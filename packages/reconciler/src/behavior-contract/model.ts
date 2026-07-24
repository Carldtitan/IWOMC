import {
  ProtocolValidationError,
  behaviorContractDigest,
  parseProtocolDocument,
  type BehaviorAssertion,
  type BehaviorContract,
  type BehaviorStep
} from "@environment-reconciler/contracts";

const ZERO_DIGEST = `sha256:${"0".repeat(64)}`;

export interface CreateBehaviorContractInput {
  readonly contractId: string;
  readonly workspaceId: string;
  readonly projectId: string;
  readonly sourceInputDigest: string;
  readonly steps: readonly BehaviorStep[];
  readonly createdAt: string;
}

export interface ReviseBehaviorContractInput {
  readonly steps: readonly BehaviorStep[];
  readonly sourceInputDigest?: string;
  readonly updatedAt: string;
}

export interface AcceptBehaviorContractInput {
  readonly actorId: string;
  readonly acceptedAt: string;
}

export interface InvalidateBehaviorContractInput {
  readonly sourceIds: readonly string[];
  readonly invalidatedAt: string;
}

export interface BehaviorContractValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export class BehaviorContractValidationError extends Error {
  readonly issues: readonly BehaviorContractValidationIssue[];

  constructor(issues: readonly BehaviorContractValidationIssue[]) {
    super("Behavior contract is invalid.");
    this.name = "BehaviorContractValidationError";
    this.issues = issues;
  }
}

export async function createBehaviorContract(
  input: CreateBehaviorContractInput
): Promise<BehaviorContract> {
  const evidenceReferenceIds = uniqueSorted(
    input.steps.flatMap((step) => step.discoveryEvidenceReferenceIds)
  );
  return finalizeBehaviorContract({
    schemaVersion: 1,
    kind: "behavior_contract",
    contractId: input.contractId,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    version: 1,
    sourceInputDigest: input.sourceInputDigest,
    reviewState: "discovered",
    reviewAssessment: {
      state: "unknown",
      reasonCodes: ["human_review_required"],
      evidenceReferenceIds
    },
    invalidatedBySourceIds: [],
    steps: asNonEmptySteps(input.steps),
    contractDigest: ZERO_DIGEST,
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  });
}

export async function reviseBehaviorContract(
  current: BehaviorContract,
  input: ReviseBehaviorContractInput
): Promise<BehaviorContract> {
  await assertValidBehaviorContract(current);
  const unaccepted = withoutAcceptance(current);
  return finalizeBehaviorContract({
    ...unaccepted,
    version: current.version + 1,
    sourceInputDigest: input.sourceInputDigest ?? current.sourceInputDigest,
    reviewState: "needs_review",
    reviewAssessment: {
      state: "unknown",
      reasonCodes: ["contract_edited_review_required"],
      evidenceReferenceIds: uniqueSorted(
        input.steps.flatMap((step) => step.discoveryEvidenceReferenceIds)
      )
    },
    invalidatedBySourceIds: [],
    steps: asNonEmptySteps(input.steps),
    contractDigest: ZERO_DIGEST,
    updatedAt: input.updatedAt
  });
}

export async function acceptBehaviorContract(
  current: BehaviorContract,
  input: AcceptBehaviorContractInput
): Promise<BehaviorContract> {
  await assertValidBehaviorContract(current);
  if (current.reviewState === "invalidated") {
    throw new BehaviorContractValidationError([
      issue(
        "/reviewState",
        "invalidated_contract_requires_revision",
        "An invalidated contract must be revised before it can be accepted."
      )
    ]);
  }
  if (!current.steps.some((step) => step.enabled && step.required)) {
    throw new BehaviorContractValidationError([
      issue(
        "/steps",
        "required_step_missing",
        "Acceptance requires at least one enabled, required behavior step."
      )
    ]);
  }
  return finalizeBehaviorContract({
    ...current,
    version: current.version + 1,
    reviewState: "accepted",
    reviewAssessment: {
      state: "known",
      reasonCodes: ["accepted_by_project_maintainer"],
      evidenceReferenceIds: current.reviewAssessment.evidenceReferenceIds
    },
    acceptedBy: input.actorId,
    acceptedAt: input.acceptedAt,
    invalidatedBySourceIds: [],
    contractDigest: ZERO_DIGEST,
    updatedAt: input.acceptedAt
  });
}

export async function invalidateBehaviorContract(
  current: BehaviorContract,
  input: InvalidateBehaviorContractInput
): Promise<BehaviorContract> {
  await assertValidBehaviorContract(current);
  const sourceIds = uniqueSorted(input.sourceIds);
  if (sourceIds.length === 0) {
    throw new BehaviorContractValidationError([
      issue(
        "/invalidatedBySourceIds",
        "invalidation_source_required",
        "Invalidation requires at least one changed source ID."
      )
    ]);
  }
  const unaccepted = withoutAcceptance(current);
  return finalizeBehaviorContract({
    ...unaccepted,
    version: current.version + 1,
    reviewState: "invalidated",
    reviewAssessment: {
      state: "known",
      reasonCodes: ["behavior_source_changed"],
      evidenceReferenceIds: current.reviewAssessment.evidenceReferenceIds
    },
    invalidatedBySourceIds: sourceIds,
    contractDigest: ZERO_DIGEST,
    updatedAt: input.invalidatedAt
  });
}

export function reorderBehaviorSteps(
  steps: readonly BehaviorStep[],
  orderedStepIds: readonly string[]
): readonly BehaviorStep[] {
  const stepsById = new Map(steps.map((step) => [step.stepId, step]));
  if (
    orderedStepIds.length !== steps.length ||
    new Set(orderedStepIds).size !== steps.length ||
    orderedStepIds.some((stepId) => !stepsById.has(stepId))
  ) {
    throw new BehaviorContractValidationError([
      issue(
        "/steps",
        "invalid_reorder",
        "Reordering must include every existing step ID exactly once."
      )
    ]);
  }
  return orderedStepIds.map((stepId, order) => ({
    ...mustGet(stepsById, stepId),
    order
  }));
}

export function setBehaviorStepEnabled(
  steps: readonly BehaviorStep[],
  stepId: string,
  enabled: boolean
): readonly BehaviorStep[] {
  if (!steps.some((step) => step.stepId === stepId)) {
    throw new BehaviorContractValidationError([
      issue("/steps", "unknown_step_id", `Unknown behavior step ${stepId}.`)
    ]);
  }
  return steps.map((step) => (step.stepId === stepId ? { ...step, enabled } : step));
}

export async function validateBehaviorContract(
  value: unknown
): Promise<readonly BehaviorContractValidationIssue[]> {
  let contract: BehaviorContract;
  try {
    const document = parseProtocolDocument(value);
    if (document.kind !== "behavior_contract") {
      return [
        issue("/kind", "wrong_document_kind", "Expected a behavior_contract protocol document.")
      ];
    }
    contract = document;
  } catch (error) {
    if (error instanceof ProtocolValidationError) {
      return error.issues.map((schemaIssue) =>
        issue(schemaIssue.instancePath, `schema_${schemaIssue.keyword}`, schemaIssue.message)
      );
    }
    return [issue("", "invalid_protocol_document", "Behavior contract schema validation failed.")];
  }

  const issues: BehaviorContractValidationIssue[] = [];
  validateReviewLifecycle(contract, issues);
  validateStepSet(contract.steps, issues);
  validateTimestampOrder(contract, issues);

  const expectedDigest = await behaviorContractDigest(contract);
  if (contract.contractDigest !== expectedDigest) {
    issues.push(
      issue(
        "/contractDigest",
        "digest_mismatch",
        "contractDigest must cover every contract field except itself."
      )
    );
  }
  return issues;
}

export async function assertValidBehaviorContract(value: unknown): Promise<void> {
  const issues = await validateBehaviorContract(value);
  if (issues.length > 0) {
    throw new BehaviorContractValidationError(issues);
  }
}

async function finalizeBehaviorContract(contract: BehaviorContract): Promise<BehaviorContract> {
  const finalized = {
    ...contract,
    contractDigest: await behaviorContractDigest(contract)
  };
  await assertValidBehaviorContract(finalized);
  return finalized;
}

function validateReviewLifecycle(
  contract: BehaviorContract,
  issues: BehaviorContractValidationIssue[]
): void {
  const acceptedByPresent = contract.acceptedBy !== undefined;
  const acceptedAtPresent = contract.acceptedAt !== undefined;
  if (acceptedByPresent !== acceptedAtPresent) {
    issues.push(
      issue(
        "/acceptedBy",
        "incomplete_acceptance",
        "acceptedBy and acceptedAt must either both be present or both be absent."
      )
    );
  }
  if (contract.reviewState === "accepted") {
    if (!acceptedByPresent || !acceptedAtPresent) {
      issues.push(
        issue(
          "/reviewState",
          "acceptance_metadata_required",
          "Accepted contracts require an acceptance actor and timestamp."
        )
      );
    }
    if (contract.reviewAssessment.state !== "known") {
      issues.push(
        issue(
          "/reviewAssessment/state",
          "accepted_review_must_be_known",
          "Accepted review state must be known."
        )
      );
    }
    if (contract.invalidatedBySourceIds.length > 0) {
      issues.push(
        issue(
          "/invalidatedBySourceIds",
          "accepted_contract_cannot_be_invalidated",
          "Accepted contracts cannot carry invalidation sources."
        )
      );
    }
    if (
      !contract.steps.some(
        (step) =>
          step.enabled &&
          step.required &&
          ["build", "lint", "typecheck", "test", "smoke"].includes(step.kind)
      )
    ) {
      issues.push(
        issue(
          "/steps",
          "required_step_missing",
          "Accepted contracts require at least one enabled, required behavioral check."
        )
      );
    }
  } else if (acceptedByPresent || acceptedAtPresent) {
    issues.push(
      issue(
        "/reviewState",
        "acceptance_metadata_forbidden",
        "Only accepted contracts may carry acceptance metadata."
      )
    );
  }

  if (contract.reviewState === "invalidated") {
    if (contract.invalidatedBySourceIds.length === 0) {
      issues.push(
        issue(
          "/invalidatedBySourceIds",
          "invalidation_source_required",
          "Invalidated contracts require at least one source ID."
        )
      );
    }
  } else if (contract.invalidatedBySourceIds.length > 0) {
    issues.push(
      issue(
        "/invalidatedBySourceIds",
        "invalidation_source_forbidden",
        "Only invalidated contracts may carry invalidation sources."
      )
    );
  }
  validateUniqueStrings(
    contract.invalidatedBySourceIds,
    "/invalidatedBySourceIds",
    "duplicate_invalidation_source",
    issues
  );
}

function validateStepSet(
  steps: readonly BehaviorStep[],
  issues: BehaviorContractValidationIssue[]
): void {
  const stepIds = new Set<string>();
  const assertionIds = new Set<string>();
  for (const [index, step] of steps.entries()) {
    const path = `/steps/${String(index)}`;
    if (stepIds.has(step.stepId)) {
      issues.push(issue(`${path}/stepId`, "duplicate_step_id", "Step IDs must be unique."));
    }
    stepIds.add(step.stepId);
    if (step.order !== index) {
      issues.push(
        issue(
          `${path}/order`,
          "non_contiguous_order",
          "Step order must be contiguous and zero-based."
        )
      );
    }
    if (step.realmAssessment.state === "known" && step.realmId === undefined) {
      issues.push(
        issue(
          `${path}/realmId`,
          "known_realm_requires_id",
          "A known realm assessment requires realmId."
        )
      );
    }
    if (step.realmAssessment.state !== "known" && step.realmId !== undefined) {
      issues.push(
        issue(
          `${path}/realmId`,
          "unconfirmed_realm_id",
          "realmId is allowed only when realmAssessment is known."
        )
      );
    }
    validateUniqueNumbers(
      step.expectedExitStatuses,
      `${path}/expectedExitStatuses`,
      "duplicate_exit_status",
      issues
    );
    validateUniqueStrings(
      step.secretReferenceIds,
      `${path}/secretReferenceIds`,
      "duplicate_secret_reference",
      issues
    );
    validateUniqueStrings(
      step.discoveryEvidenceReferenceIds,
      `${path}/discoveryEvidenceReferenceIds`,
      "duplicate_discovery_evidence",
      issues
    );
    for (const [assertionIndex, assertion] of step.assertions.entries()) {
      const assertionPath = `${path}/assertions/${String(assertionIndex)}`;
      if (assertionIds.has(assertion.assertionId)) {
        issues.push(
          issue(
            `${assertionPath}/assertionId`,
            "duplicate_assertion_id",
            "Assertion IDs must be unique across the contract."
          )
        );
      }
      assertionIds.add(assertion.assertionId);
      validateAssertion(assertion, step, assertionPath, issues);
    }
  }
}

function validateAssertion(
  assertion: BehaviorAssertion,
  step: BehaviorStep,
  path: string,
  issues: BehaviorContractValidationIssue[]
): void {
  if (assertion.kind === "exit_status") {
    const expected = Number(assertion.expected);
    if (
      !Number.isInteger(expected) ||
      !step.expectedExitStatuses.includes(expected) ||
      !["equals", "not_equals"].includes(assertion.operator)
    ) {
      issues.push(
        issue(
          path,
          "invalid_exit_status_assertion",
          "Exit assertions must use an integer expected status declared by the step."
        )
      );
    }
  }
  if (assertion.kind === "file_exists" && assertion.operator !== "exists") {
    issues.push(
      issue(`${path}/operator`, "invalid_file_assertion", "file_exists must use exists.")
    );
  }
  if (assertion.kind === "file_absent" && assertion.operator !== "absent") {
    issues.push(
      issue(`${path}/operator`, "invalid_file_assertion", "file_absent must use absent.")
    );
  }
  if (assertion.kind === "duration_under") {
    if (assertion.operator !== "less_than" || !isPositiveNumber(assertion.expected)) {
      issues.push(
        issue(
          path,
          "invalid_duration_assertion",
          "duration_under must use less_than with a positive numeric expectation."
        )
      );
    }
  }
  if (assertion.kind === "http_status") {
    const expected = Number(assertion.expected);
    if (
      assertion.operator !== "equals" ||
      !Number.isInteger(expected) ||
      expected < 100 ||
      expected > 599
    ) {
      issues.push(
        issue(
          path,
          "invalid_http_status_assertion",
          "http_status must equal an integer from 100 through 599."
        )
      );
    }
  }
  if (
    (assertion.kind === "stdout_matches" || assertion.kind === "stderr_matches") &&
    assertion.operator === "matches"
  ) {
    try {
      new RegExp(assertion.expected, "u");
    } catch {
      issues.push(
        issue(
          `${path}/expected`,
          "invalid_regular_expression",
          "Expected value is not valid regex."
        )
      );
    }
  }
}

function validateTimestampOrder(
  contract: BehaviorContract,
  issues: BehaviorContractValidationIssue[]
): void {
  const created = Date.parse(contract.createdAt);
  const updated = Date.parse(contract.updatedAt);
  if (updated < created) {
    issues.push(
      issue("/updatedAt", "timestamp_order", "updatedAt cannot be earlier than createdAt.")
    );
  }
  if (contract.acceptedAt !== undefined) {
    const accepted = Date.parse(contract.acceptedAt);
    if (accepted < created || accepted > updated) {
      issues.push(
        issue(
          "/acceptedAt",
          "timestamp_order",
          "acceptedAt must be between createdAt and updatedAt."
        )
      );
    }
  }
}

function validateUniqueStrings(
  values: readonly string[],
  path: string,
  code: string,
  issues: BehaviorContractValidationIssue[]
): void {
  if (new Set(values).size !== values.length) {
    issues.push(issue(path, code, "Values must be unique."));
  }
}

function validateUniqueNumbers(
  values: readonly number[],
  path: string,
  code: string,
  issues: BehaviorContractValidationIssue[]
): void {
  if (new Set(values).size !== values.length) {
    issues.push(issue(path, code, "Values must be unique."));
  }
}

function asNonEmptySteps(steps: readonly BehaviorStep[]): [BehaviorStep, ...BehaviorStep[]] {
  const [first, ...rest] = steps;
  if (first === undefined) {
    throw new BehaviorContractValidationError([
      issue("/steps", "step_required", "A behavior contract requires at least one step.")
    ]);
  }
  return [first, ...rest];
}

function mustGet(values: ReadonlyMap<string, BehaviorStep>, key: string): BehaviorStep {
  const value = values.get(key);
  if (value === undefined) {
    throw new BehaviorContractValidationError([
      issue("/steps", "unknown_step_id", `Unknown behavior step ${key}.`)
    ]);
  }
  return value;
}

function withoutAcceptance(contract: BehaviorContract): BehaviorContract {
  const unaccepted = { ...contract };
  delete unaccepted.acceptedAt;
  delete unaccepted.acceptedBy;
  return unaccepted;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

function isPositiveNumber(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function issue(path: string, code: string, message: string): BehaviorContractValidationIssue {
  return { path, code, message };
}
