import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { auditLog, findings, projects, users, workspaces } from "./schema/index.js";
import { developmentSeed, seedDevelopmentDatabase } from "./seed.js";
import { createTestDatabase, type TestDatabase } from "./testing/pglite.js";
import { workspaceWhere } from "./workspace-scope.js";

const expectedTableNames = [
  "approvals",
  "attestations",
  "audit_log",
  "behavior_contracts",
  "braintrust_trace_outbox",
  "browser_sessions",
  "candidate_operations",
  "candidates",
  "capability_reports",
  "capture_gaps",
  "checkpoints",
  "cleanup_leases",
  "comments",
  "concurrency_leases",
  "consent_grants",
  "deletion_jobs",
  "deletion_tombstones",
  "device_credentials",
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
  "oauth_states",
  "object_metadata",
  "policies",
  "projects",
  "provider_sessions",
  "raw_content_access_grants",
  "realms",
  "recommendations",
  "repositories",
  "retention_policies",
  "secret_references",
  "snapshots",
  "source_bundles",
  "source_inputs",
  "support_registry_entries",
  "users",
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
    expect(expectedTableNames).toHaveLength(57);
  });

  it("seeds only safe setup records and remains idempotent", async () => {
    const currentDatabase = requireTestDatabase(testDatabase);
    await seedDevelopmentDatabase(currentDatabase.database);
    await seedDevelopmentDatabase(currentDatabase.database);

    const [userCount] = await currentDatabase.database.select({ value: count() }).from(users);
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

    expect(userCount?.value).toBe(1);
    expect(workspaceCount?.value).toBe(1);
    expect(findingCount?.value).toBe(0);
    expect(scopedProject).toHaveLength(1);
    expect(await currentDatabase.database.select().from(auditLog)).toHaveLength(0);
  });
});

function requireTestDatabase(value: TestDatabase | undefined): TestDatabase {
  if (value === undefined) {
    throw new Error("Test database was not initialized");
  }
  return value;
}
