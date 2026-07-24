import type {
  DaytonaPort,
  DaytonaSandboxReference,
  DaytonaSandboxTarget,
  ExecuteDaytonaCommandResult,
  ExternalOperationContext,
  Sha256Digest
} from "@environment-reconciler/integrations/ports";

export interface ValidationCommand {
  readonly arguments: readonly string[];
  readonly executable: string;
  readonly phase:
    | "preflight"
    | "resolve"
    | "install"
    | "graph"
    | "build"
    | "lint"
    | "typecheck"
    | "test"
    | "smoke";
  readonly timeoutMs: number;
  readonly workingDirectory: string;
}

export interface CandidateValidationPlan {
  readonly acceptedBehaviorContract: boolean;
  readonly baselineCommands: readonly ValidationCommand[];
  readonly behaviorContractDigest: Sha256Digest;
  readonly candidateCommands: readonly ValidationCommand[];
  readonly candidatePatchDigest: Sha256Digest;
  readonly policyDigest: Sha256Digest;
  readonly projectPseudonym: Sha256Digest;
  readonly runPseudonym: Sha256Digest;
  readonly sourceInputDigest: Sha256Digest;
  readonly target: DaytonaSandboxTarget;
  readonly targetDigest: Sha256Digest;
  readonly validationBatchId: string;
  readonly workspacePseudonym: Sha256Digest;
}

export interface ValidationMaterializer {
  materializeCandidate(input: {
    readonly candidatePatchDigest: Sha256Digest;
    readonly sandbox: DaytonaSandboxReference;
    readonly sourceInputDigest: Sha256Digest;
  }): Promise<void>;
  materializeSource(input: {
    readonly sandbox: DaytonaSandboxReference;
    readonly sourceInputDigest: Sha256Digest;
  }): Promise<void>;
}

export interface ValidationPhaseResult {
  readonly commandId?: string;
  readonly exitCode?: number | null;
  readonly phase: ValidationCommand["phase"] | "source" | "candidate" | "cleanup";
  readonly status: "passed" | "failed" | "timed_out" | "infrastructure_error";
  readonly stderrDigest?: Sha256Digest;
  readonly stdoutDigest?: Sha256Digest;
}

export interface ValidationRunResult {
  readonly cleanupConfirmed: boolean;
  readonly kind: "baseline" | "candidate";
  readonly outcome: "passed" | "failed" | "timed_out" | "infrastructure_error" | "cleanup_failed";
  readonly phases: readonly ValidationPhaseResult[];
  readonly sandboxId?: string;
}

export interface CandidateValidationResult {
  readonly attestation?: {
    readonly behaviorContractDigest: Sha256Digest;
    readonly candidatePatchDigest: Sha256Digest;
    readonly policyDigest: Sha256Digest;
    readonly sourceInputDigest: Sha256Digest;
    readonly targetDigest: Sha256Digest;
  };
  readonly baseline?: ValidationRunResult;
  readonly candidate?: ValidationRunResult;
  readonly status:
    | "verified"
    | "behavior_contract_missing"
    | "baseline_already_passed"
    | "candidate_failed"
    | "infrastructure_error"
    | "cleanup_failed";
}

function operationContext(
  operationKey: string,
  requestDigest: Sha256Digest,
  timeoutMs: number
): ExternalOperationContext {
  return {
    attemptNumber: 1,
    budget: { maxAttempts: 2, timeoutMs },
    operationKey,
    requestDigest
  };
}

function labels(plan: CandidateValidationPlan, operationKey: string) {
  return [
    { key: "operation-key" as const, value: operationKey },
    { key: "organization-pseudonym" as const, value: plan.workspacePseudonym },
    { key: "project-pseudonym" as const, value: plan.projectPseudonym },
    { key: "run-pseudonym" as const, value: plan.runPseudonym },
    { key: "target-digest" as const, value: plan.targetDigest }
  ];
}

function commandPhase(
  command: ValidationCommand,
  result: ExecuteDaytonaCommandResult
): ValidationPhaseResult {
  const status = result.timedOut ? "timed_out" : result.exitCode === 0 ? "passed" : "failed";
  return {
    commandId: result.commandId,
    exitCode: result.exitCode,
    phase: command.phase,
    status,
    stderrDigest: result.stderr.contentDigest,
    stdoutDigest: result.stdout.contentDigest
  };
}

function terminalOutcome(
  phases: readonly ValidationPhaseResult[],
  cleanupConfirmed: boolean
): ValidationRunResult["outcome"] {
  if (!cleanupConfirmed) {
    return "cleanup_failed";
  }
  if (phases.some((phase) => phase.status === "infrastructure_error")) {
    return "infrastructure_error";
  }
  if (phases.some((phase) => phase.status === "timed_out")) {
    return "timed_out";
  }
  return phases.some((phase) => phase.status === "failed") ? "failed" : "passed";
}

export class CandidateValidationService {
  readonly #daytona: DaytonaPort;
  readonly #materializer: ValidationMaterializer;

  constructor(daytona: DaytonaPort, materializer: ValidationMaterializer) {
    this.#daytona = daytona;
    this.#materializer = materializer;
  }

  async validate(plan: CandidateValidationPlan): Promise<CandidateValidationResult> {
    if (!plan.acceptedBehaviorContract) {
      return { status: "behavior_contract_missing" };
    }
    const [baseline, candidate] = await Promise.all([
      this.#run(plan, "baseline", plan.baselineCommands),
      this.#run(plan, "candidate", plan.candidateCommands)
    ]);
    if (!baseline.cleanupConfirmed || !candidate.cleanupConfirmed) {
      return { baseline, candidate, status: "cleanup_failed" };
    }
    if (
      baseline.outcome === "infrastructure_error" ||
      candidate.outcome === "infrastructure_error"
    ) {
      return { baseline, candidate, status: "infrastructure_error" };
    }
    if (baseline.outcome === "passed") {
      return { baseline, candidate, status: "baseline_already_passed" };
    }
    if (candidate.outcome !== "passed") {
      return { baseline, candidate, status: "candidate_failed" };
    }
    return {
      attestation: {
        behaviorContractDigest: plan.behaviorContractDigest,
        candidatePatchDigest: plan.candidatePatchDigest,
        policyDigest: plan.policyDigest,
        sourceInputDigest: plan.sourceInputDigest,
        targetDigest: plan.targetDigest
      },
      baseline,
      candidate,
      status: "verified"
    };
  }

  async #run(
    plan: CandidateValidationPlan,
    kind: ValidationRunResult["kind"],
    commands: readonly ValidationCommand[]
  ): Promise<ValidationRunResult> {
    const phases: ValidationPhaseResult[] = [];
    const provisionKey = `${plan.validationBatchId}:${kind}:provision`;
    let sandbox: DaytonaSandboxReference | undefined;
    let cleanupConfirmed = false;
    try {
      const provisioned = await this.#daytona.provisionSandbox({
        autoDeleteAfterSeconds: 15 * 60,
        context: operationContext(provisionKey, plan.sourceInputDigest, 90_000),
        labels: labels(plan, provisionKey),
        maxProvisioningTimeMs: 90_000,
        target: plan.target
      });
      sandbox = provisioned.sandbox;
      await this.#materializer.materializeSource({
        sandbox,
        sourceInputDigest: plan.sourceInputDigest
      });
      phases.push({ phase: "source", status: "passed" });
      if (kind === "candidate") {
        await this.#materializer.materializeCandidate({
          candidatePatchDigest: plan.candidatePatchDigest,
          sandbox,
          sourceInputDigest: plan.sourceInputDigest
        });
        phases.push({ phase: "candidate", status: "passed" });
      }
      for (const [index, command] of commands.entries()) {
        const result = await this.#daytona.executeCommand({
          arguments: command.arguments,
          context: operationContext(
            `${plan.validationBatchId}:${kind}:${command.phase}:${index}`,
            kind === "candidate" ? plan.candidatePatchDigest : plan.sourceInputDigest,
            command.timeoutMs
          ),
          executable: command.executable,
          maxOutputBytes: 32 * 1_024,
          networkPolicy:
            command.phase === "resolve" || command.phase === "install"
              ? { allowedHostDigests: [], mode: "allowlist" }
              : { allowedHostDigests: [], mode: "deny-all" },
          sandbox,
          secretBindings: [],
          timeoutMs: command.timeoutMs,
          workingDirectory: command.workingDirectory
        });
        const phase = commandPhase(command, result);
        phases.push(phase);
        if (phase.status !== "passed") {
          break;
        }
      }
    } catch {
      phases.push({
        phase: phases.length === 0 ? "source" : "candidate",
        status: "infrastructure_error"
      });
    } finally {
      if (sandbox !== undefined) {
        try {
          const cleanup = await this.#daytona.deleteSandbox({
            context: operationContext(
              `${plan.validationBatchId}:${kind}:cleanup`,
              plan.runPseudonym,
              60_000
            ),
            expectedRunDigest: plan.runPseudonym,
            maxCleanupTimeMs: 60_000,
            reasonCode: "completed",
            sandbox
          });
          cleanupConfirmed = cleanup.deleted;
          phases.push({
            phase: "cleanup",
            status: cleanup.deleted ? "passed" : "infrastructure_error"
          });
        } catch {
          phases.push({ phase: "cleanup", status: "infrastructure_error" });
        }
      }
    }
    return {
      cleanupConfirmed,
      kind,
      outcome: terminalOutcome(phases, cleanupConfirmed),
      phases,
      ...(sandbox === undefined ? {} : { sandboxId: sandbox.sandboxId })
    };
  }
}
