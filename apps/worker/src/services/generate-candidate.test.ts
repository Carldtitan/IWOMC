import type {
  CandidateGenerationResult,
  CandidateReasoningPacket
} from "@environment-REDACTED/integrations";
import type { Sha256Digest } from "@environment-REDACTED/integrations/ports";
import { describe, expect, it } from "vitest";

import {
  GenerateCandidateService,
  type AcceptedCandidateCompletion,
  type CandidateGenerationCompletion,
  type CandidateGenerationEngine,
  type CandidateGenerationPersistence,
  type CandidateValidationStarter,
  type GenerateCandidateWorkItem,
  type PersistedAcceptedFinding,
  type RejectedCandidateCompletion
} from "./generate-candidate.js";

const digestA: Sha256Digest = `sha256:${"a".repeat(64)}`;
const digestB: Sha256Digest = `sha256:${"b".repeat(64)}`;
const workItem: GenerateCandidateWorkItem = {
  checkpointId: "checkpoint-1",
  findingId: "finding-1",
  idempotencyKey: "candidate:project-1:checkpoint-1:finding-1",
  projectId: "project-1",
  workspaceId: "workspace-1"
};

function packet(): CandidateReasoningPacket {
  return {
    behaviorContractSummary: {
      contractVersion: "1",
      requiredProbeKinds: ["install"],
      requiredTargetIds: ["linux-node-22"],
      summary: "Install on a clean target."
    },
    capabilitySummary: {
      adapterId: "npm-native",
      adapterVersion: "1",
      knownFiles: ["package.json", "package-lock.json"],
      lockfiles: ["package-lock.json"],
      packageManager: "npm",
      supportedOperations: ["package_add"],
      toolName: "npm",
      toolVersion: "11",
      writableManifestFiles: ["package.json"]
    },
    effectivePolicy: {
      allowPackageManagerSwitch: false,
      allowedPackageNames: ["zod"],
      deniedPackageNames: [],
      maximumOperations: 1,
      policyVersion: "policy-1"
    },
    finding: {
      category: "undeclared-runtime-dependency",
      dependencySection: "dependencies",
      evidenceReferenceIds: ["evidence-1"],
      expectedPackageName: "zod",
      id: "finding-1",
      recommendedVersionRange: "^4.0.0",
      ruleId: "undeclared-package",
      ruleVersion: "1",
      summary: "zod is observed but undeclared."
    },
    permittedOperations: ["package_add"],
    priorValidationSummaries: [],
    projectGoal: "Reproduce installs.",
    projectPseudonym: digestB,
    relevantGraphSlice: [
      {
        declared: false,
        evidenceReferenceIds: ["evidence-1"],
        observed: true,
        packageName: "zod"
      }
    ],
    repositoryConventions: [],
    schemaVersion: 1,
    semanticFileFragments: []
  };
}

function deterministicGeneration(
  reasoningPacket: CandidateReasoningPacket
): CandidateGenerationResult {
  return {
    findingId: reasoningPacket.finding.id,
    guardVersion: "npm-package-add-v1",
    nativeOperations: [
      {
        dependencySection: "dependencies",
        evidenceReferenceIds: ["evidence-1"],
        findingId: "finding-1",
        kind: "npm_package_add",
        lockfilePolicy: "native-manager-generated",
        manager: "npm",
        manifestPath: "package.json",
        packageName: "zod",
        versionRange: "^4.0.0"
      }
    ],
    outputFingerprint: digestB,
    plan: {
      affectedFiles: ["package.json"],
      assumptions: [],
      evidenceReferenceIds: ["evidence-1"],
      expectedGraphChanges: [
        {
          change: "declare-runtime-dependency",
          findingId: "finding-1",
          packageName: "zod"
        }
      ],
      expectedValidationImpact: [
        {
          expectedOutcome: "REDACTED",
          rationale: "Install on a clean target.",
          targetId: "linux-node-22"
        }
      ],
      findingIds: ["finding-1"],
      operations: [
        {
          dependencySection: "dependencies",
          evidenceReferenceIds: ["evidence-1"],
          findingId: "finding-1",
          kind: "package_add",
          manager: "npm",
          manifestPath: "package.json",
          packageName: "zod",
          versionRange: "^4.0.0"
        }
      ],
      proposedValidationProbes: [
        { kind: "install", probeId: "install-1", targetId: "linux-node-22" }
      ],
      rationale: "Declare the observed package.",
      risks: [],
      schemaVersion: 1
    },
    source: "deterministic-quick-fix"
  };
}

class FakeEngine implements CandidateGenerationEngine {
  calls = 0;
  error: Error | undefined;

  generate(reasoningPacket: CandidateReasoningPacket): Promise<CandidateGenerationResult> {
    this.calls += 1;
    if (this.error !== undefined) {
      return Promise.reject(this.error);
    }
    return Promise.resolve(deterministicGeneration(reasoningPacket));
  }
}

class FakePersistence implements CandidateGenerationPersistence {
  readonly order: string[] = [];
  completion: CandidateGenerationCompletion | undefined;
  readonly finding: PersistedAcceptedFinding = {
    checkpointId: workItem.checkpointId,
    findingId: workItem.findingId,
    projectId: workItem.projectId,
    reasoningPacket: packet(),
    reasoningPacketDigest: digestA,
    workspaceId: workItem.workspaceId
  };
  reservedAuditKey: string | undefined;

  loadAcceptedFinding(): Promise<PersistedAcceptedFinding> {
    this.order.push("load");
    return Promise.resolve(this.finding);
  }

  reserveCandidateGeneration(
    input: Parameters<CandidateGenerationPersistence["reserveCandidateGeneration"]>[0]
  ): ReturnType<CandidateGenerationPersistence["reserveCandidateGeneration"]> {
    this.order.push("reserve");
    this.reservedAuditKey = input.audit.idempotencyKey;
    return Promise.resolve(
      this.completion === undefined
        ? { attemptNumber: 1, disposition: "execute", externalOperationId: "external-1" }
        : { completion: this.completion, disposition: "completed" }
    );
  }

  completeAcceptedGeneration(
    input: Parameters<CandidateGenerationPersistence["completeAcceptedGeneration"]>[0]
  ): Promise<AcceptedCandidateCompletion> {
    this.order.push("persist-accepted");
    const completion: AcceptedCandidateCompletion = {
      candidateDigest:
        input.generation.source === "fireworks"
          ? input.generation.metadata.outputFingerprint
          : input.generation.outputFingerprint,
      candidateId: "candidate-1",
      findingId: input.generation.findingId,
      kind: "accepted",
      source: input.generation.source,
      validationBatchId: "batch-1",
      validationWorkflowIdempotencyKey: "validation:candidate-1"
    };
    this.completion = completion;
    return Promise.resolve(completion);
  }

  completeRejectedGeneration(
    input: Parameters<CandidateGenerationPersistence["completeRejectedGeneration"]>[0]
  ): Promise<RejectedCandidateCompletion> {
    this.order.push("persist-rejected");
    const completion: RejectedCandidateCompletion = {
      failureCode: input.failureCode,
      findingId: input.findingId,
      kind: "rejected"
    };
    this.completion = completion;
    return Promise.resolve(completion);
  }
}

class FakeValidationStarter implements CandidateValidationStarter {
  readonly started = new Set<string>();

  start(input: Parameters<CandidateValidationStarter["start"]>[0]): Promise<void> {
    this.started.add(input.idempotencyKey);
    return Promise.resolve();
  }
}

describe("GenerateCandidateService", () => {
  it("reserves audit/external state before generation, persists once, and starts validation idempotently", async () => {
    const engine = new FakeEngine();
    const persistence = new FakePersistence();
    const validation = new FakeValidationStarter();
    const service = new GenerateCandidateService(engine, persistence, validation, {
      maximumAttempts: 2,
      timeoutMs: 30_000
    });

    await expect(service.generate(workItem)).resolves.toMatchObject({ status: "generated" });
    await expect(service.generate(workItem)).resolves.toMatchObject({ status: "replayed" });

    expect(engine.calls).toBe(1);
    expect(persistence.order).toEqual(["load", "reserve", "persist-accepted", "load", "reserve"]);
    expect(persistence.reservedAuditKey).toBe(`${workItem.idempotencyKey}:audit:reserved`);
    expect(validation.started).toEqual(new Set(["validation:candidate-1"]));
  });

  it("persists a guard rejection without starting validation or changing the finding", async () => {
    const engine = new FakeEngine();
    engine.error = Object.assign(new Error("invented_evidence"), {
      code: "invented_evidence",
      name: "CandidateGuardError"
    });
    const persistence = new FakePersistence();
    const validation = new FakeValidationStarter();
    const service = new GenerateCandidateService(engine, persistence, validation, {
      maximumAttempts: 2,
      timeoutMs: 30_000
    });

    await expect(service.generate(workItem)).resolves.toMatchObject({
      completion: { failureCode: "guard:invented_evidence", findingId: "finding-1" },
      replayed: false,
      status: "rejected"
    });
    expect(persistence.finding.findingId).toBe("finding-1");
    expect(validation.started.size).toBe(0);
  });
});
