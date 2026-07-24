export const databasePackageStatus = "foundation" as const;

export {
  AuditIdempotencyConflictError,
  appendAuditEvent,
  type AppendAuditEventInput,
  type AuditActor,
  type AuditCategory
} from "./audit-service.js";
export type { ReconcilerDatabase, ReconcilerSchema } from "./database.js";
export {
  ExternalOperationConflictError,
  reserveExternalOperation,
  type ReserveExternalOperationInput
} from "./external-operation-service.js";
export * from "./schema/index.js";
export { developmentSeed, seedDevelopmentDatabase } from "./seed.js";
export {
  StateTransitionError,
  transitionCandidate,
  transitionRecommendation,
  transitionValidationJob,
  type CandidateState,
  type RecommendationState,
  type TransitionInput,
  type ValidationJobState,
  type ValidationJobTransitionInput,
  type ValidationTerminalOutcome
} from "./state-transitions.js";
export {
  WorkspaceScope,
  WorkspaceScopeError,
  assertWorkspaceId,
  inWorkspace,
  workspaceWhere
} from "./workspace-scope.js";
