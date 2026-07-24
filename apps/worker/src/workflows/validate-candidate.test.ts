import type { Sha256Digest } from "@environment-REDACTED/integrations/ports";
import { describe, expect, it } from "vitest";

import type {
  CandidateValidationPlan,
  CandidateValidationResult,
  CandidateValidationService
} from "../services/validate-candidate.js";
import {
  ValidateCandidateWorkflowOrchestrator,
  type BraintrustValidationSummaryLinker,
  type OneTargetValidationPersistence,
  type PersistedValidationCompletion,
  type ValidateCandidateWorkflowInput
} from "./validate-candidate.js";

const sourceDigest: Sha256Digest = `sha256:${"1".repeat(64)}`;
const patchDigest: Sha256Digest = `sha256:${"2".repeat(64)}`;
const targetDigest: Sha256Digest = `sha256:${"3".repeat(64)}`;
const policyDigest: Sha256Digest = `sha256:${"4".repeat(64)}`;
const contractDigest: Sha256Digest = `sha256:${"5".repeat(64)}`;
const workspacePseudonym: Sha256Digest = `sha256:${"6".repeat(64)}`;
const projectPseudonym: Sha256Digest = `sha256:${"7".repeat(64)}`;
const runPseudonym: Sha256Digest = `sha256:${"8".repeat(64)}`;
const attestationDigest: Sha256Digest = `sha256:${"9".repeat(64)}`;

function plan(): CandidateValidationPlan {
  return {
    acceptedBehaviorContract: true,
    baselineCommands: [],
    behaviorContractDigest: contractDigest,
    candidateCommands: [],
    candidatePatchDigest: patchDigest,
    policyDigest,
    projectPseudonym,
    runPseudonym,
    sourceInputDigest: sourceDigest,
    target: {
      architecture: "amd64",
      cpuCores: 2,
      diskMiB: 4_096,
      imageDigest: targetDigest,
      imageReference: "node:22-bookworm",
      memoryMiB: 2_048,
      operatingSystem: "linux"
    },
    targetDigest,
    validationBatchId: "batch-1",
    workspacePseudonym
  };
}

function workflowInput(): ValidateCandidateWorkflowInput {
  return {
    candidateId: "candidate-1",
    plan: plan(),
    projectId: "project-1",
    reasoningTraceId: "trace-1",
    validationTargetId: "target-1",
    workflowIdempotencyKey: "validation:candidate-1:target-1",
    workspaceId: "workspace-1"
  };
}

class FakeValidator implements Pick<CandidateValidationService, "validate"> {
  calls = 0;
  result: CandidateValidationResult = {
    attestation: {
      behaviorContractDigest: contractDigest,
      candidatePatchDigest: patchDigest,
      policyDigest,
      sourceInputDigest: sourceDigest,
      targetDigest
    },
    status: "verified"
  };

  validate(): Promise<CandidateValidationResult> {
    this.calls += 1;
    return Promise.resolve(this.result);
  }
}

class FakePersistence implements OneTargetValidationPersistence {
  readonly order: string[] = [];
  completion: PersistedValidationCompletion | undefined;

  beginOneTargetValidation(): ReturnType<
    OneTargetValidationPersistence["beginOneTargetValidation"]
  > {
    this.order.push("persist-jobs");
    return Promise.resolve(
      this.completion === undefined
        ? {
            baselineJobId: "baseline-job-1",
            candidateJobId: "candidate-job-1",
            disposition: "execute"
          }
        : { completion: this.completion, disposition: "completed" }
    );
  }

  completeOneTargetValidation(
    input: Parameters<OneTargetValidationPersistence["completeOneTargetValidation"]>[0]
  ): Promise<PersistedValidationCompletion> {
    this.order.push("persist-terminal");
    this.completion =
      input.result.status === "verified"
        ? {
            attestation: {
              attestationDigest,
              attestationId: "attestation-1"
            },
            candidateId: input.candidateId,
            recommendation: {
              recommendationId: "recommendation-1",
              state: "reviewable"
            },
            terminalSummaryClass: "verified",
            validationBatchId: input.validationBatchId
          }
        : {
            candidateId: input.candidateId,
            terminalSummaryClass: input.result.status,
            validationBatchId: input.validationBatchId
          };
    return Promise.resolve(this.completion);
  }
}

class FakeBraintrustLinker implements BraintrustValidationSummaryLinker {
  readonly calls: Parameters<BraintrustValidationSummaryLinker["appendTerminalSummary"]>[0][] = [];
  fail = false;

  appendTerminalSummary(
    input: Parameters<BraintrustValidationSummaryLinker["appendTerminalSummary"]>[0]
  ): Promise<void> {
    this.calls.push(input);
    return this.fail ? Promise.reject(new Error("provider_unavailable")) : Promise.resolve();
  }
}

describe("ValidateCandidateWorkflowOrchestrator", () => {
  it("persists both jobs, terminalizes a verified result, and retries only the Braintrust link", async () => {
    const validator = new FakeValidator();
    const persistence = new FakePersistence();
    const braintrust = new FakeBraintrustLinker();
    braintrust.fail = true;
    const workflow = new ValidateCandidateWorkflowOrchestrator(validator, persistence, braintrust);

    await expect(workflow.run(workflowInput())).resolves.toMatchObject({
      braintrustDelivery: "deferred",
      completion: {
        attestation: { attestationId: "attestation-1" },
        recommendation: { recommendationId: "recommendation-1", state: "reviewable" },
        terminalSummaryClass: "verified"
      },
      status: "completed"
    });

    braintrust.fail = false;
    await expect(workflow.run(workflowInput())).resolves.toMatchObject({
      braintrustDelivery: "exported",
      status: "replayed"
    });

    expect(validator.calls).toBe(1);
    expect(persistence.order).toEqual(["persist-jobs", "persist-terminal", "persist-jobs"]);
    expect(braintrust.calls).toEqual([
      {
        idempotencyKey: "validation:candidate-1:target-1:braintrust:terminal-summary",
        reasoningTraceId: "trace-1",
        summaryClass: "verified"
      },
      {
        idempotencyKey: "validation:candidate-1:target-1:braintrust:terminal-summary",
        reasoningTraceId: "trace-1",
        summaryClass: "verified"
      }
    ]);
  });

  it("never creates an attestation or recommendation for infrastructure failure", async () => {
    const validator = new FakeValidator();
    validator.result = { status: "infrastructure_error" };
    const persistence = new FakePersistence();
    const braintrust = new FakeBraintrustLinker();

    const result = await new ValidateCandidateWorkflowOrchestrator(
      validator,
      persistence,
      braintrust
    ).run(workflowInput());

    expect(result).toMatchObject({
      completion: { terminalSummaryClass: "infrastructure_error" },
      status: "completed"
    });
    expect(result).not.toHaveProperty("completion.attestation");
    expect(result).not.toHaveProperty("completion.recommendation");
  });
});
