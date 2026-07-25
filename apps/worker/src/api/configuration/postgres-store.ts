import type { BehaviorContract, OptimalityPolicy } from "@environment-reconciler/contracts";
import {
  assertValidBehaviorContract,
  assertValidProjectGoal,
  type EditableProjectGoal
} from "@environment-reconciler/reconciler";

import type {
  PostgresConnection,
  PostgresConnectionFactory
} from "../../infrastructure/ingestion/hyperdrive-postgres.js";
import { sha256Base64Url } from "../../security/crypto.js";
import type {
  AppendConfigurationResult,
  AppendConfigurationRevision,
  ConfigurationPersistence,
  ConfigurationProject,
  ConfigurationRole,
  VersionedOptimalityPolicy
} from "./service.js";

type ConfigurationDocumentKind = "behavior_contract" | "optimality_policy" | "project_goal";

interface ProjectRow {
  readonly project_id: unknown;
  readonly workspace_id: unknown;
}

interface MembershipRow {
  readonly role: unknown;
}

interface RevisionRow {
  readonly document: unknown;
  readonly object_id: unknown;
  readonly protected_constraint_ids: unknown;
  readonly version: unknown;
}

interface AppendDocument<T> {
  readonly document: Readonly<Record<string, unknown>>;
  readonly documentKind: ConfigurationDocumentKind;
  readonly objectId: string;
  readonly protectedConstraintIds: readonly string[];
  readonly revision: AppendConfigurationRevision<T>;
  readonly version: number;
}

/**
 * Neon/Postgres implementation of the versioned configuration boundary.
 *
 * Every mutation takes a transaction-scoped advisory lock for one
 * project/document kind. The revision, candidate invalidations, current
 * version transition and audit event therefore commit or roll back together.
 */
export class PostgresConfigurationStore implements ConfigurationPersistence {
  readonly #connections: PostgresConnectionFactory;

  constructor(connections: PostgresConnectionFactory) {
    this.#connections = connections;
  }

  async getProject(projectId: string): Promise<ConfigurationProject | undefined> {
    return this.#read(async (connection) => {
      const result = await connection.query<ProjectRow>(
        `SELECT id AS project_id, workspace_id
         FROM projects
         WHERE id = $1
           AND status <> 'deleted'
         LIMIT 1`,
        [projectId]
      );
      const row = result.rows[0];
      return row === undefined
        ? undefined
        : {
            projectId: requiredString(row.project_id, "project id"),
            workspaceId: requiredString(row.workspace_id, "workspace id")
          };
    });
  }

  async membershipRole(
    workspaceId: string,
    userId: string
  ): Promise<ConfigurationRole | undefined> {
    return this.#read(async (connection) => {
      const result = await connection.query<MembershipRow>(
        `SELECT role
         FROM workspace_members
         WHERE workspace_id = $1
           AND user_id = $2
           AND removed_at IS NULL
         LIMIT 1`,
        [workspaceId, userId]
      );
      const value = result.rows[0]?.role;
      return value === undefined ? undefined : configurationRole(value);
    });
  }

  async getProjectGoal(projectId: string): Promise<EditableProjectGoal | undefined> {
    const row = await this.#currentRevision(projectId, "project_goal");
    if (row === undefined) {
      return undefined;
    }
    assertValidProjectGoal(row.document);
    return row.document;
  }

  async getBehaviorContract(projectId: string): Promise<BehaviorContract | undefined> {
    const row = await this.#currentRevision(projectId, "behavior_contract");
    if (row === undefined) {
      return undefined;
    }
    await assertValidBehaviorContract(row.document);
    return row.document as BehaviorContract;
  }

  async getOptimalityPolicy(projectId: string): Promise<VersionedOptimalityPolicy | undefined> {
    const row = await this.#currentRevision(projectId, "optimality_policy");
    if (row === undefined) {
      return undefined;
    }
    const document = optimalityPolicy(row.document);
    return {
      document,
      protectedConstraintIds: stringArray(row.protected_constraint_ids, "protected constraint ids")
    };
  }

  appendProjectGoalRevision(
    revision: AppendConfigurationRevision<EditableProjectGoal>
  ): Promise<AppendConfigurationResult> {
    return this.#append({
      document: jsonDocument(revision.next),
      documentKind: "project_goal",
      objectId: revision.next.goalId,
      protectedConstraintIds: [],
      revision,
      version: revision.next.version
    });
  }

  appendBehaviorContractRevision(
    revision: AppendConfigurationRevision<BehaviorContract>
  ): Promise<AppendConfigurationResult> {
    return this.#append({
      document: jsonDocument(revision.next),
      documentKind: "behavior_contract",
      objectId: revision.next.contractId,
      protectedConstraintIds: [],
      revision,
      version: revision.next.version
    });
  }

  appendOptimalityPolicyRevision(
    revision: AppendConfigurationRevision<VersionedOptimalityPolicy>
  ): Promise<AppendConfigurationResult> {
    return this.#append({
      document: jsonDocument(revision.next.document),
      documentKind: "optimality_policy",
      objectId: revision.next.document.policyId,
      protectedConstraintIds: revision.next.protectedConstraintIds,
      revision,
      version: revision.next.document.version
    });
  }

  async #currentRevision(
    projectId: string,
    documentKind: ConfigurationDocumentKind
  ): Promise<RevisionRow | undefined> {
    return this.#read(async (connection) => {
      const result = await connection.query<RevisionRow>(
        `SELECT document, object_id, protected_constraint_ids, version
         FROM configuration_revisions
         WHERE project_id = $1
           AND document_kind = $2
         ORDER BY version DESC
         LIMIT 1`,
        [projectId, documentKind]
      );
      return result.rows[0];
    });
  }

  async #append<T>(input: AppendDocument<T>): Promise<AppendConfigurationResult> {
    validateAppend(input);
    const connection = await this.#connections.connect();
    let transactionOpen = false;
    try {
      await connection.query("BEGIN");
      transactionOpen = true;
      await connection.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `${input.revision.workspaceId}:${input.revision.projectId}:${input.documentKind}`
      ]);

      const project = await connection.query<{ readonly found: unknown }>(
        `SELECT true AS found
         FROM projects
         WHERE workspace_id = $1
           AND id = $2
           AND status <> 'deleted'
         FOR SHARE`,
        [input.revision.workspaceId, input.revision.projectId]
      );
      if (project.rows[0] === undefined) {
        await connection.query("ROLLBACK");
        transactionOpen = false;
        return "not_found";
      }

      const current = await connection.query<RevisionRow>(
        `SELECT object_id, version, document, protected_constraint_ids
         FROM configuration_revisions
         WHERE workspace_id = $1
           AND project_id = $2
           AND document_kind = $3
         ORDER BY version DESC
         LIMIT 1
         FOR UPDATE`,
        [input.revision.workspaceId, input.revision.projectId, input.documentKind]
      );
      const currentRow = current.rows[0];
      if (currentRow === undefined) {
        await connection.query("ROLLBACK");
        transactionOpen = false;
        return "not_found";
      }
      const currentVersion = positiveInteger(currentRow.version, "current version");
      if (currentVersion !== input.revision.expectedVersion) {
        await connection.query("ROLLBACK");
        transactionOpen = false;
        return "version_conflict";
      }
      if (requiredString(currentRow.object_id, "current object id") !== input.objectId) {
        throw new Error("Configuration object identity cannot change between revisions.");
      }

      const [documentDigest, metadataDigest] = await Promise.all([
        sha256Base64Url(JSON.stringify(input.document)),
        sha256Base64Url(
          JSON.stringify({
            afterVersion: input.revision.audit.afterVersion,
            beforeVersion: input.revision.audit.beforeVersion,
            invalidation: input.revision.invalidateCandidatesBoundTo
          })
        )
      ]);

      await connection.query(
        `INSERT INTO configuration_revisions (
           id, workspace_id, project_id, document_kind, object_id, version,
           document, protected_constraint_ids, document_digest,
           created_by_user_id, created_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11
         )`,
        [
          input.revision.audit.auditId,
          input.revision.workspaceId,
          input.revision.projectId,
          input.documentKind,
          input.objectId,
          input.version,
          JSON.stringify(input.document),
          JSON.stringify(input.protectedConstraintIds),
          documentDigest,
          input.revision.audit.actorUserId,
          input.revision.audit.occurredAt
        ]
      );

      const binding = input.revision.invalidateCandidatesBoundTo;
      await connection.query(
        `UPDATE candidates AS candidate
         SET state = 'stale',
             state_version = candidate.state_version + 1,
             last_transition_key = 'configuration:' || $6 || ':' || candidate.id::text,
             stale_at = $7,
             updated_at = $7
         WHERE candidate.workspace_id = $1
           AND candidate.project_id = $2
           AND candidate.state NOT IN ('stale', 'applied')
           AND EXISTS (
             SELECT 1
             FROM candidate_configuration_bindings AS binding
             WHERE binding.workspace_id = candidate.workspace_id
               AND binding.candidate_id = candidate.id
               AND binding.binding_kind = $3
               AND binding.binding_object_id = $4
               AND binding.binding_version = $5
           )`,
        [
          input.revision.workspaceId,
          input.revision.projectId,
          binding.bindingKind,
          binding.bindingObjectId,
          binding.bindingVersion,
          input.revision.audit.auditId,
          input.revision.audit.occurredAt
        ]
      );

      await connection.query(
        `INSERT INTO audit_log (
           id, workspace_id, project_id, actor_type, actor_user_id, category,
           action, object_type, object_id, object_digest, outcome,
           idempotency_key, occurred_at, metadata_digest
         ) VALUES (
           $1, $2, $3, 'user', $4, $5, $6, $7, $8, $9,
           $10, $11, $12, $13
         )`,
        [
          input.revision.audit.auditId,
          input.revision.audit.workspaceId,
          input.revision.audit.projectId,
          input.revision.audit.actorUserId,
          input.revision.audit.category,
          input.revision.audit.action,
          input.revision.audit.objectType,
          input.revision.audit.objectId,
          documentDigest,
          input.revision.audit.outcome,
          input.revision.audit.idempotencyKey,
          input.revision.audit.occurredAt,
          metadataDigest
        ]
      );

      await connection.query("COMMIT");
      transactionOpen = false;
      return "appended";
    } catch (error) {
      if (transactionOpen) {
        await connection.query("ROLLBACK").catch(() => undefined);
      }
      throw error;
    } finally {
      await connection.close();
    }
  }

  async #read<T>(operation: (connection: PostgresConnection) => Promise<T>): Promise<T> {
    const connection = await this.#connections.connect();
    try {
      return await operation(connection);
    } finally {
      await connection.close();
    }
  }
}

function validateAppend<T>(input: AppendDocument<T>): void {
  if (input.version !== input.revision.expectedVersion + 1) {
    throw new Error("Configuration revisions must advance the version by exactly one.");
  }
  if (
    input.revision.audit.workspaceId !== input.revision.workspaceId ||
    input.revision.audit.projectId !== input.revision.projectId ||
    input.revision.audit.beforeVersion !== input.revision.expectedVersion ||
    input.revision.audit.afterVersion !== input.version
  ) {
    throw new Error("Configuration audit binding does not match the revision.");
  }
  const binding = input.revision.invalidateCandidatesBoundTo;
  if (
    binding.bindingKind !== input.documentKind ||
    binding.bindingObjectId !== input.objectId ||
    binding.bindingVersion !== input.revision.expectedVersion
  ) {
    throw new Error("Candidate invalidation binding does not match the replaced revision.");
  }
}

function jsonDocument(value: object): Readonly<Record<string, unknown>> {
  return value as Readonly<Record<string, unknown>>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${label} returned by configuration persistence.`);
  }
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid ${label} returned by configuration persistence.`);
  }
  return parsed;
}

function stringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Invalid ${label} returned by configuration persistence.`);
  }
  return [...value] as string[];
}

function configurationRole(value: unknown): ConfigurationRole {
  const roles: readonly ConfigurationRole[] = [
    "owner",
    "maintainer",
    "developer",
    "reviewer",
    "observer",
    "member"
  ];
  if (typeof value !== "string" || !roles.includes(value as ConfigurationRole)) {
    throw new Error("Invalid role returned by configuration persistence.");
  }
  return value as ConfigurationRole;
}

function optimalityPolicy(value: unknown): OptimalityPolicy {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    (value as { readonly kind?: unknown }).kind !== "optimality_policy" ||
    !Number.isSafeInteger((value as { readonly version?: unknown }).version)
  ) {
    throw new Error("Invalid optimality policy returned by configuration persistence.");
  }
  return value as OptimalityPolicy;
}
