import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AuditIdempotencyConflictError, appendAuditEvent } from "./audit-service.js";
import {
  ExternalOperationConflictError,
  reserveExternalOperation
} from "./external-operation-service.js";
import {
  auditLog,
  behaviorContracts,
  candidates,
  checkpoints,
  externalOperations,
  findings,
  githubInstallations,
  policies,
  projects,
  recommendations,
  repositories,
  sourceInputs,
  REDACTEDs,
  validationBatches,
  validationJobs,
  validationTargets,
  workspaceMembers,
  workspaces
} from "./schema/index.js";
import { developmentSeed, seedDevelopmentDatabase } from "./seed.js";
import {
  StateTransitionError,
  transitionCandidate,
  transitionRecommendation,
  transitionValidationJob
} from "./state-transitions.js";
import { createTestDatabase, type TestDatabase } from "./testing/pglite.js";
import { inWorkspace, WorkspaceScopeError, workspaceWhere } from "./workspace-scope.js";

const secondWorkspace = {
  workspaceId: "20000000-0000-4000-8000-000000000001",
  installationId: "20000000-0000-4000-8000-000000000002",
  projectId: "20000000-0000-4000-REDACTED"
} as const;

const stateFixture = {
  checkpointId: "30000000-0000-4000-8000-000000000001",
  sourceInputId: "30000000-0000-4000-8000-000000000002",
  findingId: "30000000-0000-4000-REDACTED",
  contractId: "30000000-0000-4000-8000-000000000004",
  policyId: "30000000-0000-4000-8000-000000000005",
  candidateId: "30000000-0000-4000-8000-000000000006",
  targetId: "30000000-0000-4000-8000-000000000007",
  batchId: "30000000-0000-4000-8000-000000000008",
  jobId: "30000000-0000-4000-8000-000000000009",
  recommendationId: "30000000-0000-4000-8000-00000000000a"
} as const;

const expectedTableNames = [
  "approvals",
  "attestations",
  "audit_log",
  "behavior_contracts",
  "braintrust_trace_outbox",
  "browser_sessions",
  "candidate_configuration_bindings",
  "candidate_operations",
  "candidates",
  "capability_reports",
  "capture_gaps",
  "checkpoints",
  "cleanup_leases",
  "comments",
  "concurrency_leases",
  "configuration_revisions",
  "consent_grants",
  "deletion_jobs",
  "deletion_tombstones",
  "device_REDACTEDs",
  "devices",
  "environment_layers",
  "evaluation_runs",
  "event_anchors",
  "event_headers",
  "event_streams",
  "export_jobs",
  "external_operations",
  "finding_evidence",
  "findings",
  "github_installations",
  "inventory_facts",
  "job_dedup_keys",
  "model_prompt_versions",
  "REDACTED_states",
  "object_metadata",
  "policies",
  "projects",
  "provider_sessions",
  "raw_content_access_grants",
  "realms",
  "recommendations",
  "repositories",
  "retention_policies",
  "REDACTED_references",
  "snapshots",
  "source_bundles",
  "source_inputs",
  "support_registry_entries",
  "REDACTEDs",
  "validation_batches",
  "validation_cache_entries",
  "validation_jobs",
  "validation_phases",
  "validation_targets",
  "webhook_deliveries",
  "workspace_invitations",
  "workspace_members",
  "workspaces"
] as const;

describe.sequential("PostgreSQL persistence integration", () => {
  let testDatabase: TestDatabase | undefined;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
  }, 30_000);

  afterAll(async () => {
    await testDatabase?.close();
  });

  it("migrates an empty database and safely reapplies migrations", async () => {
    const currentDatabase = requireTestDatabase(testDatabase);
    await currentDatabase.migrate();
    const result = await currentDatabase.client.query<{ table_name: string }>(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `);
    const names = result.rows.map((row) => row.table_name);

    expect(names).toEqual(expect.arrayContaining([...expectedTableNames]));
    expect(expectedTableNames).toHaveLength(59);
  });

  it("seeds only safe setup records and remains idempotent", async () => {
    const currentDatabase = requireTestDatabase(testDatabase);
    await seedDevelopmentDatabase(currentDatabase.database);
    await seedDevelopmentDatabase(currentDatabase.database);

    const [REDACTEDCount] = await currentDatabase.database.select({ value: count() }).from(REDACTEDs);
    const [workspaceCount] = await currentDatabase.database
      .select({ value: count() })
      .from(workspaces);
    const [findingCount] = await currentDatabase.database.select({ value: count() }).from(findings);
    const scopedProject = await currentDatabase.database
      .select()
      .from(projects)
      .where(
        workspaceWhere(
          developmentSeed.workspaceId,
          projects.workspaceId,
          eq(projects.id, developmentSeed.projectId)
        )
      );

    expect(REDACTEDCount?.value).toBe(1);
    expect(workspaceCount?.value).toBe(1);
    expect(findingCount?.value).toBe(0);
    expect(scopedProject).toHaveLength(1);
    expect(await currentDatabase.database.select().from(auditLog)).toHaveLength(0);
  });

  it("enforces workspace isolation, composite foreign keys, and unique identities", async () => {
    const { database } = requireTestDatabase(testDatabase);
    await database.insert(workspaces).values({
      id: secondWorkspace.workspaceId,
      ownerUserId: developmentSeed.REDACTEDId,
      slug: "second-workspace",
      name: "Second Workspace"
    });
    await database.insert(workspaceMembers).values({
      workspaceId: secondWorkspace.workspaceId,
      REDACTEDId: developmentSeed.REDACTEDId,
      role: "owner"
    });
    await database.insert(githubInstallations).values({
      id: secondWorkspace.installationId,
      workspaceId: secondWorkspace.workspaceId,
      installedByUserId: developmentSeed.REDACTEDId,
      githubInstallationId: "second-installation",
      accountId: "second-account",
      accountLogin: "development-REDACTED",
      permissionsDigest: digest("2")
    });
    await database.insert(projects).values({
      id: secondWorkspace.projectId,
      workspaceId: secondWorkspace.workspaceId,
      name: "Second Project",
      slug: "second-project",
      createdByUserId: developmentSeed.REDACTEDId
    });

    const leakedProject = await database
      .select()
      .from(projects)
      .where(
        workspaceWhere(
          secondWorkspace.workspaceId,
          projects.workspaceId,
          eq(projects.id, developmentSeed.projectId)
        )
      );
    expect(leakedProject).toEqual([]);
    expect(() =>
      inWorkspace(secondWorkspace.workspaceId, {
        workspaceId: developmentSeed.workspaceId,
        name: "smuggled"
      })
    ).toThrow(WorkspaceScopeError);

    await expect(
      database.insert(repositories).values({
        id: "20000000-0000-4000-8000-000000000004",
        workspaceId: secondWorkspace.workspaceId,
        projectId: developmentSeed.projectId,
        githubInstallationId: secondWorkspace.installationId,
        providerRepositoryId: "cross-workspace-repository",
        owner: "development-REDACTED",
        name: "cross-workspace",
        defaultBranch: "main",
        visibility: "private"
      })
    ).rejects.toThrow();
    await expect(
      database.insert(projects).values({
        id: "20000000-0000-4000-8000-000000000005",
        workspaceId: secondWorkspace.workspaceId,
        name: "Duplicate Project",
        slug: "second-project",
        createdByUserId: developmentSeed.REDACTEDId
      })
    ).rejects.toThrow();
  });

  it("allows only explicit, idempotent state transitions with expected prior state", async () => {
    const { database } = requireTestDatabase(testDatabase);
    await insertStateFixture(database);
    const transitionTime = new Date("2026-07-24T20:00:00.000Z");

    const candidate = await transitionCandidate(database, {
      workspaceId: developmentSeed.workspaceId,
      id: stateFixture.candidateId,
      expectedState: "draft",
      nextState: "ready_for_validation",
      idempotencyKey: "candidate-ready-1",
      now: transitionTime
    });
    const candidateReplay = await transitionCandidate(database, {
      workspaceId: developmentSeed.workspaceId,
      id: stateFixture.candidateId,
      expectedState: "draft",
      nextState: "ready_for_validation",
      idempotencyKey: "candidate-ready-1",
      now: transitionTime
    });
    expect(candidate).toMatchObject({ state: "ready_for_validation", stateVersion: 1 });
    expect(candidateReplay).toMatchObject({
      id: candidate.id,
      state: "ready_for_validation",
      stateVersion: 1
    });
    await expect(
      transitionCandidate(database, {
        workspaceId: developmentSeed.workspaceId,
        id: stateFixture.candidateId,
        expectedState: "draft",
        nextState: "applied",
        idempotencyKey: "candidate-invalid"
      })
    ).rejects.toBeInstanceOf(StateTransitionError);

    await expect(
      transitionValidationJob(database, {
        workspaceId: developmentSeed.workspaceId,
        id: stateFixture.jobId,
        expectedState: "queued",
        nextState: "terminal",
        idempotencyKey: "job-invalid",
        terminalOutcome: "REDACTEDed"
      })
    ).rejects.toMatchObject({ code: "invalid_transition" });
    await transitionValidationJob(database, {
      workspaceId: developmentSeed.workspaceId,
      id: stateFixture.jobId,
      expectedState: "queued",
      nextState: "provisioning",
      idempotencyKey: "job-provisioning"
    });
    await transitionValidationJob(database, {
      workspaceId: developmentSeed.workspaceId,
      id: stateFixture.jobId,
      expectedState: "provisioning",
      nextState: "cleanup",
      idempotencyKey: "job-cleanup"
    });
    const terminalJob = await transitionValidationJob(database, {
      workspaceId: developmentSeed.workspaceId,
      id: stateFixture.jobId,
      expectedState: "cleanup",
      nextState: "terminal",
      terminalOutcome: "infrastructure",
      idempotencyKey: "job-terminal",
      now: transitionTime
    });
    expect(terminalJob).toMatchObject({
      state: "terminal",
      terminalOutcome: "infrastructure",
      stateVersion: 3
    });

    const recommendation = await transitionRecommendation(database, {
      workspaceId: developmentSeed.workspaceId,
      id: stateFixture.recommendationId,
      expectedState: "draft",
      nextState: "reviewable",
      idempotencyKey: "recommendation-reviewable"
    });
    expect(recommendation.state).toBe("reviewable");
    await expect(
      transitionRecommendation(database, {
        workspaceId: secondWorkspace.workspaceId,
        id: stateFixture.recommendationId,
        expectedState: "reviewable",
        nextState: "approved",
        idempotencyKey: "cross-workspace-transition"
      })
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("binds append-only audit and external-operation records idempotently", async () => {
    const { database } = requireTestDatabase(testDatabase);
    const occurredAt = new Date("2026-07-24T21:00:00.000Z");
    const auditInput = {
      id: "40000000-0000-4000-8000-000000000001",
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      actor: { type: "REDACTED", REDACTEDId: developmentSeed.REDACTEDId } as const,
      category: "approval" as const,
      action: "recommendation.approved",
      objectType: "recommendation",
      objectId: stateFixture.recommendationId,
      objectDigest: digest("a"),
      outcome: "succeeded" as const,
      idempotencyKey: "audit-recommendation-approved",
      occurredAt,
      metadataDigest: digest("b")
    };
    const audit = await appendAuditEvent(database, auditInput);
    const auditReplay = await appendAuditEvent(database, auditInput);
    expect(auditReplay.id).toBe(audit.id);
    expect(audit).toMatchObject({
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      actorType: "REDACTED",
      actorUserId: developmentSeed.REDACTEDId,
      objectType: "recommendation",
      objectId: stateFixture.recommendationId,
      outcome: "succeeded"
    });
    expect(audit.occurredAt).toEqual(occurredAt);
    await expect(
      appendAuditEvent(database, { ...auditInput, outcome: "failed" })
    ).rejects.toBeInstanceOf(AuditIdempotencyConflictError);
    await expect(
      database.update(auditLog).set({ outcome: "failed" }).where(eq(auditLog.id, audit.id))
    ).rejects.toThrow();
    await expect(database.delete(auditLog).where(eq(auditLog.id, audit.id))).rejects.toThrow();
    expect(await database.select().from(auditLog).where(eq(auditLog.id, audit.id))).toMatchObject([
      { id: audit.id, outcome: "succeeded" }
    ]);

    const operationInput = {
      id: "40000000-0000-4000-8000-000000000002",
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      operationKey: "daytona-provision-run-1",
      provider: "daytona" as const,
      operationKind: "provision-sandbox",
      requestFingerprint: digest("c")
    };
    const operation = await reserveExternalOperation(database, operationInput);
    const operationReplay = await reserveExternalOperation(database, operationInput);
    expect(operationReplay.id).toBe(operation.id);
    expect(operation).toMatchObject({
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      state: "reserved",
      attemptCount: 0,
      costMicros: 0
    });
    await expect(
      reserveExternalOperation(database, {
        ...operationInput,
        requestFingerprint: digest("d")
      })
    ).rejects.toBeInstanceOf(ExternalOperationConflictError);
    expect(
      await database
        .select()
        .from(externalOperations)
        .where(eq(externalOperations.operationKey, operationInput.operationKey))
    ).toHaveLength(1);
  });
});

async function insertStateFixture(database: TestDatabase["database"]): Promise<void> {
  await database.transaction(async (transaction) => {
    await transaction.insert(checkpoints).values({
      id: stateFixture.checkpointId,
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      repositoryId: developmentSeed.repositoryId,
      trigger: "session-ended",
      sourceCommitSha: "1111111111111111111111111111111111111111",
      state: "complete",
      coverageDigest: digest("1")
    });
    await transaction.insert(sourceInputs).values({
      id: stateFixture.sourceInputId,
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      repositoryId: developmentSeed.repositoryId,
      checkpointId: stateFixture.checkpointId,
      commitSha: "1111111111111111111111111111111111111111",
      treeDigest: digest("2"),
      sourceInputDigest: digest("3"),
      state: "available"
    });
    await transaction.insert(findings).values({
      id: stateFixture.findingId,
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      checkpointId: stateFixture.checkpointId,
      ruleId: "undeclared-used",
      ruleVersion: "1",
      kind: "undeclared_dependency",
      state: "accepted",
      supportLevel: "full_native",
      confidenceEvidence: "1.0000",
      confidenceAttribution: "0.9000",
      confidenceCompleteness: "0.9500",
      evidenceSetDigest: digest("4"),
      gapSetDigest: digest("5")
    });
    await transaction.insert(behaviorContracts).values({
      id: stateFixture.contractId,
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      version: 1,
      contractDigest: digest("6"),
      commandSetDigest: digest("7"),
      schemaVersion: "1",
      state: "accepted",
      createdByUserId: developmentSeed.REDACTEDId,
      acceptedByUserId: developmentSeed.REDACTEDId
    });
    await transaction.insert(policies).values({
      id: stateFixture.policyId,
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      version: 1,
      policyDigest: digest("8"),
      schemaVersion: "1",
      hardConstraintsDigest: digest("9"),
      objectivesDigest: digest("a"),
      state: "active",
      createdByUserId: developmentSeed.REDACTEDId
    });
    await transaction.insert(candidates).values({
      id: stateFixture.candidateId,
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      findingId: stateFixture.findingId,
      sourceInputId: stateFixture.sourceInputId,
      policyId: stateFixture.policyId,
      behaviorContractId: stateFixture.contractId,
      candidateDigest: digest("b"),
      state: "draft",
      generatedBy: "deterministic-rule",
      generatorVersion: "1"
    });
    await transaction.insert(validationTargets).values({
      id: stateFixture.targetId,
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      targetDigest: digest("c"),
      operatingSystem: "linux",
      architecture: "amd64",
      imageReference: "node:22",
      imageDigest: digest("d"),
      policyId: stateFixture.policyId
    });
    await transaction.insert(validationBatches).values({
      id: stateFixture.batchId,
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      candidateId: stateFixture.candidateId,
      sourceInputId: stateFixture.sourceInputId,
      policyId: stateFixture.policyId,
      behaviorContractId: stateFixture.contractId,
      workflowIdempotencyKey: "validation-batch-1",
      targetSetDigest: digest("e")
    });
    await transaction.insert(validationJobs).values({
      id: stateFixture.jobId,
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      validationBatchId: stateFixture.batchId,
      candidateId: stateFixture.candidateId,
      validationTargetId: stateFixture.targetId,
      sourceInputId: stateFixture.sourceInputId,
      immutableInputDigest: digest("f"),
      dedupDigest: digest("0")
    });
    await transaction.insert(recommendations).values({
      id: stateFixture.recommendationId,
      workspaceId: developmentSeed.workspaceId,
      projectId: developmentSeed.projectId,
      candidateId: stateFixture.candidateId,
      attestationSetDigest: digest("1"),
      sourceInputDigest: digest("3"),
      policyDigest: digest("8"),
      behaviorContractDigest: digest("6"),
      targetSetDigest: digest("e")
    });
  });
}

function digest(character: string): string {
  return `sha256:${character.repeat(64)}`;
}

function requireTestDatabase(value: TestDatabase | undefined): TestDatabase {
  if (value === undefined) {
    throw new Error("Test database was not initialized");
  }
  return value;
}
