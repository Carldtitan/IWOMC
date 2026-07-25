import { describe, expect, it } from "vitest";

import type {
  PostgresConnection,
  PostgresConnectionFactory,
  PostgresQueryResult
} from "../../infrastructure/ingestion/hyperdrive-postgres.js";
import {
  PostgresConfigurationStore,
  type AppendConfigurationRevision,
  type ConfigurationAuditEvent
} from "./index.js";
import type { EditableProjectGoal } from "@environment-REDACTED/REDACTED";

const workspaceId = "20000000-0000-4000-8000-000000000001";
const projectId = "20000000-0000-4000-8000-000000000002";
const actorUserId = "20000000-0000-4000-REDACTED";
const auditId = "20000000-0000-4000-8000-000000000004";
const occurredAt = "2026-07-24T17:00:00.000Z";

describe("PostgresConfigurationStore", () => {
  it("atomically appends a revision, invalidates its exact bindings, and audits", async () => {
    const connection = new RecordingConnection((text) => {
      if (text.includes("SELECT true AS found")) {
        return rows([{ found: true }]);
      }
      if (text.includes("FROM configuration_revisions")) {
        return rows([
          {
            document: projectGoal(1),
            object_id: "goal:project",
            protected_constraint_ids: [],
            version: 1
          }
        ]);
      }
      return rows([]);
    });
    const store = new PostgresConfigurationStore(factory(connection));

    await expect(store.appendProjectGoalRevision(projectGoalRevision())).resolves.toBe("appended");

    expect(connection.closed).toBe(true);
    expect(connection.statements.map(statementClass)).toEqual([
      "begin",
      "lock",
      "project",
      "current",
      "revision",
      "invalidation",
      "audit",
      "commit"
    ]);
    const invalidation = connection.statements.find((statement) =>
      statement.text.includes("UPDATE candidates AS candidate")
    );
    expect(invalidation?.values).toEqual([
      workspaceId,
      projectId,
      "project_goal",
      "goal:project",
      1,
      auditId,
      occurredAt
    ]);
    expect(invalidation?.text).toContain("candidate.state NOT IN ('stale', 'applied')");
    expect(invalidation?.text).toContain("binding.binding_version = $5");
  });

  it("returns a version conflict before any revision, invalidation, or audit write", async () => {
    const connection = new RecordingConnection((text) => {
      if (text.includes("SELECT true AS found")) {
        return rows([{ found: true }]);
      }
      if (text.includes("FROM configuration_revisions")) {
        return rows([
          {
            document: projectGoal(2),
            object_id: "goal:project",
            protected_constraint_ids: [],
            version: 2
          }
        ]);
      }
      return rows([]);
    });
    const store = new PostgresConfigurationStore(factory(connection));

    await expect(store.appendProjectGoalRevision(projectGoalRevision())).resolves.toBe(
      "version_conflict"
    );

    expect(connection.statements.map(statementClass)).toEqual([
      "begin",
      "lock",
      "project",
      "current",
      "rollback"
    ]);
    expect(connection.closed).toBe(true);
  });

  it("rolls back the complete mutation if audit persistence fails", async () => {
    const connection = new RecordingConnection((text) => {
      if (text.includes("SELECT true AS found")) {
        return rows([{ found: true }]);
      }
      if (text.includes("FROM configuration_revisions")) {
        return rows([
          {
            document: projectGoal(1),
            object_id: "goal:project",
            protected_constraint_ids: [],
            version: 1
          }
        ]);
      }
      if (text.includes("INSERT INTO audit_log")) {
        throw new Error("database unavailable");
      }
      return rows([]);
    });
    const store = new PostgresConfigurationStore(factory(connection));

    await expect(store.appendProjectGoalRevision(projectGoalRevision())).rejects.toThrow(
      "database unavailable"
    );

    expect(connection.statements.map(statementClass).at(-1)).toBe("rollback");
    expect(connection.statements.some((statement) => statementClass(statement) === "commit")).toBe(
      false
    );
    expect(connection.closed).toBe(true);
  });

  it("reads project scope and active membership without leaking removed members", async () => {
    const connection = new RecordingConnection((text) => {
      if (text.includes("FROM projects")) {
        return rows([{ project_id: projectId, workspace_id: workspaceId }]);
      }
      if (text.includes("FROM workspace_members")) {
        return rows([{ role: "maintainer" }]);
      }
      return rows([]);
    });
    const store = new PostgresConfigurationStore(factory(connection));

    await expect(store.getProject(projectId)).resolves.toEqual({ projectId, workspaceId });
    await expect(store.membershipRole(workspaceId, actorUserId)).resolves.toBe("maintainer");

    expect(
      connection.statements.find((statement) => statement.text.includes("FROM workspace_members"))
        ?.text
    ).toContain("removed_at IS NULL");
  });
});

function projectGoal(version: number): EditableProjectGoal {
  return {
    authoredBy: actorUserId,
    contextOnly: true,
    createdAt: occurredAt,
    goalId: "goal:project",
    kind: "project_goal",
    nonFunctionalPriorities: [],
    projectId,
    schemaVersion: 1,
    statement: "Keep clean installs reproducible.",
    updatedAt: occurredAt,
    updatedBy: actorUserId,
    version,
    workspaceId
  };
}

function projectGoalRevision(): AppendConfigurationRevision<EditableProjectGoal> {
  return {
    audit: audit(),
    expectedVersion: 1,
    invalidateCandidatesBoundTo: {
      bindingKind: "project_goal",
      bindingObjectId: "goal:project",
      bindingVersion: 1,
      reason: "project_goal_changed"
    },
    next: projectGoal(2),
    projectId,
    workspaceId
  };
}

function audit(): ConfigurationAuditEvent {
  return {
    action: "project_goal_edited",
    actorUserId,
    afterVersion: 2,
    auditId,
    beforeVersion: 1,
    category: "policy",
    idempotencyKey: `configuration:${auditId}`,
    objectId: "goal:project",
    objectType: "project_goal",
    occurredAt,
    outcome: "succeeded",
    projectId,
    workspaceId
  };
}

interface Statement {
  readonly text: string;
  readonly values: readonly unknown[];
}

class RecordingConnection implements PostgresConnection {
  readonly statements: Statement[] = [];
  closed = false;
  readonly #respond: (text: string, values: readonly unknown[]) => PostgresQueryResult<unknown>;

  constructor(respond: (text: string, values: readonly unknown[]) => PostgresQueryResult<unknown>) {
    this.#respond = respond;
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  query<Row>(text: string, values: readonly unknown[] = []): Promise<PostgresQueryResult<Row>> {
    this.statements.push({ text, values });
    return Promise.resolve(this.#respond(text, values) as PostgresQueryResult<Row>);
  }
}

function rows<Row>(values: readonly Row[]): PostgresQueryResult<Row> {
  return { rowCount: values.length, rows: values };
}

function factory(connection: PostgresConnection): PostgresConnectionFactory {
  return { connect: () => Promise.resolve(connection) };
}

function statementClass(statement: Statement): string {
  const normalized = statement.text.trim();
  if (normalized === "BEGIN") return "begin";
  if (normalized === "COMMIT") return "commit";
  if (normalized === "ROLLBACK") return "rollback";
  if (normalized.includes("pg_advisory_xact_lock")) return "lock";
  if (normalized.includes("SELECT true AS found")) return "project";
  if (normalized.includes("FROM configuration_revisions")) return "current";
  if (normalized.includes("INSERT INTO configuration_revisions")) return "revision";
  if (normalized.includes("UPDATE candidates AS candidate")) return "invalidation";
  if (normalized.includes("INSERT INTO audit_log")) return "audit";
  return "unknown";
}
