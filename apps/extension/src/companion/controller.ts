import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

export type CompanionErrorCode = "already_running" | "missing_binary" | "spawn_failed";

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

const defaultLauncher: CompanionLauncher = (binaryPath, environment) =>
  spawn(binaryPath, [], {
    env: environment,
    stdio: "ignore",
    windowsHide: true
  });

export class CompanionController {
  readonly #fileExists: (path: string) => boolean;
  readonly #launcher: CompanionLauncher;
  readonly #shutdownTimeoutMilliseconds: number;
  #child: ManagedChild | undefined;

  constructor(options?: {
    readonly fileExists?: (path: string) => boolean;
    readonly launcher?: CompanionLauncher;
    readonly shutdownTimeoutMilliseconds?: number;
  }) {
    this.#fileExists = options?.fileExists ?? existsSync;
    this.#launcher = options?.launcher ?? defaultLauncher;
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
    let child: ManagedChild;
    try {
      child = this.#launcher(options.binaryPath, {
        ...process.env,
        ER_COMPANION_DATA_DIR: options.dataDirectory
      });
    } catch {
      throw new CompanionError("spawn_failed", "The Companion could not be started.");
    }
    this.#child = child;
    child.once("error", () => {
      if (this.#child === child) {
        this.#child = undefined;
      }
    });
    child.once("exit", () => {
      if (this.#child === child) {
        this.#child = undefined;
      }
    });
  }

  async stop(): Promise<void> {
    const child = this.#child;
    if (child?.exitCode !== null) {
      this.#child = undefined;
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
  }
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
