import { describe, expect, it } from "vitest";

import {
  acceptBehaviorContract,
  createDefaultOptimalityPolicy,
  discoverNpmBehaviorContract,
  evaluateCandidatePolicy,
  invalidateBehaviorContract
} from "./behavior-policy.js";

describe("behavior contract and default optimality policy", () => {
  it("discovers ordered native npm behavior and requires human acceptance", () => {
    const discovered = discoverNpmBehaviorContract({
      hasPackageLock: true,
      packageJson: JSON.stringify({
        scripts: {
          build: "tsc",
          lint: "eslint .",
          test: "vitest run"
        }
      }),
      projectGoal: "Reconstruct and verify the application.",
      projectId: "project-1"
    });

    expect(discovered.steps.map((step) => step.kind)).toEqual(["install", "build", "lint", "test"]);
    expect(discovered.reviewState).toBe("needs_review");

    const accepted = acceptBehaviorContract(discovered, "owner-1", "2026-07-24T00:00:00.000Z");
    expect(accepted).toMatchObject({
      acceptedBy: "owner-1",
      reviewState: "accepted"
    });

    const invalidated = invalidateBehaviorContract(accepted, ["source-2", "source-1"]);
    expect(invalidated).toMatchObject({
      invalidatedBySourceIds: ["source-1", "source-2"],
      reviewState: "invalidated",
      version: 2
    });
    expect(invalidated).not.toHaveProperty("acceptedBy");
  });

  it("lets hard gates dominate preferences and never calls reconstruction verified", () => {
    const policy = createDefaultOptimalityPolicy({
      projectId: "project-1",
      requiredTargetIds: ["linux-node-22"]
    });
    const eligible = evaluateCandidatePolicy(policy, {
      acceptedBehaviorContract: true,
      allRequiredTargetsPass: true,
      dependencyCount: 8,
      lockfileConsistent: true,
      nativeManagerOnly: true,
      reproducibilityScore: 0.98,
      secretGuardPassed: true,
      supportedVersions: true,
      touchedFileCount: 2
    });
    const missingContract = evaluateCandidatePolicy(policy, {
      acceptedBehaviorContract: false,
      allRequiredTargetsPass: true,
      dependencyCount: 1,
      lockfileConsistent: true,
      nativeManagerOnly: true,
      reproducibilityScore: 1,
      secretGuardPassed: true,
      supportedVersions: true,
      touchedFileCount: 1
    });
    const unsafe = evaluateCandidatePolicy(policy, {
      acceptedBehaviorContract: true,
      allRequiredTargetsPass: true,
      dependencyCount: 0,
      lockfileConsistent: true,
      nativeManagerOnly: true,
      reproducibilityScore: 1,
      secretGuardPassed: false,
      supportedVersions: true,
      touchedFileCount: 0
    });

    expect(eligible.resultClass).toBe("verified_eligible");
    expect(missingContract.resultClass).toBe("reconstruction_passed");
    expect(unsafe).toMatchObject({
      eligibleForVerification: false,
      failedHardGates: ["secret_guard_passed"],
      resultClass: "policy_rejected"
    });
  });
});
