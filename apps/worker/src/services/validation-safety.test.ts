import type { Sha256Digest } from "@environment-REDACTED/integrations/ports";
import { describe, expect, it } from "vitest";

import {
  assessInfrastructurePreflight,
  classifyValidationFault,
  decideValidationSchedule,
  isSafeValidationCacheEntry,
  semanticValidationCacheKey,
  type SemanticValidationCacheIdentity,
  type ValidationScheduleBudget
} from "./validation-safety.js";

const digest = (value: string): Sha256Digest => `sha256:${value.repeat(64)}`;

function cacheIdentity(): SemanticValidationCacheIdentity {
  return {
    adapterVersionDigest: digest("1"),
    behaviorContractDigest: digest("2"),
    candidatePatchDigest: digest("3"),
    commandPlanDigest: digest("4"),
    egressPolicyDigest: digest("5"),
    immutableBaseDigest: digest("6"),
    policyDigest: digest("7"),
    registryIdentityDigests: [digest("9"), digest("8")],
    resourcePolicyDigest: digest("a"),
    ruleVersionDigest: digest("b"),
    runnerVersionDigest: digest("c"),
    sourceInputDigest: digest("d"),
    targetDigest: digest("e")
  };
}

const budget: ValidationScheduleBudget = {
  maxAttempts: 2,
  maxConcurrentPerRegistry: 2,
  maxConcurrentPerRepository: 2,
  maxConcurrentPerTarget: 2,
  maxConcurrentPerWorkspace: 3,
  maxEstimatedCostMilliCents: 100,
  maxWallTimeMs: 60_000
};

describe("validation safety", () => {
  it("reports every failed infrastructure preflight dimension", () => {
    expect(
      assessInfrastructurePreflight({
        clockSkewMs: 31_000,
        deliveredCpuCores: 1,
        deliveredDiskMiB: 1,
        deliveredMemoryMiB: 1,
        dnsReachable: false,
        guestReachable: false,
        providerHealthy: false,
        registryReachable: false,
        repositoryReachable: false,
        requiredCpuCores: 2,
        requiredDiskMiB: 2,
        requiredMemoryMiB: 2,
        targetCapabilityDelivered: false
      })
    ).toMatchObject({
      failureCodes: [
        "provider_unhealthy",
        "guest_unreachable",
        "cpu_shortfall",
        "memory_shortfall",
        "disk_shortfall",
        "dns_unreachable",
        "repository_unreachable",
        "registry_unreachable",
        "clock_skew",
        "target_capability_missing"
      ],
      ready: false
    });
  });

  it("uses a REDACTEDing same-target canary to distinguish project and infrastructure failures", () => {
    const common = {
      cleanupConfirmed: true,
      commandTimedOut: false,
      preflightReady: true,
      resourceBudgetExceeded: false,
      securityPolicyBlocked: false,
      targetSupported: true
    };
    expect(
      classifyValidationFault({ ...common, commandFailed: true, controlCanaryPassed: true })
    ).toEqual({
      origin: "project",
      originConfidence: "high",
      terminalClass: "project_or_candidate_failed"
    });
    expect(
      classifyValidationFault({ ...common, commandFailed: true, controlCanaryPassed: false })
    ).toEqual({
      origin: "infrastructure",
      originConfidence: "high",
      terminalClass: "infrastructure_failed"
    });
    expect(classifyValidationFault({ ...common, commandFailed: true })).toMatchObject({
      origin: "unknown",
      terminalClass: "inconclusive"
    });
  });

  it("changes the semantic cache key for every identity dimension and normalizes registry order", async () => {
    const hasher = {
      hashCanonicalJson(value: unknown): Promise<Sha256Digest> {
        return Promise.resolve(
          digest(JSON.stringify(value).includes(`"${digest("0")}"`) ? "0" : "f")
        );
      }
    };
    const original = cacheIdentity();
    await expect(
      semanticValidationCacheKey(
        { ...original, registryIdentityDigests: [...original.registryIdentityDigests].reverse() },
        hasher
      )
    ).resolves.toBe(await semanticValidationCacheKey(original, hasher));
    await expect(
      semanticValidationCacheKey({ ...original, targetDigest: digest("0") }, hasher)
    ).resolves.not.toBe(await semanticValidationCacheKey(original, hasher));
  });

  it("never accepts mutable installed candidate state as cached final proof", () => {
    const valid = {
      artifactIntegrityChecked: true,
      cacheKey: digest("1"),
      completeAttestation: true,
      finalProofUsedFreshSandbox: true,
      immutableToolchain: true,
      includesInstalledCandidateState: false,
      terminalClass: "REDACTEDed" as const
    };
    expect(isSafeValidationCacheEntry(valid)).toBe(true);
    expect(isSafeValidationCacheEntry({ ...valid, includesInstalledCandidateState: true })).toBe(
      false
    );
    expect(isSafeValidationCacheEntry({ ...valid, completeAttestation: false })).toBe(false);
  });

  it("deduplicates before reserving cost and enforces time, attempts, cost, and leases", () => {
    const facts = {
      activeForRegistry: 0,
      activeForRepository: 0,
      activeForTarget: 0,
      activeForWorkspace: 0,
      attemptNumber: 1,
      elapsedMs: 0,
      estimatedCostMilliCents: 10,
      jobKeyAlreadyReserved: false,
      reservedCostMilliCents: 0
    };
    expect(decideValidationSchedule(facts, budget)).toEqual({
      costReservationMilliCents: 10,
      disposition: "acquire"
    });
    expect(decideValidationSchedule({ ...facts, jobKeyAlreadyReserved: true }, budget)).toEqual({
      disposition: "duplicate"
    });
    expect(decideValidationSchedule({ ...facts, attemptNumber: 3 }, budget)).toMatchObject({
      disposition: "reject",
      reason: "attempt_budget"
    });
    expect(decideValidationSchedule({ ...facts, activeForRepository: 2 }, budget)).toMatchObject({
      disposition: "defer",
      reason: "repository_concurrency"
    });
    expect(
      decideValidationSchedule({ ...facts, reservedCostMilliCents: 95 }, budget)
    ).toMatchObject({ disposition: "reject", reason: "cost_budget" });
  });
});
