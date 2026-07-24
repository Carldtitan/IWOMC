import type {
  DaytonaCommandResourceUsage,
  DaytonaPort,
  DaytonaSandboxLabel,
  DaytonaSandboxReference,
  DaytonaSandboxStatus,
  DaytonaSandboxTarget,
  DeleteDaytonaSandboxRequest,
  DeleteDaytonaSandboxResult,
  ExecuteDaytonaCommandRequest,
  ExecuteDaytonaCommandResult,
  FindDaytonaSandboxRequest,
  FindDaytonaSandboxResult,
  InspectDaytonaSandboxRequest,
  InspectDaytonaSandboxResult,
  ProvisionDaytonaSandboxRequest,
  ProvisionDaytonaSandboxResult,
  RedactedExcerpt,
  Sha256Digest
} from "@environment-reconciler/integrations/ports";

import { DeterministicScenario, ScenarioFailure, utf8ByteLength } from "./scenario.js";

interface StoredDaytonaSandbox {
  readonly reference: DaytonaSandboxReference;
  readonly target: DaytonaSandboxTarget;
  readonly labels: readonly DaytonaSandboxLabel[];
  readonly provisionOperationKey: string;
  readonly runDigest: Sha256Digest;
  readonly autoDeleteAtMilliseconds: number;
  phase: DaytonaSandboxStatus["phase"];
  providerHealthy: boolean;
  guestReachable: boolean;
  failureClass: DaytonaSandboxStatus["failureClass"] | undefined;
  confirmedDeletedAt: string | undefined;
}

export interface ScriptedDaytonaCommandResult {
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly stdout: RedactedExcerpt;
  readonly stderr: RedactedExcerpt;
  readonly resourceUsage?: DaytonaCommandResourceUsage;
}

export interface FakeDaytonaOptions {
  readonly scenario?: DeterministicScenario;
  readonly provisionedPhase?: "provisioning" | "ready";
  readonly commandResults?: readonly ScriptedDaytonaCommandResult[];
}

type ProvisionValue = Omit<ProvisionDaytonaSandboxResult, "receipt">;
type FindValue = Omit<FindDaytonaSandboxResult, "receipt">;
type InspectValue = Omit<InspectDaytonaSandboxResult, "receipt">;
type ExecuteValue = Omit<ExecuteDaytonaCommandResult, "receipt">;
type DeleteValue = Omit<DeleteDaytonaSandboxResult, "receipt">;

export class FakeDaytona implements DaytonaPort {
  readonly scenario: DeterministicScenario;
  readonly #provisionedPhase: "provisioning" | "ready";
  readonly #sandboxes = new Map<string, StoredDaytonaSandbox>();
  readonly #sandboxIdsByProvisionOperation = new Map<string, string>();
  readonly #commandResults: ScriptedDaytonaCommandResult[] = [];

  constructor(options: FakeDaytonaOptions = {}) {
    this.scenario = options.scenario ?? new DeterministicScenario();
    this.#provisionedPhase = options.provisionedPhase ?? "ready";
    for (const result of options.commandResults ?? []) {
      this.enqueueCommandResult(result);
    }
  }

  enqueueCommandResult(result: ScriptedDaytonaCommandResult): void {
    this.#commandResults.push(cloneScriptedCommandResult(result));
  }

  async provisionSandbox(
    request: ProvisionDaytonaSandboxRequest
  ): Promise<ProvisionDaytonaSandboxResult> {
    validateTarget(request.target);
    assertPositiveSafeInteger(request.autoDeleteAfterSeconds, "autoDeleteAfterSeconds");
    assertPositiveSafeInteger(request.maxProvisioningTimeMs, "maxProvisioningTimeMs");
    const labelMap = validateLabels(request.labels, request.context.operationKey);
    const runDigest = labelMap.get("run-pseudonym");
    if (!isSha256Digest(runDigest)) {
      throw new ScenarioFailure("missing_run_label", "daytona.provisionSandbox");
    }

    const execution = await this.scenario.execute<ProvisionValue>({
      service: "daytona",
      operation: "provisionSandbox",
      context: request.context,
      perform: () => {
        if (this.#sandboxIdsByProvisionOperation.has(request.context.operationKey)) {
          throw new ScenarioFailure("provision_operation_conflict", "daytona.provisionSandbox");
        }
        const sandboxId = this.scenario.ids.generate();
        const reference: DaytonaSandboxReference = {
          sandboxId,
          providerResourceId: `fake-daytona://${sandboxId}`
        };
        const sandbox: StoredDaytonaSandbox = {
          reference,
          target: cloneTarget(request.target),
          labels: request.labels.map((label) => ({ ...label })),
          provisionOperationKey: request.context.operationKey,
          runDigest,
          autoDeleteAtMilliseconds:
            this.scenario.clock.now().getTime() + request.autoDeleteAfterSeconds * 1_000,
          phase: this.#provisionedPhase,
          providerHealthy: true,
          guestReachable: this.#provisionedPhase === "ready",
          failureClass: undefined,
          confirmedDeletedAt: undefined
        };
        this.#sandboxes.set(sandboxId, sandbox);
        this.#sandboxIdsByProvisionOperation.set(request.context.operationKey, sandboxId);
        return {
          value: {
            sandbox: { ...reference },
            created: true,
            status: this.#provisionedPhase
          },
          resultSummary: {
            sandboxId,
            created: true,
            status: this.#provisionedPhase,
            targetDigest: labelMap.get("target-digest") ?? null
          },
          providerResourceId: reference.providerResourceId
        };
      },
      clone: cloneProvisionValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async findSandboxByOperationKey(
    request: FindDaytonaSandboxRequest
  ): Promise<FindDaytonaSandboxResult> {
    if (request.provisionOperationKey.trim().length === 0) {
      throw new ScenarioFailure(
        "invalid_provision_operation_key",
        "daytona.findSandboxByOperationKey"
      );
    }
    const execution = await this.scenario.execute<FindValue>({
      service: "daytona",
      operation: "findSandboxByOperationKey",
      context: request.context,
      perform: () => {
        const sandboxId = this.#sandboxIdsByProvisionOperation.get(request.provisionOperationKey);
        const stored = sandboxId === undefined ? undefined : this.#sandboxes.get(sandboxId);
        const sandbox = stored === undefined ? null : { ...stored.reference };
        return {
          value: { sandbox },
          resultSummary:
            sandbox === null ? { found: false } : { found: true, sandboxId: sandbox.sandboxId },
          ...(sandbox === null ? {} : { providerResourceId: sandbox.providerResourceId })
        };
      },
      clone: cloneFindValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async inspectSandbox(
    request: InspectDaytonaSandboxRequest
  ): Promise<InspectDaytonaSandboxResult> {
    const execution = await this.scenario.execute<InspectValue>({
      service: "daytona",
      operation: "inspectSandbox",
      context: request.context,
      perform: async () => {
        const sandbox = this.#requireSandbox(request.sandbox, "daytona.inspectSandbox");
        this.#applyAutomaticDeletion(sandbox);
        const status = await this.#status(sandbox);
        return {
          value: { status },
          resultSummary: {
            sandboxId: sandbox.reference.sandboxId,
            phase: status.phase,
            providerHealthy: status.providerHealthy,
            guestReachable: status.guestReachable,
            statusDigest: status.statusDigest
          },
          providerResourceId: sandbox.reference.providerResourceId
        };
      },
      clone: cloneInspectValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async executeCommand(
    request: ExecuteDaytonaCommandRequest
  ): Promise<ExecuteDaytonaCommandResult> {
    validateCommandRequest(request);
    const execution = await this.scenario.execute<ExecuteValue>({
      service: "daytona",
      operation: "executeCommand",
      context: request.context,
      perform: async () => {
        const sandbox = this.#requireSandbox(request.sandbox, "daytona.executeCommand");
        this.#applyAutomaticDeletion(sandbox);
        if (sandbox.phase !== "ready") {
          throw new ScenarioFailure("sandbox_not_ready", "daytona.executeCommand");
        }
        const scripted = this.#commandResults.shift();
        if (scripted === undefined) {
          throw new ScenarioFailure("unscripted_command", "daytona.executeCommand");
        }
        await this.#validateExcerpt(scripted.stdout);
        await this.#validateExcerpt(scripted.stderr);
        if (scripted.stdout.byteLength + scripted.stderr.byteLength > request.maxOutputBytes) {
          throw new ScenarioFailure("command_output_limit_exceeded", "daytona.executeCommand");
        }
        if (scripted.timedOut && scripted.exitCode !== null) {
          throw new ScenarioFailure("invalid_scripted_timeout", "daytona.executeCommand");
        }

        sandbox.phase = "busy";
        const commandId = this.scenario.ids.generate();
        sandbox.phase = "ready";
        const value: ExecuteValue = {
          commandId,
          exitCode: scripted.exitCode,
          timedOut: scripted.timedOut,
          stdout: { ...scripted.stdout },
          stderr: { ...scripted.stderr },
          resourceUsage: { ...(scripted.resourceUsage ?? { wallTimeMs: 0 }) }
        };
        return {
          value,
          resultSummary: {
            commandId,
            exitCode: value.exitCode,
            timedOut: value.timedOut,
            stdoutDigest: value.stdout.contentDigest,
            stderrDigest: value.stderr.contentDigest,
            wallTimeMs: value.resourceUsage.wallTimeMs
          },
          providerResourceId: sandbox.reference.providerResourceId,
          providerRequestId: commandId
        };
      },
      clone: cloneExecuteValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async deleteSandbox(request: DeleteDaytonaSandboxRequest): Promise<DeleteDaytonaSandboxResult> {
    assertPositiveSafeInteger(request.maxCleanupTimeMs, "maxCleanupTimeMs");
    const execution = await this.scenario.execute<DeleteValue>({
      service: "daytona",
      operation: "deleteSandbox",
      context: request.context,
      perform: () => {
        const sandbox = this.#requireSandbox(request.sandbox, "daytona.deleteSandbox");
        if (sandbox.runDigest !== request.expectedRunDigest) {
          throw new ScenarioFailure("run_digest_mismatch", "daytona.deleteSandbox");
        }
        if (sandbox.phase !== "deleted") {
          sandbox.phase = "deleting";
          sandbox.providerHealthy = true;
          sandbox.guestReachable = false;
          sandbox.phase = "deleted";
          sandbox.confirmedDeletedAt = this.scenario.clock.now().toISOString();
        }
        return {
          value: {
            deleted: true,
            ...(sandbox.confirmedDeletedAt === undefined
              ? {}
              : { confirmedAt: sandbox.confirmedDeletedAt })
          },
          resultSummary: {
            sandboxId: sandbox.reference.sandboxId,
            deleted: true,
            reasonCode: request.reasonCode,
            confirmedAt: sandbox.confirmedDeletedAt ?? null
          },
          providerResourceId: sandbox.reference.providerResourceId
        };
      },
      clone: cloneDeleteValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  setSandboxState(
    sandboxId: string,
    state: {
      readonly phase: DaytonaSandboxStatus["phase"];
      readonly providerHealthy?: boolean;
      readonly guestReachable?: boolean;
      readonly failureClass?: DaytonaSandboxStatus["failureClass"];
    }
  ): void {
    const sandbox = this.#sandboxes.get(sandboxId);
    if (sandbox === undefined) {
      throw new ScenarioFailure("sandbox_not_found", "daytona.setSandboxState");
    }
    sandbox.phase = state.phase;
    sandbox.providerHealthy = state.providerHealthy ?? sandbox.providerHealthy;
    sandbox.guestReachable = state.guestReachable ?? sandbox.guestReachable;
    sandbox.failureClass = state.failureClass;
  }

  #requireSandbox(reference: DaytonaSandboxReference, point: string): StoredDaytonaSandbox {
    const sandbox = this.#sandboxes.get(reference.sandboxId);
    if (sandbox?.reference.providerResourceId !== reference.providerResourceId) {
      throw new ScenarioFailure("sandbox_not_found", point);
    }
    return sandbox;
  }

  #applyAutomaticDeletion(sandbox: StoredDaytonaSandbox): void {
    if (
      sandbox.phase !== "deleted" &&
      this.scenario.clock.now().getTime() >= sandbox.autoDeleteAtMilliseconds
    ) {
      sandbox.phase = "deleted";
      sandbox.guestReachable = false;
      sandbox.confirmedDeletedAt = this.scenario.clock.now().toISOString();
    }
  }

  async #status(sandbox: StoredDaytonaSandbox): Promise<DaytonaSandboxStatus> {
    const observedAt = this.scenario.clock.now().toISOString();
    const statusDigest = await this.scenario.hasher.hashCanonicalJson({
      sandboxId: sandbox.reference.sandboxId,
      phase: sandbox.phase,
      providerHealthy: sandbox.providerHealthy,
      guestReachable: sandbox.guestReachable,
      observedAt,
      failureClass: sandbox.failureClass ?? null
    });
    return {
      phase: sandbox.phase,
      providerHealthy: sandbox.providerHealthy,
      guestReachable: sandbox.guestReachable,
      observedAt,
      statusDigest,
      ...(sandbox.failureClass === undefined ? {} : { failureClass: sandbox.failureClass })
    };
  }

  async #validateExcerpt(excerpt: RedactedExcerpt): Promise<void> {
    if (
      excerpt.redactionPolicyVersion.trim().length === 0 ||
      utf8ByteLength(excerpt.text) !== excerpt.byteLength
    ) {
      throw new ScenarioFailure("invalid_redacted_excerpt", "daytona.executeCommand");
    }
    const actualDigest = await this.scenario.hasher.hashText(excerpt.text);
    if (actualDigest !== excerpt.contentDigest) {
      throw new ScenarioFailure("excerpt_digest_mismatch", "daytona.executeCommand");
    }
  }
}

function validateTarget(target: DaytonaSandboxTarget): void {
  if (target.imageReference.trim().length === 0) {
    throw new ScenarioFailure("invalid_image_reference", "daytona.provisionSandbox");
  }
  assertPositiveSafeInteger(target.cpuCores, "cpuCores");
  assertPositiveSafeInteger(target.memoryMiB, "memoryMiB");
  assertPositiveSafeInteger(target.diskMiB, "diskMiB");
}

function validateLabels(
  labels: readonly DaytonaSandboxLabel[],
  operationKey: string
): Map<DaytonaSandboxLabel["key"], string> {
  const required = [
    "operation-key",
    "organization-pseudonym",
    "project-pseudonym",
    "run-pseudonym",
    "target-digest"
  ] as const;
  const map = new Map<DaytonaSandboxLabel["key"], string>();
  for (const label of labels) {
    if (map.has(label.key)) {
      throw new ScenarioFailure("duplicate_sandbox_label", "daytona.provisionSandbox");
    }
    map.set(label.key, label.value);
  }
  if (required.some((key) => !map.has(key)) || map.get("operation-key") !== operationKey) {
    throw new ScenarioFailure("invalid_sandbox_labels", "daytona.provisionSandbox");
  }
  return map;
}

function validateCommandRequest(request: ExecuteDaytonaCommandRequest): void {
  if (
    request.executable.trim().length === 0 ||
    !request.workingDirectory.startsWith("/") ||
    request.workingDirectory.split("/").includes("..")
  ) {
    throw new ScenarioFailure("invalid_command", "daytona.executeCommand");
  }
  assertPositiveSafeInteger(request.timeoutMs, "timeoutMs");
  assertPositiveSafeInteger(request.maxOutputBytes, "maxOutputBytes");
  const targetNames = new Set<string>();
  for (const binding of request.secretBindings) {
    if (!/^[A-Z_][A-Z0-9_]*$/u.test(binding.targetName) || targetNames.has(binding.targetName)) {
      throw new ScenarioFailure("invalid_secret_binding", "daytona.executeCommand");
    }
    targetNames.add(binding.targetName);
  }
}

function assertPositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ScenarioFailure("invalid_numeric_parameter", name);
  }
}

function isSha256Digest(value: string | undefined): value is Sha256Digest {
  return value?.startsWith("sha256:") === true;
}

function cloneTarget(value: DaytonaSandboxTarget): DaytonaSandboxTarget {
  return { ...value };
}

function cloneProvisionValue(value: ProvisionValue): ProvisionValue {
  return { ...value, sandbox: { ...value.sandbox } };
}

function cloneFindValue(value: FindValue): FindValue {
  return { sandbox: value.sandbox === null ? null : { ...value.sandbox } };
}

function cloneInspectValue(value: InspectValue): InspectValue {
  return { status: { ...value.status } };
}

function cloneExecuteValue(value: ExecuteValue): ExecuteValue {
  return {
    ...value,
    stdout: { ...value.stdout },
    stderr: { ...value.stderr },
    resourceUsage: { ...value.resourceUsage }
  };
}

function cloneDeleteValue(value: DeleteValue): DeleteValue {
  return { ...value };
}

function cloneScriptedCommandResult(
  value: ScriptedDaytonaCommandResult
): ScriptedDaytonaCommandResult {
  return {
    ...value,
    stdout: { ...value.stdout },
    stderr: { ...value.stderr },
    ...(value.resourceUsage === undefined ? {} : { resourceUsage: { ...value.resourceUsage } })
  };
}
