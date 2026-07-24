import type {
  CandidateGenerationResult,
  CandidateReasoningPacket
} from "@environment-REDACTED/integrations";
import type {
  ExternalOperationContext,
  Sha256Digest
} from "@environment-REDACTED/integrations/ports";

export interface GenerateCandidateWorkItem {
  readonly checkpointId: string;
  readonly findingId: string;
  readonly idempotencyKey: string;
  readonly projectId: string;
  readonly workspaceId: string;
}

export interface PersistedAcceptedFinding {
  readonly checkpointId: string;
  readonly findingId: string;
  readonly projectId: string;
  readonly reasoningPacket: CandidateReasoningPacket;
  readonly reasoningPacketDigest: Sha256Digest;
  readonly workspaceId: string;
}

export interface AcceptedCandidateCompletion {
  readonly kind: "accepted";
  readonly candidateDigest: Sha256Digest;
  readonly candidateId: string;
  readonly findingId: string;
  readonly source: CandidateGenerationResult["source"];
  readonly validationBatchId: string;
  readonly validationWorkflowIdempotencyKey: string;
}

export interface RejectedCandidateCompletion {
  readonly kind: "rejected";
  readonly failureCode: string;
  readonly findingId: string;
}

export type CandidateGenerationCompletion =
  AcceptedCandidateCompletion | RejectedCandidateCompletion;

export type CandidateGenerationReservation =
  | {
      readonly disposition: "execute";
      readonly attemptNumber: number;
      readonly externalOperationId: string;
    }
  | {
      readonly disposition: "in_progress";
    }
  | {
      readonly completion: CandidateGenerationCompletion;
      readonly disposition: "completed";
    };

export interface CandidateGenerationPersistence {
  loadAcceptedFinding(input: {
    readonly checkpointId: string;
    readonly findingId: string;
    readonly projectId: string;
    readonly workspaceId: string;
  }): Promise<PersistedAcceptedFinding | undefined>;

  /**
   * Implementations must atomically reserve/claim the Fireworks external
   * operation and append the supplied audit event before returning `execute`.
   * A concurrent claimant receives `in_progress`; a replay receives the
   * durable completion.
   */
  reserveCandidateGeneration(input: {
    readonly audit: {
      readonly action: "candidate_generation_reserved";
      readonly idempotencyKey: string;
      readonly objectDigest: Sha256Digest;
      readonly objectId: string;
      readonly objectType: "finding";
    };
    readonly findingId: string;
    readonly operationKey: string;
    readonly projectId: string;
    readonly provider: "fireworks";
    readonly requestFingerprint: Sha256Digest;
    readonly workspaceId: string;
  }): Promise<CandidateGenerationReservation>;

  completeAcceptedGeneration(input: {
    readonly externalOperationId: string;
    readonly generation: CandidateGenerationResult;
    readonly operationKey: string;
    readonly projectId: string;
    readonly workspaceId: string;
  }): Promise<AcceptedCandidateCompletion>;

  completeRejectedGeneration(input: {
    readonly externalOperationId: string;
    readonly failureCode: string;
    readonly findingId: string;
    readonly operationKey: string;
    readonly projectId: string;
    readonly workspaceId: string;
  }): Promise<RejectedCandidateCompletion>;
}

export interface CandidateValidationStarter {
  start(input: {
    readonly candidateId: string;
    readonly idempotencyKey: string;
    readonly validationBatchId: string;
  }): Promise<void>;
}

export interface CandidateGenerationEngine {
  generate(
    packet: CandidateReasoningPacket,
    context: ExternalOperationContext
  ): Promise<CandidateGenerationResult>;
}

export interface CandidateGenerationServiceConfiguration {
  readonly maximumAttempts: number;
  readonly timeoutMs: number;
}

export type GenerateCandidateServiceResult =
  | {
      readonly completion: AcceptedCandidateCompletion;
      readonly status: "generated" | "replayed";
    }
  | {
      readonly status: "in_progress";
    }
  | {
      readonly completion: RejectedCandidateCompletion;
      readonly replayed: boolean;
      readonly status: "rejected";
    };

export class GenerateCandidateServiceError extends Error {
  readonly code:
    | "accepted_finding_not_found"
    | "finding_identity_mismatch"
    | "invalid_configuration"
    | "invalid_work_item";

  constructor(code: GenerateCandidateServiceError["code"]) {
    super(code);
    this.name = "GenerateCandidateServiceError";
    this.code = code;
  }
}

/**
 * Orchestrates candidate generation without making model output authoritative.
 * The persistence port owns the atomic database transaction; the validation
 * starter owns an idempotent Workflow create using the persisted workflow key.
 * The engine supplied in production must be the integrations package's
 * guarded `generateCandidateWithDeterministicFallback` path.
 */
export class GenerateCandidateService {
  readonly #configuration: CandidateGenerationServiceConfiguration;
  readonly #engine: CandidateGenerationEngine;
  readonly #persistence: CandidateGenerationPersistence;
  readonly #validation: CandidateValidationStarter;

  constructor(
    engine: CandidateGenerationEngine,
    persistence: CandidateGenerationPersistence,
    validation: CandidateValidationStarter,
    configuration: CandidateGenerationServiceConfiguration
  ) {
    if (
      !Number.isSafeInteger(configuration.maximumAttempts) ||
      configuration.maximumAttempts < 1 ||
      configuration.maximumAttempts > 3 ||
      !Number.isSafeInteger(configuration.timeoutMs) ||
      configuration.timeoutMs < 1
    ) {
      throw new GenerateCandidateServiceError("invalid_configuration");
    }
    this.#engine = engine;
    this.#persistence = persistence;
    this.#validation = validation;
    this.#configuration = configuration;
  }

  async generate(workItem: GenerateCandidateWorkItem): Promise<GenerateCandidateServiceResult> {
    this.#validateWorkItem(workItem);
    const finding = await this.#persistence.loadAcceptedFinding({
      checkpointId: workItem.checkpointId,
      findingId: workItem.findingId,
      projectId: workItem.projectId,
      workspaceId: workItem.workspaceId
    });
    if (finding === undefined) {
      throw new GenerateCandidateServiceError("accepted_finding_not_found");
    }
    if (
      finding.checkpointId !== workItem.checkpointId ||
      finding.findingId !== workItem.findingId ||
      finding.projectId !== workItem.projectId ||
      finding.workspaceId !== workItem.workspaceId ||
      finding.reasoningPacket.finding.id !== workItem.findingId
    ) {
      throw new GenerateCandidateServiceError("finding_identity_mismatch");
    }

    const reservation = await this.#persistence.reserveCandidateGeneration({
      audit: {
        action: "candidate_generation_reserved",
        idempotencyKey: `${workItem.idempotencyKey}:audit:reserved`,
        objectDigest: finding.reasoningPacketDigest,
        objectId: finding.findingId,
        objectType: "finding"
      },
      findingId: finding.findingId,
      operationKey: workItem.idempotencyKey,
      projectId: finding.projectId,
      provider: "fireworks",
      requestFingerprint: finding.reasoningPacketDigest,
      workspaceId: finding.workspaceId
    });

    if (reservation.disposition === "in_progress") {
      return { status: "in_progress" };
    }
    if (reservation.disposition === "completed") {
      if (reservation.completion.kind === "rejected") {
        return {
          completion: reservation.completion,
          replayed: true,
          status: "rejected"
        };
      }
      await this.#startValidation(reservation.completion);
      return { completion: reservation.completion, status: "replayed" };
    }

    let generation: CandidateGenerationResult;
    try {
      generation = await this.#engine.generate(finding.reasoningPacket, {
        attemptNumber: reservation.attemptNumber,
        budget: {
          maxAttempts: this.#configuration.maximumAttempts,
          timeoutMs: this.#configuration.timeoutMs
        },
        operationKey: workItem.idempotencyKey,
        requestDigest: finding.reasoningPacketDigest
      });
    } catch (error: unknown) {
      const failureCode = knownGenerationFailureCode(error);
      if (failureCode === undefined) {
        throw error instanceof Error ? error : new Error("candidate_generation_failed");
      }
      const completion = await this.#persistence.completeRejectedGeneration({
        externalOperationId: reservation.externalOperationId,
        failureCode,
        findingId: finding.findingId,
        operationKey: workItem.idempotencyKey,
        projectId: finding.projectId,
        workspaceId: finding.workspaceId
      });
      return { completion, replayed: false, status: "rejected" };
    }

    const completion = await this.#persistence.completeAcceptedGeneration({
      externalOperationId: reservation.externalOperationId,
      generation,
      operationKey: workItem.idempotencyKey,
      projectId: finding.projectId,
      workspaceId: finding.workspaceId
    });
    await this.#startValidation(completion);
    return { completion, status: "generated" };
  }

  async #startValidation(completion: AcceptedCandidateCompletion): Promise<void> {
    await this.#validation.start({
      candidateId: completion.candidateId,
      idempotencyKey: completion.validationWorkflowIdempotencyKey,
      validationBatchId: completion.validationBatchId
    });
  }

  #validateWorkItem(workItem: GenerateCandidateWorkItem): void {
    if (
      workItem.checkpointId.trim().length === 0 ||
      workItem.findingId.trim().length === 0 ||
      workItem.idempotencyKey.trim().length === 0 ||
      workItem.projectId.trim().length === 0 ||
      workItem.workspaceId.trim().length === 0
    ) {
      throw new GenerateCandidateServiceError("invalid_work_item");
    }
  }
}

function knownGenerationFailureCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const value = error as { readonly code?: unknown; readonly name?: unknown };
  if (typeof value.code !== "string") {
    return undefined;
  }
  if (value.name === "CandidateGuardError" && CANDIDATE_GUARD_FAILURES.has(value.code)) {
    return `guard:${value.code}`;
  }
  if (value.name === "FireworksIntegrationError" && FIREWORKS_FAILURES.has(value.code)) {
    return `fireworks:${value.code}`;
  }
  return undefined;
}

const CANDIDATE_GUARD_FAILURES: ReadonlySet<string> = new Set([
  "ambiguous_evidence",
  "disallowed_dependency",
  "invented_evidence",
  "invented_finding",
  "invalid_packet",
  "invalid_structured_output",
  "manager_switch",
  "policy_violation",
  "prompt_injection_detected",
  "REDACTED_material_detected",
  "unknown_file",
  "unsupported_operation"
]);

const FIREWORKS_FAILURES: ReadonlySet<string> = new Set([
  "input_digest_mismatch",
  "invalid_configuration",
  "output_truncated",
  "provider_error",
  "provider_response_invalid",
  "request_too_large",
  "schema_digest_mismatch",
  "timeout",
  "unknown_response_schema",
  "unsafe_input"
]);
