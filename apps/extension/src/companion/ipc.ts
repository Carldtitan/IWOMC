import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { createConnection, type Socket } from "node:net";

const IPC_PROTOCOL_VERSION = 1;
const DEFAULT_MAXIMUM_FRAME_BYTES = 64 * 1024;
const DEFAULT_TIMEOUT_MILLISECONDS = 5_000;
const UNIX_SOCKET_PATH_LIMIT = 100;

export type IpcErrorCode =
  | "authentication_failed"
  | "closed"
  | "invalid_endpoint"
  | "invalid_frame"
  | "invalid_request"
  | "peer_validation_failed"
  | "remote_error"
  | "timeout";

export class CompanionIpcError extends Error {
  readonly code: IpcErrorCode;

  constructor(code: IpcErrorCode, message: string) {
    super(message);
    this.name = "CompanionIpcError";
    this.code = code;
  }
}

export interface CompanionEndpointOptions {
  readonly platform?: NodeJS.Platform;
  readonly runtimeDirectory?: string;
  readonly scopeId: string;
  readonly temporaryDirectory?: string;
  readonly userId?: number;
}

export function deriveCompanionEndpoint(options: CompanionEndpointOptions): string {
  if (
    options.scopeId.length === 0 ||
    options.scopeId.length > 1_024 ||
    [...options.scopeId].some((character) => character.codePointAt(0)! < 0x20)
  ) {
    throw new CompanionIpcError("invalid_endpoint", "The Companion IPC scope is invalid.");
  }
  const platform = options.platform ?? process.platform;
  const digest = createHash("sha256").update(options.scopeId, "utf8").digest("hex");
  if (platform === "win32") {
    return `\\\\.\\pipe\\environment-reconciler-${digest.slice(0, 32)}`;
  }

  const unixPath = path.posix;
  const userId = options.userId ?? currentUserId();
  const root =
    options.runtimeDirectory ??
    process.env.XDG_RUNTIME_DIR ??
    unixPath.join(
      options.temporaryDirectory ?? tmpdir(),
      `environment-reconciler-${userId ?? "user"}`
    );
  if (!unixPath.isAbsolute(root)) {
    throw new CompanionIpcError(
      "invalid_endpoint",
      "The Companion runtime directory must be absolute."
    );
  }
  const endpoint = unixPath.join(root, `companion-${digest.slice(0, 24)}.sock`);
  if (Buffer.byteLength(endpoint, "utf8") > UNIX_SOCKET_PATH_LIMIT) {
    const fallback = unixPath.join(
      options.temporaryDirectory ?? tmpdir(),
      `er-${digest.slice(0, 32)}.sock`
    );
    if (Buffer.byteLength(fallback, "utf8") > UNIX_SOCKET_PATH_LIMIT) {
      throw new CompanionIpcError(
        "invalid_endpoint",
        "The derived Companion socket path is too long."
      );
    }
    return fallback;
  }
  return endpoint;
}

interface StatView {
  readonly mode: number;
  readonly uid: number;
  isDirectory(): boolean;
  isSocket(): boolean;
}

export async function validateLocalEndpoint(
  endpoint: string,
  options: {
    readonly lstat?: (target: string) => Promise<StatView>;
    readonly platform?: NodeJS.Platform;
    readonly userId?: number;
  } = {}
): Promise<void> {
  const platform = options.platform ?? process.platform;
  if (platform === "win32") {
    if (!/^\\\\\.\\pipe\\environment-reconciler-[a-f0-9]{32}$/u.test(endpoint)) {
      throw new CompanionIpcError(
        "peer_validation_failed",
        "The Companion named pipe path is not trusted."
      );
    }
    return;
  }
  if (
    !path.posix.isAbsolute(endpoint) ||
    Buffer.byteLength(endpoint, "utf8") > UNIX_SOCKET_PATH_LIMIT
  ) {
    throw new CompanionIpcError(
      "peer_validation_failed",
      "The Companion socket path is not trusted."
    );
  }

  const readStat = options.lstat ?? lstat;
  const expectedUserId = options.userId ?? currentUserId();
  let directory: StatView;
  let socket: StatView;
  try {
    [directory, socket] = await Promise.all([
      readStat(path.posix.dirname(endpoint)),
      readStat(endpoint)
    ]);
  } catch {
    throw new CompanionIpcError(
      "peer_validation_failed",
      "The Companion socket or its directory is unavailable."
    );
  }
  const ownedByCurrentUser =
    expectedUserId === undefined ||
    (directory.uid === expectedUserId && socket.uid === expectedUserId);
  const privatePermissions = (directory.mode & 0o077) === 0 && (socket.mode & 0o077) === 0;
  if (
    !directory.isDirectory() ||
    !socket.isSocket() ||
    !ownedByCurrentUser ||
    !privatePermissions
  ) {
    throw new CompanionIpcError(
      "peer_validation_failed",
      "The Companion socket failed ownership or permission checks."
    );
  }
}

export interface CompanionIpcConnectOptions {
  readonly endpoint: string;
  readonly maximumFrameBytes?: number;
  readonly requestTimeoutMilliseconds?: number;
  readonly secret: Uint8Array;
  readonly socketFactory?: (endpoint: string) => Socket;
  readonly validatePeer?: (endpoint: string) => Promise<void>;
}

interface PendingRequest {
  readonly reject: (error: Error) => void;
  readonly resolve: (response: JsonObject) => void;
  readonly timer: NodeJS.Timeout;
}

type JsonObject = Record<string, unknown>;

export class CompanionIpcClient {
  readonly #decoder: JsonFrameDecoder;
  readonly #maximumFrameBytes: number;
  readonly #pending = new Map<string, PendingRequest>();
  readonly #requestTimeoutMilliseconds: number;
  readonly #socket: Socket;
  #closed = false;

  private constructor(
    socket: Socket,
    maximumFrameBytes: number,
    requestTimeoutMilliseconds: number
  ) {
    this.#socket = socket;
    this.#maximumFrameBytes = maximumFrameBytes;
    this.#requestTimeoutMilliseconds = requestTimeoutMilliseconds;
    this.#decoder = new JsonFrameDecoder(maximumFrameBytes);
    socket.on("data", (chunk: Buffer) => {
      try {
        for (const frame of this.#decoder.push(chunk)) {
          this.#acceptResponse(frame);
        }
      } catch {
        this.#fail(
          new CompanionIpcError("invalid_frame", "The Companion sent an invalid IPC frame.")
        );
      }
    });
    socket.on("error", () => {
      this.#fail(new CompanionIpcError("closed", "The Companion IPC connection failed."));
    });
    socket.on("close", () => {
      this.#fail(new CompanionIpcError("closed", "The Companion IPC connection closed."));
    });
  }

  static async connect(options: CompanionIpcConnectOptions): Promise<CompanionIpcClient> {
    validateConnectOptions(options);
    await (options.validatePeer ?? validateLocalEndpoint)(options.endpoint);
    const socketFactory = options.socketFactory ?? ((endpoint) => createConnection(endpoint));
    const socket = socketFactory(options.endpoint);
    const timeout = options.requestTimeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS;
    await waitForConnect(socket, timeout);
    const client = new CompanionIpcClient(
      socket,
      options.maximumFrameBytes ?? DEFAULT_MAXIMUM_FRAME_BYTES,
      timeout
    );
    try {
      await client.#authenticate(new Uint8Array(options.secret));
      return client;
    } catch (error) {
      client.close();
      throw error;
    }
  }

  get closed(): boolean {
    return this.#closed;
  }

  async request<T>(type: string, payload: JsonObject = {}): Promise<T> {
    if (!/^[a-z][a-z0-9_.-]{0,99}$/u.test(type)) {
      throw new CompanionIpcError("invalid_request", "The IPC request type is invalid.");
    }
    const response = await this.#exchange(type, payload);
    if (response.ok !== true) {
      const remotePayload = isObject(response.payload) ? response.payload : {};
      const remoteCode =
        typeof remotePayload.code === "string" &&
        /^[a-z][a-z0-9_]{0,63}$/u.test(remotePayload.code)
          ? remotePayload.code
          : "unknown";
      throw new CompanionIpcError(
        "remote_error",
        `The Companion rejected the IPC request (${remoteCode}).`
      );
    }
    return response.payload as T;
  }

  close(): void {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    this.#rejectPending(
      new CompanionIpcError("closed", "The Companion IPC connection was closed.")
    );
    this.#socket.end();
    this.#socket.destroy();
  }

  async #authenticate(secret: Uint8Array): Promise<void> {
    const clientNonce = randomBytes(32).toString("base64url");
    try {
      const challenge = await this.#exchange("handshake.challenge", {
        nonce: clientNonce,
        protocolVersion: IPC_PROTOCOL_VERSION
      });
      if (challenge.type !== "handshake.response" || challenge.ok !== true) {
        throw authenticationFailure();
      }
      const responsePayload = requiredObject(challenge.payload);
      const serverNonce = requiredNonce(responsePayload.serverNonce);
      const serverMac = requiredMac(responsePayload.mac);
      const expectedServerMac = createHandshakeMac(secret, "server", clientNonce, serverNonce);
      if (!safeMacEqual(serverMac, expectedServerMac)) {
        throw authenticationFailure();
      }

      const proof = await this.#exchange("handshake.proof", {
        clientNonce,
        mac: createHandshakeMac(secret, "client", clientNonce, serverNonce),
        serverNonce
      });
      const proofPayload = requiredObject(proof.payload);
      if (proof.type !== "handshake.ack" || proof.ok !== true || proofPayload.accepted !== true) {
        throw authenticationFailure();
      }
    } catch (error) {
      if (
        error instanceof CompanionIpcError &&
        ["closed", "invalid_frame", "timeout"].includes(error.code)
      ) {
        throw error;
      }
      throw authenticationFailure();
    } finally {
      secret.fill(0);
    }
  }

  #exchange(type: string, payload: JsonObject): Promise<JsonObject> {
    if (this.#closed) {
      return Promise.reject(
        new CompanionIpcError("closed", "The Companion IPC connection is closed.")
      );
    }
    const requestId = randomUUID();
    const frame = encodeJsonFrame(
      {
        payload,
        protocolVersion: IPC_PROTOCOL_VERSION,
        requestId,
        type
      },
      this.#maximumFrameBytes
    );
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(requestId);
        reject(new CompanionIpcError("timeout", "The Companion IPC request timed out."));
      }, this.#requestTimeoutMilliseconds);
      timer.unref();
      this.#pending.set(requestId, { reject, resolve, timer });
      try {
        this.#socket.write(frame);
      } catch {
        clearTimeout(timer);
        this.#pending.delete(requestId);
        reject(new CompanionIpcError("closed", "The Companion IPC write failed."));
      }
    });
  }

  #acceptResponse(response: JsonObject): void {
    const requestId = response.requestId;
    if (
      typeof requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(requestId)
    ) {
      throw new CompanionIpcError("invalid_frame", "The IPC response ID is invalid.");
    }
    const pending = this.#pending.get(requestId);
    if (pending === undefined) {
      throw new CompanionIpcError("invalid_frame", "The IPC response ID is unknown.");
    }
    this.#pending.delete(requestId);
    clearTimeout(pending.timer);
    pending.resolve(response);
  }

  #fail(error: CompanionIpcError): void {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    this.#rejectPending(error);
    this.#socket.destroy();
  }

  #rejectPending(error: CompanionIpcError): void {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#pending.clear();
  }
}

export function encodeJsonFrame(
  value: JsonObject,
  maximumFrameBytes = DEFAULT_MAXIMUM_FRAME_BYTES
): Buffer {
  let payload: Buffer;
  try {
    payload = Buffer.from(JSON.stringify(value), "utf8");
  } catch {
    throw new CompanionIpcError("invalid_frame", "The IPC frame is not serializable.");
  }
  if (payload.byteLength === 0 || payload.byteLength > maximumFrameBytes) {
    throw new CompanionIpcError("invalid_frame", "The IPC frame exceeds its size limit.");
  }
  const frame = Buffer.allocUnsafe(4 + payload.byteLength);
  frame.writeUInt32BE(payload.byteLength, 0);
  payload.copy(frame, 4);
  return frame;
}

export class JsonFrameDecoder {
  readonly #maximumFrameBytes: number;
  #buffer = Buffer.alloc(0);

  constructor(maximumFrameBytes = DEFAULT_MAXIMUM_FRAME_BYTES) {
    if (
      !Number.isSafeInteger(maximumFrameBytes) ||
      maximumFrameBytes < 256 ||
      maximumFrameBytes > 1024 * 1024
    ) {
      throw new CompanionIpcError("invalid_frame", "The IPC frame limit is invalid.");
    }
    this.#maximumFrameBytes = maximumFrameBytes;
  }

  push(chunk: Uint8Array): JsonObject[] {
    if (chunk.byteLength === 0) {
      return [];
    }
    this.#buffer = Buffer.concat([this.#buffer, Buffer.from(chunk)]);
    const frames: JsonObject[] = [];
    while (this.#buffer.byteLength >= 4) {
      const length = this.#buffer.readUInt32BE(0);
      if (length === 0 || length > this.#maximumFrameBytes) {
        throw new CompanionIpcError("invalid_frame", "The IPC frame length is invalid.");
      }
      if (this.#buffer.byteLength < 4 + length) {
        break;
      }
      const bytes = this.#buffer.subarray(4, 4 + length);
      this.#buffer = this.#buffer.subarray(4 + length);
      let value: unknown;
      try {
        value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      } catch {
        throw new CompanionIpcError("invalid_frame", "The IPC frame contains invalid JSON.");
      }
      if (!isObject(value)) {
        throw new CompanionIpcError("invalid_frame", "The IPC frame must contain an object.");
      }
      frames.push(value);
    }
    return frames;
  }
}

export function createHandshakeMac(
  secret: Uint8Array,
  role: "client" | "server",
  clientNonce: string,
  serverNonce: string
): string {
  return createHmac("sha256", secret)
    .update(`environment-reconciler-ipc-v1\0${role}\0${clientNonce}\0${serverNonce}`, "utf8")
    .digest("base64url");
}

function validateConnectOptions(options: CompanionIpcConnectOptions): void {
  const maximumFrameBytes = options.maximumFrameBytes ?? DEFAULT_MAXIMUM_FRAME_BYTES;
  const timeout = options.requestTimeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS;
  if (
    options.secret.byteLength < 32 ||
    options.secret.byteLength > 1_024 ||
    !Number.isSafeInteger(maximumFrameBytes) ||
    maximumFrameBytes < 256 ||
    maximumFrameBytes > 1024 * 1024 ||
    !Number.isSafeInteger(timeout) ||
    timeout < 1 ||
    timeout > 60_000
  ) {
    throw new CompanionIpcError("invalid_request", "The IPC connection options are invalid.");
  }
}

function waitForConnect(socket: Socket, timeoutMilliseconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timer);
      socket.off("connect", connected);
      socket.off("error", failed);
    };
    const connected = (): void => {
      cleanup();
      resolve();
    };
    const failed = (): void => {
      cleanup();
      reject(new CompanionIpcError("closed", "The Companion IPC connection failed."));
    };
    const timer = setTimeout(() => {
      cleanup();
      socket.destroy();
      reject(new CompanionIpcError("timeout", "The Companion IPC connection timed out."));
    }, timeoutMilliseconds);
    timer.unref();
    socket.once("connect", connected);
    socket.once("error", failed);
  });
}

function requiredObject(value: unknown): JsonObject {
  if (!isObject(value)) {
    throw authenticationFailure();
  }
  return value;
}

function requiredNonce(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(value)) {
    throw authenticationFailure();
  }
  return value;
}

function requiredMac(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(value)) {
    throw authenticationFailure();
  }
  return value;
}

function safeMacEqual(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual, "base64url");
  const expectedBytes = Buffer.from(expected, "base64url");
  return (
    actualBytes.byteLength === expectedBytes.byteLength &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

function authenticationFailure(): CompanionIpcError {
  return new CompanionIpcError("authentication_failed", "The Companion IPC authentication failed.");
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function currentUserId(): number | undefined {
  return typeof process.getuid === "function" ? process.getuid() : undefined;
}
