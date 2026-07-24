import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";

import type { ReconcilerDatabase } from "./database.js";
import { externalOperations } from "./schema/index.js";
import { assertWorkspaceId } from "./workspace-scope.js";

export interface ReserveExternalOperationInput {
  readonly id: string;
  readonly workspaceId: string;
  readonly projectId?: string;
  readonly operationKey: string;
  readonly provider: "braintrust" | "daytona" | "fireworks" | "github" | "queue" | "r2";
  readonly operationKind: string;
  readonly requestFingerprint: string;
}

export class ExternalOperationConflictError extends Error {
  constructor() {
    super("The external operation key is bound to a different request");
    this.name = "ExternalOperationConflictError";
  }
}

export async function reserveExternalOperation<TQueryResult extends PgQueryResultHKT>(
  database: ReconcilerDatabase<TQueryResult>,
  input: ReserveExternalOperationInput
): Promise<typeof externalOperations.$inferSelect> {
  assertWorkspaceId(input.workspaceId);
  if (
    input.operationKey.trim().length === 0 ||
    input.operationKind.trim().length === 0 ||
    input.requestFingerprint.trim().length === 0
  ) {
    throw new TypeError("External operation bindings must not be empty");
  }

  const values: typeof externalOperations.$inferInsert = {
    id: input.id,
    workspaceId: input.workspaceId,
    operationKey: input.operationKey,
    provider: input.provider,
    operationKind: input.operationKind,
    requestFingerprint: input.requestFingerprint,
    ...(input.projectId === undefined ? {} : { projectId: input.projectId })
  };
  const inserted = await database
    .insert(externalOperations)
    .values(values)
    .onConflictDoNothing({
      target: [externalOperations.workspaceId, externalOperations.operationKey]
    })
    .returning();
  const created = inserted[0];
  if (created !== undefined) {
    return created;
  }

  const existing = (
    await database
      .select()
      .from(externalOperations)
      .where(
        and(
          eq(externalOperations.workspaceId, input.workspaceId),
          eq(externalOperations.operationKey, input.operationKey)
        )
      )
      .limit(1)
  )[0];
  if (existing?.id !== input.id) {
    throw new ExternalOperationConflictError();
  }
  if (
    existing.projectId !== (input.projectId ?? null) ||
    existing.provider !== input.provider ||
    existing.operationKind !== input.operationKind ||
    existing.requestFingerprint !== input.requestFingerprint
  ) {
    throw new ExternalOperationConflictError();
  }
  return existing;
}
