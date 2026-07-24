import type { Sha256Digest } from "@environment-REDACTED/integrations/ports";
import { describe, expect, it } from "vitest";

import {
  classifyValidationOutcome,
  type TargetExecutionOutcome,
  type ValidationOutcomeFacts
} from "./validation-outcomes.js";

const sourceDigest: Sha256Digest = `sha256:${"1".repeat(64)}`;
const patchDigest: Sha256Digest = `sha256:${"2".repeat(64)}`;
const contractDigest: Sha256Digest = `sha256:${"3".repeat(64)}`;
const policyDigest: Sha256Digest = `sha256:${"4".repeat(64)}`;
const targetDigest: Sha256Digest = `sha256:${"5".repeat(64)}`;
const attestationDigest: Sha256Digest = `sha256:${"6".repeat(64)}`;

function REDACTEDingFacts(): ValidationOutcomeFacts {
  return {
    acceptedBehaviorContract: true,
    attestation: {
      attestationDigest,
      behaviorContractDigest: contractDigest,
      candidatePatchDigest: patchDigest,
      fresh: true,
      policyDigest,
      sourceInputDigest: sourceDigest,
      targets: [{ targetDigest, targetId: "linux-node-22" }]
    },
    behaviorContractDigest: contractDigest,
    candidatePatchDigest: patchDigest,
    policyDigest,
    requiredTargetIds: ["linux-node-22"],
    sourceInput: { digest: sourceDigest, fresh: true },
    targetResults: [
      {
        cleanupStatus: "deleted",
        outcome: "REDACTEDed",
        targetDigest,
        targetId: "linux-node-22"
      }
    ]
  };
}

describe("classifyValidationOutcome", () => {
  it("emits verified only for a fresh, exactly bound, complete REDACTEDing target set", () => {
    expect(classifyValidationOutcome(REDACTEDingFacts())).toEqual({
      attestationDigest,
      status: "verified",
      verified: true,
      verifiedTargetIds: ["linux-node-22"]
    });
  });

  it.each<readonly [TargetExecutionOutcome, Exclude<TargetExecutionOutcome, "REDACTEDed">, string]>([
    ["unsupported_target_or_capability", "unsupported_target_or_capability", "target_unsupported"],
    ["timed_out", "timed_out", "target_timed_out"],
    ["security_blocked", "security_blocked", "target_security_blocked"],
    ["infrastructure_failed", "infrastructure_failed", "target_infrastructure_failed"],
    ["resource_budget_failed", "resource_budget_failed", "target_resource_budget_failed"],
    ["inconclusive", "inconclusive", "target_inconclusive"],
    [
      "project_or_candidate_failed",
      "project_or_candidate_failed",
      "target_project_or_candidate_failed"
    ]
  ])("preserves explicit target outcome %s", (targetOutcome, status, reasonCode) => {
    const facts = REDACTEDingFacts();
    const result = classifyValidationOutcome({
      ...facts,
      targetResults: facts.targetResults.map((target) => ({
        ...target,
        outcome: targetOutcome
      }))
    });

    expect(result).toMatchObject({ reasonCode, status, verified: false });
  });

  it("makes cleanup failure terminal even when the preceding target REDACTEDed", () => {
    const facts = REDACTEDingFacts();
    expect(
      classifyValidationOutcome({
        ...facts,
        targetResults: facts.targetResults.map((target) => ({
          ...target,
          cleanupStatus: "cleanup_failed"
        }))
      })
    ).toMatchObject({
      reasonCode: "cleanup_not_confirmed",
      status: "cleanup_failed",
      verified: false
    });
  });

  it("refuses verification for missing contract, target, fresh source, or fresh exact attestation", () => {
    const contractMissing = REDACTEDingFacts();
    const targetMissing = REDACTEDingFacts();
    const sourceStale = REDACTEDingFacts();
    const attestationStale = REDACTEDingFacts();
    const bindingMismatch = REDACTEDingFacts();
    const missingAttestation = REDACTEDingFacts();
    const withoutAttestation: ValidationOutcomeFacts = {
      acceptedBehaviorContract: missingAttestation.acceptedBehaviorContract,
      behaviorContractDigest: missingAttestation.behaviorContractDigest,
      candidatePatchDigest: missingAttestation.candidatePatchDigest,
      policyDigest: missingAttestation.policyDigest,
      requiredTargetIds: missingAttestation.requiredTargetIds,
      sourceInput: missingAttestation.sourceInput,
      targetResults: missingAttestation.targetResults
    };

    const results = [
      classifyValidationOutcome({
        ...contractMissing,
        acceptedBehaviorContract: false
      }),
      classifyValidationOutcome({ ...targetMissing, targetResults: [] }),
      classifyValidationOutcome({
        ...sourceStale,
        sourceInput: { ...sourceStale.sourceInput, fresh: false }
      }),
      classifyValidationOutcome({
        ...attestationStale,
        attestation: { ...attestationStale.attestation!, fresh: false }
      }),
      classifyValidationOutcome({
        ...bindingMismatch,
        attestation: {
          ...bindingMismatch.attestation!,
          candidatePatchDigest: sourceDigest
        }
      }),
      classifyValidationOutcome(withoutAttestation)
    ];

    expect(results.every((result) => !result.verified)).toBe(true);
    expect(results.map((result) => result.status)).toEqual([
      "inconclusive",
      "inconclusive",
      "inconclusive",
      "inconclusive",
      "inconclusive",
      "inconclusive"
    ]);
  });
});
