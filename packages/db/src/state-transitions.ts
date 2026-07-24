import { and, eq, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";

import type { ReconcilerDatabase } from "./database.js";
import { candidates, recommendations, validationJobs } from "./schema/index.js";
import { assertWorkspaceId } from "./workspace-scope.js";

export type CandidateState =
  | "applied"
  | "approved"
  | "draft"
  | "inconclusive"
  | "ready_for_validation"
  | "stale"
  | "static_rejected"
  | "validating"
  | "validation_failed"
  | "verified";

export type ValidationJobState =
  | "benchmark"
  | "build"
  | "cleanup"
  | "evidence_persist"
  | "install"
  | "preflight"
  | "provisioning"
  | "queued"
  | "resolve"
  | "smoke"
  | "source_prepare"
  | "terminal"
  | "test";

export type ValidationTerminalOutcome =
  | "cancelled"
  | "failed"
  | "inconclusive"
  | "infrastructure"
  | "passed"
  | "security_blocked"
  | "timed_out"
  | "unsupported";

export type RecommendationState =
  "applied" | "approved" | "draft" | "invalidated" | "rejected" | "reviewable" | "superseded";

export class StateTransitionError extends Error {
  readonly code: "conflict" | "invalid_transition" | "not_found";

  constructor(code: StateTransitionError["code"], message: string) {
    super(message);
    this.name = "StateTransitionError";
    this.code = code;
  }
}

export interface TransitionInput<State extends string> {
  readonly workspaceId: string;
  readonly id: string;
  readonly expectedState: State;
  readonly nextState: State;
  readonly idempotencyKey: string;
  readonly now?: Date;
}

export interface ValidationJobTransitionInput extends TransitionInput<ValidationJobState> {
  readonly terminalOutcome?: ValidationTerminalOutcome;
}

const candidateTransitions: Readonly<Record<CandidateState, readonly CandidateState[]>> = {
  draft: ["static_rejected", "ready_for_validation"],
  static_rejected: [],
  ready_for_validation: ["validating", "stale"],
  validating: ["validation_failed", "inconclusive", "verified", "stale"],
  validation_failed: [],
  inconclusive: [],
  verified: ["approved", "stale"],
  stale: [],
  approved: ["applied", "stale"],
  applied: []
};

const validationJobTransitions: Readonly<
  Record<ValidationJobState, readonly ValidationJobState[]>
> = {
  queued: ["provisioning"],
  provisioning: ["preflight", "cleanup"],
  preflight: ["source_prepare", "cleanup"],
  source_prepare: ["resolve", "cleanup"],
  resolve: ["install", "cleanup"],
  install: ["build", "cleanup"],
  build: ["test", "cleanup"],
  test: ["smoke", "cleanup"],
  smoke: ["benchmark", "evidence_persist", "cleanup"],
  benchmark: ["evidence_persist", "cleanup"],
  evidence_persist: ["cleanup"],
  cleanup: ["terminal"],
  terminal: []
};

const recommendationTransitions: Readonly<
  Record<RecommendationState, readonly RecommendationState[]>
> = {
  draft: ["reviewable", "invalidated", "rejected", "superseded"],
  reviewable: ["approved", "invalidated", "rejected", "superseded"],
  approved: ["applied", "invalidated", "superseded"],
  applied: [],
  invalidated: [],
  rejected: [],
  superseded: []
};

export async function transitionCandidate<TQueryResult extends PgQueryResultHKT>(
  database: ReconcilerDatabase<TQueryResult>,
  input: TransitionInput<CandidateState>
): Promise<typeof candidates.$inferSelect> {
  validateTransitionInput(input);
  assertAllowed(candidateTransitions, input.expectedState, input.nextState);
  const updated = (
    await database
      .update(candidates)
      .set({
        state: input.nextState,
        stateVersion: sql`${candidates.stateVersion} + 1`,
        lastTransitionKey: input.idempotencyKey,
        updatedAt: input.now ?? new Date()
      })
      .where(
        and(
          eq(candidates.workspaceId, input.workspaceId),
          eq(candidates.id, input.id),
          eq(candidates.state, input.expectedState)
        )
      )
      .returning()
  )[0];
  if (updated !== undefined) {
    return updated;
  }
  return resolveTransitionMiss(
    await selectCandidate(database, input.workspaceId, input.id),
    input.nextState,
    input.idempotencyKey
  );
}

export async function transitionValidationJob<TQueryResult extends PgQueryResultHKT>(
  database: ReconcilerDatabase<TQueryResult>,
  input: ValidationJobTransitionInput
): Promise<typeof validationJobs.$inferSelect> {
  validateTransitionInput(input);
  assertAllowed(validationJobTransitions, input.expectedState, input.nextState);
  if (
    (input.nextState === "terminal" && input.terminalOutcome === undefined) ||
    (input.nextState !== "terminal" && input.terminalOutcome !== undefined)
  ) {
    throw new StateTransitionError(
      "invalid_transition",
      "A terminal outcome is required exactly when entering terminal state"
    );
  }
  const now = input.now ?? new Date();
  const updated = (
    await database
      .update(validationJobs)
      .set({
        state: input.nextState,
        stateVersion: sql`${validationJobs.stateVersion} + 1`,
        lastTransitionKey: input.idempotencyKey,
        updatedAt: now,
        ...(input.nextState === "terminal"
          ? { terminalOutcome: input.terminalOutcome, completedAt: now }
          : {})
      })
      .where(
        and(
          eq(validationJobs.workspaceId, input.workspaceId),
          eq(validationJobs.id, input.id),
          eq(validationJobs.state, input.expectedState)
        )
      )
      .returning()
  )[0];
  if (updated !== undefined) {
    return updated;
  }
  return resolveTransitionMiss(
    await selectValidationJob(database, input.workspaceId, input.id),
    input.nextState,
    input.idempotencyKey
  );
}

export async function transitionRecommendation<TQueryResult extends PgQueryResultHKT>(
  database: ReconcilerDatabase<TQueryResult>,
  input: TransitionInput<RecommendationState>
): Promise<typeof recommendations.$inferSelect> {
  validateTransitionInput(input);
  assertAllowed(recommendationTransitions, input.expectedState, input.nextState);
  const updated = (
    await database
      .update(recommendations)
      .set({
        state: input.nextState,
        stateVersion: sql`${recommendations.stateVersion} + 1`,
        lastTransitionKey: input.idempotencyKey,
        updatedAt: input.now ?? new Date()
      })
      .where(
        and(
          eq(recommendations.workspaceId, input.workspaceId),
          eq(recommendations.id, input.id),
          eq(recommendations.state, input.expectedState)
        )
      )
      .returning()
  )[0];
  if (updated !== undefined) {
    return updated;
  }
  return resolveTransitionMiss(
    await selectRecommendation(database, input.workspaceId, input.id),
    input.nextState,
    input.idempotencyKey
  );
}

function validateTransitionInput<State extends string>(input: TransitionInput<State>): void {
  assertWorkspaceId(input.workspaceId);
  if (input.id.trim().length === 0 || input.idempotencyKey.trim().length === 0) {
    throw new StateTransitionError(
      "invalid_transition",
      "Transition IDs and idempotency keys must not be empty"
    );
  }
}

function assertAllowed<State extends string>(
  graph: Readonly<Record<State, readonly State[]>>,
  expectedState: State,
  nextState: State
): void {
  if (!graph[expectedState].includes(nextState)) {
    throw new StateTransitionError(
      "invalid_transition",
      `Transition from ${expectedState} to ${nextState} is not allowed`
    );
  }
}

function resolveTransitionMiss<Row extends { lastTransitionKey: string | null; state: string }>(
  row: Row | undefined,
  nextState: string,
  idempotencyKey: string
): Row {
  if (row === undefined) {
    throw new StateTransitionError("not_found", "Stateful object was not found in this workspace");
  }
  if (row.state === nextState && row.lastTransitionKey === idempotencyKey) {
    return row;
  }
  throw new StateTransitionError("conflict", "Expected prior state did not match");
}

async function selectCandidate<TQueryResult extends PgQueryResultHKT>(
  database: ReconcilerDatabase<TQueryResult>,
  workspaceId: string,
  id: string
): Promise<typeof candidates.$inferSelect | undefined> {
  return (
    await database
      .select()
      .from(candidates)
      .where(and(eq(candidates.workspaceId, workspaceId), eq(candidates.id, id)))
      .limit(1)
  )[0];
}

async function selectValidationJob<TQueryResult extends PgQueryResultHKT>(
  database: ReconcilerDatabase<TQueryResult>,
  workspaceId: string,
  id: string
): Promise<typeof validationJobs.$inferSelect | undefined> {
  return (
    await database
      .select()
      .from(validationJobs)
      .where(and(eq(validationJobs.workspaceId, workspaceId), eq(validationJobs.id, id)))
      .limit(1)
  )[0];
}

async function selectRecommendation<TQueryResult extends PgQueryResultHKT>(
  database: ReconcilerDatabase<TQueryResult>,
  workspaceId: string,
  id: string
): Promise<typeof recommendations.$inferSelect | undefined> {
  return (
    await database
      .select()
      .from(recommendations)
      .where(and(eq(recommendations.workspaceId, workspaceId), eq(recommendations.id, id)))
      .limit(1)
  )[0];
}
