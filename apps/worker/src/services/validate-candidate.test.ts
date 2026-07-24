import type { RedactedExcerpt, Sha256Digest } from "@environment-reconciler/integrations/ports";
import { describe, expect, it } from "vitest";

import { FakeDaytona } from "../../../../packages/testkit/src/fakes/daytona.js";
import {
  CandidateValidationService,
  type CandidateValidationPlan,
  type ValidationMaterializer
} from "./validate-candidate.js";

const sourceDigest: Sha256Digest = `sha256:${"1".repeat(64)}`;
const patchDigest: Sha256Digest = `sha256:${"2".repeat(64)}`;
const targetDigest: Sha256Digest = `sha256:${"3".repeat(64)}`;
const policyDigest: Sha256Digest = `sha256:${"4".repeat(64)}`;
const contractDigest: Sha256Digest = `sha256:${"5".repeat(64)}`;
const workspacePseudonym: Sha256Digest = `sha256:${"6".repeat(64)}`;
const projectPseudonym: Sha256Digest = `sha256:${"7".repeat(64)}`;
const runPseudonym: Sha256Digest = `sha256:${"8".repeat(64)}`;

function plan(acceptedBehaviorContract = true): CandidateValidationPlan {
  return {
    acceptedBehaviorContract,
    baselineCommands: [
      {
        arguments: ["test"],
        executable: "npm",
        phase: "test",
        timeoutMs: 30_000,
        workingDirectory: "/workspace"
      }
    ],
    behaviorContractDigest: contractDigest,
    candidateCommands: [
      {
        arguments: ["test"],
        executable: "npm",
        phase: "test",
        timeoutMs: 30_000,
        workingDirectory: "/workspace"
      }
    ],
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

async function excerpt(daytona: FakeDaytona, text: string): Promise<RedactedExcerpt> {
  return {
    byteLength: new TextEncoder().encode(text).byteLength,
    contentDigest: await daytona.scenario.hasher.hashText(text),
    redactionPolicyVersion: "test-v1",
    text,
    truncated: false
  };
}

function materializer(calls: string[]): ValidationMaterializer {
  return {
    materializeCandidate(input) {
      calls.push(`candidate:${input.sandbox.sandboxId}`);
      return Promise.resolve();
    },
    materializeSource(input) {
      calls.push(`source:${input.sandbox.sandboxId}`);
      return Promise.resolve();
    }
  };
}

describe("CandidateValidationService", () => {
  it("verifies only a failing baseline and passing candidate in separate clean sandboxes", async () => {
    const daytona = new FakeDaytona();
    daytona.enqueueCommandResult({
      exitCode: 1,
      stderr: await excerpt(daytona, "module missing"),
      stdout: await excerpt(daytona, ""),
      timedOut: false
    });
    daytona.enqueueCommandResult({
      exitCode: 0,
      stderr: await excerpt(daytona, ""),
      stdout: await excerpt(daytona, "tests passed"),
      timedOut: false
    });
    const calls: string[] = [];

    const result = await new CandidateValidationService(daytona, materializer(calls)).validate(
      plan()
    );

    expect(result.status).toBe("verified");
    expect(result.attestation).toEqual({
      behaviorContractDigest: contractDigest,
      candidatePatchDigest: patchDigest,
      policyDigest,
      sourceInputDigest: sourceDigest,
      targetDigest
    });
    expect(result.baseline?.cleanupConfirmed).toBe(true);
    expect(result.candidate?.cleanupConfirmed).toBe(true);
    expect(result.baseline?.sandboxId).not.toBe(result.candidate?.sandboxId);
    expect(calls.filter((call) => call.startsWith("source:"))).toHaveLength(2);
    expect(calls.filter((call) => call.startsWith("candidate:"))).toHaveLength(1);
    expect(result.candidate?.phases.map(({ phase }) => phase)).toEqual([
      "provision",
      "source",
      "candidate",
      "test",
      "cleanup"
    ]);
    expect(result.candidate?.phases.every(({ durationMs }) => durationMs >= 0)).toBe(true);
  });

  it("does not provision or verify without an accepted behavior contract", async () => {
    const daytona = new FakeDaytona();
    const calls: string[] = [];

    await expect(
      new CandidateValidationService(daytona, materializer(calls)).validate(plan(false))
    ).resolves.toEqual({ status: "behavior_contract_missing" });
    expect(calls).toEqual([]);
  });

  it("uses a narrower label when the unchanged baseline already passes", async () => {
    const daytona = new FakeDaytona();
    for (let index = 0; index < 2; index += 1) {
      daytona.enqueueCommandResult({
        exitCode: 0,
        stderr: await excerpt(daytona, ""),
        stdout: await excerpt(daytona, "tests passed"),
        timedOut: false
      });
    }

    const result = await new CandidateValidationService(daytona, materializer([])).validate(plan());

    expect(result.status).toBe("baseline_already_passed");
    expect(result.attestation).toBeUndefined();
  });

  it("fails as infrastructure and still confirms cleanup when the sandbox is not ready", async () => {
    const daytona = new FakeDaytona({ provisionedPhase: "provisioning" });

    const result = await new CandidateValidationService(daytona, materializer([])).validate(plan());

    expect(result.status).toBe("infrastructure_error");
    expect(result.baseline?.cleanupConfirmed).toBe(true);
    expect(result.candidate?.cleanupConfirmed).toBe(true);
    expect(result.baseline?.phases.map(({ phase, status }) => ({ phase, status }))).toEqual([
      { phase: "provision", status: "infrastructure_error" },
      { phase: "cleanup", status: "passed" }
    ]);
    expect(result.baseline?.phases.every(({ durationMs }) => durationMs >= 0)).toBe(true);
  });
});
