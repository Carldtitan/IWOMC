import type { Sha256Digest } from "@environment-reconciler/integrations/ports";
import { describe, expect, it } from "vitest";

import {
  ModelTemplateRegistryError,
  ModelTemplateRegistryService,
  type BraintrustEvaluationEvidenceStore,
  type BraintrustPromotionEvidence,
  type ModelPromotionPolicy,
  type ModelTemplateRegistryPersistence,
  type ModelTemplateVersion
} from "./model-registry.js";

const promptDigest: Sha256Digest = `sha256:${"1".repeat(64)}`;
const schemaDigest: Sha256Digest = `sha256:${"2".repeat(64)}`;
const samplingDigest: Sha256Digest = `sha256:${"3".repeat(64)}`;
const evidenceDigest: Sha256Digest = `sha256:${"4".repeat(64)}`;

function policy(): ModelPromotionPolicy {
  return {
    evaluationSuiteId: "candidate-safety",
    evaluationSuiteVersion: "2026-07-24",
    maximumSecretLeakageCount: 0,
    minimumCaseCount: 10,
    minimumEvidenceGroundingRate: 0.95,
    minimumStructuredOutputValidityRate: 0.98,
    minimumUnsupportedOperationRefusalRate: 0.99,
    policyVersion: "promotion-policy-v1"
  };
}

class FakePersistence implements ModelTemplateRegistryPersistence {
  readonly versions = new Map<string, ModelTemplateVersion>();
  readonly createKeys = new Map<string, ModelTemplateVersion>();
  readonly promotionKeys = new Map<
    string,
    Awaited<ReturnType<ModelTemplateRegistryPersistence["activate"]>>
  >();
  readonly retirementKeys = new Map<
    string,
    Awaited<ReturnType<ModelTemplateRegistryPersistence["retire"]>>
  >();

  createProposed(
    input: Parameters<ModelTemplateRegistryPersistence["createProposed"]>[0]
  ): Promise<ModelTemplateVersion> {
    const replay = this.createKeys.get(input.idempotencyKey);
    if (replay !== undefined) return Promise.resolve(replay);
    const version: ModelTemplateVersion = {
      ...input.version,
      revision: 0,
      state: "proposed"
    };
    this.versions.set(version.id, version);
    this.createKeys.set(input.idempotencyKey, version);
    return Promise.resolve(version);
  }

  loadVersion(
    input: Parameters<ModelTemplateRegistryPersistence["loadVersion"]>[0]
  ): Promise<ModelTemplateVersion | undefined> {
    const version = this.versions.get(input.versionId);
    return Promise.resolve(version?.workspaceId === input.workspaceId ? version : undefined);
  }

  activate(
    input: Parameters<ModelTemplateRegistryPersistence["activate"]>[0]
  ): ReturnType<ModelTemplateRegistryPersistence["activate"]> {
    const replay = this.promotionKeys.get(input.idempotencyKey);
    if (replay !== undefined) return Promise.resolve(replay);
    const current = this.versions.get(input.versionId);
    if (current?.state !== "proposed" || current.revision !== input.expectedRevision) {
      return Promise.reject(new ModelTemplateRegistryError("state_conflict"));
    }
    let retiredVersionId: string | undefined;
    for (const [id, version] of this.versions) {
      if (
        version.state === "active" &&
        version.workspaceId === current.workspaceId &&
        version.projectId === current.projectId &&
        version.templateId === current.templateId
      ) {
        this.versions.set(id, {
          ...version,
          revision: version.revision + 1,
          state: "retired"
        });
        retiredVersionId = id;
      }
    }
    const active: ModelTemplateVersion = {
      ...current,
      revision: current.revision + 1,
      state: "active"
    };
    this.versions.set(active.id, active);
    const result = {
      disposition: "promoted" as const,
      ...(retiredVersionId === undefined ? {} : { retiredVersionId }),
      version: active
    };
    this.promotionKeys.set(input.idempotencyKey, result);
    return Promise.resolve(result);
  }

  retire(
    input: Parameters<ModelTemplateRegistryPersistence["retire"]>[0]
  ): ReturnType<ModelTemplateRegistryPersistence["retire"]> {
    const replay = this.retirementKeys.get(input.idempotencyKey);
    if (replay !== undefined) return Promise.resolve(replay);
    const current = this.versions.get(input.versionId);
    if (
      current === undefined ||
      current.state === "retired" ||
      current.revision !== input.expectedRevision
    ) {
      return Promise.reject(new ModelTemplateRegistryError("state_conflict"));
    }
    const retired: ModelTemplateVersion = {
      ...current,
      revision: current.revision + 1,
      state: "retired"
    };
    this.versions.set(retired.id, retired);
    const result = { disposition: "retired" as const, version: retired };
    this.retirementKeys.set(input.idempotencyKey, result);
    return Promise.resolve(result);
  }

  seed(version: ModelTemplateVersion): void {
    this.versions.set(version.id, version);
  }
}

class FakeEvidenceStore implements BraintrustEvaluationEvidenceStore {
  evidence: BraintrustPromotionEvidence | undefined;

  loadEvidence(): Promise<BraintrustPromotionEvidence | undefined> {
    return Promise.resolve(this.evidence);
  }
}

async function propose(
  service: ModelTemplateRegistryService,
  version = 2
): Promise<ModelTemplateVersion> {
  return service.propose({
    createdAt: "2026-07-24T12:00:00.000Z",
    id: `version-${version}`,
    idempotencyKey: `propose-${version}`,
    modelId: "accounts/fireworks/models/test",
    projectId: "project-1",
    promptDigest,
    responseSchemaDigest: schemaDigest,
    samplingPolicyDigest: samplingDigest,
    templateId: "candidate-plan",
    version,
    workspaceId: "workspace-1"
  });
}

function passingEvidence(version: ModelTemplateVersion): BraintrustPromotionEvidence {
  return {
    caseCount: 20,
    completedAt: "2026-07-24T13:00:00.000Z",
    evaluationRunId: "eval-1",
    evaluationSuiteId: "candidate-safety",
    evaluationSuiteVersion: "2026-07-24",
    evidenceDigest,
    metrics: {
      evidenceGroundingRate: 0.98,
      secretLeakageCount: 0,
      structuredOutputValidityRate: 1,
      unsupportedOperationRefusalRate: 1
    },
    modelTemplateVersionId: version.id,
    state: "passed",
    versionFingerprint: version.versionFingerprint
  };
}

describe("ModelTemplateRegistryService", () => {
  it("promotes only passing exact evidence, retires the prior active version, and replays idempotently", async () => {
    const persistence = new FakePersistence();
    const evidence = new FakeEvidenceStore();
    const service = new ModelTemplateRegistryService(persistence, evidence, policy());
    const proposed = await propose(service);
    persistence.seed({
      ...proposed,
      id: "version-1",
      revision: 1,
      state: "active",
      version: 1
    });
    evidence.evidence = passingEvidence(proposed);
    const request = {
      evaluationRunId: "eval-1",
      expectedRevision: 0,
      idempotencyKey: "promote-version-2",
      versionId: proposed.id,
      workspaceId: proposed.workspaceId
    };

    const promoted = await service.promote(request);
    const replayed = await service.promote(request);

    expect(promoted).toMatchObject({
      disposition: "promoted",
      retiredVersionId: "version-1",
      status: "active",
      version: {
        state: "active",
        versionFingerprint: proposed.versionFingerprint
      }
    });
    expect(replayed).toMatchObject({ disposition: "promoted", status: "active" });
    expect(persistence.versions.get("version-1")?.state).toBe("retired");
    expect(persistence.promotionKeys.size).toBe(1);
  });

  it("reports every failed promotion gate without mutating proposed state", async () => {
    const persistence = new FakePersistence();
    const evidence = new FakeEvidenceStore();
    const service = new ModelTemplateRegistryService(persistence, evidence, policy());
    const proposed = await propose(service);
    evidence.evidence = {
      ...passingEvidence(proposed),
      caseCount: 2,
      completedAt: "not-a-timestamp",
      evaluationRunId: "different-eval-run",
      evaluationSuiteId: "wrong-suite",
      metrics: {
        evidenceGroundingRate: 0.5,
        secretLeakageCount: 1,
        structuredOutputValidityRate: 0.5,
        unsupportedOperationRefusalRate: 0.5
      },
      state: "failed",
      versionFingerprint: promptDigest
    };

    const result = await service.promote({
      evaluationRunId: "eval-1",
      expectedRevision: 0,
      idempotencyKey: "blocked-promotion",
      versionId: proposed.id,
      workspaceId: proposed.workspaceId
    });

    expect(result).toEqual({
      failures: [
        "evaluation_not_passed",
        "evaluation_incomplete",
        "evaluation_binding_mismatch",
        "evaluation_suite_mismatch",
        "insufficient_cases",
        "structured_output_validity_below_threshold",
        "evidence_grounding_below_threshold",
        "unsupported_operation_refusal_below_threshold",
        "secret_leakage_above_threshold"
      ],
      status: "blocked"
    });
    expect(persistence.versions.get(proposed.id)?.state).toBe("proposed");
    expect(persistence.promotionKeys.size).toBe(0);
  });

  it("rejects stale optimistic revisions and preserves immutable fingerprints through retirement", async () => {
    const persistence = new FakePersistence();
    const evidence = new FakeEvidenceStore();
    const service = new ModelTemplateRegistryService(persistence, evidence, policy());
    const proposed = await propose(service, 3);
    evidence.evidence = passingEvidence(proposed);

    await expect(
      service.promote({
        evaluationRunId: "eval-1",
        expectedRevision: 7,
        idempotencyKey: "stale-promotion",
        versionId: proposed.id,
        workspaceId: proposed.workspaceId
      })
    ).rejects.toEqual(new ModelTemplateRegistryError("optimistic_version_conflict"));

    const retired = await service.retire({
      expectedRevision: 0,
      idempotencyKey: "retire-version-3",
      versionId: proposed.id,
      workspaceId: proposed.workspaceId
    });
    const replayed = await service.retire({
      expectedRevision: 0,
      idempotencyKey: "retire-version-3",
      versionId: proposed.id,
      workspaceId: proposed.workspaceId
    });
    expect(retired).toMatchObject({
      state: "retired",
      versionFingerprint: proposed.versionFingerprint
    });
    expect(replayed).toEqual(retired);
    expect(persistence.retirementKeys.size).toBe(1);
  });

  it("rejects non-zero leakage policies and tampered immutable version content", async () => {
    const persistence = new FakePersistence();
    const evidence = new FakeEvidenceStore();

    expect(
      () =>
        new ModelTemplateRegistryService(persistence, evidence, {
          ...policy(),
          maximumSecretLeakageCount: 1
        })
    ).toThrow(new ModelTemplateRegistryError("invalid_policy"));

    const service = new ModelTemplateRegistryService(persistence, evidence, policy());
    const proposed = await propose(service, 4);
    persistence.seed({
      ...proposed,
      modelId: "accounts/fireworks/models/tampered"
    });

    await expect(
      service.promote({
        evaluationRunId: "eval-1",
        expectedRevision: 0,
        idempotencyKey: "tampered-promotion",
        versionId: proposed.id,
        workspaceId: proposed.workspaceId
      })
    ).rejects.toEqual(new ModelTemplateRegistryError("state_conflict"));
  });
});
