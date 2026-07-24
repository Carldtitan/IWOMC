import { EventEmitter } from "node:events";
import { type Socket } from "node:net";
import { describe, expect, it } from "vitest";

import {
  CompanionIpcClient,
  JsonFrameDecoder,
  createHandshakeMac,
  deriveCompanionEndpoint,
  encodeJsonFrame,
  type CompanionIpcError,
  validateLocalEndpoint
} from "./ipc.js";

const secret = new Uint8Array(32).fill(7);

describe("Companion IPC endpoint security", () => {
  it("derives stable scope-separated named pipes and Unix sockets without raw IDs", () => {
    const windows = deriveCompanionEndpoint({
      platform: "win32",
      scopeId: "device/private workspace"
    });
    const unix = deriveCompanionEndpoint({
      platform: "linux",
      runtimeDirectory: "/run/user/1000/environment-reconciler",
      scopeId: "device/private workspace",
      userId: 1_000
    });

    expect(windows).toMatch(/^\\\\\.\\pipe\\environment-reconciler-[a-f0-9]{32}$/u);
    expect(unix).toMatch(
      /^\/run\/user\/1000\/environment-reconciler\/companion-[a-f0-9]{24}\.sock$/u
    );
    expect(`${windows}${unix}`).not.toContain("private workspace");
  });

  it("requires a private same-user Unix socket and parent directory", async () => {
    const secureStat =
      (socketMode: number, socketUserId = 1_000) =>
      (target: string) =>
        Promise.resolve({
          isDirectory: () => !target.endsWith(".sock"),
          isSocket: () => target.endsWith(".sock"),
          mode: target.endsWith(".sock") ? socketMode : 0o700,
          uid: target.endsWith(".sock") ? socketUserId : 1_000
        });

    await expect(
      validateLocalEndpoint("/run/user/1000/companion.sock", {
        lstat: secureStat(0o600),
        platform: "linux",
        userId: 1_000
      })
    ).resolves.toBeUndefined();
    await expect(
      validateLocalEndpoint("/run/user/1000/companion.sock", {
        lstat: secureStat(0o666),
        platform: "linux",
        userId: 1_000
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<CompanionIpcError>>({
        code: "peer_validation_failed"
      })
    );
    await expect(
      validateLocalEndpoint("/run/user/1000/companion.sock", {
        lstat: secureStat(0o600, 2_000),
        platform: "linux",
        userId: 1_000
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<CompanionIpcError>>({
        code: "peer_validation_failed"
      })
    );
  });
});

describe("bounded IPC framing", () => {
  it("decodes split and coalesced length-prefixed JSON frames", () => {
    const decoder = new JsonFrameDecoder(1_024);
    const first = encodeJsonFrame({ requestId: "one" }, 1_024);
    const second = encodeJsonFrame({ requestId: "two" }, 1_024);

    expect(decoder.push(first.subarray(0, 3))).toEqual([]);
    expect(decoder.push(Buffer.concat([first.subarray(3), second]))).toEqual([
      { requestId: "one" },
      { requestId: "two" }
    ]);
  });

  it("rejects declared and encoded frames above the configured bound", () => {
    const decoder = new JsonFrameDecoder(256);
    const oversizedHeader = Buffer.alloc(4);
    oversizedHeader.writeUInt32BE(257);

    expect(() => decoder.push(oversizedHeader)).toThrowError(
      expect.objectContaining<Partial<CompanionIpcError>>({ code: "invalid_frame" })
    );
    expect(() => encodeJsonFrame({ value: "x".repeat(300) }, 256)).toThrowError(
      expect.objectContaining<Partial<CompanionIpcError>>({ code: "invalid_frame" })
    );
  });
});

describe("CompanionIpcClient", () => {
  it("authenticates both nonce roles and correlates requests by ID", async () => {
    const server = new FakeCompanionServer(secret);
    const client = await CompanionIpcClient.connect({
      endpoint: "\\\\.\\pipe\\environment-reconciler-0123456789abcdef0123456789abcdef",
      requestTimeoutMilliseconds: 100,
      secret,
      socketFactory: () => server.open(),
      validatePeer: () => Promise.resolve()
    });

    const response = await client.request<{ readonly state: string }>("status.get");

    expect(response).toEqual({ state: "observing" });
    expect(server.requestTypes).toEqual(["handshake.challenge", "handshake.proof", "status.get"]);
    client.close();
  });

  it("rejects an invalid server HMAC and closes the socket", async () => {
    const server = new FakeCompanionServer(secret, true);

    await expect(
      CompanionIpcClient.connect({
        endpoint: "\\\\.\\pipe\\environment-reconciler-0123456789abcdef0123456789abcdef",
        requestTimeoutMilliseconds: 100,
        secret,
        socketFactory: () => server.open(),
        validatePeer: () => Promise.resolve()
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<CompanionIpcError>>({
        code: "authentication_failed"
      })
    );
    expect(server.destroyed).toBe(true);
  });

  it("times out a request that receives no matching response", async () => {
    const server = new FakeCompanionServer(secret);
    server.ignoreStatus = true;
    const client = await CompanionIpcClient.connect({
      endpoint: "\\\\.\\pipe\\environment-reconciler-0123456789abcdef0123456789abcdef",
      requestTimeoutMilliseconds: 5,
      secret,
      socketFactory: () => server.open(),
      validatePeer: () => Promise.resolve()
    });

    await expect(client.request("status.get")).rejects.toEqual(
      expect.objectContaining<Partial<CompanionIpcError>>({ code: "timeout" })
    );
    client.close();
  });
});

class FakeCompanionServer {
  readonly #decoder = new JsonFrameDecoder();
  readonly #events = new EventEmitter();
  readonly #invalidServerMac: boolean;
  readonly #secret: Uint8Array;
  readonly requestTypes: string[] = [];
  destroyed = false;
  ignoreStatus = false;

  readonly socket = this.#events as EventEmitter & Socket;

  constructor(serverSecret: Uint8Array, invalidServerMac = false) {
    this.#secret = new Uint8Array(serverSecret);
    this.#invalidServerMac = invalidServerMac;
    Object.assign(this.socket, {
      destroy: () => {
        this.destroyed = true;
        queueMicrotask(() => this.#events.emit("close"));
      },
      end: () => undefined,
      write: (frame: Uint8Array) => {
        this.#receive(frame);
        return true;
      }
    });
  }

  open(): Socket {
    queueMicrotask(() => this.#events.emit("connect"));
    return this.socket;
  }

  #receive(frame: Uint8Array): void {
    for (const request of this.#decoder.push(frame)) {
      const type = String(request.type);
      const requestId = String(request.requestId);
      this.requestTypes.push(type);
      const payload = isObject(request.payload) ? request.payload : {};
      if (type === "handshake.challenge") {
        const clientNonce = String(payload.nonce);
        const serverNonce = Buffer.alloc(32, 9).toString("base64url");
        this.#respond({
          ok: true,
          payload: {
            mac: this.#invalidServerMac
              ? Buffer.alloc(32, 1).toString("base64url")
              : createHandshakeMac(this.#secret, "server", clientNonce, serverNonce),
            serverNonce
          },
          requestId,
          type: "handshake.response"
        });
      } else if (type === "handshake.proof") {
        const clientNonce = String(payload.clientNonce);
        const serverNonce = String(payload.serverNonce);
        const expected = createHandshakeMac(this.#secret, "client", clientNonce, serverNonce);
        this.#respond({
          ok: payload.mac === expected,
          payload: { accepted: payload.mac === expected },
          requestId,
          type: "handshake.ack"
        });
      } else if (!this.ignoreStatus && type === "status.get") {
        this.#respond({
          ok: true,
          payload: { state: "observing" },
          requestId,
          type: "status.result"
        });
      }
    }
  }

  #respond(response: Record<string, unknown>): void {
    queueMicrotask(() => this.#events.emit("data", encodeJsonFrame(response)));
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
