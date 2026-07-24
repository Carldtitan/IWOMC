import {
  type BehaviorContract,
  type BehaviorAssertion,
  type BehaviorStep,
  type OptimalityPolicy,
  type PolicyBudgets,
  type PolicyConstraint,
  type PolicyObjective
} from "@environment-REDACTED/contracts";
import {
  type EditableProjectGoal,
  type ProjectGoalPriorityInput
} from "@environment-REDACTED/REDACTED";

export type ConfigurationRole =
  "owner" | "maintainer" | "developer" | "reviewer" | "observer" | "member";

export interface ConfigurationProject {
  readonly projectId: string;
  readonly workspaceId: string;
}

export interface VersionedOptimalityPolicy {
  readonly document: OptimalityPolicy;
  /**
   * These constraints are correctness gates. Policy edits may add constraints,
   * but may never remove or weaken this set.
   */
  readonly protectedConstraintIds: readonly string[];
}

export interface ConfigurationAuditEvent {
  readonly action:
    | "project_goal_edited"
    | "behavior_contract_edited"
    | "behavior_steps_reordered"
    | "behavior_step_enabled"
    | "behavior_step_disabled"
    | "behavior_contract_accepted"
    | "optimality_policy_edited";
  readonly actorUserId: string;
  readonly afterVersion: number;
  readonly auditId: string;
  readonly beforeVersion: number;
  readonly category: "behavior_contract" | "policy";
  readonly idempotencyKey: string;
  readonly objectId: string;
  readonly objectType: "behavior_contract" | "optimality_policy" | "project_goal";
  readonly occurredAt: string;
  readonly outcome: "succeeded";
  readonly projectId: string;
  readonly workspaceId: string;
}

export interface CandidateBindingInvalidation {
  readonly bindingKind: "behavior_contract" | "optimality_policy" | "project_goal";
  readonly bindingObjectId: string;
  readonly bindingVersion: number;
  readonly reason:
    "behavior_contract_changed" | "optimality_policy_changed" | "project_goal_changed";
}

export interface AppendConfigurationRevision<T> {
  readonly audit: ConfigurationAuditEvent;
  readonly expectedVersion: number;
  readonly invalidateCandidatesBoundTo: CandidateBindingInvalidation;
  readonly next: T;
  readonly projectId: string;
  readonly workspaceId: string;
}

export type AppendConfigurationResult = "appended" | "not_found" | "version_conflict";

/**
 * Persistence implementations MUST insert the revision, mark affected
 * candidates stale, advance the current pointer with expectedVersion, and
 * append the audit event in one transaction. Existing revisions are immutable.
 */
export interface ConfigurationPersistence {
  getProject(projectId: string): Promise<ConfigurationProject | undefined>;
  membershipRole(workspaceId: string, REDACTEDId: string): Promise<ConfigurationRole | undefined>;
  getProjectGoal(projectId: string): Promise<EditableProjectGoal | undefined>;
  getBehaviorContract(projectId: string): Promise<BehaviorContract | undefined>;
  getOptimalityPolicy(projectId: string): Promise<VersionedOptimalityPolicy | undefined>;
  appendProjectGoalRevision(
    input: AppendConfigurationRevision<EditableProjectGoal>
  ): Promise<AppendConfigurationResult>;
  appendBehaviorContractRevision(
    input: AppendConfigurationRevision<BehaviorContract>
  ): Promise<AppendConfigurationResult>;
  appendOptimalityPolicyRevision(
    input: AppendConfigurationRevision<VersionedOptimalityPolicy>
  ): Promise<AppendConfigurationResult>;
}

export interface ConfigurationRuntime {
  now(): string;
  randomUuid(): string;
}

export interface EditProjectGoalRequest {
  readonly actorUserId: string;
  readonly expectedVersion: number;
  readonly nonFunctionalPriorities?: readonly ProjectGoalPriorityInput[];
  readonly projectId: string;
  readonly statement?: string;
}

export interface EditBehaviorContractRequest {
  readonly actorUserId: string;
  readonly expectedVersion: number;
  readonly projectId: string;
  readonly sourceInputDigest?: string;
  readonly steps: unknown;
}

export interface EditOptimalityPolicyRequest {
  readonly actorUserId: string;
  readonly expectedVersion: number;
  readonly patch: unknown;
  readonly projectId: string;
}

export class ConfigurationError extends Error {
  readonly code: "forbidden" | "invalid_configuration" | "not_found" | "version_conflict";

  constructor(code: ConfigurationError["code"]) {
    super(code);
    this.name = "ConfigurationError";
    this.code = code;
  }
}

export interface ConfigurationApi {
  getProjectGoal(projectId: string, actorUserId: string): Promise<EditableProjectGoal>;
  editProjectGoal(input: EditProjectGoalRequest): Promise<EditableProjectGoal>;
  getBehaviorContract(projectId: string, actorUserId: string): Promise<BehaviorContract>;
  editBehaviorContract(input: EditBehaviorContractRequest): Promise<BehaviorContract>;
  reorderBehaviorSteps(input: {
    readonly actorUserId: string;
    readonly expectedVersion: number;
    readonly orderedStepIds: readonly string[];
    readonly projectId: string;
  }): Promise<BehaviorContract>;
  setBehaviorStepEnabled(input: {
    readonly actorUserId: string;
    readonly enabled: boolean;
    readonly expectedVersion: number;
    readonly projectId: string;
    readonly stepId: string;
  }): Promise<BehaviorContract>;
  acceptBehaviorContract(input: {
    readonly actorUserId: string;
    readonly expectedVersion: number;
    readonly projectId: string;
  }): Promise<BehaviorContract>;
  getOptimalityPolicy(projectId: string, actorUserId: string): Promise<VersionedOptimalityPolicy>;
  editOptimalityPolicy(input: EditOptimalityPolicyRequest): Promise<VersionedOptimalityPolicy>;
}

export class ConfigurationService implements ConfigurationApi {
  readonly #persistence: ConfigurationPersistence;
  readonly #runtime: ConfigurationRuntime;

  constructor(persistence: ConfigurationPersistence, runtime: ConfigurationRuntime) {
    this.#persistence = persistence;
    this.#runtime = runtime;
  }

  async getProjectGoal(projectId: string, actorUserId: string): Promise<EditableProjectGoal> {
    await this.#authorize(projectId, actorUserId, false);
    return this.#required(this.#persistence.getProjectGoal(projectId));
  }

  async editProjectGoal(input: EditProjectGoalRequest): Promise<EditableProjectGoal> {
    const project = await this.#authorize(input.projectId, input.actorUserId, true);
    const current = await this.#required(this.#persistence.getProjectGoal(input.projectId));
    this.#assertVersion(current.version, input.expectedVersion);
    let next: EditableProjectGoal;
    try {
      next = reviseProjectGoal(current, {
        actorUserId: input.actorUserId,
        ...(input.nonFunctionalPriorities === undefined
          ? {}
          : { nonFunctionalPriorities: input.nonFunctionalPriorities }),
        ...(input.statement === undefined ? {} : { statement: input.statement }),
        updatedAt: this.#runtime.now()
      });
    } catch (error) {
      throw mapDomainError(error);
    }
    await this.#append(
      this.#persistence.appendProjectGoalRevision({
        audit: this.#audit(project, input.actorUserId, {
          action: "project_goal_edited",
          afterVersion: next.version,
          beforeVersion: current.version,
          category: "policy",
          objectId: current.goalId,
          objectType: "project_goal"
        }),
        expectedVersion: input.expectedVersion,
        invalidateCandidatesBoundTo: {
          bindingKind: "project_goal",
          bindingObjectId: current.goalId,
          bindingVersion: current.version,
          reason: "project_goal_changed"
        },
        next,
        projectId: project.projectId,
        workspaceId: project.workspaceId
      })
    );
    return next;
  }

  async getBehaviorContract(projectId: string, actorUserId: string): Promise<BehaviorContract> {
    await this.#authorize(projectId, actorUserId, false);
    return this.#required(this.#persistence.getBehaviorContract(projectId));
  }

  async editBehaviorContract(input: EditBehaviorContractRequest): Promise<BehaviorContract> {
    const project = await this.#authorize(input.projectId, input.actorUserId, true);
    const current = await this.#required(this.#persistence.getBehaviorContract(input.projectId));
    this.#assertVersion(current.version, input.expectedVersion);
    let next: BehaviorContract;
    try {
      const steps = decodeBehaviorSteps(current, input.steps);
      next = await reviseContract(current, {
        ...(input.sourceInputDigest === undefined
          ? {}
          : { sourceInputDigest: input.sourceInputDigest }),
        steps,
        updatedAt: this.#runtime.now()
      });
    } catch (error) {
      throw mapDomainError(error);
    }
    await this.#appendContract(
      project,
      input.actorUserId,
      current,
      next,
      "behavior_contract_edited"
    );
    return next;
  }

  async reorderBehaviorSteps(input: {
    readonly actorUserId: string;
    readonly expectedVersion: number;
    readonly orderedStepIds: readonly string[];
    readonly projectId: string;
  }): Promise<BehaviorContract> {
    const project = await this.#authorize(input.projectId, input.actorUserId, true);
    const current = await this.#required(this.#persistence.getBehaviorContract(input.projectId));
    this.#assertVersion(current.version, input.expectedVersion);
    let next: BehaviorContract;
    try {
      const steps = reorderSteps(current.steps, input.orderedStepIds);
      next = await reviseContract(current, {
        steps,
        updatedAt: this.#runtime.now()
      });
    } catch (error) {
      throw mapDomainError(error);
    }
    await this.#appendContract(
      project,
      input.actorUserId,
      current,
      next,
      "behavior_steps_reordered"
    );
    return next;
  }

  async setBehaviorStepEnabled(input: {
    readonly actorUserId: string;
    readonly enabled: boolean;
    readonly expectedVersion: number;
    readonly projectId: string;
    readonly stepId: string;
  }): Promise<BehaviorContract> {
    const project = await this.#authorize(input.projectId, input.actorUserId, true);
    const current = await this.#required(this.#persistence.getBehaviorContract(input.projectId));
    this.#assertVersion(current.version, input.expectedVersion);
    let next: BehaviorContract;
    try {
      const steps = setStepEnabled(current.steps, input.stepId, input.enabled);
      next = await reviseContract(current, {
        steps,
        updatedAt: this.#runtime.now()
      });
    } catch (error) {
      throw mapDomainError(error);
    }
    await this.#appendContract(
      project,
      input.actorUserId,
      current,
      next,
      input.enabled ? "behavior_step_enabled" : "behavior_step_disabled"
    );
    return next;
  }

  async acceptBehaviorContract(input: {
    readonly actorUserId: string;
    readonly expectedVersion: number;
    readonly projectId: string;
  }): Promise<BehaviorContract> {
    const project = await this.#authorize(input.projectId, input.actorUserId, true);
    const current = await this.#required(this.#persistence.getBehaviorContract(input.projectId));
    this.#assertVersion(current.version, input.expectedVersion);
    let next: BehaviorContract;
    try {
      next = await acceptContract(current, {
        acceptedAt: this.#runtime.now(),
        actorId: input.actorUserId
      });
    } catch (error) {
      throw mapDomainError(error);
    }
    await this.#appendContract(
      project,
      input.actorUserId,
      current,
      next,
      "behavior_contract_accepted"
    );
    return next;
  }

  async getOptimalityPolicy(
    projectId: string,
    actorUserId: string
  ): Promise<VersionedOptimalityPolicy> {
    await this.#authorize(projectId, actorUserId, false);
    return this.#required(this.#persistence.getOptimalityPolicy(projectId));
  }

  async editOptimalityPolicy(
    input: EditOptimalityPolicyRequest
  ): Promise<VersionedOptimalityPolicy> {
    const project = await this.#authorize(input.projectId, input.actorUserId, true);
    const current = await this.#required(this.#persistence.getOptimalityPolicy(input.projectId));
    this.#assertVersion(current.document.version, input.expectedVersion);
    let next: VersionedOptimalityPolicy;
    try {
      next = await reviseOptimalityPolicy(
        current,
        input.patch,
        input.actorUserId,
        this.#runtime.now()
      );
    } catch (error) {
      throw mapDomainError(error);
    }
    await this.#append(
      this.#persistence.appendOptimalityPolicyRevision({
        audit: this.#audit(project, input.actorUserId, {
          action: "optimality_policy_edited",
          afterVersion: next.document.version,
          beforeVersion: current.document.version,
          category: "policy",
          objectId: current.document.policyId,
          objectType: "optimality_policy"
        }),
        expectedVersion: input.expectedVersion,
        invalidateCandidatesBoundTo: {
          bindingKind: "optimality_policy",
          bindingObjectId: current.document.policyId,
          bindingVersion: current.document.version,
          reason: "optimality_policy_changed"
        },
        next,
        projectId: project.projectId,
        workspaceId: project.workspaceId
      })
    );
    return next;
  }

  async #appendContract(
    project: ConfigurationProject,
    actorUserId: string,
    current: BehaviorContract,
    next: BehaviorContract,
    action: ConfigurationAuditEvent["action"]
  ): Promise<void> {
    await this.#append(
      this.#persistence.appendBehaviorContractRevision({
        audit: this.#audit(project, actorUserId, {
          action,
          afterVersion: next.version,
          beforeVersion: current.version,
          category: "behavior_contract",
          objectId: current.contractId,
          objectType: "behavior_contract"
        }),
        expectedVersion: current.version,
        invalidateCandidatesBoundTo: {
          bindingKind: "behavior_contract",
          bindingObjectId: current.contractId,
          bindingVersion: current.version,
          reason: "behavior_contract_changed"
        },
        next,
        projectId: project.projectId,
        workspaceId: project.workspaceId
      })
    );
  }

  async #authorize(
    projectId: string,
    REDACTEDId: string,
    mutation: boolean
  ): Promise<ConfigurationProject> {
    const project = await this.#required(this.#persistence.getProject(projectId));
    const role = await this.#persistence.membershipRole(project.workspaceId, REDACTEDId);
    if (role === undefined || (mutation && role !== "owner" && role !== "maintainer")) {
      throw new ConfigurationError("forbidden");
    }
    return project;
  }

  #assertVersion(current: number, expected: number): void {
    if (!Number.isSafeInteger(expected) || expected < 1 || current !== expected) {
      throw new ConfigurationError("version_conflict");
    }
  }

  async #required<T>(value: Promise<T | undefined>): Promise<T> {
    const resolved = await value;
    if (resolved === undefined) {
      throw new ConfigurationError("not_found");
    }
    return resolved;
  }

  async #append(result: Promise<AppendConfigurationResult>): Promise<void> {
    const outcome = await result;
    if (outcome !== "appended") {
      throw new ConfigurationError(outcome);
    }
  }

  #audit(
    project: ConfigurationProject,
    actorUserId: string,
    input: Omit<
      ConfigurationAuditEvent,
      | "actorUserId"
      | "auditId"
      | "idempotencyKey"
      | "occurredAt"
      | "outcome"
      | "projectId"
      | "workspaceId"
    >
  ): ConfigurationAuditEvent {
    const auditId = this.#runtime.randomUuid();
    return {
      ...input,
      actorUserId,
      auditId,
      idempotencyKey: `configuration:${auditId}`,
      occurredAt: this.#runtime.now(),
      outcome: "succeeded",
      projectId: project.projectId,
      workspaceId: project.workspaceId
    };
  }
}

async function reviseOptimalityPolicy(
  current: VersionedOptimalityPolicy,
  patchValue: unknown,
  actorUserId: string,
  createdAt: string
): Promise<VersionedOptimalityPolicy> {
  const patch = record(patchValue);
  const allowedFields = new Set([
    "budgets",
    "hardConstraints",
    "mode",
    "objectives",
    "requiredTargetIds"
  ]);
  if (Object.keys(patch).some((key) => !allowedFields.has(key))) {
    throw new ConfigurationError("invalid_configuration");
  }
  const rawDraft = {
    budgets: patch.budgets === undefined ? current.document.budgets : policyBudgets(patch.budgets),
    createdAt,
    createdBy: actorUserId,
    hardConstraints:
      patch.hardConstraints === undefined
        ? current.document.hardConstraints
        : policyConstraints(patch.hardConstraints),
    kind: "optimality_policy" as const,
    mode: patch.mode === undefined ? current.document.mode : policyMode(patch.mode),
    objectives:
      patch.objectives === undefined
        ? current.document.objectives
        : policyObjectives(patch.objectives),
    policyDigest: `sha256:${"0".repeat(64)}`,
    policyId: current.document.policyId,
    projectId: current.document.projectId,
    requiredTargetIds:
      patch.requiredTargetIds === undefined
        ? current.document.requiredTargetIds
        : requiredTargetIds(patch.requiredTargetIds),
    schemaVersion: 1 as const,
    version: current.document.version + 1,
    workspaceId: current.document.workspaceId
  };
  assertPolicySemantics(current, rawDraft);
  const document: OptimalityPolicy = {
    ...rawDraft,
    policyDigest: await objectDigest(rawDraft, "policyDigest")
  };
  return {
    document,
    protectedConstraintIds: [...current.protectedConstraintIds]
  };
}

function assertPolicySemantics(current: VersionedOptimalityPolicy, next: OptimalityPolicy): void {
  const nextById = new Map(
    next.hardConstraints.map((constraint) => [constraint.constraintId, constraint])
  );
  const currentById = new Map(
    current.document.hardConstraints.map((constraint) => [constraint.constraintId, constraint])
  );
  if (
    current.protectedConstraintIds.length === 0 ||
    new Set(next.hardConstraints.map((constraint) => constraint.constraintId)).size !==
      next.hardConstraints.length ||
    new Set(next.objectives.map((objective) => objective.objectiveId)).size !==
      next.objectives.length ||
    new Set(next.requiredTargetIds).size !== next.requiredTargetIds.length
  ) {
    throw new ConfigurationError("invalid_configuration");
  }
  for (const constraintId of current.protectedConstraintIds) {
    const before = currentById.get(constraintId);
    const after = nextById.get(constraintId);
    if (
      before === undefined ||
      after === undefined ||
      JSON.stringify(before) !== JSON.stringify(after)
    ) {
      throw new ConfigurationError("invalid_configuration");
    }
  }
}

function decodeBehaviorSteps(_current: BehaviorContract, steps: unknown): readonly BehaviorStep[] {
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > 1_024) {
    throw new ConfigurationError("invalid_configuration");
  }
  const decoded: BehaviorStep[] = [];
  const ids = new Set<string>();
  for (const [index, step] of steps.entries()) {
    if (!isBehaviorStep(step) || step.order !== index || ids.has(step.stepId)) {
      throw new ConfigurationError("invalid_configuration");
    }
    ids.add(step.stepId);
    decoded.push(structuredClone(step));
  }
  return decoded;
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ConfigurationError("invalid_configuration");
  }
  return value as Readonly<Record<string, unknown>>;
}

function mapDomainError(error: unknown): ConfigurationError {
  if (error instanceof ConfigurationError) {
    return error;
  }
  return new ConfigurationError("invalid_configuration");
}

function reviseProjectGoal(
  current: EditableProjectGoal,
  input: {
    readonly actorUserId: string;
    readonly nonFunctionalPriorities?: readonly ProjectGoalPriorityInput[];
    readonly statement?: string;
    readonly updatedAt: string;
  }
): EditableProjectGoal {
  const statement = (input.statement ?? current.statement).trim();
  if (statement.length === 0 || statement.length > 2_048) {
    throw new ConfigurationError("invalid_configuration");
  }
  const priorities =
    input.nonFunctionalPriorities === undefined
      ? current.nonFunctionalPriorities
      : input.nonFunctionalPriorities.map((priority, order) => {
          const priorityStatement = priority.statement.trim();
          if (priorityStatement.length === 0 || priorityStatement.length > 1_024) {
            throw new ConfigurationError("invalid_configuration");
          }
          return {
            kind: priority.kind,
            order,
            priorityId: priority.priorityId ?? `priority:${current.goalId}:${String(order)}`,
            statement: priorityStatement
          };
        });
  if (
    priorities.length > 32 ||
    new Set(priorities.map(({ priorityId }) => priorityId)).size !== priorities.length
  ) {
    throw new ConfigurationError("invalid_configuration");
  }
  return {
    ...current,
    nonFunctionalPriorities: priorities,
    statement,
    updatedAt: input.updatedAt,
    updatedBy: input.actorUserId,
    version: current.version + 1
  };
}

async function reviseContract(
  current: BehaviorContract,
  input: {
    readonly sourceInputDigest?: string;
    readonly steps: readonly BehaviorStep[];
    readonly updatedAt: string;
  }
): Promise<BehaviorContract> {
  if (
    input.steps.length === 0 ||
    (input.sourceInputDigest !== undefined && !isDigest(input.sourceInputDigest))
  ) {
    throw new ConfigurationError("invalid_configuration");
  }
  const raw: BehaviorContract = {
    contractDigest: `sha256:${"0".repeat(64)}`,
    contractId: current.contractId,
    createdAt: current.createdAt,
    invalidatedBySourceIds: [],
    kind: "behavior_contract",
    projectId: current.projectId,
    reviewAssessment: {
      evidenceReferenceIds: uniqueSorted(
        input.steps.flatMap((step) => step.discoveryEvidenceReferenceIds)
      ),
      reasonCodes: ["contract_edited_review_required"],
      state: "unknown"
    },
    reviewState: "needs_review",
    schemaVersion: 1,
    sourceInputDigest: input.sourceInputDigest ?? current.sourceInputDigest,
    steps: asBehaviorTuple(input.steps),
    updatedAt: input.updatedAt,
    version: current.version + 1,
    workspaceId: current.workspaceId
  };
  return {
    ...raw,
    contractDigest: await objectDigest(raw, "contractDigest")
  };
}

async function acceptContract(
  current: BehaviorContract,
  input: { readonly acceptedAt: string; readonly actorId: string }
): Promise<BehaviorContract> {
  if (
    current.reviewState === "invalidated" ||
    input.actorId.trim() === "" ||
    !current.steps.some(
      (step) =>
        step.enabled &&
        step.required &&
        ["build", "lint", "typecheck", "test", "smoke"].includes(step.kind)
    )
  ) {
    throw new ConfigurationError("invalid_configuration");
  }
  const raw: BehaviorContract = {
    ...current,
    acceptedAt: input.acceptedAt,
    acceptedBy: input.actorId,
    contractDigest: `sha256:${"0".repeat(64)}`,
    invalidatedBySourceIds: [],
    reviewAssessment: {
      evidenceReferenceIds: current.reviewAssessment.evidenceReferenceIds,
      reasonCodes: ["accepted_by_project_maintainer"],
      state: "known"
    },
    reviewState: "accepted",
    updatedAt: input.acceptedAt,
    version: current.version + 1
  };
  return {
    ...raw,
    contractDigest: await objectDigest(raw, "contractDigest")
  };
}

function reorderSteps(
  steps: readonly BehaviorStep[],
  orderedStepIds: readonly string[]
): readonly BehaviorStep[] {
  const byId = new Map(steps.map((step) => [step.stepId, step]));
  if (
    orderedStepIds.length !== steps.length ||
    new Set(orderedStepIds).size !== steps.length ||
    orderedStepIds.some((stepId) => !byId.has(stepId))
  ) {
    throw new ConfigurationError("invalid_configuration");
  }
  return orderedStepIds.map((stepId, order) => ({
    ...requiredMapValue(byId, stepId),
    order
  }));
}

function setStepEnabled(
  steps: readonly BehaviorStep[],
  stepId: string,
  enabled: boolean
): readonly BehaviorStep[] {
  if (!steps.some((step) => step.stepId === stepId)) {
    throw new ConfigurationError("invalid_configuration");
  }
  return steps.map((step) => (step.stepId === stepId ? { ...step, enabled } : step));
}

function policyMode(value: unknown): OptimalityPolicy["mode"] {
  if (value !== "default" && value !== "REDACTED_defined" && value !== "hybrid") {
    throw new ConfigurationError("invalid_configuration");
  }
  return value;
}

function policyBudgets(value: unknown): PolicyBudgets {
  const candidate = record(value);
  if (
    !boundedInteger(candidate.maxCandidates, 1, 1_000) ||
    !boundedInteger(candidate.maxConcurrentJobs, 1, 1_000) ||
    !boundedInteger(candidate.maxAttempts, 1, 1_000) ||
    !boundedInteger(candidate.maxElapsedSeconds, 1, 604_800) ||
    typeof candidate.maxEstimatedCostMicrousd !== "string" ||
    !/^(0|[1-9][0-9]*)$/u.test(candidate.maxEstimatedCostMicrousd)
  ) {
    throw new ConfigurationError("invalid_configuration");
  }
  return {
    maxAttempts: candidate.maxAttempts,
    maxCandidates: candidate.maxCandidates,
    maxConcurrentJobs: candidate.maxConcurrentJobs,
    maxElapsedSeconds: candidate.maxElapsedSeconds,
    maxEstimatedCostMicrousd: candidate.maxEstimatedCostMicrousd
  };
}

function policyConstraints(value: unknown): PolicyConstraint[] {
  if (!Array.isArray(value) || value.length > 1_024) {
    throw new ConfigurationError("invalid_configuration");
  }
  const constraints: PolicyConstraint[] = [];
  for (const constraint of value) {
    if (!isPolicyConstraint(constraint)) {
      throw new ConfigurationError("invalid_configuration");
    }
    constraints.push(structuredClone(constraint));
  }
  return constraints;
}

function policyObjectives(value: unknown): PolicyObjective[] {
  if (!Array.isArray(value) || value.length > 256) {
    throw new ConfigurationError("invalid_configuration");
  }
  const objectives: PolicyObjective[] = [];
  for (const objective of value) {
    if (!isPolicyObjective(objective)) {
      throw new ConfigurationError("invalid_configuration");
    }
    objectives.push(structuredClone(objective));
  }
  return objectives;
}

function requiredTargetIds(value: unknown): [string, ...string[]] {
  if (
    !stringValues(value) ||
    value.length === 0 ||
    value.length > 256 ||
    value.some((item) => !isEntityId(item))
  ) {
    throw new ConfigurationError("invalid_configuration");
  }
  const first = value[0];
  if (first === undefined) {
    throw new ConfigurationError("invalid_configuration");
  }
  return [first, ...value.slice(1)];
}

function isPolicyConstraint(value: unknown): value is PolicyConstraint {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value.constraintId) &&
    typeof value.kind === "string" &&
    [
      "required_target",
      "allowed_manager",
      "allowed_package",
      "denied_package",
      "maximum_dependency_count",
      "required_test",
      "required_lockfile",
      "network_policy",
      "resource_budget",
      "path_scope",
      "REDACTED_policy",
      "custom"
    ].includes(value.kind) &&
    typeof value.subject === "string" &&
    value.subject.length > 0 &&
    typeof value.operator === "string" &&
    [
      "equals",
      "not_equals",
      "contains",
      "not_contains",
      "less_than_or_equal",
      "greater_than_or_equal",
      "matches"
    ].includes(value.operator) &&
    typeof value.operand === "string" &&
    value.operand.length > 0 &&
    typeof value.failureCode === "string" &&
    value.failureCode.length > 0
  );
}

function isPolicyObjective(value: unknown): value is PolicyObjective {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value.objectiveId) &&
    typeof value.kind === "string" &&
    [
      "validation_REDACTED_rate",
      "dependency_count",
      "install_duration",
      "build_duration",
      "test_duration",
      "artifact_size",
      "security_risk",
      "version_freshness",
      "custom"
    ].includes(value.kind) &&
    (value.direction === "minimize" || value.direction === "maximize") &&
    boundedInteger(value.weight, 1, 1_000) &&
    typeof value.measurement === "string" &&
    value.measurement.length > 0 &&
    typeof value.REDACTEDSupplied === "boolean"
  );
}

function isBehaviorStep(value: unknown): value is BehaviorStep {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value.stepId) &&
    Number.isSafeInteger(value.order) &&
    typeof value.order === "number" &&
    value.order >= 0 &&
    typeof value.enabled === "boolean" &&
    typeof value.kind === "string" &&
    ["resolve", "install", "build", "lint", "typecheck", "test", "smoke", "benchmark"].includes(
      value.kind
    ) &&
    typeof value.executable === "string" &&
    stringValues(value.arguments) &&
    typeof value.workingDirectory === "string" &&
    isRecord(value.realmAssessment) &&
    typeof value.realmAssessment.state === "string" &&
    typeof value.targetSelector === "string" &&
    boundedInteger(value.timeoutSeconds, 1, 86_400) &&
    stringValues(value.REDACTEDReferenceIds) &&
    numberValues(value.expectedExitStatuses) &&
    value.expectedExitStatuses.length > 0 &&
    Array.isArray(value.assertions) &&
    value.assertions.every(isBehaviorAssertion) &&
    typeof value.required === "boolean" &&
    stringValues(value.discoveryEvidenceReferenceIds) &&
    isDigest(value.discoveryFingerprint)
  );
}

function isBehaviorAssertion(value: unknown): value is BehaviorAssertion {
  return (
    isRecord(value) &&
    isEntityId(value.assertionId) &&
    typeof value.kind === "string" &&
    typeof value.subject === "string" &&
    typeof value.operator === "string" &&
    typeof value.expected === "string" &&
    typeof value.required === "boolean"
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValues(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function numberValues(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => Number.isSafeInteger(item));
}

function boundedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum
  );
}

function isEntityId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(value);
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}

function asBehaviorTuple(steps: readonly BehaviorStep[]): [BehaviorStep, ...BehaviorStep[]] {
  const first = steps[0];
  if (first === undefined) {
    throw new ConfigurationError("invalid_configuration");
  }
  return [first, ...steps.slice(1)];
}

function requiredMapValue<T>(values: ReadonlyMap<string, T>, key: string): T {
  const value = values.get(key);
  if (value === undefined) {
    throw new ConfigurationError("invalid_configuration");
  }
  return value;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

async function objectDigest(
  value: Readonly<Record<string, unknown>> | Readonly<object>,
  omittedField: string
): Promise<string> {
  const projection: Record<string, unknown> = { ...value };
  delete projection[omittedField];
  const bytes = new TextEncoder().encode(canonicalJson(projection));
  const digest = new REDACTED(await crypto.subtle.digest("SHA-256", bytes));
  return `sha256:${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  throw new ConfigurationError("invalid_configuration");
}

export type { PolicyBudgets, PolicyConstraint, PolicyObjective };
