import type { Sha256Digest } from "@environment-reconciler/integrations/ports";

import type {
  CandidateValidationPlan,
  CandidateValidationResult,
  CandidateValidationService
} from "../services/validate-candidate.js";

export interface ValidateCandidateWorkflowInput {
  readonly candidateId: string;
  readonly plan: CandidateValidationPlan;
  readonly projectId: string;
  readonly reasoningTraceId: string;
  readonly validationTargetId: string;
  readonly workflowIdempotencyKey: string;
  readonly workspaceId: string;
}

export type ValidationTerminalSummaryClass = CandidateValidationResult["status"];

export type PersistedValidationCompletion =
  | {
      readonly attestation: {
        readonly attestationDigest: Sha256Digest;
        readonly attestationId: string;
      };
      readonly candidateId: string;
      readonly recommendation: {
        readonly recommendationId: string;
        readonly state: "reviewable";
      };
      readonly terminalSummaryClass: "verified";
      readonly validationBatchId: string;
    }
  | {
      readonly candidateId: string;
      readonly terminalSummaryClass: Exclude<ValidationTerminalSummaryClass, "verified">;
      readonly validationBatchId: string;
    };

export type OneTargetValidationReservation =
  | {
      readonly baselineJobId: string;
      readonly candidateJobId: string;
      readonly disposition: "execute";
    }
  | {
      readonly completion: PersistedValidationCompletion;
      readonly disposition: "completed";
    }
  | {
      readonly disposition: "in_progress";
    };

export interface OneTargetValidationPersistence {
  /**
   * Atomically creates/claims the batch plus separate baseline and candidate
   * jobs. Duplicate or concurrent Workflow deliveries must not create rows.
   */
  beginOneTargetValidation(input: {
    readonly baselineJobKey: string;
    readonly candidateId: string;
    readonly candidateJobKey: string;
    readonly projectId: string;
    readonly sourceInputDigest: Sha256Digest;
    readonly targetDigest: Sha256Digest;
    readonly validationBatchId: string;
    readonly validationTargetId: string;
    readonly workflowIdempotencyKey: string;
    readonly workspaceId: string;
  }): Promise<OneTargetValidationReservation>;

  /**
   * Atomically stores both run results, terminalizes the batch/candidate, and
   * creates an attestation plus reviewable recommendation only for `verified`.
   */
  completeOneTargetValidation(input: {
    readonly baselineJobId: string;
    readonly candidateId: string;
    readonly candidateJobId: string;
    readonly projectId: string;
    readonly result: CandidateValidationResult;
    readonly validationBatchId: string;
    readonly validationTargetId: string;
    readonly workflowIdempotencyKey: string;
    readonly workspaceId: string;
  }): Promise<PersistedValidationCompletion>;
}

export interface BraintrustValidationSummaryLinker {
  /**
   * Appends only the terminal summary class to the existing reasoning trace.
   * The implementation owns a durable outbox and deduplicates by this key.
   */
  appendTerminalSummary(input: {
    readonly idempotencyKey: string;
    readonly reasoningTraceId: string;
    readonly summaryClass: ValidationTerminalSummaryClass;
  }): Promise<void>;
}

export type ValidateCandidateWorkflowResult =
  | {
      readonly status: "in_progress";
    }
  | {
      readonly braintrustDelivery: "deferred" | "exported";
      readonly completion: PersistedValidationCompletion;
      readonly status: "completed" | "replayed";
    };

export class ValidateCandidateWorkflowError extends Error {
  readonly code:
    "invalid_input" | "persistence_identity_mismatch" | "persistence_terminal_mismatch";

  constructor(code: ValidateCandidateWorkflowError["code"]) {
    super(code);
    this.name = "ValidateCandidateWorkflowError";
    this.code = code;
  }
}

/**
 * First production one-target matrix orchestrator. Advanced caches, leases,
 * multi-target fan-out, and cancellation remain outside this MVP boundary.
 */
export class ValidateCandidateWorkflowOrchestrator {
  readonly #braintrust: BraintrustValidationSummaryLinker;
  readonly #persistence: OneTargetValidationPersistence;
  readonly #validator: Pick<CandidateValidationService, "validate">;

  constructor(
    validator: Pick<CandidateValidationService, "validate">,
    persistence: OneTargetValidationPersistence,
    braintrust: BraintrustValidationSummaryLinker
  ) {
    this.#validator = validator;
    this.#persistence = persistence;
    this.#braintrust = braintrust;
  }

  async run(input: ValidateCandidateWorkflowInput): Promise<ValidateCandidateWorkflowResult> {
    validateInput(input);
    const reservation = await this.#persistence.beginOneTargetValidation({
      baselineJobKey: `${input.workflowIdempotencyKey}:baseline:${input.plan.targetDigest}`,
      candidateId: input.candidateId,
      candidateJobKey: `${input.workflowIdempotencyKey}:candidate:${input.plan.targetDigest}`,
      projectId: input.projectId,
      sourceInputDigest: input.plan.sourceInputDigest,
      targetDigest: input.plan.targetDigest,
      validationBatchId: input.plan.validationBatchId,
      validationTargetId: input.validationTargetId,
      workflowIdempotencyKey: input.workflowIdempotencyKey,
      workspaceId: input.workspaceId
    });

    if (reservation.disposition === "in_progress") {
      return { status: "in_progress" };
    }
    if (reservation.disposition === "completed") {
      assertCompletionIdentity(input, reservation.completion);
      return {
        braintrustDelivery: await this.#linkSummaryBestEffort(input, reservation.completion),
        completion: reservation.completion,
        status: "replayed"
      };
    }

    const result = await this.#validator.validate(input.plan);
    const completion = await this.#persistence.completeOneTargetValidation({
      baselineJobId: reservation.baselineJobId,
      candidateId: input.candidateId,
      candidateJobId: reservation.candidateJobId,
      projectId: input.projectId,
      result,
      validationBatchId: input.plan.validationBatchId,
      validationTargetId: input.validationTargetId,
      workflowIdempotencyKey: input.workflowIdempotencyKey,
      workspaceId: input.workspaceId
    });
    assertCompletionIdentity(input, completion);
    if (completion.terminalSummaryClass !== result.status) {
      throw new ValidateCandidateWorkflowError("persistence_terminal_mismatch");
    }
    return {
      braintrustDelivery: await this.#linkSummaryBestEffort(input, completion),
      completion,
      status: "completed"
    };
  }

  async #linkSummaryBestEffort(
    input: ValidateCandidateWorkflowInput,
    completion: PersistedValidationCompletion
  ): Promise<"deferred" | "exported"> {
    try {
      await this.#braintrust.appendTerminalSummary({
        idempotencyKey: `${input.workflowIdempotencyKey}:braintrust:terminal-summary`,
        reasoningTraceId: input.reasoningTraceId,
        summaryClass: completion.terminalSummaryClass
      });
      return "exported";
    } catch {
      return "deferred";
    }
  }
}

function validateInput(input: ValidateCandidateWorkflowInput): void {
  if (
    input.candidateId.trim().length === 0 ||
    input.projectId.trim().length === 0 ||
    input.reasoningTraceId.trim().length === 0 ||
    input.validationTargetId.trim().length === 0 ||
    input.workflowIdempotencyKey.trim().length === 0 ||
    input.workspaceId.trim().length === 0 ||
    input.plan.validationBatchId.trim().length === 0
  ) {
    throw new ValidateCandidateWorkflowError("invalid_input");
  }
}

function assertCompletionIdentity(
  input: ValidateCandidateWorkflowInput,
  completion: PersistedValidationCompletion
): void {
  if (
    completion.candidateId !== input.candidateId ||
    completion.validationBatchId !== input.plan.validationBatchId
  ) {
    throw new ValidateCandidateWorkflowError("persistence_identity_mismatch");
  }
  if (
    completion.terminalSummaryClass === "verified" &&
    (completion.attestation.attestationId.length === 0 ||
      completion.attestation.attestationDigest.length === 0 ||
      completion.recommendation.recommendationId.length === 0)
  ) {
    throw new ValidateCandidateWorkflowError("persistence_terminal_mismatch");
  }
}
