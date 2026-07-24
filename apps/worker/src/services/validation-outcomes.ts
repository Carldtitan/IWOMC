import type { Sha256Digest } from "@environment-reconciler/integrations/ports";

export type TargetExecutionOutcome =
  | "passed"
  | "project_or_candidate_failed"
  | "unsupported_target_or_capability"
  | "timed_out"
  | "security_blocked"
  | "infrastructure_failed"
  | "resource_budget_failed"
  | "inconclusive";

export interface RequiredTargetValidationResult {
  readonly cleanupStatus: "deleted" | "cleanup_failed";
  readonly outcome: TargetExecutionOutcome;
  readonly targetDigest: Sha256Digest;
  readonly targetId: string;
}

export interface ValidationAttestationBinding {
  readonly attestationDigest: Sha256Digest;
  readonly behaviorContractDigest: Sha256Digest;
  readonly candidatePatchDigest: Sha256Digest;
  readonly fresh: boolean;
  readonly policyDigest: Sha256Digest;
  readonly sourceInputDigest: Sha256Digest;
  readonly targets: readonly {
    readonly targetDigest: Sha256Digest;
    readonly targetId: string;
  }[];
}

export interface ValidationOutcomeFacts {
  readonly acceptedBehaviorContract: boolean;
  readonly attestation?: ValidationAttestationBinding;
  readonly behaviorContractDigest: Sha256Digest;
  readonly candidatePatchDigest: Sha256Digest;
  readonly policyDigest: Sha256Digest;
  readonly requiredTargetIds: readonly string[];
  readonly sourceInput: {
    readonly digest: Sha256Digest;
    readonly fresh: boolean;
  };
  readonly targetResults: readonly RequiredTargetValidationResult[];
}

export type NonVerifiedValidationOutcome =
  | "project_or_candidate_failed"
  | "unsupported_target_or_capability"
  | "timed_out"
  | "security_blocked"
  | "infrastructure_failed"
  | "resource_budget_failed"
  | "inconclusive"
  | "cleanup_failed";

export type ClassifiedValidationOutcome =
  | {
      readonly affectedTargetIds: readonly string[];
      readonly reasonCode:
        | "attestation_binding_mismatch"
        | "attestation_missing"
        | "attestation_stale"
        | "behavior_contract_missing"
        | "cleanup_not_confirmed"
        | "no_required_targets"
        | "required_target_missing"
        | "source_stale"
        | "target_inconclusive"
        | "target_infrastructure_failed"
        | "target_project_or_candidate_failed"
        | "target_resource_budget_failed"
        | "target_security_blocked"
        | "target_timed_out"
        | "target_unsupported";
      readonly status: NonVerifiedValidationOutcome;
      readonly verified: false;
    }
  | {
      readonly attestationDigest: Sha256Digest;
      readonly status: "verified";
      readonly verified: true;
      readonly verifiedTargetIds: readonly string[];
    };

export class ValidationOutcomeFactsError extends Error {
  readonly code: "invalid_digest" | "invalid_target_identity" | "unknown_target_result";

  constructor(code: ValidationOutcomeFactsError["code"]) {
    super(code);
    this.name = "ValidationOutcomeFactsError";
    this.code = code;
  }
}

const OUTCOME_PRIORITY: readonly Exclude<TargetExecutionOutcome, "passed">[] = [
  "security_blocked",
  "unsupported_target_or_capability",
  "resource_budget_failed",
  "timed_out",
  "infrastructure_failed",
  "project_or_candidate_failed",
  "inconclusive"
];

/**
 * The only classifier allowed to emit `verified`. It is intentionally closed:
 * callers provide facts, never the desired terminal label.
 */
export function classifyValidationOutcome(
  facts: ValidationOutcomeFacts
): ClassifiedValidationOutcome {
  validateFacts(facts);
  const requiredTargetIds = [...facts.requiredTargetIds].sort();
  if (requiredTargetIds.length === 0) {
    return notVerified("inconclusive", "no_required_targets", []);
  }

  const resultsByTarget = new Map(
    facts.targetResults.map((result) => [result.targetId, result] as const)
  );
  const missingTargetIds = requiredTargetIds.filter((targetId) => !resultsByTarget.has(targetId));
  if (missingTargetIds.length > 0) {
    return notVerified("inconclusive", "required_target_missing", missingTargetIds);
  }

  const cleanupFailures = requiredTargetIds.filter(
    (targetId) => resultsByTarget.get(targetId)?.cleanupStatus !== "deleted"
  );
  if (cleanupFailures.length > 0) {
    return notVerified("cleanup_failed", "cleanup_not_confirmed", cleanupFailures);
  }
  if (!facts.acceptedBehaviorContract) {
    return notVerified("inconclusive", "behavior_contract_missing", requiredTargetIds);
  }
  if (!facts.sourceInput.fresh) {
    return notVerified("inconclusive", "source_stale", requiredTargetIds);
  }

  for (const outcome of OUTCOME_PRIORITY) {
    const affectedTargetIds = requiredTargetIds.filter(
      (targetId) => resultsByTarget.get(targetId)?.outcome === outcome
    );
    if (affectedTargetIds.length > 0) {
      return targetFailure(outcome, affectedTargetIds);
    }
  }

  const attestation = facts.attestation;
  if (attestation === undefined) {
    return notVerified("inconclusive", "attestation_missing", requiredTargetIds);
  }
  if (!attestation.fresh) {
    return notVerified("inconclusive", "attestation_stale", requiredTargetIds);
  }
  if (!attestationMatchesFacts(facts, attestation, requiredTargetIds)) {
    return notVerified("inconclusive", "attestation_binding_mismatch", requiredTargetIds);
  }

  return {
    attestationDigest: attestation.attestationDigest,
    status: "verified",
    verified: true,
    verifiedTargetIds: requiredTargetIds
  };
}

function targetFailure(
  outcome: Exclude<TargetExecutionOutcome, "passed">,
  targetIds: readonly string[]
): ClassifiedValidationOutcome {
  switch (outcome) {
    case "security_blocked":
      return notVerified("security_blocked", "target_security_blocked", targetIds);
    case "unsupported_target_or_capability":
      return notVerified("unsupported_target_or_capability", "target_unsupported", targetIds);
    case "resource_budget_failed":
      return notVerified("resource_budget_failed", "target_resource_budget_failed", targetIds);
    case "timed_out":
      return notVerified("timed_out", "target_timed_out", targetIds);
    case "infrastructure_failed":
      return notVerified("infrastructure_failed", "target_infrastructure_failed", targetIds);
    case "project_or_candidate_failed":
      return notVerified(
        "project_or_candidate_failed",
        "target_project_or_candidate_failed",
        targetIds
      );
    case "inconclusive":
      return notVerified("inconclusive", "target_inconclusive", targetIds);
  }
}

function notVerified(
  status: NonVerifiedValidationOutcome,
  reasonCode: Extract<ClassifiedValidationOutcome, { verified: false }>["reasonCode"],
  affectedTargetIds: readonly string[]
): ClassifiedValidationOutcome {
  return {
    affectedTargetIds: [...affectedTargetIds].sort(),
    reasonCode,
    status,
    verified: false
  };
}

function attestationMatchesFacts(
  facts: ValidationOutcomeFacts,
  attestation: ValidationAttestationBinding,
  requiredTargetIds: readonly string[]
): boolean {
  if (
    attestation.sourceInputDigest !== facts.sourceInput.digest ||
    attestation.candidatePatchDigest !== facts.candidatePatchDigest ||
    attestation.behaviorContractDigest !== facts.behaviorContractDigest ||
    attestation.policyDigest !== facts.policyDigest
  ) {
    return false;
  }
  const attestedTargets = [...attestation.targets].sort((left, right) =>
    left.targetId.localeCompare(right.targetId)
  );
  if (
    attestedTargets.length !== requiredTargetIds.length ||
    !attestedTargets.every((target, index) => target.targetId === requiredTargetIds[index])
  ) {
    return false;
  }
  const resultByTarget = new Map(
    facts.targetResults.map((result) => [result.targetId, result] as const)
  );
  return attestedTargets.every(
    (target) => resultByTarget.get(target.targetId)?.targetDigest === target.targetDigest
  );
}

function validateFacts(facts: ValidationOutcomeFacts): void {
  const digests: unknown[] = [
    facts.sourceInput.digest,
    facts.candidatePatchDigest,
    facts.behaviorContractDigest,
    facts.policyDigest,
    ...facts.targetResults.map((result) => result.targetDigest),
    ...(facts.attestation === undefined
      ? []
      : [
          facts.attestation.attestationDigest,
          facts.attestation.sourceInputDigest,
          facts.attestation.candidatePatchDigest,
          facts.attestation.behaviorContractDigest,
          facts.attestation.policyDigest,
          ...facts.attestation.targets.map((target) => target.targetDigest)
        ])
  ];
  if (!digests.every(isSha256Digest)) {
    throw new ValidationOutcomeFactsError("invalid_digest");
  }

  const requiredTargetIds = facts.requiredTargetIds;
  const resultTargetIds = facts.targetResults.map((result) => result.targetId);
  const attestedTargetIds = facts.attestation?.targets.map((target) => target.targetId) ?? [];
  if (
    [...requiredTargetIds, ...resultTargetIds, ...attestedTargetIds].some(
      (targetId) => targetId.trim().length === 0
    ) ||
    new Set(requiredTargetIds).size !== requiredTargetIds.length ||
    new Set(resultTargetIds).size !== resultTargetIds.length ||
    new Set(attestedTargetIds).size !== attestedTargetIds.length
  ) {
    throw new ValidationOutcomeFactsError("invalid_target_identity");
  }
  const required = new Set(requiredTargetIds);
  if (resultTargetIds.some((targetId) => !required.has(targetId))) {
    throw new ValidationOutcomeFactsError("unknown_target_result");
  }
}

function isSha256Digest(value: unknown): value is Sha256Digest {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
}
