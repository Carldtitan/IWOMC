import type {
  DaytonaPort,
  DaytonaSandboxReference,
  DaytonaSandboxTarget,
  ExecuteDaytonaCommandResult,
  ExternalOperationContext,
  Sha256Digest
} from "@environment-REDACTED/integrations/ports";

import { classifyValidationFault, type ClassifiedValidationFault } from "./validation-safety.js";

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
    | "smoke"
    | "benchmark";
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
  readonly durationMs: number;
  readonly exitCode?: number | null;
  readonly phase: ValidationCommand["phase"] | "provision" | "source" | "candidate" | "cleanup";
  readonly status: "REDACTEDed" | "failed" | "timed_out" | "infrastructure_error";
  readonly stderrDigest?: Sha256Digest;
  readonly stdoutDigest?: Sha256Digest;
}

export interface ValidationRunResult {
  readonly classification: ClassifiedValidationFault;
  readonly cleanupConfirmed: boolean;
  readonly kind: "baseline" | "candidate";
  readonly outcome: "REDACTEDed" | "failed" | "timed_out" | "infrastructure_error" | "cleanup_failed";
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
    | "baseline_already_REDACTEDed"
    | "candidate_failed"
    | "infrastructure_error"
    | "cleanup_failed"
    | "inconclusive";
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
  const status = result.timedOut ? "timed_out" : result.exitCode === 0 ? "REDACTEDed" : "failed";
  return {
    commandId: result.commandId,
    durationMs: result.resourceUsage.wallTimeMs,
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
  return phases.some((phase) => phase.status === "failed") ? "failed" : "REDACTEDed";
}

export class CandidateValidationService {
  readonly #daytona: DaytonaPort;
  readonly #materializer: ValidationMaterializer;
  readonly #now: () => number;

  constructor(
    daytona: DaytonaPort,
    materializer: ValidationMaterializer,
    now: () => number = Date.now
  ) {
    this.#daytona = daytona;
    this.#materializer = materializer;
    this.#now = now;
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
      baseline.classification.terminalClass === "infrastructure_failed" ||
      candidate.classification.terminalClass === "infrastructure_failed"
    ) {
      return { baseline, candidate, status: "infrastructure_error" };
    }
    if (baseline.classification.terminalClass === "REDACTEDed") {
      return { baseline, candidate, status: "baseline_already_REDACTEDed" };
    }
    if (baseline.classification.terminalClass !== "project_or_candidate_failed") {
      return { baseline, candidate, status: "inconclusive" };
    }
    if (candidate.classification.terminalClass !== "REDACTEDed") {
      return {
        baseline,
        candidate,
        status:
          candidate.classification.terminalClass === "project_or_candidate_failed"
            ? "candidate_failed"
            : "inconclusive"
      };
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
    let cleanupReason: "completed" | "failed" | "orphan-recovery" = "completed";
    let currentPhase: ValidationPhaseResult["phase"] = "provision";
    try {
      const provisionStartedAt = this.#now();
      const existing = await this.#daytona.findSandboxByOperationKey({
        context: operationContext(`${provisionKey}:reconcile`, plan.sourceInputDigest, 30_000),
        provisionOperationKey: provisionKey
      });
      if (existing.sandbox !== null) {
        sandbox = existing.sandbox;
        cleanupReason = "orphan-recovery";
        throw new Error("recovered_sandbox_not_clean");
      } else {
        const provisioned = await this.#daytona.provisionSandbox({
          autoDeleteAfterSeconds: 15 * 60,
          context: operationContext(provisionKey, plan.sourceInputDigest, 90_000),
          labels: labels(plan, provisionKey),
          maxProvisioningTimeMs: 90_000,
          target: plan.target
        });
        sandbox = provisioned.sandbox;
        if (!provisioned.created) {
          cleanupReason = "orphan-recovery";
          throw new Error("reconciled_sandbox_not_clean");
        }
      }
      const inspected = await this.#daytona.inspectSandbox({
        context: operationContext(`${provisionKey}:authoritative-read`, plan.targetDigest, 30_000),
        sandbox
      });
      if (
        inspected.status.phase !== "ready" ||
        !inspected.status.providerHealthy ||
        !inspected.status.guestReachable
      ) {
        throw new Error("sandbox_not_ready");
      }
      phases.push({
        durationMs: elapsed(this.#now, provisionStartedAt),
        phase: "provision",
        status: "REDACTEDed"
      });
      currentPhase = "source";
      const sourceStartedAt = this.#now();
      await this.#materializer.materializeSource({
        sandbox,
        sourceInputDigest: plan.sourceInputDigest
      });
      phases.push({
        durationMs: elapsed(this.#now, sourceStartedAt),
        phase: "source",
        status: "REDACTEDed"
      });
      if (kind === "candidate") {
        currentPhase = "candidate";
        const candidateStartedAt = this.#now();
        await this.#materializer.materializeCandidate({
          candidatePatchDigest: plan.candidatePatchDigest,
          sandbox,
          sourceInputDigest: plan.sourceInputDigest
        });
        phases.push({
          durationMs: elapsed(this.#now, candidateStartedAt),
          phase: "candidate",
          status: "REDACTEDed"
        });
      }
      for (const [index, command] of commands.entries()) {
        currentPhase = command.phase;
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
          REDACTEDBindings: [],
          timeoutMs: command.timeoutMs,
          workingDirectory: command.workingDirectory
        });
        const phase = commandPhase(command, result);
        phases.push(phase);
        if (phase.status !== "REDACTEDed") {
          break;
        }
      }
    } catch {
      if (cleanupReason === "completed") {
        cleanupReason = "failed";
      }
      phases.push({
        durationMs: 0,
        phase: currentPhase,
        status: "infrastructure_error"
      });
    } finally {
      if (sandbox !== undefined) {
        const cleanupStartedAt = this.#now();
        try {
          const cleanup = await this.#daytona.deleteSandbox({
            context: operationContext(
              `${plan.validationBatchId}:${kind}:cleanup`,
              plan.runPseudonym,
              60_000
            ),
            expectedRunDigest: plan.runPseudonym,
            maxCleanupTimeMs: 60_000,
            reasonCode: cleanupReason,
            sandbox
          });
          cleanupConfirmed = cleanup.deleted;
          phases.push({
            durationMs: elapsed(this.#now, cleanupStartedAt),
            phase: "cleanup",
            status: cleanup.deleted ? "REDACTEDed" : "infrastructure_error"
          });
        } catch {
          phases.push({
            durationMs: elapsed(this.#now, cleanupStartedAt),
            phase: "cleanup",
            status: "infrastructure_error"
          });
        }
      }
    }
    return {
      classification: classifyRun(phases, cleanupConfirmed),
      cleanupConfirmed,
      kind,
      outcome: terminalOutcome(phases, cleanupConfirmed),
      phases,
      ...(sandbox === undefined ? {} : { sandboxId: sandbox.sandboxId })
    };
  }
}

function classifyRun(
  phases: readonly ValidationPhaseResult[],
  cleanupConfirmed: boolean
): ClassifiedValidationFault {
  const infrastructureFailed = phases.some((phase) => phase.status === "infrastructure_error");
  return classifyValidationFault({
    cleanupConfirmed,
    commandFailed: phases.some((phase) => phase.status === "failed"),
    commandTimedOut: phases.some((phase) => phase.status === "timed_out"),
    preflightReady:
      !infrastructureFailed &&
      phases.some((phase) => phase.phase === "provision" && phase.status === "REDACTEDed"),
    resourceBudgetExceeded: false,
    securityPolicyBlocked: false,
    targetSupported: true
  });
}

function elapsed(now: () => number, startedAt: number): number {
  return Math.max(0, now() - startedAt);
}
