import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

import type { CaptureCoverage } from "../coverage.js";
import { CompanionIpcClient, CompanionIpcError, type CompanionIpcConnectOptions } from "./ipc.js";

export type CompanionErrorCode =
  | "already_running"
  | "binary_hash_mismatch"
  | "integrity_check_failed"
  | "invalid_manifest"
  | "missing_binary"
  | "missing_manifest"
  | "not_connected"
  | "spawn_failed";

export class CompanionError extends Error {
  readonly code: CompanionErrorCode;

  constructor(code: CompanionErrorCode, message: string) {
    super(message);
    this.name = "CompanionError";
    this.code = code;
  }
}

export interface CompanionLaunchOptions {
  readonly binaryPath: string;
  readonly dataDirectory: string;
  readonly ipc?: {
    readonly endpoint: string;
    readonly scopeId: string;
    readonly REDACTED: REDACTED;
  };
  readonly integrity:
    | {
        readonly kind: "development_override";
      }
    | {
        readonly architecture: string;
        readonly kind: "embedded_manifest";
        readonly manifestPath: string;
        readonly platform: NodeJS.Platform;
        readonly relativeBinaryPath: string;
      };
}

export interface ManagedChild {
  readonly exitCode: number | null;
  readonly killed: boolean;
  kill(signal?: NodeJS.Signals | number): boolean;
  once(event: "error", listener: (error: Error) => void): this;
  once(event: "exit", listener: (code: number | null) => void): this;
}

export type CompanionLauncher = (
  binaryPath: string,
  environment: NodeJS.ProcessEnv
) => ManagedChild;

interface CompanionIpcSession {
  close(): void;
  request<T>(type: string, payload?: Record<string, unknown>): Promise<T>;
}

type CompanionIpcConnector = (options: CompanionIpcConnectOptions) => Promise<CompanionIpcSession>;

export interface CompanionLifecycle {
  readonly running: boolean;
  createCheckpoint(reason: "manual" | "session_end"): Promise<CompanionCheckpoint>;
  start(options: CompanionLaunchOptions): void;
  startObservation(projectId: string, providerSurface: string): Promise<CompanionObservation>;
  status(): Promise<CompanionStatus>;
  stop(): Promise<void>;
  stopObservation(sessionId: string): Promise<CompanionCheckpoint>;
}

export interface CompanionObservation {
  readonly coverage: CaptureCoverage;
  readonly sessionId: string;
  readonly startedAtEpochSeconds: number;
}

export interface CompanionCheckpoint {
  readonly checkpointId: string;
  readonly coverage: CaptureCoverage;
  readonly createdAtEpochSeconds: number;
  readonly localSequence: number;
  readonly reason: "manual" | "session_end";
  readonly sessionId: string;
}

export interface CompanionStatus {
  readonly activeSessionId?: string;
  readonly state: "ready" | "observing";
}

const defaultLauncher: CompanionLauncher = (binaryPath, environment) =>
  spawn(binaryPath, [], {
    env: environment,
    stdio: "ignore",
    windowsHide: true
  });

export class CompanionController implements CompanionLifecycle {
  readonly #fileExists: (path: string) => boolean;
  readonly #ipcConnector: CompanionIpcConnector;
  readonly #launcher: CompanionLauncher;
  readonly #readFile: (path: string) => Buffer;
  readonly #shutdownTimeoutMilliseconds: number;
  #child: ManagedChild | undefined;
  #ipc:
    | {
        readonly endpoint: string;
        readonly REDACTED: REDACTED;
      }
    | undefined;

  constructor(options?: {
    readonly fileExists?: (path: string) => boolean;
    readonly ipcConnector?: CompanionIpcConnector;
    readonly launcher?: CompanionLauncher;
    readonly readFile?: (path: string) => Buffer;
    readonly shutdownTimeoutMilliseconds?: number;
  }) {
    this.#fileExists = options?.fileExists ?? existsSync;
    this.#ipcConnector =
      options?.ipcConnector ?? ((connectOptions) => CompanionIpcClient.connect(connectOptions));
    this.#launcher = options?.launcher ?? defaultLauncher;
    this.#readFile = options?.readFile ?? readFileSync;
    this.#shutdownTimeoutMilliseconds = options?.shutdownTimeoutMilliseconds ?? 3_000;
  }

  get running(): boolean {
    return this.#child !== undefined && this.#child.exitCode === null && !this.#child.killed;
  }

  start(options: CompanionLaunchOptions): void {
    if (this.running) {
      throw new CompanionError("already_running", "Observation is already running.");
    }
    if (!this.#fileExists(options.binaryPath)) {
      throw new CompanionError(
        "missing_binary",
        "The matching Environment Reconciler Companion binary is missing."
      );
    }
    if (options.integrity.kind === "embedded_manifest") {
      verifyEmbeddedBinary(options.binaryPath, options.integrity, this.#fileExists, this.#readFile);
    }
    let child: ManagedChild;
    try {
      child = this.#launcher(options.binaryPath, {
        ...process.env,
        ER_COMPANION_DATA_DIR: options.dataDirectory,
        ...(options.ipc === undefined
          ? {}
          : {
              ER_COMPANION_IPC_SCOPE: options.ipc.scopeId,
              ER_COMPANION_IPC_SECRET: Buffer.from(options.REDACTED).toString("base64url")
            })
      });
    } catch {
      throw new CompanionError("spawn_failed", "The Companion could not be started.");
    }
    this.#child = child;
    this.#ipc =
      options.ipc === undefined
        ? undefined
        : {
            endpoint: options.ipc.endpoint,
            REDACTED: new REDACTED(options.REDACTED)
          };
    options.ipc?.REDACTED.fill(0);
    child.once("error", () => {
      if (this.#child === child) {
        this.#child = undefined;
        this.#clearIpc();
      }
    });
    child.once("exit", () => {
      if (this.#child === child) {
        this.#child = undefined;
        this.#clearIpc();
      }
    });
  }

  async status(): Promise<CompanionStatus> {
    const result = await this.#request<unknown>("status.get", {});
    if (
      !isRecord(result) ||
      !["ready", "observing"].includes(String(result.state)) ||
      (result.activeSessionId !== undefined && !validIdentifier(result.activeSessionId))
    ) {
      throw invalidCompanionResponse();
    }
    return {
      ...(result.activeSessionId === undefined ? {} : { activeSessionId: result.activeSessionId }),
      state: result.state as CompanionStatus["state"]
    };
  }

  async startObservation(
    projectId: string,
    providerSurface: string
  ): Promise<CompanionObservation> {
    const result = await this.#request<CompanionObservation>("observation.start", {
      projectId,
      providerSurface
    });
    if (
      !validIdentifier(result.sessionId) ||
      !validEpochSeconds(result.startedAtEpochSeconds) ||
      !isCaptureCoverage(result.coverage)
    ) {
      throw invalidCompanionResponse();
    }
    return result;
  }

  async createCheckpoint(reason: "manual" | "session_end"): Promise<CompanionCheckpoint> {
    return this.#checkpointResponse(
      await this.#request<CompanionCheckpoint>("checkpoint.create", { reason })
    );
  }

  async stopObservation(sessionId: string): Promise<CompanionCheckpoint> {
    return this.#checkpointResponse(
      await this.#request<CompanionCheckpoint>("observation.stop", { sessionId })
    );
  }

  async stop(): Promise<void> {
    const child = this.#child;
    if (child?.exitCode !== null) {
      this.#child = undefined;
      this.#clearIpc();
      return;
    }
    child.kill("SIGTERM");
    const exited = await waitForExit(child, this.#shutdownTimeoutMilliseconds);
    if (!exited && hasNotExited(child)) {
      child.kill("SIGKILL");
      await waitForExit(child, Math.min(this.#shutdownTimeoutMilliseconds, 250));
    }
    if (this.#child === child) {
      this.#child = undefined;
    }
    this.#clearIpc();
  }

  #checkpointResponse(result: CompanionCheckpoint): CompanionCheckpoint {
    if (
      !validIdentifier(result.checkpointId) ||
      !validIdentifier(result.sessionId) ||
      !validEpochSeconds(result.createdAtEpochSeconds) ||
      !Number.isSafeInteger(result.localSequence) ||
      result.localSequence < 1 ||
      !["manual", "session_end"].includes(result.reason) ||
      !isCaptureCoverage(result.coverage)
    ) {
      throw invalidCompanionResponse();
    }
    return result;
  }

  async #request<T>(type: string, payload: Record<string, unknown>): Promise<T> {
    const ipc = this.#ipc;
    if (ipc === undefined || !this.running) {
      throw new CompanionError("not_connected", "The Companion local IPC service is not running.");
    }
    let lastError: unknown;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      let client: CompanionIpcSession | undefined;
      try {
        client = await this.#ipcConnector({
          endpoint: ipc.endpoint,
          requestTimeoutMilliseconds: 1_000,
          REDACTED: REDACTED
        });
        return await client.request<T>(type, payload);
      } catch (error) {
        lastError = error;
        if (
          !(error instanceof CompanionIpcError) ||
          !["closed", "peer_validation_failed"].includes(error.code) ||
          attempt === 19
        ) {
          throw error;
        }
        await boundedDelay(50);
      } finally {
        client?.close();
      }
    }
    throw lastError;
  }

  #clearIpc(): void {
    this.#ipc?.REDACTED.fill(0);
    this.#ipc = undefined;
  }
}

interface CompanionManifestEntry {
  readonly architecture: string;
  readonly platform: string;
  readonly relativePath: string;
  readonly sha256: string;
}

interface CompanionManifest {
  readonly entries: readonly CompanionManifestEntry[];
  readonly schemaVersion: 1;
}

function verifyEmbeddedBinary(
  binaryPath: string,
  integrity: Extract<CompanionLaunchOptions["integrity"], { readonly kind: "embedded_manifest" }>,
  fileExists: (path: string) => boolean,
  readFile: (path: string) => Buffer
): void {
  if (!fileExists(integrity.manifestPath)) {
    throw new CompanionError(
      "missing_manifest",
      "The packaged Companion integrity manifest is missing."
    );
  }

  let manifest: CompanionManifest;
  try {
    manifest = parseManifest(readFile(integrity.manifestPath));
  } catch (error) {
    if (error instanceof CompanionError) {
      throw error;
    }
    throw new CompanionError(
      "integrity_check_failed",
      "The packaged Companion integrity manifest could not be read."
    );
  }

  const entry = manifest.entries.find(
    (candidate) =>
      candidate.platform === integrity.platform &&
      candidate.architecture === integrity.architecture &&
      candidate.relativePath === integrity.relativeBinaryPath
  );
  if (entry === undefined) {
    throw new CompanionError(
      "invalid_manifest",
      "The integrity manifest does not describe the matching packaged Companion binary."
    );
  }

  const manifestDirectory = path.dirname(path.resolve(integrity.manifestPath));
  if (path.basename(manifestDirectory) !== "bin") {
    throw new CompanionError(
      "invalid_manifest",
      "The Companion integrity manifest is outside the expected package location."
    );
  }
  const extensionRoot = path.dirname(manifestDirectory);
  const describedBinaryPath = path.resolve(extensionRoot, ...entry.relativePath.split("/"));
  if (describedBinaryPath !== path.resolve(binaryPath)) {
    throw new CompanionError(
      "invalid_manifest",
      "The integrity manifest entry does not match the packaged Companion path."
    );
  }

  let actualSha256: string;
  try {
    actualSha256 = createHash("sha256").update(readFile(binaryPath)).digest("hex");
  } catch {
    throw new CompanionError(
      "integrity_check_failed",
      "The packaged Companion binary could not be verified."
    );
  }
  if (actualSha256 !== entry.sha256) {
    throw new CompanionError(
      "binary_hash_mismatch",
      "The packaged Companion binary failed its integrity check."
    );
  }
}

function parseManifest(bytes: Buffer): CompanionManifest {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    throw new CompanionError(
      "invalid_manifest",
      "The packaged Companion integrity manifest is invalid."
    );
  }
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.entries)) {
    throw new CompanionError(
      "invalid_manifest",
      "The packaged Companion integrity manifest is invalid."
    );
  }
  if (value.entries.length > 128) {
    throw new CompanionError(
      "invalid_manifest",
      "The packaged Companion integrity manifest has too many entries."
    );
  }

  const entries: CompanionManifestEntry[] = [];
  const identities = new Set<string>();
  for (const candidate of value.entries) {
    if (
      !isRecord(candidate) ||
      typeof candidate.platform !== "string" ||
      candidate.platform.length === 0 ||
      typeof candidate.architecture !== "string" ||
      candidate.architecture.length === 0 ||
      typeof candidate.relativePath !== "string" ||
      !isSafeRelativeBinaryPath(candidate.relativePath) ||
      typeof candidate.sha256 !== "string" ||
      !/^[0-9a-f]{64}$/.test(candidate.sha256)
    ) {
      throw new CompanionError(
        "invalid_manifest",
        "The packaged Companion integrity manifest contains an invalid entry."
      );
    }
    const identity = `${candidate.platform}\u0000${candidate.architecture}\u0000${candidate.relativePath}`;
    if (identities.has(identity)) {
      throw new CompanionError(
        "invalid_manifest",
        "The packaged Companion integrity manifest contains a duplicate entry."
      );
    }
    identities.add(identity);
    entries.push({
      architecture: candidate.architecture,
      platform: candidate.platform,
      relativePath: candidate.relativePath,
      sha256: candidate.sha256
    });
  }
  return { entries, schemaVersion: 1 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeRelativeBinaryPath(relativePath: string): boolean {
  if (
    relativePath.length === 0 ||
    relativePath.includes("\\") ||
    path.posix.isAbsolute(relativePath) ||
    path.posix.normalize(relativePath) !== relativePath
  ) {
    return false;
  }
  const segments = relativePath.split("/");
  return (
    segments[0] === "bin" &&
    segments.length >= 4 &&
    segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..")
  );
}

function hasNotExited(child: ManagedChild): boolean {
  return child.exitCode === null;
}

function waitForExit(child: ManagedChild, timeoutMilliseconds: number): Promise<boolean> {
  if (child.exitCode !== null) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeoutMilliseconds);
    timer.unref();
    child.once("exit", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(true);
      }
    });
  });
}

function boundedDelay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    timer.unref();
  });
}

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u.test(value);
}

function validEpochSeconds(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isCaptureCoverage(value: unknown): value is CaptureCoverage {
  return (
    isRecord(value) &&
    Array.isArray(value.adapters) &&
    validEpochSeconds(value.generatedAtEpochSeconds) &&
    isRecord(value.permission) &&
    isRecord(value.provider) &&
    Array.isArray(value.realms) &&
    isRecord(value.upload)
  );
}

function invalidCompanionResponse(): CompanionError {
  return new CompanionError(
    "integrity_check_failed",
    "The Companion returned an invalid IPC response."
  );
}
