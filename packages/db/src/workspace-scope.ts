import { and, eq, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export class WorkspaceScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceScopeError";
  }
}

export function assertWorkspaceId(workspaceId: string): void {
  if (!uuidPattern.test(workspaceId)) {
    throw new WorkspaceScopeError("A valid workspace ID is required");
  }
}

/**
 * Central predicate constructor for every tenant query. Callers provide the
 * table's workspace column; the tenant filter cannot be omitted accidentally.
 */
export function workspaceWhere(
  workspaceId: string,
  workspaceColumn: AnyPgColumn,
  ...conditions: readonly (SQL | undefined)[]
): SQL {
  assertWorkspaceId(workspaceId);
  const predicate = and(eq(workspaceColumn, workspaceId), ...conditions);
  if (predicate === undefined) {
    throw new WorkspaceScopeError("Unable to construct a workspace predicate");
  }
  return predicate;
}

/**
 * Adds a trusted workspace ID to insert values and rejects attempts to smuggle
 * a different tenant ID through a generic object.
 */
export function inWorkspace<Value extends Readonly<Record<string, unknown>>>(
  workspaceId: string,
  value: Value
): Value & { readonly workspaceId: string } {
  assertWorkspaceId(workspaceId);
  if (
    Object.hasOwn(value, "workspaceId") &&
    value.workspaceId !== undefined &&
    value.workspaceId !== workspaceId
  ) {
    throw new WorkspaceScopeError("Insert values belong to a different workspace");
  }
  return { ...value, workspaceId };
}

export class WorkspaceScope {
  readonly workspaceId: string;

  constructor(workspaceId: string) {
    assertWorkspaceId(workspaceId);
    this.workspaceId = workspaceId;
  }

  where(workspaceColumn: AnyPgColumn, ...conditions: readonly (SQL | undefined)[]): SQL {
    return workspaceWhere(this.workspaceId, workspaceColumn, ...conditions);
  }

  values<Value extends Readonly<Record<string, unknown>>>(
    value: Value
  ): Value & { readonly workspaceId: string } {
    return inWorkspace(this.workspaceId, value);
  }
}
