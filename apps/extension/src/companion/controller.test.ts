import { describe, expect, it } from "vitest";

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
    expect(() => controller.start({ binaryPath: "/missing", dataDirectory: "/data" })).toThrowError(
      expect.objectContaining<Partial<CompanionError>>({ code: "missing_binary" })
    );
  });

  it("gracefully stops and force-kills only after the bounded timeout", async () => {
    const child = new FakeChild();
    const controller = new CompanionController({
      fileExists: () => true,
      launcher: () => child,
      shutdownTimeoutMilliseconds: 5
    });
    controller.start({ binaryPath: "/companion", dataDirectory: "/data" });

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
    controller.start({ binaryPath: "/companion", dataDirectory: "/data" });
    children[0]!.emitExit(1);

    controller.start({ binaryPath: "/companion", dataDirectory: "/data" });

    expect(controller.running).toBe(true);
    expect(nextChild).toBe(2);
  });
});
