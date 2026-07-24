import type {
  DaytonaPort,
  DaytonaSandboxReference,
  ExternalOperationContext,
  Sha256Digest
} from "@environment-reconciler/integrations/ports";

import type { DemoSponsorRunExecutor, DemoSponsorRunResponse } from "./routes.js";

const RUN_TIMEOUT_MS = 90_000;
type DemoDaytonaPort = Pick<DaytonaPort, "deleteSandbox" | "executeCommand" | "provisionSandbox">;

export interface DemoTraceExportInput {
  readonly commandPassed: boolean;
  readonly durationMs: number;
  readonly organizationPseudonym: Sha256Digest;
  readonly projectPseudonym: Sha256Digest;
  readonly runDigest: Sha256Digest;
  readonly traceId: string;
}

export interface DemoTraceExporter {
  export(input: DemoTraceExportInput): Promise<"deferred" | "exported">;
}

export class RuntimeDemoSponsorRunExecutor implements DemoSponsorRunExecutor {
  readonly #daytona: DemoDaytonaPort;
  readonly #fireworksConfigured: boolean;
  readonly #now: () => number;
  readonly #traces: DemoTraceExporter;

  constructor(
    daytona: DemoDaytonaPort,
    traces: DemoTraceExporter,
    fireworksConfigured: boolean,
    now: () => number = Date.now
  ) {
    this.#daytona = daytona;
    this.#traces = traces;
    this.#fireworksConfigured = fireworksConfigured;
    this.#now = now;
  }

  async run(input: { readonly signal: AbortSignal }): Promise<DemoSponsorRunResponse> {
    const runId = crypto.randomUUID();
    const startedAtMs = this.#now();
    const runDigest = await digest(`demo-run:${runId}`);
    const organizationPseudonym = await digest("demo-organization");
    const projectPseudonym = await digest("demo-project");
    let sandbox: DaytonaSandboxReference | undefined;
    let sandboxCreated = false;
    let commandPassed = false;
    let cleanupConfirmed = false;
    let timedOut = false;

    try {
      throwIfAborted(input.signal);
      const provisioned = await abortable(
        this.#daytona.provisionSandbox({
          autoDeleteAfterSeconds: 300,
          context: operationContext(`${runId}:provision`, runDigest, 45_000),
          labels: [
            { key: "operation-key", value: `${runId}:provision` },
            { key: "organization-pseudonym", value: organizationPseudonym },
            { key: "project-pseudonym", value: projectPseudonym },
            { key: "run-pseudonym", value: runDigest },
            { key: "target-digest", value: runDigest }
          ],
          maxProvisioningTimeMs: 45_000,
          target: {
            architecture: "amd64",
            cpuCores: 1,
            diskMiB: 3_072,
            imageDigest: runDigest,
            imageReference: "daytona-default",
            memoryMiB: 1_024,
            operatingSystem: "linux"
          }
        }),
        input.signal
      );
      sandbox = provisioned.sandbox;
      sandboxCreated = true;
      const command = await abortable(
        this.#daytona.executeCommand({
          arguments: ["--version"],
          context: operationContext(`${runId}:command`, runDigest, 15_000),
          executable: "node",
          maxOutputBytes: 256,
          networkPolicy: { allowedHostDigests: [], mode: "deny-all" },
          sandbox,
          secretBindings: [],
          timeoutMs: 15_000,
          workingDirectory: "/home/daytona"
        }),
        input.signal
      );
      commandPassed = command.exitCode === 0 && !command.timedOut;
      timedOut = command.timedOut;
    } catch {
      timedOut = input.signal.aborted;
    } finally {
      if (sandbox !== undefined) {
        try {
          cleanupConfirmed = (
            await this.#daytona.deleteSandbox({
              context: operationContext(`${runId}:cleanup`, runDigest, 20_000),
              expectedRunDigest: runDigest,
              maxCleanupTimeMs: 20_000,
              reasonCode: commandPassed ? "completed" : "failed",
              sandbox
            })
          ).deleted;
        } catch {
          cleanupConfirmed = false;
        }
      }
    }

    const durationMs = boundedDuration(this.#now() - startedAtMs);
    const daytonaStatus = timedOut
      ? "timed_out"
      : !cleanupConfirmed && sandboxCreated
        ? "cleanup_failed"
        : commandPassed && cleanupConfirmed
          ? "succeeded"
          : "failed";
    const braintrustStatus = timedOut
      ? "deferred"
      : await this.#traces
          .export({
            commandPassed,
            durationMs,
            organizationPseudonym,
            projectPseudonym,
            runDigest,
            traceId: runId
          })
          .catch(() => "deferred" as const);
    const overall =
      daytonaStatus === "timed_out"
        ? "timed_out"
        : daytonaStatus !== "succeeded"
          ? "failed"
          : braintrustStatus === "exported"
            ? "succeeded"
            : "partial";

    return {
      braintrust: { status: braintrustStatus, traceId: runId },
      daytona: {
        cleanupConfirmed,
        commandPassed,
        durationMs,
        sandboxCreated,
        status: daytonaStatus
      },
      fireworks: {
        reason: this.#fireworksConfigured
          ? "live_generation_not_required_for_probe"
          : "credential_unavailable",
        status: "unavailable"
      },
      overall,
      runId
    };
  }
}

function operationContext(
  operationKey: string,
  requestDigest: Sha256Digest,
  timeoutMs: number
): ExternalOperationContext {
  return {
    attemptNumber: 1,
    budget: { maxAttempts: 1, timeoutMs },
    operationKey,
    requestDigest
  };
}

async function digest(value: string): Promise<Sha256Digest> {
  const bytes = new TextEncoder().encode(value);
  const result = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return `sha256:${[...result].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new Error("demo_timeout");
  return new Promise<T>((resolve, reject) => {
    const aborted = (): void => reject(new Error("demo_timeout"));
    signal.addEventListener("abort", aborted, { once: true });
    void operation
      .finally(() => signal.removeEventListener("abort", aborted))
      .then(resolve, reject);
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new Error("demo_timeout");
}

function boundedDuration(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(RUN_TIMEOUT_MS, Math.round(value))) : 0;
}
