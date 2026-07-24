import type {
  PostgresConnection,
  PostgresConnectionFactory,
  PostgresQueryResult
} from "../../infrastructure/ingestion/hyperdrive-postgres.js";
import { sha256Base64Url } from "../../security/crypto.js";
import {
  CollaborationError,
  type ApprovalView,
  type AuditView,
  type CollaborationRole,
  type CollaborationStore,
  type CommentView,
  type DeviceProviderView,
  type IntegrationView,
  type MemberView,
  type PrivacyStatusView
} from "./service.js";

export class PostgresCollaborationStore implements CollaborationStore {
  readonly #connections: PostgresConnectionFactory;

  constructor(connections: PostgresConnectionFactory) {
    this.#connections = connections;
  }

  async membershipRole(
    workspaceId: string,
    REDACTEDId: string
  ): Promise<CollaborationRole | undefined> {
    return this.#read(async (connection) => {
      const result = await connection.query<{ readonly role: unknown }>(
        `SELECT role
         FROM workspace_members
         WHERE workspace_id = $1
           AND REDACTED_id = $2
           AND removed_at IS NULL
         LIMIT 1`,
        [workspaceId, REDACTEDId]
      );
      const role = result.rows[0]?.role;
      return role === undefined ? undefined : collaborationRole(role);
    });
  }

  async listMembers(workspaceId: string): Promise<readonly MemberView[]> {
    return this.#read(async (connection) => {
      const result = await connection.query<MemberRow>(
        `SELECT m.REDACTED_id, m.role, m.joined_at, u.display_name, u.github_login
         FROM workspace_members AS m
         JOIN REDACTEDs AS u ON u.id = m.REDACTED_id
         WHERE m.workspace_id = $1
           AND m.removed_at IS NULL
         ORDER BY m.joined_at ASC, m.REDACTED_id ASC`,
        [workspaceId]
      );
      return result.rows.map(memberFromRow);
    });
  }

  async changeMemberRole(
    input: Parameters<CollaborationStore["changeMemberRole"]>[0]
  ): Promise<boolean> {
    return this.#transaction(async (connection) => {
      const current = await connection.query<{ readonly role: unknown }>(
        `SELECT role
         FROM workspace_members
         WHERE workspace_id = $1
           AND REDACTED_id = $2
           AND removed_at IS NULL
         FOR UPDATE`,
        [input.workspaceId, input.targetUserId]
      );
      const currentRole = current.rows[0]?.role;
      if (currentRole === undefined) {
        return false;
      }
      if (currentRole === "owner" && input.role !== "owner") {
        const owners = await connection.query<{ readonly count: unknown }>(
          `SELECT count(*) AS count
           FROM workspace_members
           WHERE workspace_id = $1
             AND role = 'owner'
             AND removed_at IS NULL`,
          [input.workspaceId]
        );
        if (integer(owners.rows[0]?.count, "owner count") <= 1) {
          throw new CollaborationError("last_owner");
        }
      }
      await connection.query(
        `UPDATE workspace_members
         SET role = $3
         WHERE workspace_id = $1
           AND REDACTED_id = $2
           AND removed_at IS NULL`,
        [input.workspaceId, input.targetUserId, input.role]
      );
      await appendAudit(connection, {
        action: "member.role_changed",
        actorUserId: input.actorUserId,
        auditId: input.auditId,
        category: "membership",
        idempotencyKey: input.idempotencyKey,
        objectDigest: await sha256Base64Url(`${input.targetUserId}:${input.role}`),
        objectId: input.targetUserId,
        objectType: "workspace_member",
        workspaceId: input.workspaceId
      });
      return true;
    });
  }

  async listComments(
    workspaceId: string,
    findingId: string
  ): Promise<readonly CommentView[] | undefined> {
    return this.#read(async (connection) => {
      if (!(await scopedObjectExists(connection, "findings", workspaceId, findingId))) {
        return undefined;
      }
      const result = await connection.query<CommentRow>(
        `SELECT id, author_REDACTED_id, body, created_at, edited_at
         FROM comments
         WHERE workspace_id = $1
           AND finding_id = $2
           AND deleted_at IS NULL
         ORDER BY created_at ASC, id ASC`,
        [workspaceId, findingId]
      );
      return result.rows.map(commentFromRow);
    });
  }

  async addComment(
    input: Parameters<CollaborationStore["addComment"]>[0]
  ): Promise<CommentView | undefined> {
    return this.#transaction(async (connection) => {
      const finding = await connection.query<{ readonly project_id: unknown }>(
        `SELECT project_id
         FROM findings
         WHERE workspace_id = $1
           AND id = $2
         FOR SHARE`,
        [input.workspaceId, input.findingId]
      );
      const projectId = finding.rows[0]?.project_id;
      if (projectId === undefined) {
        return undefined;
      }
      const created = await connection.query<CommentRow>(
        `INSERT INTO comments (
           id, workspace_id, finding_id, author_REDACTED_id, body, body_digest
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, author_REDACTED_id, body, created_at, edited_at`,
        [
          input.commentId,
          input.workspaceId,
          input.findingId,
          input.actorUserId,
          input.body,
          input.bodyDigest
        ]
      );
      await appendAudit(connection, {
        action: "finding.comment_added",
        actorUserId: input.actorUserId,
        auditId: input.auditId,
        category: "collaboration",
        idempotencyKey: input.idempotencyKey,
        objectDigest: input.bodyDigest,
        objectId: input.commentId,
        objectType: "comment",
        projectId: stringValue(projectId, "project id"),
        workspaceId: input.workspaceId
      });
      return commentFromRow(singleRow(created, "created comment"));
    });
  }

  async listApprovals(
    workspaceId: string,
    recommendationId: string
  ): Promise<readonly ApprovalView[] | undefined> {
    return this.#read(async (connection) => {
      if (
        !(await scopedObjectExists(connection, "recommendations", workspaceId, recommendationId))
      ) {
        return undefined;
      }
      const result = await connection.query<ApprovalRow>(
        `SELECT id, recommendation_id, REDACTED_id, decision, reason_code, created_at
         FROM approvals
         WHERE workspace_id = $1
           AND recommendation_id = $2
         ORDER BY created_at ASC, id ASC`,
        [workspaceId, recommendationId]
      );
      return result.rows.map(approvalFromRow);
    });
  }

  async addApproval(
    input: Parameters<CollaborationStore["addApproval"]>[0]
  ): Promise<ApprovalView | "conflict" | undefined> {
    return this.#transaction(async (connection) => {
      const recommendation = await connection.query<{ readonly project_id: unknown }>(
        `SELECT project_id
         FROM recommendations
         WHERE workspace_id = $1
           AND id = $2
         FOR SHARE`,
        [input.workspaceId, input.recommendationId]
      );
      const projectId = recommendation.rows[0]?.project_id;
      if (projectId === undefined) {
        return undefined;
      }
      const inserted = await connection.query<ApprovalRow>(
        `INSERT INTO approvals (
           id, workspace_id, recommendation_id, REDACTED_id, decision,
           approval_policy_version, object_digest, reason_code
         ) VALUES ($1, $2, $3, $4, $5, 'mvp-v1', $6, $7)
         ON CONFLICT (workspace_id, recommendation_id, REDACTED_id) DO NOTHING
         RETURNING id, recommendation_id, REDACTED_id, decision, reason_code, created_at`,
        [
          input.approvalId,
          input.workspaceId,
          input.recommendationId,
          input.actorUserId,
          input.decision,
          input.objectDigest,
          input.reasonCode ?? null
        ]
      );
      let approval = inserted.rows[0];
      if (approval === undefined) {
        const existing = await connection.query<ApprovalRow>(
          `SELECT id, recommendation_id, REDACTED_id, decision, reason_code, created_at
           FROM approvals
           WHERE workspace_id = $1
             AND recommendation_id = $2
             AND REDACTED_id = $3
           LIMIT 1`,
          [input.workspaceId, input.recommendationId, input.actorUserId]
        );
        approval = existing.rows[0];
        if (approval === undefined) {
          return "conflict";
        }
        if (
          approval.decision !== input.decision ||
          (approval.reason_code ?? null) !== (input.reasonCode ?? null)
        ) {
          return "conflict";
        }
        return approvalFromRow(approval);
      }
      await appendAudit(connection, {
        action: `recommendation.${input.decision}`,
        actorUserId: input.actorUserId,
        auditId: input.auditId,
        category: "approval",
        idempotencyKey: input.idempotencyKey,
        objectDigest: input.objectDigest,
        objectId: input.approvalId,
        objectType: "approval",
        projectId: stringValue(projectId, "project id"),
        workspaceId: input.workspaceId
      });
      return approvalFromRow(approval);
    });
  }

  async listDevices(workspaceId: string): Promise<readonly DeviceProviderView[]> {
    return this.#read(async (connection) => {
      const result = await connection.query<DeviceRow>(
        `SELECT
           d.id,
           d.display_name,
           d.platform,
           d.companion_version,
           d.state,
           d.last_seen_at,
           COALESCE(
             array_agg(DISTINCT s.provider) FILTER (WHERE s.provider IS NOT NULL),
             ARRAY[]::text[]
           ) AS providers
         FROM devices AS d
         LEFT JOIN provider_sessions AS s
           ON s.workspace_id = d.workspace_id
          AND s.device_id = d.id
         WHERE d.workspace_id = $1
         GROUP BY d.id
         ORDER BY d.created_at ASC, d.id ASC`,
        [workspaceId]
      );
      return result.rows.map(deviceFromRow);
    });
  }

  async revokeDevice(input: Parameters<CollaborationStore["revokeDevice"]>[0]): Promise<boolean> {
    return this.#transaction(async (connection) => {
      const result = await connection.query(
        `UPDATE devices
         SET state = 'revoked', revoked_at = COALESCE(revoked_at, now()), updated_at = now()
         WHERE workspace_id = $1
           AND id = $2
           AND revoked_at IS NULL`,
        [input.workspaceId, input.deviceId]
      );
      if (result.rowCount !== 1) {
        return false;
      }
      await connection.query(
        `UPDATE device_REDACTEDs
         SET revoked_at = COALESCE(revoked_at, now())
         WHERE workspace_id = $1
           AND device_id = $2`,
        [input.workspaceId, input.deviceId]
      );
      await appendAudit(connection, {
        action: "device.revoked",
        actorUserId: input.actorUserId,
        auditId: input.auditId,
        category: "device",
        idempotencyKey: input.idempotencyKey,
        objectDigest: await sha256Base64Url(input.deviceId),
        objectId: input.deviceId,
        objectType: "device",
        workspaceId: input.workspaceId
      });
      return true;
    });
  }

  async listIntegrations(workspaceId: string): Promise<readonly IntegrationView[]> {
    return this.#read(async (connection) => {
      const result = await connection.query<IntegrationRow>(
        `SELECT id, account_login, suspended_at, created_at
         FROM github_installations
         WHERE workspace_id = $1
           AND deleted_at IS NULL
         ORDER BY created_at ASC, id ASC`,
        [workspaceId]
      );
      return result.rows.map(integrationFromRow);
    });
  }

  async getPrivacyStatus(workspaceId: string): Promise<PrivacyStatusView | undefined> {
    return this.#read(async (connection) => {
      const workspace = await connection.query<PrivacyRow>(
        `SELECT
           w.raw_content_enabled,
           w.default_retention_class,
           (
             SELECT count(*)
             FROM consent_grants AS c
             WHERE c.workspace_id = w.id
               AND c.state = 'active'
               AND c.revoked_at IS NULL
               AND (c.expires_at IS NULL OR c.expires_at > now())
           ) AS active_consent_count
         FROM workspaces AS w
         WHERE w.id = $1
           AND w.deleted_at IS NULL
         LIMIT 1`,
        [workspaceId]
      );
      const row = workspace.rows[0];
      if (row === undefined) {
        return undefined;
      }
      const policies = await connection.query<RetentionRow>(
        `SELECT retention_class, version, duration_seconds, object_type
         FROM retention_policies
         WHERE workspace_id = $1
           AND state = 'active'
         ORDER BY retention_class ASC, object_type ASC, version DESC`,
        [workspaceId]
      );
      return {
        activeConsentCount: integer(row.active_consent_count, "active consent count"),
        defaultRetentionClass: stringValue(row.default_retention_class, "default retention class"),
        rawContentEnabled: booleanValue(row.raw_content_enabled, "raw content enabled"),
        retentionPolicies: policies.rows.map((policy) => ({
          durationSeconds: integer(policy.duration_seconds, "duration seconds"),
          objectType: stringValue(policy.object_type, "object type"),
          retentionClass: stringValue(policy.retention_class, "retention class"),
          version: integer(policy.version, "version")
        }))
      };
    });
  }

  async listAudit(workspaceId: string, limit: number): Promise<readonly AuditView[]> {
    return this.#read(async (connection) => {
      const result = await connection.query<AuditRow>(
        `SELECT
           id, actor_type, actor_REDACTED_id, category, action, object_type,
           object_id, outcome, occurred_at
         FROM audit_log
         WHERE workspace_id = $1
         ORDER BY occurred_at DESC, id DESC
         LIMIT $2`,
        [workspaceId, limit]
      );
      return result.rows.map(auditFromRow);
    });
  }

  async #read<T>(operation: (connection: PostgresConnection) => Promise<T>): Promise<T> {
    const connection = await this.#connections.connect();
    try {
      return await operation(connection);
    } finally {
      await connection.close();
    }
  }

  async #transaction<T>(operation: (connection: PostgresConnection) => Promise<T>): Promise<T> {
    const connection = await this.#connections.connect();
    let open = false;
    try {
      await connection.query("BEGIN");
      open = true;
      const result = await operation(connection);
      await connection.query("COMMIT");
      open = false;
      return result;
    } catch (error) {
      if (open) {
        await connection.query("ROLLBACK").catch(() => undefined);
      }
      throw error;
    } finally {
      await connection.close();
    }
  }
}

interface MemberRow {
  readonly display_name: unknown;
  readonly github_login: unknown;
  readonly joined_at: unknown;
  readonly role: unknown;
  readonly REDACTED_id: unknown;
}

interface CommentRow {
  readonly author_REDACTED_id: unknown;
  readonly body: unknown;
  readonly created_at: unknown;
  readonly edited_at: unknown;
  readonly id: unknown;
}

interface ApprovalRow {
  readonly created_at: unknown;
  readonly decision: unknown;
  readonly id: unknown;
  readonly reason_code: unknown;
  readonly recommendation_id: unknown;
  readonly REDACTED_id: unknown;
}

interface DeviceRow {
  readonly companion_version: unknown;
  readonly display_name: unknown;
  readonly id: unknown;
  readonly last_seen_at: unknown;
  readonly platform: unknown;
  readonly providers: unknown;
  readonly state: unknown;
}

interface IntegrationRow {
  readonly account_login: unknown;
  readonly created_at: unknown;
  readonly id: unknown;
  readonly suspended_at: unknown;
}

interface PrivacyRow {
  readonly active_consent_count: unknown;
  readonly default_retention_class: unknown;
  readonly raw_content_enabled: unknown;
}

interface RetentionRow {
  readonly duration_seconds: unknown;
  readonly object_type: unknown;
  readonly retention_class: unknown;
  readonly version: unknown;
}

interface AuditRow {
  readonly action: unknown;
  readonly actor_type: unknown;
  readonly actor_REDACTED_id: unknown;
  readonly category: unknown;
  readonly id: unknown;
  readonly object_id: unknown;
  readonly object_type: unknown;
  readonly occurred_at: unknown;
  readonly outcome: unknown;
}

interface AuditInput {
  readonly action: string;
  readonly actorUserId: string;
  readonly auditId: string;
  readonly category: string;
  readonly idempotencyKey: string;
  readonly objectDigest: string;
  readonly objectId: string;
  readonly objectType: string;
  readonly projectId?: string;
  readonly workspaceId: string;
}

async function appendAudit(connection: PostgresConnection, input: AuditInput): Promise<void> {
  const metadataDigest = await sha256Base64Url(
    JSON.stringify({ action: input.action, objectId: input.objectId })
  );
  await connection.query(
    `INSERT INTO audit_log (
       id, workspace_id, project_id, actor_type, actor_REDACTED_id, category,
       action, object_type, object_id, object_digest, outcome,
       idempotency_key, occurred_at, metadata_digest
     ) VALUES (
       $1, $2, $3, 'REDACTED', $4, $5, $6, $7, $8, $9,
       'succeeded', $10, now(), $11
     )`,
    [
      input.auditId,
      input.workspaceId,
      input.projectId ?? null,
      input.actorUserId,
      input.category,
      input.action,
      input.objectType,
      input.objectId,
      input.objectDigest,
      input.idempotencyKey,
      metadataDigest
    ]
  );
}

async function scopedObjectExists(
  connection: PostgresConnection,
  table: "findings" | "recommendations",
  workspaceId: string,
  objectId: string
): Promise<boolean> {
  const result = await connection.query<{ readonly found: unknown }>(
    `SELECT EXISTS (
       SELECT 1 FROM ${table} WHERE workspace_id = $1 AND id = $2
     ) AS found`,
    [workspaceId, objectId]
  );
  return booleanValue(result.rows[0]?.found, "object existence");
}

function memberFromRow(row: MemberRow): MemberView {
  return {
    displayName: nullableString(row.display_name, "display name"),
    githubLogin: stringValue(row.github_login, "GitHub login"),
    joinedAt: timestamp(row.joined_at, "joined at"),
    role: collaborationRole(row.role),
    REDACTEDId: stringValue(row.REDACTED_id, "REDACTED id")
  };
}

function commentFromRow(row: CommentRow): CommentView {
  return {
    authorUserId: stringValue(row.author_REDACTED_id, "author REDACTED id"),
    body: stringValue(row.body, "comment body"),
    commentId: stringValue(row.id, "comment id"),
    createdAt: timestamp(row.created_at, "created at"),
    editedAt: nullableTimestamp(row.edited_at, "edited at")
  };
}

function approvalFromRow(row: ApprovalRow): ApprovalView {
  const decision = stringValue(row.decision, "decision");
  if (decision !== "approved" && decision !== "rejected") {
    throw new Error("PostgreSQL returned an invalid approval decision.");
  }
  return {
    approvalId: stringValue(row.id, "approval id"),
    createdAt: timestamp(row.created_at, "created at"),
    decision,
    reasonCode: nullableString(row.reason_code, "reason code"),
    recommendationId: stringValue(row.recommendation_id, "recommendation id"),
    REDACTEDId: stringValue(row.REDACTED_id, "REDACTED id")
  };
}

function deviceFromRow(row: DeviceRow): DeviceProviderView {
  if (!Array.isArray(row.providers) || !row.providers.every((item) => typeof item === "string")) {
    throw new Error("PostgreSQL returned invalid device providers.");
  }
  return {
    companionVersion: nullableString(row.companion_version, "companion version"),
    deviceId: stringValue(row.id, "device id"),
    displayName: stringValue(row.display_name, "display name"),
    lastSeenAt: nullableTimestamp(row.last_seen_at, "last seen at"),
    platform: stringValue(row.platform, "platform"),
    providers: row.providers,
    state: stringValue(row.state, "device state")
  };
}

function integrationFromRow(row: IntegrationRow): IntegrationView {
  return {
    accountLogin: stringValue(row.account_login, "account login"),
    installedAt: timestamp(row.created_at, "installed at"),
    integrationId: stringValue(row.id, "integration id"),
    provider: "github",
    state: row.suspended_at === null ? "active" : "suspended"
  };
}

function auditFromRow(row: AuditRow): AuditView {
  return {
    action: stringValue(row.action, "action"),
    actorType: stringValue(row.actor_type, "actor type"),
    actorUserId: nullableString(row.actor_REDACTED_id, "actor REDACTED id"),
    auditId: stringValue(row.id, "audit id"),
    category: stringValue(row.category, "category"),
    objectId: stringValue(row.object_id, "object id"),
    objectType: stringValue(row.object_type, "object type"),
    occurredAt: timestamp(row.occurred_at, "occurred at"),
    outcome: stringValue(row.outcome, "outcome")
  };
}

function collaborationRole(value: unknown): CollaborationRole {
  const role = stringValue(value, "workspace role");
  if (!["owner", "maintainer", "developer", "reviewer", "observer", "member"].includes(role)) {
    throw new Error("PostgreSQL returned an invalid workspace role.");
  }
  return role as CollaborationRole;
}

function singleRow<Row>(result: PostgresQueryResult<Row>, operation: string): Row {
  const row = result.rows[0];
  if (row === undefined) {
    throw new Error(`PostgreSQL returned no row for ${operation}.`);
  }
  return row;
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`PostgreSQL returned invalid ${field}.`);
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  return value === null ? null : stringValue(value, field);
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`PostgreSQL returned invalid ${field}.`);
  }
  return value;
}

function integer(value: unknown, field: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "bigint" || (typeof value === "string" && /^[0-9]+$/u.test(value))
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`PostgreSQL returned invalid ${field}.`);
  }
  return parsed;
}

function timestamp(value: unknown, field: string): string {
  const time =
    value instanceof Date
      ? value
      : typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : new Date(Number.NaN);
  if (!Number.isFinite(time.getTime())) {
    throw new Error(`PostgreSQL returned invalid ${field}.`);
  }
  return time.toISOString();
}

function nullableTimestamp(value: unknown, field: string): string | null {
  return value === null ? null : timestamp(value, field);
}
