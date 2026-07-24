import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";

import type { ReconcilerDatabase } from "./database.js";
import { auditLog } from "./schema/index.js";
import { assertWorkspaceId } from "./workspace-scope.js";

export type AuditCategory =
  | "approval"
  | "authentication"
  | "behavior_contract"
  | "collaboration"
  | "cleanup"
  | "deletion"
  | "device"
  | "export"
  | "external_side_effect"
  | "github_write"
  | "integration"
  | "installation"
  | "membership"
  | "policy"
  | "privacy"
  | "retention";

export type AuditActor =
  | { readonly type: "device"; readonly deviceId: string }
  | { readonly type: "provider"; readonly pseudonymDigest: string }
  | { readonly type: "system"; readonly pseudonymDigest: string }
  | { readonly type: "REDACTED"; readonly REDACTEDId: string };

export interface AppendAuditEventInput {
  readonly id: string;
  readonly workspaceId: string;
  readonly projectId?: string;
  readonly actor: AuditActor;
  readonly category: AuditCategory;
  readonly action: string;
  readonly objectType: string;
  readonly objectId: string;
  readonly objectDigest: string;
  readonly outcome: "denied" | "failed" | "succeeded";
  readonly idempotencyKey: string;
  readonly occurredAt: Date;
  readonly metadataDigest: string;
}

export class AuditIdempotencyConflictError extends Error {
  constructor() {
    super("The audit idempotency key is already bound to a different event");
    this.name = "AuditIdempotencyConflictError";
  }
}

/**
 * The only application write path for audit_log. Database triggers separately
 * prohibit UPDATE and DELETE, including writes outside this service.
 */
export async function appendAuditEvent<TQueryResult extends PgQueryResultHKT>(
  database: ReconcilerDatabase<TQueryResult>,
  input: AppendAuditEventInput
): Promise<typeof auditLog.$inferSelect> {
  validateAuditInput(input);
  const actorColumns = actorToColumns(input.actor);
  const values: typeof auditLog.$inferInsert = {
    id: input.id,
    workspaceId: input.workspaceId,
    actorType: input.actor.type,
    category: input.category,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId,
    objectDigest: input.objectDigest,
    outcome: input.outcome,
    idempotencyKey: input.idempotencyKey,
    occurredAt: input.occurredAt,
    metadataDigest: input.metadataDigest,
    ...actorColumns,
    ...(input.projectId === undefined ? {} : { projectId: input.projectId })
  };
  const inserted = await database
    .insert(auditLog)
    .values(values)
    .onConflictDoNothing({
      target: [auditLog.workspaceId, auditLog.idempotencyKey]
    })
    .returning();
  const created = inserted[0];
  if (created !== undefined) {
    return created;
  }

  const existing = (
    await database
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.workspaceId, input.workspaceId),
          eq(auditLog.idempotencyKey, input.idempotencyKey)
        )
      )
      .limit(1)
  )[0];
  if (existing === undefined || !sameAuditBinding(existing, values)) {
    throw new AuditIdempotencyConflictError();
  }
  return existing;
}

function actorToColumns(
  actor: AuditActor
): Pick<typeof auditLog.$inferInsert, "actorDeviceId" | "actorPseudonymDigest" | "actorUserId"> {
  if (actor.type === "REDACTED") {
    return { actorUserId: actor.REDACTEDId };
  }
  if (actor.type === "device") {
    return { actorDeviceId: actor.deviceId };
  }
  return { actorPseudonymDigest: actor.pseudonymDigest };
}

function validateAuditInput(input: AppendAuditEventInput): void {
  assertWorkspaceId(input.workspaceId);
  for (const value of [
    input.id,
    input.action,
    input.objectType,
    input.objectId,
    input.objectDigest,
    input.idempotencyKey,
    input.metadataDigest
  ]) {
    if (value.trim().length === 0) {
      throw new TypeError("Audit event bindings must not be empty");
    }
  }
  if (!Number.isFinite(input.occurredAt.getTime())) {
    throw new TypeError("Audit event time must be valid");
  }
}

function sameAuditBinding(
  existing: typeof auditLog.$inferSelect,
  expected: typeof auditLog.$inferInsert
): boolean {
  return (
    existing.id === expected.id &&
    existing.projectId === (expected.projectId ?? null) &&
    existing.actorType === expected.actorType &&
    existing.actorUserId === (expected.actorUserId ?? null) &&
    existing.actorDeviceId === (expected.actorDeviceId ?? null) &&
    existing.actorPseudonymDigest === (expected.actorPseudonymDigest ?? null) &&
    existing.category === expected.category &&
    existing.action === expected.action &&
    existing.objectType === expected.objectType &&
    existing.objectId === expected.objectId &&
    existing.objectDigest === expected.objectDigest &&
    existing.outcome === expected.outcome &&
    existing.occurredAt.getTime() === expected.occurredAt.getTime() &&
    existing.metadataDigest === expected.metadataDigest
  );
}
