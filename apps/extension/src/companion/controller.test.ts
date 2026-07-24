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
