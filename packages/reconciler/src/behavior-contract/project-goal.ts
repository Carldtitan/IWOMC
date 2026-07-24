import { stableId } from "../graphs/canonical.js";

const ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const MAX_GOAL_LENGTH = 2_048;
const MAX_PRIORITY_LENGTH = 1_024;
const MAX_PRIORITIES = 32;

export type ProjectGoalPriorityKind =
  | "install_time"
  | "build_time"
  | "runtime_latency"
  | "memory"
  | "disk"
  | "image_size"
  | "dependency_count"
  | "version_freshness"
  | "license"
  | "security"
  | "custom";

export interface ProjectGoalPriority {
  readonly priorityId: string;
  readonly order: number;
  readonly kind: ProjectGoalPriorityKind;
  readonly statement: string;
}

/**
 * Human-authored context for candidate reasoning. `contextOnly` is deliberately immutable:
 * project goals may rank otherwise-correct candidates, but cannot override correctness gates.
 */
export interface EditableProjectGoal {
  readonly schemaVersion: 1;
  readonly kind: "project_goal";
  readonly goalId: string;
  readonly workspaceId: string;
  readonly projectId: string;
  readonly version: number;
  readonly statement: string;
  readonly nonFunctionalPriorities: readonly ProjectGoalPriority[];
  readonly contextOnly: true;
  readonly authoredBy: string;
  readonly updatedBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectGoalPriorityInput {
  readonly priorityId?: string;
  readonly kind: ProjectGoalPriorityKind;
  readonly statement: string;
}

export interface CreateProjectGoalInput {
  readonly goalId?: string;
  readonly workspaceId: string;
  readonly projectId: string;
  readonly statement: string;
  readonly nonFunctionalPriorities?: readonly ProjectGoalPriorityInput[];
  readonly actorId: string;
  readonly createdAt: string;
}

export interface EditProjectGoalInput {
  readonly expectedVersion: number;
  readonly statement?: string;
  readonly nonFunctionalPriorities?: readonly ProjectGoalPriorityInput[];
  readonly actorId: string;
  readonly updatedAt: string;
}

export interface ProjectGoalValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export class ProjectGoalValidationError extends Error {
  readonly issues: readonly ProjectGoalValidationIssue[];

  constructor(issues: readonly ProjectGoalValidationIssue[]) {
    super("Project goal is invalid.");
    this.name = "ProjectGoalValidationError";
    this.issues = issues;
  }
}

export function createProjectGoal(input: CreateProjectGoalInput): EditableProjectGoal {
  const priorities = normalizePriorities(input.nonFunctionalPriorities ?? []);
  const goal: EditableProjectGoal = {
    schemaVersion: 1,
    kind: "project_goal",
    goalId: input.goalId ?? stableId("goal", [input.workspaceId, input.projectId]),
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    version: 1,
    statement: input.statement.trim(),
    nonFunctionalPriorities: priorities,
    contextOnly: true,
    authoredBy: input.actorId,
    updatedBy: input.actorId,
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  };
  assertValidProjectGoal(goal);
  return goal;
}

export function editProjectGoal(
  current: EditableProjectGoal,
  input: EditProjectGoalInput
): EditableProjectGoal {
  assertValidProjectGoal(current);
  if (input.expectedVersion !== current.version) {
    throw new ProjectGoalValidationError([
      {
        path: "/version",
        code: "version_conflict",
        message: `Expected version ${String(input.expectedVersion)}, current version is ${String(current.version)}.`
      }
    ]);
  }
  const goal: EditableProjectGoal = {
    ...current,
    version: current.version + 1,
    statement: input.statement?.trim() ?? current.statement,
    nonFunctionalPriorities:
      input.nonFunctionalPriorities === undefined
        ? current.nonFunctionalPriorities
        : normalizePriorities(input.nonFunctionalPriorities),
    updatedBy: input.actorId,
    updatedAt: input.updatedAt
  };
  assertValidProjectGoal(goal);
  return goal;
}

export function validateProjectGoal(value: unknown): readonly ProjectGoalValidationIssue[] {
  if (!isRecord(value)) {
    return [issue("", "object_required", "Project goal must be an object.")];
  }
  const issues: ProjectGoalValidationIssue[] = [];
  const allowedKeys = new Set([
    "schemaVersion",
    "kind",
    "goalId",
    "workspaceId",
    "projectId",
    "version",
    "statement",
    "nonFunctionalPriorities",
    "contextOnly",
    "authoredBy",
    "updatedBy",
    "createdAt",
    "updatedAt"
  ]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      issues.push(issue(`/${key}`, "unknown_field", "Unknown project-goal field."));
    }
  }

  if (value.schemaVersion !== 1) {
    issues.push(issue("/schemaVersion", "unsupported_version", "schemaVersion must be 1."));
  }
  if (value.kind !== "project_goal") {
    issues.push(issue("/kind", "invalid_kind", "kind must be project_goal."));
  }
  for (const key of ["goalId", "workspaceId", "projectId", "authoredBy", "updatedBy"] as const) {
    if (!isEntityId(value[key])) {
      issues.push(issue(`/${key}`, "invalid_entity_id", `${key} must be a valid entity ID.`));
    }
  }
  if (!Number.isSafeInteger(value.version) || Number(value.version) < 1) {
    issues.push(issue("/version", "invalid_version", "version must be a positive safe integer."));
  }
  if (
    typeof value.statement !== "string" ||
    value.statement.trim() === "" ||
    value.statement !== value.statement.trim() ||
    value.statement.length > MAX_GOAL_LENGTH
  ) {
    issues.push(
      issue(
        "/statement",
        "invalid_goal_statement",
        `statement must be trimmed, non-empty, and at most ${String(MAX_GOAL_LENGTH)} characters.`
      )
    );
  }
  if (value.contextOnly !== true) {
    issues.push(
      issue(
        "/contextOnly",
        "goal_cannot_override_gates",
        "Project goals must remain reasoning context only."
      )
    );
  }

  const priorities = value.nonFunctionalPriorities;
  if (!Array.isArray(priorities) || priorities.length > MAX_PRIORITIES) {
    issues.push(
      issue(
        "/nonFunctionalPriorities",
        "invalid_priorities",
        `nonFunctionalPriorities must contain at most ${String(MAX_PRIORITIES)} entries.`
      )
    );
  } else {
    validatePriorities(priorities, issues);
  }

  if (!isTimestamp(value.createdAt)) {
    issues.push(
      issue("/createdAt", "invalid_timestamp", "createdAt must be an RFC 3339 timestamp.")
    );
  }
  if (!isTimestamp(value.updatedAt)) {
    issues.push(
      issue("/updatedAt", "invalid_timestamp", "updatedAt must be an RFC 3339 timestamp.")
    );
  }
  if (
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt) &&
    Date.parse(value.updatedAt) < Date.parse(value.createdAt)
  ) {
    issues.push(
      issue("/updatedAt", "timestamp_order", "updatedAt cannot be earlier than createdAt.")
    );
  }
  return issues;
}

export function assertValidProjectGoal(value: unknown): asserts value is EditableProjectGoal {
  const issues = validateProjectGoal(value);
  if (issues.length > 0) {
    throw new ProjectGoalValidationError(issues);
  }
}

function normalizePriorities(
  inputs: readonly ProjectGoalPriorityInput[]
): readonly ProjectGoalPriority[] {
  if (inputs.length > MAX_PRIORITIES) {
    throw new ProjectGoalValidationError([
      issue(
        "/nonFunctionalPriorities",
        "too_many_priorities",
        `At most ${String(MAX_PRIORITIES)} priorities are allowed.`
      )
    ]);
  }
  return inputs.map((input, order) => {
    const statement = input.statement.trim();
    return {
      priorityId:
        input.priorityId ??
        stableId("goal-priority", {
          kind: input.kind,
          statement
        }),
      order,
      kind: input.kind,
      statement
    };
  });
}

function validatePriorities(
  priorities: readonly unknown[],
  issues: ProjectGoalValidationIssue[]
): void {
  const ids = new Set<string>();
  for (const [index, priority] of priorities.entries()) {
    const path = `/nonFunctionalPriorities/${String(index)}`;
    if (!isRecord(priority)) {
      issues.push(issue(path, "object_required", "Priority must be an object."));
      continue;
    }
    const allowedKeys = new Set(["priorityId", "order", "kind", "statement"]);
    for (const key of Object.keys(priority)) {
      if (!allowedKeys.has(key)) {
        issues.push(issue(`${path}/${key}`, "unknown_field", "Unknown priority field."));
      }
    }
    if (!isEntityId(priority.priorityId)) {
      issues.push(issue(`${path}/priorityId`, "invalid_entity_id", "Invalid priority ID."));
    } else if (ids.has(priority.priorityId)) {
      issues.push(issue(`${path}/priorityId`, "duplicate_id", "Priority IDs must be unique."));
    } else {
      ids.add(priority.priorityId);
    }
    if (priority.order !== index) {
      issues.push(
        issue(`${path}/order`, "non_contiguous_order", "Priority order must be zero-based.")
      );
    }
    if (!isPriorityKind(priority.kind)) {
      issues.push(issue(`${path}/kind`, "invalid_priority_kind", "Unknown priority kind."));
    }
    if (
      typeof priority.statement !== "string" ||
      priority.statement.trim() === "" ||
      priority.statement !== priority.statement.trim() ||
      priority.statement.length > MAX_PRIORITY_LENGTH
    ) {
      issues.push(
        issue(
          `${path}/statement`,
          "invalid_priority_statement",
          "Priority statements must be trimmed, non-empty, and bounded."
        )
      );
    }
  }
}

function isPriorityKind(value: unknown): value is ProjectGoalPriorityKind {
  return (
    typeof value === "string" &&
    [
      "install_time",
      "build_time",
      "runtime_latency",
      "memory",
      "disk",
      "image_size",
      "dependency_count",
      "version_freshness",
      "license",
      "security",
      "custom"
    ].includes(value)
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEntityId(value: unknown): value is string {
  return typeof value === "string" && ENTITY_ID.test(value);
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 64 &&
    value.trim() === value &&
    Number.isFinite(Date.parse(value))
  );
}

function issue(path: string, code: string, message: string): ProjectGoalValidationIssue {
  return { path, code, message };
}
