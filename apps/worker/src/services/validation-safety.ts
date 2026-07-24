import type { Sha256Digest } from "@environment-reconciler/integrations/ports";

export type ValidationTerminalClass =
  | "passed"
  | "project_or_candidate_failed"
  | "unsupported_target_or_capability"
  | "timed_out"
  | "security_blocked"
  | "infrastructure_failed"
  | "resource_budget_failed"
  | "inconclusive"
  | "cleanup_failed";

export interface InfrastructurePreflightFacts {
  readonly clockSkewMs: number;
  readonly deliveredCpuCores: number;
  readonly deliveredDiskMiB: number;
  readonly deliveredMemoryMiB: number;
  readonly dnsReachable: boolean;
  readonly guestReachable: boolean;
  readonly providerHealthy: boolean;
  readonly registryReachable: boolean;
  readonly repositoryReachable: boolean;
  readonly requiredCpuCores: number;
  readonly requiredDiskMiB: number;
  readonly requiredMemoryMiB: number;
  readonly targetCapabilityDelivered: boolean;
}

export type InfrastructurePreflightResult =
  | { readonly ready: true }
  | {
      readonly failureCodes: readonly (
        | "clock_skew"
        | "cpu_shortfall"
        | "disk_shortfall"
        | "dns_unreachable"
        | "guest_unreachable"
        | "memory_shortfall"
        | "provider_unhealthy"
        | "registry_unreachable"
        | "repository_unreachable"
        | "target_capability_missing"
      )[];
      readonly ready: false;
    };

export function assessInfrastructurePreflight(
  facts: InfrastructurePreflightFacts
): InfrastructurePreflightResult {
  const failures: Exclude<
    InfrastructurePreflightResult,
    { ready: true }
  >["failureCodes"][number][] = [];
  if (!facts.providerHealthy) failures.push("provider_unhealthy");
  if (!facts.guestReachable) failures.push("guest_unreachable");
  if (facts.deliveredCpuCores < facts.requiredCpuCores) failures.push("cpu_shortfall");
  if (facts.deliveredMemoryMiB < facts.requiredMemoryMiB) failures.push("memory_shortfall");
  if (facts.deliveredDiskMiB < facts.requiredDiskMiB) failures.push("disk_shortfall");
  if (!facts.dnsReachable) failures.push("dns_unreachable");
  if (!facts.repositoryReachable) failures.push("repository_unreachable");
  if (!facts.registryReachable) failures.push("registry_unreachable");
  if (Math.abs(facts.clockSkewMs) > 30_000) failures.push("clock_skew");
  if (!facts.targetCapabilityDelivered) failures.push("target_capability_missing");
  return failures.length === 0 ? { ready: true } : { failureCodes: failures, ready: false };
}

export interface ValidationFaultFacts {
  readonly cleanupConfirmed: boolean;
  readonly commandFailed: boolean;
  readonly commandTimedOut: boolean;
  readonly preflightReady: boolean;
  readonly resourceBudgetExceeded: boolean;
  readonly securityPolicyBlocked: boolean;
  readonly targetSupported: boolean;
  /**
   * A same-target control command ran in a fresh sandbox after the failure.
   * `undefined` means no valid canary result exists.
   */
  readonly controlCanaryPassed?: boolean;
}

export interface ClassifiedValidationFault {
  readonly origin: "cleanup" | "infrastructure" | "project" | "security" | "target" | "unknown";
  readonly originConfidence: "high" | "medium" | "low";
  readonly terminalClass: ValidationTerminalClass;
}

export function classifyValidationFault(facts: ValidationFaultFacts): ClassifiedValidationFault {
  if (!facts.cleanupConfirmed) {
    return { origin: "cleanup", originConfidence: "high", terminalClass: "cleanup_failed" };
  }
  if (facts.securityPolicyBlocked) {
    return { origin: "security", originConfidence: "high", terminalClass: "security_blocked" };
  }
  if (!facts.targetSupported) {
    return {
      origin: "target",
      originConfidence: "high",
      terminalClass: "unsupported_target_or_capability"
    };
  }
  if (facts.resourceBudgetExceeded) {
    return {
      origin: "infrastructure",
      originConfidence: "high",
      terminalClass: "resource_budget_failed"
    };
  }
  if (!facts.preflightReady || facts.controlCanaryPassed === false) {
    return {
      origin: "infrastructure",
      originConfidence: facts.controlCanaryPassed === false ? "high" : "medium",
      terminalClass: "infrastructure_failed"
    };
  }
  if (facts.commandTimedOut) {
    return facts.controlCanaryPassed === true
      ? { origin: "project", originConfidence: "medium", terminalClass: "timed_out" }
      : { origin: "unknown", originConfidence: "low", terminalClass: "inconclusive" };
  }
  if (facts.commandFailed) {
    return facts.controlCanaryPassed === true
      ? {
          origin: "project",
          originConfidence: "high",
          terminalClass: "project_or_candidate_failed"
        }
      : { origin: "unknown", originConfidence: "low", terminalClass: "inconclusive" };
  }
  return { origin: "project", originConfidence: "high", terminalClass: "passed" };
}

export interface SemanticValidationCacheIdentity {
  readonly adapterVersionDigest: Sha256Digest;
  readonly behaviorContractDigest: Sha256Digest;
  readonly candidatePatchDigest: Sha256Digest | "unchanged-baseline";
  readonly commandPlanDigest: Sha256Digest;
  readonly egressPolicyDigest: Sha256Digest;
  readonly immutableBaseDigest: Sha256Digest;
  readonly policyDigest: Sha256Digest;
  readonly registryIdentityDigests: readonly Sha256Digest[];
  readonly resourcePolicyDigest: Sha256Digest;
  readonly ruleVersionDigest: Sha256Digest;
  readonly runnerVersionDigest: Sha256Digest;
  readonly sourceInputDigest: Sha256Digest;
  readonly targetDigest: Sha256Digest;
}

export interface CanonicalDigestPort {
  hashCanonicalJson(value: unknown): Promise<Sha256Digest>;
}

export async function semanticValidationCacheKey(
  identity: SemanticValidationCacheIdentity,
  digests: CanonicalDigestPort
): Promise<Sha256Digest> {
  validateCacheIdentity(identity);
  return digests.hashCanonicalJson({
    ...identity,
    registryIdentityDigests: [...identity.registryIdentityDigests].sort()
  });
}

export interface ValidationCacheEntry {
  readonly artifactIntegrityChecked: boolean;
  readonly cacheKey: Sha256Digest;
  readonly completeAttestation: boolean;
  readonly finalProofUsedFreshSandbox: boolean;
  readonly immutableToolchain: boolean;
  readonly includesInstalledCandidateState: boolean;
  readonly terminalClass: ValidationTerminalClass;
}

export function isSafeValidationCacheEntry(entry: ValidationCacheEntry): boolean {
  return (
    isSha256Digest(entry.cacheKey) &&
    entry.artifactIntegrityChecked &&
    entry.completeAttestation &&
    entry.finalProofUsedFreshSandbox &&
    entry.immutableToolchain &&
    !entry.includesInstalledCandidateState &&
    entry.terminalClass === "passed"
  );
}

export interface ValidationScheduleBudget {
  readonly maxAttempts: number;
  readonly maxConcurrentPerRegistry: number;
  readonly maxConcurrentPerRepository: number;
  readonly maxConcurrentPerTarget: number;
  readonly maxConcurrentPerWorkspace: number;
  readonly maxEstimatedCostMilliCents: number;
  readonly maxWallTimeMs: number;
}

export interface ValidationScheduleFacts {
  readonly activeForRegistry: number;
  readonly activeForRepository: number;
  readonly activeForTarget: number;
  readonly activeForWorkspace: number;
  readonly attemptNumber: number;
  readonly elapsedMs: number;
  readonly estimatedCostMilliCents: number;
  readonly jobKeyAlreadyReserved: boolean;
  readonly reservedCostMilliCents: number;
}

export type ValidationScheduleDecision =
  | { readonly disposition: "acquire"; readonly costReservationMilliCents: number }
  | {
      readonly disposition: "defer";
      readonly reason:
        | "registry_concurrency"
        | "repository_concurrency"
        | "target_concurrency"
        | "workspace_concurrency";
    }
  | {
      readonly disposition: "reject";
      readonly reason: "attempt_budget" | "cost_budget" | "time_budget";
    }
  | { readonly disposition: "duplicate" };

export function decideValidationSchedule(
  facts: ValidationScheduleFacts,
  budget: ValidationScheduleBudget
): ValidationScheduleDecision {
  validateScheduleNumbers(facts, budget);
  if (facts.jobKeyAlreadyReserved) return { disposition: "duplicate" };
  if (facts.attemptNumber > budget.maxAttempts) {
    return { disposition: "reject", reason: "attempt_budget" };
  }
  if (facts.elapsedMs >= budget.maxWallTimeMs) {
    return { disposition: "reject", reason: "time_budget" };
  }
  if (
    facts.reservedCostMilliCents + facts.estimatedCostMilliCents >
    budget.maxEstimatedCostMilliCents
  ) {
    return { disposition: "reject", reason: "cost_budget" };
  }
  if (facts.activeForWorkspace >= budget.maxConcurrentPerWorkspace) {
    return { disposition: "defer", reason: "workspace_concurrency" };
  }
  if (facts.activeForRepository >= budget.maxConcurrentPerRepository) {
    return { disposition: "defer", reason: "repository_concurrency" };
  }
  if (facts.activeForTarget >= budget.maxConcurrentPerTarget) {
    return { disposition: "defer", reason: "target_concurrency" };
  }
  if (facts.activeForRegistry >= budget.maxConcurrentPerRegistry) {
    return { disposition: "defer", reason: "registry_concurrency" };
  }
  return {
    costReservationMilliCents: facts.estimatedCostMilliCents,
    disposition: "acquire"
  };
}

function validateCacheIdentity(identity: SemanticValidationCacheIdentity): void {
  const values = [
    identity.adapterVersionDigest,
    identity.behaviorContractDigest,
    identity.commandPlanDigest,
    identity.egressPolicyDigest,
    identity.immutableBaseDigest,
    identity.policyDigest,
    identity.resourcePolicyDigest,
    identity.ruleVersionDigest,
    identity.runnerVersionDigest,
    identity.sourceInputDigest,
    identity.targetDigest,
    ...identity.registryIdentityDigests
  ];
  if (
    (identity.candidatePatchDigest !== "unchanged-baseline" &&
      !isSha256Digest(identity.candidatePatchDigest)) ||
    values.some((value) => !isSha256Digest(value))
  ) {
    throw new Error("invalid_semantic_cache_identity");
  }
}

function validateScheduleNumbers(
  facts: ValidationScheduleFacts,
  budget: ValidationScheduleBudget
): void {
  const values = [
    facts.activeForRegistry,
    facts.activeForRepository,
    facts.activeForTarget,
    facts.activeForWorkspace,
    facts.attemptNumber,
    facts.elapsedMs,
    facts.estimatedCostMilliCents,
    facts.reservedCostMilliCents,
    budget.maxAttempts,
    budget.maxConcurrentPerRegistry,
    budget.maxConcurrentPerRepository,
    budget.maxConcurrentPerTarget,
    budget.maxConcurrentPerWorkspace,
    budget.maxEstimatedCostMilliCents,
    budget.maxWallTimeMs
  ];
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error("invalid_validation_schedule_budget");
  }
}

function isSha256Digest(value: string): value is Sha256Digest {
  return /^sha256:[a-f0-9]{64}$/u.test(value);
}
