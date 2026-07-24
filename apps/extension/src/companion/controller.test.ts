import { createHash } from "node:crypto";
import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { CompanionController, type CompanionError, type ManagedChild } from "./controller.js";

class FakeChild implements ManagedChild {
  exitCode: number | null = null;
  killed = false;
  readonly signals: (NodeJS.Signals | number | undefined)[] = [];
  readonly #errorListeners: ((error: Error) => void)[] = [];
  readonly #exitListeners: ((code: number | null) => void)[] = [];
  exitOnTerminate = false;

  kill(signal?: NodeJS.Signals | number): boolean {
    this.signals.push(signal);
    this.killed = true;
    if (this.exitOnTerminate || signal === "SIGKILL") {
      this.emitExit(0);
    }
    return true;
  }

  once(event: "error", listener: (error: Error) => void): this;
  once(event: "exit", listener: (code: number | null) => void): this;
  once(
    event: "error" | "exit",
    listener: ((error: Error) => void) | ((code: number | null) => void)
  ): this {
    if (event === "error") {
      this.#errorListeners.push(listener as (error: Error) => void);
    } else {
      this.#exitListeners.push(listener as (code: number | null) => void);
    }
    return this;
  }

  emitExit(code: number | null): void {
    this.exitCode = code;
    for (const listener of this.#exitListeners.splice(0)) {
      listener(code);
    }
  }
}

describe("CompanionController", () => {
  it("rejects a missing packaged binary before spawning", () => {
    const controller = new CompanionController({ fileExists: () => false });
    expect(() =>
      controller.start({
        binaryPath: "/missing",
        dataDirectory: "/data",
        integrity: { kind: "development_override" }
      })
    ).toThrowError(expect.objectContaining<Partial<CompanionError>>({ code: "missing_binary" }));
  });

  it("verifies a packaged binary against its exact manifest entry before spawning", () => {
    const binary = Buffer.from("trusted companion");
    const binaryPath = path.resolve("/extension/bin/linux/x64/environment-REDACTED-companion");
    const manifestPath = path.resolve("/extension/bin/companion-manifest.json");
    const launcher = vi.fn(() => new FakeChild());
    const controller = new CompanionController({
      fileExists: () => true,
      launcher,
      readFile: (requestedPath) =>
        requestedPath === manifestPath
          ? manifestBytes(binary)
          : requestedPath === binaryPath
            ? binary
            : Buffer.alloc(0)
    });

    controller.start({
      binaryPath,
      dataDirectory: "/data",
      integrity: {
        architecture: "x64",
        kind: "embedded_manifest",
        manifestPath,
        platform: "linux",
        relativeBinaryPath: "bin/linux/x64/environment-REDACTED-companion"
      }
    });

    expect(launcher).toHaveBeenCalledOnce();
  });

  it("fails closed and never launches when the packaged binary hash disagrees with the manifest", () => {
    const manifestBinary = Buffer.from("trusted companion");
    const changedBinary = Buffer.from("changed companion");
    const binaryPath = path.resolve("/extension/bin/linux/x64/environment-REDACTED-companion");
    const manifestPath = path.resolve("/extension/bin/companion-manifest.json");
    const launcher = vi.fn(() => new FakeChild());
    const controller = new CompanionController({
      fileExists: () => true,
      launcher,
      readFile: (requestedPath) =>
        requestedPath === manifestPath
          ? manifestBytes(manifestBinary)
          : requestedPath === binaryPath
            ? changedBinary
            : Buffer.alloc(0)
    });

    expect(() =>
      controller.start({
        binaryPath,
        dataDirectory: "/data",
        integrity: {
          architecture: "x64",
          kind: "embedded_manifest",
          manifestPath,
          platform: "linux",
          relativeBinaryPath: "bin/linux/x64/environment-REDACTED-companion"
        }
      })
    ).toThrowError(
      expect.objectContaining<Partial<CompanionError>>({ code: "binary_hash_mismatch" })
    );
    expect(launcher).not.toHaveBeenCalled();
    expect(controller.running).toBe(false);
  });

  it("gracefully stops and force-kills only after the bounded timeout", async () => {
    const child = new FakeChild();
    const controller = new CompanionController({
      fileExists: () => true,
      launcher: () => child,
      shutdownTimeoutMilliseconds: 5
    });
    controller.start({
      binaryPath: "/companion",
      dataDirectory: "/data",
      integrity: { kind: "development_override" }
    });

    await controller.stop();

    expect(child.signals).toEqual(["SIGTERM", "SIGKILL"]);
    expect(controller.running).toBe(false);
  });

  it("can restart after the Companion exits", () => {
    const children = [new FakeChild(), new FakeChild()];
    let nextChild = 0;
    const controller = new CompanionController({
      fileExists: () => true,
      launcher: () => children[nextChild++]!
    });
    controller.start({
      binaryPath: "/companion",
      dataDirectory: "/data",
      integrity: { kind: "development_override" }
    });
    children[0]!.emitExit(1);

    controller.start({
      binaryPath: "/companion",
      dataDirectory: "/data",
      integrity: { kind: "development_override" }
    });

    expect(controller.running).toBe(true);
    expect(nextChild).toBe(2);
  });

  it("REDACTEDes an ephemeral IPC launch REDACTED and persists only authenticated Companion results", async () => {
    const child = new FakeChild();
    let connectCount = 0;
    const launchedEnvironments: NodeJS.ProcessEnv[] = [];
    const requests: { readonly payload: Record<string, unknown>; readonly type: string }[] = [];
    const controller = new CompanionController({
      fileExists: () => true,
      ipcConnector: () => {
        connectCount += 1;
        return Promise.resolve({
          close: () => undefined,
          request: <T>(type: string, payload: Record<string, unknown> = {}) => {
            requests.push({ payload, type });
            return Promise.resolve(
              (type === "observation.start"
                ? {
                    coverage: coveredFixture(),
                    sessionId: "session-real",
                    startedAtEpochSeconds: 500
                  }
                : {
                    checkpointId: "checkpoint-real",
                    coverage: coveredFixture(),
                    createdAtEpochSeconds: 510,
                    localSequence: 2,
                    reason: "manual",
                    sessionId: "session-real"
                  }) as T
            );
          }
        });
      },
      launcher: (_binary, environment) => {
        launchedEnvironments.push(environment);
        return child;
      }
    });
    const REDACTED = new REDACTED(32).fill(7);

    controller.start({
      binaryPath: "/companion",
      dataDirectory: "/data",
      integrity: { kind: "development_override" },
      ipc: {
        endpoint: "\\\\.\\pipe\\environment-REDACTED-0123456789abcdef0123456789abcdef",
        scopeId: "launch-scope",
        REDACTED: REDACTED
      }
    });
    const observation = await controller.startObservation("project-1", "Codex local hook");
    const checkpoint = await controller.createCheckpoint("manual");

    expect(launchedEnvironments[0]).toMatchObject({
      ER_COMPANION_IPC_SCOPE: "launch-scope",
      ER_COMPANION_IPC_SECRET: Buffer.alloc(32, 7).toString("base64url")
    });
    expect(REDACTED).toEqual(new REDACTED(32));
    expect(observation.sessionId).toBe("session-real");
    expect(checkpoint).toMatchObject({ checkpointId: "checkpoint-real", localSequence: 2 });
    expect(connectCount).toBe(2);
    expect(requests).toEqual([
      {
        payload: { projectId: "project-1", providerSurface: "Codex local hook" },
        type: "observation.start"
      },
      { payload: { reason: "manual" }, type: "checkpoint.create" }
    ]);
  });
});

function manifestBytes(binary: Buffer): Buffer {
  return Buffer.from(
    JSON.stringify({
      entries: [
        {
          architecture: "x64",
          platform: "linux",
          relativePath: "bin/linux/x64/environment-REDACTED-companion",
          sha256: createHash("sha256").update(binary).digest("hex")
        }
      ],
      schemaVersion: 1
    })
  );
}

function coveredFixture() {
  return {
    adapters: [],
    generatedAtEpochSeconds: 500,
    permission: {
      condition: "covered",
      gaps: [],
      grantedCapabilities: [],
      profile: "repository_scoped"
    },
    provider: {
      capabilities: [],
      condition: "covered",
      gaps: [],
      providerId: "codex",
      sessionBoundary: "automatic",
      surface: "Codex local hook"
    },
    realms: [],
    upload: { gaps: [], state: "online" }
  } as const;
}
