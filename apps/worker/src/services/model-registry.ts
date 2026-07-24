import type { CanonicalJsonValue, Sha256Digest } from "@environment-reconciler/integrations/ports";

export type ModelTemplateState = "proposed" | "active" | "retired";

export interface ModelTemplateVersion {
  readonly id: string;
  readonly workspaceId: string;
  readonly projectId?: string;
  readonly templateId: string;
  readonly version: number;
  readonly modelId: string;
  readonly promptDigest: Sha256Digest;
  readonly responseSchemaDigest: Sha256Digest;
  readonly samplingPolicyDigest: Sha256Digest;
  readonly versionFingerprint: Sha256Digest;
  readonly state: ModelTemplateState;
  /** Optimistic concurrency revision; immutable content never changes. */
  readonly revision: number;
  readonly createdAt: string;
}

export interface BraintrustPromotionEvidence {
  readonly caseCount: number;
  readonly completedAt?: string;
  readonly evaluationRunId: string;
  readonly evaluationSuiteId: string;
  readonly evaluationSuiteVersion: string;
  readonly evidenceDigest: Sha256Digest;
  readonly metrics: {
    readonly evidenceGroundingRate: number;
    readonly secretLeakageCount: number;
    readonly structuredOutputValidityRate: number;
    readonly unsupportedOperationRefusalRate: number;
  };
  readonly modelTemplateVersionId: string;
  readonly state: "running" | "passed" | "failed" | "cancelled";
  readonly versionFingerprint: Sha256Digest;
}

export interface ModelPromotionPolicy {
  readonly evaluationSuiteId: string;
  readonly evaluationSuiteVersion: string;
  readonly minimumCaseCount: number;
  readonly minimumEvidenceGroundingRate: number;
  readonly minimumStructuredOutputValidityRate: number;
  readonly minimumUnsupportedOperationRefusalRate: number;
  /** The production gate is zero leakage; this configured value must be zero. */
  readonly maximumSecretLeakageCount: number;
  readonly policyVersion: string;
}

export interface ModelTemplateRegistryPersistence {
  createProposed(input: {
    readonly idempotencyKey: string;
    readonly version: Omit<ModelTemplateVersion, "revision" | "state">;
  }): Promise<ModelTemplateVersion>;

  loadVersion(input: {
    readonly versionId: string;
    readonly workspaceId: string;
  }): Promise<ModelTemplateVersion | undefined>;

  /**
   * Atomically compares revision, retires the prior active version in the same
   * template scope, activates this version, and records the evidence binding.
   * Reusing the same idempotency key returns the original result.
   */
  activate(input: {
    readonly evaluationEvidenceDigest: Sha256Digest;
    readonly evaluationRunId: string;
    readonly expectedRevision: number;
    readonly idempotencyKey: string;
    readonly promotionPolicyVersion: string;
    readonly versionId: string;
    readonly workspaceId: string;
  }): Promise<{
    readonly disposition: "promoted" | "replayed";
    readonly retiredVersionId?: string;
    readonly version: ModelTemplateVersion;
  }>;

  retire(input: {
    readonly expectedRevision: number;
    readonly idempotencyKey: string;
    readonly versionId: string;
    readonly workspaceId: string;
  }): Promise<{
    readonly disposition: "retired" | "replayed";
    readonly version: ModelTemplateVersion;
  }>;
}

export interface BraintrustEvaluationEvidenceStore {
  loadEvidence(input: {
    readonly evaluationRunId: string;
    readonly modelTemplateVersionId: string;
    readonly workspaceId: string;
  }): Promise<BraintrustPromotionEvidence | undefined>;
}

export type PromotionGateFailure =
  | "evaluation_missing"
  | "evaluation_not_passed"
  | "evaluation_incomplete"
  | "evaluation_binding_mismatch"
  | "evaluation_suite_mismatch"
  | "insufficient_cases"
  | "structured_output_validity_below_threshold"
  | "evidence_grounding_below_threshold"
  | "unsupported_operation_refusal_below_threshold"
  | "secret_leakage_above_threshold";

export type PromoteModelTemplateResult =
  | {
      readonly failures: readonly PromotionGateFailure[];
      readonly status: "blocked";
    }
  | {
      readonly disposition: "promoted" | "replayed";
      readonly retiredVersionId?: string;
      readonly status: "active";
      readonly version: ModelTemplateVersion;
    };

export class ModelTemplateRegistryError extends Error {
  readonly code:
    | "invalid_input"
    | "invalid_policy"
    | "optimistic_version_conflict"
    | "state_conflict"
    | "version_not_found";

  constructor(code: ModelTemplateRegistryError["code"]) {
    super(code);
    this.name = "ModelTemplateRegistryError";
    this.code = code;
  }
}

export class ModelTemplateRegistryService {
  readonly #evidence: BraintrustEvaluationEvidenceStore;
  readonly #persistence: ModelTemplateRegistryPersistence;
  readonly #policy: ModelPromotionPolicy;

  constructor(
    persistence: ModelTemplateRegistryPersistence,
    evidence: BraintrustEvaluationEvidenceStore,
    policy: ModelPromotionPolicy
  ) {
    validatePolicy(policy);
    this.#persistence = persistence;
    this.#evidence = evidence;
    this.#policy = policy;
  }

  async propose(input: {
    readonly createdAt: string;
    readonly id: string;
    readonly idempotencyKey: string;
    readonly modelId: string;
    readonly projectId?: string;
    readonly promptDigest: Sha256Digest;
    readonly responseSchemaDigest: Sha256Digest;
    readonly samplingPolicyDigest: Sha256Digest;
    readonly templateId: string;
    readonly version: number;
    readonly workspaceId: string;
  }): Promise<ModelTemplateVersion> {
    validateProposal(input);
    const immutableIdentity = {
      createdAt: input.createdAt,
      id: input.id,
      modelId: input.modelId,
      ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
      promptDigest: input.promptDigest,
      responseSchemaDigest: input.responseSchemaDigest,
      samplingPolicyDigest: input.samplingPolicyDigest,
      templateId: input.templateId,
      version: input.version,
      workspaceId: input.workspaceId
    };
    const versionFingerprint = await fingerprintImmutableVersion(immutableIdentity);
    const proposed = await this.#persistence.createProposed({
      idempotencyKey: input.idempotencyKey,
      version: {
        ...immutableIdentity,
        versionFingerprint
      }
    });
    if (proposed.id !== input.id || proposed.versionFingerprint !== versionFingerprint) {
      throw new ModelTemplateRegistryError("state_conflict");
    }
    await assertImmutableVersion(proposed);
    return proposed;
  }

  async promote(input: {
    readonly evaluationRunId: string;
    readonly expectedRevision: number;
    readonly idempotencyKey: string;
    readonly versionId: string;
    readonly workspaceId: string;
  }): Promise<PromoteModelTemplateResult> {
    validateMutationInput(input);
    const version = await this.#loadVersion(input.workspaceId, input.versionId);
    await assertImmutableVersion(version);
    if (version.state === "retired") {
      throw new ModelTemplateRegistryError("state_conflict");
    }
    if (version.state === "proposed" && version.revision !== input.expectedRevision) {
      throw new ModelTemplateRegistryError("optimistic_version_conflict");
    }

    const evidence = await this.#evidence.loadEvidence({
      evaluationRunId: input.evaluationRunId,
      modelTemplateVersionId: version.id,
      workspaceId: input.workspaceId
    });
    const failures = evaluatePromotionGate(version, input.evaluationRunId, evidence, this.#policy);
    if (failures.length > 0 || evidence === undefined) {
      return { failures, status: "blocked" };
    }

    const activated = await this.#persistence.activate({
      evaluationEvidenceDigest: evidence.evidenceDigest,
      evaluationRunId: evidence.evaluationRunId,
      expectedRevision: input.expectedRevision,
      idempotencyKey: input.idempotencyKey,
      promotionPolicyVersion: this.#policy.policyVersion,
      versionId: version.id,
      workspaceId: input.workspaceId
    });
    if (
      activated.version.id !== version.id ||
      activated.version.state !== "active" ||
      activated.version.versionFingerprint !== version.versionFingerprint
    ) {
      throw new ModelTemplateRegistryError("state_conflict");
    }
    return {
      disposition: activated.disposition,
      ...(activated.retiredVersionId === undefined
        ? {}
        : { retiredVersionId: activated.retiredVersionId }),
      status: "active",
      version: activated.version
    };
  }

  async retire(input: {
    readonly expectedRevision: number;
    readonly idempotencyKey: string;
    readonly versionId: string;
    readonly workspaceId: string;
  }): Promise<ModelTemplateVersion> {
    validateMutationInput(input);
    const version = await this.#loadVersion(input.workspaceId, input.versionId);
    await assertImmutableVersion(version);
    if (version.state !== "retired" && version.revision !== input.expectedRevision) {
      throw new ModelTemplateRegistryError("optimistic_version_conflict");
    }
    const retired = await this.#persistence.retire(input);
    if (
      retired.version.id !== version.id ||
      retired.version.state !== "retired" ||
      retired.version.versionFingerprint !== version.versionFingerprint
    ) {
      throw new ModelTemplateRegistryError("state_conflict");
    }
    return retired.version;
  }

  async #loadVersion(workspaceId: string, versionId: string): Promise<ModelTemplateVersion> {
    const version = await this.#persistence.loadVersion({ versionId, workspaceId });
    if (version === undefined) {
      throw new ModelTemplateRegistryError("version_not_found");
    }
    return version;
  }
}

function evaluatePromotionGate(
  version: ModelTemplateVersion,
  expectedEvaluationRunId: string,
  evidence: BraintrustPromotionEvidence | undefined,
  policy: ModelPromotionPolicy
): readonly PromotionGateFailure[] {
  if (evidence === undefined) {
    return ["evaluation_missing"];
  }
  const failures: PromotionGateFailure[] = [];
  if (evidence.state !== "passed") failures.push("evaluation_not_passed");
  if (
    evidence.completedAt === undefined ||
    !Number.isFinite(Date.parse(evidence.completedAt)) ||
    !Number.isSafeInteger(evidence.caseCount) ||
    evidence.caseCount < 0 ||
    !validRate(evidence.metrics.structuredOutputValidityRate) ||
    !validRate(evidence.metrics.evidenceGroundingRate) ||
    !validRate(evidence.metrics.unsupportedOperationRefusalRate) ||
    !Number.isSafeInteger(evidence.metrics.secretLeakageCount) ||
    evidence.metrics.secretLeakageCount < 0
  ) {
    failures.push("evaluation_incomplete");
  }
  if (
    evidence.evaluationRunId !== expectedEvaluationRunId ||
    evidence.modelTemplateVersionId !== version.id ||
    evidence.versionFingerprint !== version.versionFingerprint ||
    !isSha256Digest(evidence.evidenceDigest)
  ) {
    failures.push("evaluation_binding_mismatch");
  }
  if (
    evidence.evaluationSuiteId !== policy.evaluationSuiteId ||
    evidence.evaluationSuiteVersion !== policy.evaluationSuiteVersion
  ) {
    failures.push("evaluation_suite_mismatch");
  }
  if (evidence.caseCount < policy.minimumCaseCount) failures.push("insufficient_cases");
  if (evidence.metrics.structuredOutputValidityRate < policy.minimumStructuredOutputValidityRate) {
    failures.push("structured_output_validity_below_threshold");
  }
  if (evidence.metrics.evidenceGroundingRate < policy.minimumEvidenceGroundingRate) {
    failures.push("evidence_grounding_below_threshold");
  }
  if (
    evidence.metrics.unsupportedOperationRefusalRate < policy.minimumUnsupportedOperationRefusalRate
  ) {
    failures.push("unsupported_operation_refusal_below_threshold");
  }
  if (evidence.metrics.secretLeakageCount > policy.maximumSecretLeakageCount) {
    failures.push("secret_leakage_above_threshold");
  }
  return failures;
}

function validatePolicy(policy: ModelPromotionPolicy): void {
  if (
    policy.policyVersion.trim().length === 0 ||
    policy.evaluationSuiteId.trim().length === 0 ||
    policy.evaluationSuiteVersion.trim().length === 0 ||
    !Number.isSafeInteger(policy.minimumCaseCount) ||
    policy.minimumCaseCount < 1 ||
    !validRate(policy.minimumStructuredOutputValidityRate) ||
    !validRate(policy.minimumEvidenceGroundingRate) ||
    !validRate(policy.minimumUnsupportedOperationRefusalRate) ||
    policy.maximumSecretLeakageCount !== 0
  ) {
    throw new ModelTemplateRegistryError("invalid_policy");
  }
}

function validateProposal(input: {
  readonly createdAt: string;
  readonly id: string;
  readonly idempotencyKey: string;
  readonly modelId: string;
  readonly promptDigest: Sha256Digest;
  readonly responseSchemaDigest: Sha256Digest;
  readonly samplingPolicyDigest: Sha256Digest;
  readonly templateId: string;
  readonly version: number;
  readonly workspaceId: string;
}): void {
  if (
    input.id.trim().length === 0 ||
    input.idempotencyKey.trim().length === 0 ||
    input.modelId.trim().length === 0 ||
    input.templateId.trim().length === 0 ||
    input.workspaceId.trim().length === 0 ||
    !Number.isSafeInteger(input.version) ||
    input.version < 1 ||
    !Number.isFinite(Date.parse(input.createdAt)) ||
    ![input.promptDigest, input.responseSchemaDigest, input.samplingPolicyDigest].every(
      isSha256Digest
    )
  ) {
    throw new ModelTemplateRegistryError("invalid_input");
  }
}

function validateMutationInput(input: {
  readonly expectedRevision: number;
  readonly idempotencyKey: string;
  readonly versionId: string;
  readonly workspaceId: string;
}): void {
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0 ||
    input.idempotencyKey.trim().length === 0 ||
    input.versionId.trim().length === 0 ||
    input.workspaceId.trim().length === 0
  ) {
    throw new ModelTemplateRegistryError("invalid_input");
  }
}

function validRate(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function isSha256Digest(value: unknown): value is Sha256Digest {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
}

function toCanonicalJson(value: unknown): CanonicalJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item) => toCanonicalJson(item));
  if (typeof value !== "object") throw new ModelTemplateRegistryError("invalid_input");
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry) => entry[1] !== undefined)
      .map(([key, item]) => [key, toCanonicalJson(item)])
  );
}

function canonicalJson(value: CanonicalJsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return jsonString(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (isCanonicalArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${jsonString(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

function jsonString(value: string): string {
  return JSON.stringify(value);
}

function isCanonicalArray(value: CanonicalJsonValue): value is readonly CanonicalJsonValue[] {
  return Array.isArray(value);
}

async function sha256Canonical(value: CanonicalJsonValue): Promise<Sha256Digest> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return `sha256:${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function fingerprintImmutableVersion(
  version: Omit<ModelTemplateVersion, "revision" | "state" | "versionFingerprint">
): Promise<Sha256Digest> {
  return sha256Canonical(toCanonicalJson(version));
}

async function assertImmutableVersion(version: ModelTemplateVersion): Promise<void> {
  const expectedFingerprint = await fingerprintImmutableVersion({
    createdAt: version.createdAt,
    id: version.id,
    modelId: version.modelId,
    ...(version.projectId === undefined ? {} : { projectId: version.projectId }),
    promptDigest: version.promptDigest,
    responseSchemaDigest: version.responseSchemaDigest,
    samplingPolicyDigest: version.samplingPolicyDigest,
    templateId: version.templateId,
    version: version.version,
    workspaceId: version.workspaceId
  });
  if (expectedFingerprint !== version.versionFingerprint) {
    throw new ModelTemplateRegistryError("state_conflict");
  }
}
