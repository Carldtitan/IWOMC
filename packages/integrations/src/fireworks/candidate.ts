import {
  assertCanonicalJsonSafe,
  assertSafeText,
  BoundaryValidationError,
  isSha256Digest,
  toCanonicalJson
} from "../internal/boundary-safety.js";
import { sha256Canonical } from "../internal/digest.js";
import type {
  CanonicalJsonValue,
  Sha256Digest,
  StructuredOutputSchemaReference
} from "../ports/index.js";

export const CANDIDATE_PLAN_SCHEMA_ID = "environment-REDACTED.candidate-plan";
export const CANDIDATE_PLAN_SCHEMA_VERSION = "1";
export const CANDIDATE_GUARD_VERSION = "npm-package-add-v1";

export type CandidateOperationKind = "package_add";
export type NpmDependencySection = "dependencies" | "devDependencies";
export type ValidationProbeKind = "build" | "install" | "test" | "typecheck";

export interface CandidateFindingSummary {
  readonly id: string;
  readonly category: string;
  readonly summary: string;
  readonly ruleId: string;
  readonly ruleVersion: string;
  readonly expectedPackageName: string;
  readonly recommendedVersionRange: string;
  readonly dependencySection: NpmDependencySection;
  readonly evidenceReferenceIds: readonly string[];
}

export interface RedactedGraphNode {
  readonly packageName: string;
  readonly declared: boolean;
  readonly observed: boolean;
  readonly evidenceReferenceIds: readonly string[];
}

export interface RedactedSemanticFragment {
  readonly filePath: string;
  readonly fragmentKind: "config" | "lockfile" | "manifest" | "source-ast";
  readonly semanticDigest: Sha256Digest;
  readonly summary: string;
  readonly evidenceReferenceIds: readonly string[];
}

export interface RepositoryConventionSummary {
  readonly conventionId: string;
  readonly summary: string;
  readonly evidenceReferenceIds: readonly string[];
}

export interface BehaviorContractSummary {
  readonly contractVersion: string;
  readonly summary: string;
  readonly requiredTargetIds: readonly string[];
  readonly requiredProbeKinds: readonly ValidationProbeKind[];
}

export interface AdapterCapabilitySummary {
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly toolName: "npm";
  readonly toolVersion: string;
  readonly packageManager: "npm";
  readonly supportedOperations: readonly CandidateOperationKind[];
  readonly knownFiles: readonly string[];
  readonly writableManifestFiles: readonly string[];
  readonly lockfiles: readonly string[];
}

export interface EffectiveCandidatePolicy {
  readonly policyVersion: string;
  readonly allowedPackageNames: readonly string[];
  readonly deniedPackageNames: readonly string[];
  readonly maximumOperations: number;
  readonly allowPackageManagerSwitch: false;
}

export interface PriorValidationSummary {
  readonly targetId: string;
  readonly summaryClass:
    "baseline-failed" | "baseline-REDACTEDed" | "candidate-failed" | "candidate-REDACTEDed" | "not-run";
}

export interface CandidateReasoningPacketInput {
  readonly projectPseudonym: Sha256Digest;
  readonly projectGoal: string;
  readonly finding: CandidateFindingSummary;
  readonly relevantGraphSlice: readonly RedactedGraphNode[];
  readonly semanticFileFragments: readonly RedactedSemanticFragment[];
  readonly repositoryConventions: readonly RepositoryConventionSummary[];
  readonly behaviorContractSummary: BehaviorContractSummary;
  readonly capabilitySummary: AdapterCapabilitySummary;
  readonly permittedOperations: readonly CandidateOperationKind[];
  readonly effectivePolicy: EffectiveCandidatePolicy;
  readonly priorValidationSummaries: readonly PriorValidationSummary[];
}

export interface CandidateReasoningPacket extends CandidateReasoningPacketInput {
  readonly schemaVersion: 1;
}

export interface PackageAddCandidateOperation {
  readonly kind: "package_add";
  readonly findingId: string;
  readonly evidenceReferenceIds: readonly string[];
  readonly manager: "npm";
  readonly packageName: string;
  readonly versionRange: string;
  readonly dependencySection: NpmDependencySection;
  readonly manifestPath: string;
}

export interface ExpectedGraphChange {
  readonly findingId: string;
  readonly packageName: string;
  readonly change: "declare-development-dependency" | "declare-runtime-dependency";
}

export interface ExpectedValidationImpact {
  readonly targetId: string;
  readonly expectedOutcome: "REDACTED" | "unchanged";
  readonly rationale: string;
}

export interface ProposedValidationProbe {
  readonly probeId: string;
  readonly kind: ValidationProbeKind;
  readonly targetId: string;
}

export interface CandidatePlan {
  readonly schemaVersion: 1;
  readonly findingIds: readonly string[];
  readonly operations: readonly PackageAddCandidateOperation[];
  readonly evidenceReferenceIds: readonly string[];
  readonly affectedFiles: readonly string[];
  readonly rationale: string;
  readonly expectedGraphChanges: readonly ExpectedGraphChange[];
  readonly expectedValidationImpact: readonly ExpectedValidationImpact[];
  readonly assumptions: readonly string[];
  readonly risks: readonly string[];
  readonly proposedValidationProbes: readonly ProposedValidationProbe[];
}

export interface NativeNpmPackageAddOperation {
  readonly kind: "npm_package_add";
  readonly manager: "npm";
  readonly findingId: string;
  readonly evidenceReferenceIds: readonly string[];
  readonly packageName: string;
  readonly versionRange: string;
  readonly dependencySection: NpmDependencySection;
  readonly manifestPath: string;
  /**
   * The native npm adapter owns lockfile generation. No model-provided file
   * bytes, shell command, or lockfile content crosses this boundary.
   */
  readonly lockfilePolicy: "native-manager-generated";
}

export interface AcceptedCandidatePlan {
  readonly plan: CandidatePlan;
  readonly nativeOperations: readonly NativeNpmPackageAddOperation[];
  readonly guardVersion: typeof CANDIDATE_GUARD_VERSION;
}

export class CandidateGuardError extends Error {
  readonly code:
    | "ambiguous_evidence"
    | "disallowed_dependency"
    | "invented_evidence"
    | "invented_finding"
    | "invalid_packet"
    | "invalid_structured_output"
    | "manager_switch"
    | "policy_violation"
    | "prompt_injection_detected"
    | "REDACTED_material_detected"
    | "unknown_file"
    | "unsupported_operation";

  constructor(code: CandidateGuardError["code"]) {
    super(code);
    this.name = "CandidateGuardError";
    this.code = code;
  }
}

export const CANDIDATE_PLAN_JSON_SCHEMA: CanonicalJsonValue = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  additionalProperties: false,
  properties: {
    affectedFiles: { items: { type: "string" }, type: "array" },
    assumptions: { items: { type: "string" }, type: "array" },
    evidenceReferenceIds: { items: { type: "string" }, type: "array" },
    expectedGraphChanges: {
      items: {
        additionalProperties: false,
        properties: {
          change: {
            enum: ["declare-development-dependency", "declare-runtime-dependency"],
            type: "string"
          },
          findingId: { type: "string" },
          packageName: { type: "string" }
        },
        required: ["findingId", "packageName", "change"],
        type: "object"
      },
      type: "array"
    },
    expectedValidationImpact: {
      items: {
        additionalProperties: false,
        properties: {
          expectedOutcome: { enum: ["REDACTED", "unchanged"], type: "string" },
          rationale: { type: "string" },
          targetId: { type: "string" }
        },
        required: ["targetId", "expectedOutcome", "rationale"],
        type: "object"
      },
      type: "array"
    },
    findingIds: { items: { type: "string" }, type: "array" },
    operations: {
      items: {
        additionalProperties: false,
        properties: {
          dependencySection: {
            enum: ["dependencies", "devDependencies"],
            type: "string"
          },
          evidenceReferenceIds: { items: { type: "string" }, type: "array" },
          findingId: { type: "string" },
          kind: { enum: ["package_add"], type: "string" },
          manager: { enum: ["npm"], type: "string" },
          manifestPath: { type: "string" },
          packageName: { type: "string" },
          versionRange: { type: "string" }
        },
        required: [
          "kind",
          "findingId",
          "evidenceReferenceIds",
          "manager",
          "packageName",
          "versionRange",
          "dependencySection",
          "manifestPath"
        ],
        type: "object"
      },
      type: "array"
    },
    proposedValidationProbes: {
      items: {
        additionalProperties: false,
        properties: {
          kind: { enum: ["build", "install", "test", "typecheck"], type: "string" },
          probeId: { type: "string" },
          targetId: { type: "string" }
        },
        required: ["probeId", "kind", "targetId"],
        type: "object"
      },
      type: "array"
    },
    rationale: { type: "string" },
    risks: { items: { type: "string" }, type: "array" },
    schemaVersion: { enum: [1], type: "integer" }
  },
  required: [
    "schemaVersion",
    "findingIds",
    "operations",
    "evidenceReferenceIds",
    "affectedFiles",
    "rationale",
    "expectedGraphChanges",
    "expectedValidationImpact",
    "assumptions",
    "risks",
    "proposedValidationProbes"
  ],
  type: "object"
};

const PLAN_KEYS = [
  "schemaVersion",
  "findingIds",
  "operations",
  "evidenceReferenceIds",
  "affectedFiles",
  "rationale",
  "expectedGraphChanges",
  "expectedValidationImpact",
  "assumptions",
  "risks",
  "proposedValidationProbes"
] as const;

const OPERATION_KEYS = [
  "kind",
  "findingId",
  "evidenceReferenceIds",
  "manager",
  "packageName",
  "versionRange",
  "dependencySection",
  "manifestPath"
] as const;

const MAX_TEXT_LENGTH = 2_000;
const MAX_COLLECTION_LENGTH = 64;
const NPM_PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u;
const NPM_VERSION_RANGE = /^(?:[~^]|>=?|<=?)?\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?$/u;

function isSafeRepositoryPath(value: string): boolean {
  if (
    value.length === 0 ||
    value.length > 512 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("\u0000")
  ) {
    return false;
  }
  return value
    .split("/")
    .every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function invalidStructuredOutput(): never {
  throw new CandidateGuardError("invalid_structured_output");
}

function candidateErrorFromBoundary(
  error: BoundaryValidationError,
  invalidJsonCode: "invalid_packet" | "invalid_structured_output"
): CandidateGuardError {
  return new CandidateGuardError(
    error.code === "invalid_json_value" ? invalidJsonCode : error.code
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function isRuntimeValue(value: unknown, expected: string): boolean {
  return value === expected;
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_TEXT_LENGTH) {
    invalidStructuredOutput();
  }
  return value;
}

function requiredStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_COLLECTION_LENGTH) {
    invalidStructuredOutput();
  }
  return value.map((item) => requiredString(item));
}

function requireUnique(values: readonly string[], code: CandidateGuardError["code"]): void {
  if (new Set(values).size !== values.length) {
    throw new CandidateGuardError(code);
  }
}

function parseOperation(value: unknown): PackageAddCandidateOperation {
  if (!isRecord(value) || !hasExactKeys(value, OPERATION_KEYS)) {
    invalidStructuredOutput();
  }
  const kind = requiredString(value.kind);
  if (kind !== "package_add") {
    throw new CandidateGuardError("unsupported_operation");
  }
  const manager = requiredString(value.manager);
  if (manager !== "npm") {
    throw new CandidateGuardError("manager_switch");
  }
  const dependencySection = requiredString(value.dependencySection);
  if (dependencySection !== "dependencies" && dependencySection !== "devDependencies") {
    invalidStructuredOutput();
  }
  return {
    dependencySection,
    evidenceReferenceIds: requiredStringArray(value.evidenceReferenceIds),
    findingId: requiredString(value.findingId),
    kind,
    manager,
    manifestPath: requiredString(value.manifestPath),
    packageName: requiredString(value.packageName),
    versionRange: requiredString(value.versionRange)
  };
}

function parseExpectedGraphChange(value: unknown): ExpectedGraphChange {
  const keys = ["change", "findingId", "packageName"] as const;
  if (!isRecord(value) || !hasExactKeys(value, keys)) {
    invalidStructuredOutput();
  }
  const change = requiredString(value.change);
  if (change !== "declare-development-dependency" && change !== "declare-runtime-dependency") {
    invalidStructuredOutput();
  }
  return {
    change,
    findingId: requiredString(value.findingId),
    packageName: requiredString(value.packageName)
  };
}

function parseExpectedValidationImpact(value: unknown): ExpectedValidationImpact {
  const keys = ["expectedOutcome", "rationale", "targetId"] as const;
  if (!isRecord(value) || !hasExactKeys(value, keys)) {
    invalidStructuredOutput();
  }
  const expectedOutcome = requiredString(value.expectedOutcome);
  if (expectedOutcome !== "REDACTED" && expectedOutcome !== "unchanged") {
    invalidStructuredOutput();
  }
  return {
    expectedOutcome,
    rationale: requiredString(value.rationale),
    targetId: requiredString(value.targetId)
  };
}

function parseValidationProbe(value: unknown): ProposedValidationProbe {
  const keys = ["kind", "probeId", "targetId"] as const;
  if (!isRecord(value) || !hasExactKeys(value, keys)) {
    invalidStructuredOutput();
  }
  const kind = requiredString(value.kind);
  if (kind !== "build" && kind !== "install" && kind !== "test" && kind !== "typecheck") {
    invalidStructuredOutput();
  }
  return {
    kind,
    probeId: requiredString(value.probeId),
    targetId: requiredString(value.targetId)
  };
}

function parseArray<T>(value: unknown, parser: (item: unknown) => T): readonly T[] {
  if (!Array.isArray(value) || value.length > MAX_COLLECTION_LENGTH) {
    invalidStructuredOutput();
  }
  return value.map((item) => parser(item));
}

export function parseCandidatePlan(value: unknown): CandidatePlan {
  if (!isRecord(value) || !hasExactKeys(value, PLAN_KEYS) || value.schemaVersion !== 1) {
    invalidStructuredOutput();
  }
  return {
    affectedFiles: requiredStringArray(value.affectedFiles),
    assumptions: requiredStringArray(value.assumptions),
    evidenceReferenceIds: requiredStringArray(value.evidenceReferenceIds),
    expectedGraphChanges: parseArray(value.expectedGraphChanges, parseExpectedGraphChange),
    expectedValidationImpact: parseArray(
      value.expectedValidationImpact,
      parseExpectedValidationImpact
    ),
    findingIds: requiredStringArray(value.findingIds),
    operations: parseArray(value.operations, parseOperation),
    proposedValidationProbes: parseArray(value.proposedValidationProbes, parseValidationProbe),
    rationale: requiredString(value.rationale),
    risks: requiredStringArray(value.risks),
    schemaVersion: 1
  };
}

function validatePacketText(packet: CandidateReasoningPacket): void {
  try {
    assertCanonicalJsonSafe(candidateReasoningPacketToJson(packet), {
      rejectPromptInjection: true
    });
  } catch (error: unknown) {
    if (error instanceof BoundaryValidationError) {
      throw candidateErrorFromBoundary(error, "invalid_packet");
    }
    throw error;
  }
}

function assertPacketBounds(packet: CandidateReasoningPacket): void {
  const collections: readonly (readonly unknown[])[] = [
    packet.finding.evidenceReferenceIds,
    packet.relevantGraphSlice,
    packet.semanticFileFragments,
    packet.repositoryConventions,
    packet.behaviorContractSummary.requiredTargetIds,
    packet.behaviorContractSummary.requiredProbeKinds,
    packet.capabilitySummary.supportedOperations,
    packet.capabilitySummary.knownFiles,
    packet.capabilitySummary.writableManifestFiles,
    packet.capabilitySummary.lockfiles,
    packet.permittedOperations,
    packet.effectivePolicy.allowedPackageNames,
    packet.effectivePolicy.deniedPackageNames,
    packet.priorValidationSummaries
  ];
  if (
    collections.some((collection) => collection.length > MAX_COLLECTION_LENGTH) ||
    packet.effectivePolicy.maximumOperations < 1 ||
    packet.effectivePolicy.maximumOperations > 8
  ) {
    throw new CandidateGuardError("invalid_packet");
  }
}

export function buildCandidateReasoningPacket(
  input: CandidateReasoningPacketInput
): CandidateReasoningPacket {
  const packet: CandidateReasoningPacket = {
    behaviorContractSummary: {
      contractVersion: input.behaviorContractSummary.contractVersion,
      requiredProbeKinds: [...input.behaviorContractSummary.requiredProbeKinds],
      requiredTargetIds: [...input.behaviorContractSummary.requiredTargetIds],
      summary: input.behaviorContractSummary.summary
    },
    capabilitySummary: {
      adapterId: input.capabilitySummary.adapterId,
      adapterVersion: input.capabilitySummary.adapterVersion,
      knownFiles: [...input.capabilitySummary.knownFiles],
      lockfiles: [...input.capabilitySummary.lockfiles],
      packageManager: input.capabilitySummary.packageManager,
      supportedOperations: [...input.capabilitySummary.supportedOperations],
      toolName: input.capabilitySummary.toolName,
      toolVersion: input.capabilitySummary.toolVersion,
      writableManifestFiles: [...input.capabilitySummary.writableManifestFiles]
    },
    effectivePolicy: {
      allowPackageManagerSwitch: false,
      allowedPackageNames: [...input.effectivePolicy.allowedPackageNames],
      deniedPackageNames: [...input.effectivePolicy.deniedPackageNames],
      maximumOperations: input.effectivePolicy.maximumOperations,
      policyVersion: input.effectivePolicy.policyVersion
    },
    finding: {
      category: input.finding.category,
      dependencySection: input.finding.dependencySection,
      evidenceReferenceIds: [...input.finding.evidenceReferenceIds],
      expectedPackageName: input.finding.expectedPackageName,
      id: input.finding.id,
      recommendedVersionRange: input.finding.recommendedVersionRange,
      ruleId: input.finding.ruleId,
      ruleVersion: input.finding.ruleVersion,
      summary: input.finding.summary
    },
    permittedOperations: [...input.permittedOperations],
    priorValidationSummaries: input.priorValidationSummaries.map((summary) => ({
      summaryClass: summary.summaryClass,
      targetId: summary.targetId
    })),
    projectGoal: input.projectGoal,
    projectPseudonym: input.projectPseudonym,
    relevantGraphSlice: input.relevantGraphSlice.map((node) => ({
      declared: node.declared,
      evidenceReferenceIds: [...node.evidenceReferenceIds],
      observed: node.observed,
      packageName: node.packageName
    })),
    repositoryConventions: input.repositoryConventions.map((convention) => ({
      conventionId: convention.conventionId,
      evidenceReferenceIds: [...convention.evidenceReferenceIds],
      summary: convention.summary
    })),
    schemaVersion: 1,
    semanticFileFragments: input.semanticFileFragments.map((fragment) => ({
      evidenceReferenceIds: [...fragment.evidenceReferenceIds],
      filePath: fragment.filePath,
      fragmentKind: fragment.fragmentKind,
      semanticDigest: fragment.semanticDigest,
      summary: fragment.summary
    }))
  };

  if (
    !isSha256Digest(packet.projectPseudonym) ||
    !isRuntimeValue(packet.capabilitySummary.packageManager, "npm") ||
    !isRuntimeValue(packet.capabilitySummary.toolName, "npm") ||
    !NPM_PACKAGE_NAME.test(packet.finding.expectedPackageName) ||
    !NPM_VERSION_RANGE.test(packet.finding.recommendedVersionRange) ||
    packet.finding.evidenceReferenceIds.length === 0 ||
    !packet.effectivePolicy.allowedPackageNames.includes(packet.finding.expectedPackageName) ||
    packet.effectivePolicy.deniedPackageNames.includes(packet.finding.expectedPackageName) ||
    packet.capabilitySummary.knownFiles.some((file) => !isSafeRepositoryPath(file)) ||
    packet.capabilitySummary.writableManifestFiles.some(
      (file) =>
        !isSafeRepositoryPath(file) ||
        !file.endsWith("package.json") ||
        !packet.capabilitySummary.knownFiles.includes(file)
    ) ||
    packet.capabilitySummary.lockfiles.some(
      (file) => !isSafeRepositoryPath(file) || !packet.capabilitySummary.knownFiles.includes(file)
    ) ||
    packet.semanticFileFragments.some(
      (fragment) =>
        !isSha256Digest(fragment.semanticDigest) ||
        !packet.capabilitySummary.knownFiles.includes(fragment.filePath)
    )
  ) {
    throw new CandidateGuardError("invalid_packet");
  }
  assertPacketBounds(packet);
  validatePacketText(packet);
  return packet;
}

export function candidateReasoningPacketToJson(
  packet: CandidateReasoningPacket
): CanonicalJsonValue {
  return toCanonicalJson({
    behaviorContractSummary: packet.behaviorContractSummary,
    capabilitySummary: packet.capabilitySummary,
    effectivePolicy: packet.effectivePolicy,
    finding: packet.finding,
    permittedOperations: packet.permittedOperations,
    priorValidationSummaries: packet.priorValidationSummaries,
    projectGoal: packet.projectGoal,
    projectPseudonym: packet.projectPseudonym,
    relevantGraphSlice: packet.relevantGraphSlice,
    repositoryConventions: packet.repositoryConventions,
    schemaVersion: packet.schemaVersion,
    semanticFileFragments: packet.semanticFileFragments
  });
}

function allPacketEvidenceIds(packet: CandidateReasoningPacket): ReadonlySet<string> {
  const ids = new Set(packet.finding.evidenceReferenceIds);
  for (const node of packet.relevantGraphSlice) {
    for (const id of node.evidenceReferenceIds) ids.add(id);
  }
  for (const fragment of packet.semanticFileFragments) {
    for (const id of fragment.evidenceReferenceIds) ids.add(id);
  }
  for (const convention of packet.repositoryConventions) {
    for (const id of convention.evidenceReferenceIds) ids.add(id);
  }
  return ids;
}

function validatePlanSafety(plan: CandidatePlan): void {
  try {
    assertCanonicalJsonSafe(toCanonicalJson(plan), { rejectPromptInjection: true });
  } catch (error: unknown) {
    if (error instanceof BoundaryValidationError) {
      throw candidateErrorFromBoundary(error, "invalid_structured_output");
    }
    throw error;
  }
}

export function guardCandidatePlan(
  packet: CandidateReasoningPacket,
  candidate: unknown
): AcceptedCandidatePlan {
  validatePacketText(packet);
  const plan = parseCandidatePlan(candidate);
  validatePlanSafety(plan);

  if (plan.operations.length === 0) {
    throw new CandidateGuardError("unsupported_operation");
  }
  if (
    plan.operations.length > packet.effectivePolicy.maximumOperations ||
    plan.operations.length > 8
  ) {
    throw new CandidateGuardError("policy_violation");
  }

  requireUnique(plan.findingIds, "invented_finding");
  requireUnique(plan.evidenceReferenceIds, "invented_evidence");
  requireUnique(plan.affectedFiles, "unknown_file");

  const allowedFindingIds = new Set([packet.finding.id]);
  if (plan.findingIds.length !== 1 || !plan.findingIds.every((id) => allowedFindingIds.has(id))) {
    throw new CandidateGuardError("invented_finding");
  }

  const evidenceIds = allPacketEvidenceIds(packet);
  if (
    plan.evidenceReferenceIds.length === 0 ||
    !plan.evidenceReferenceIds.every((id) => evidenceIds.has(id))
  ) {
    throw new CandidateGuardError("invented_evidence");
  }

  const writableFiles = new Set(packet.capabilitySummary.writableManifestFiles);
  const lockfiles = new Set(packet.capabilitySummary.lockfiles);
  if (
    plan.affectedFiles.length === 0 ||
    !plan.affectedFiles.every((file) => writableFiles.has(file) && !lockfiles.has(file))
  ) {
    throw new CandidateGuardError("unknown_file");
  }

  if (
    !packet.permittedOperations.includes("package_add") ||
    !packet.capabilitySummary.supportedOperations.includes("package_add")
  ) {
    throw new CandidateGuardError("unsupported_operation");
  }

  const allowedPackages = new Set(packet.effectivePolicy.allowedPackageNames);
  const deniedPackages = new Set(packet.effectivePolicy.deniedPackageNames);
  const requiredTargets = new Set(packet.behaviorContractSummary.requiredTargetIds);
  const requiredProbeKinds = new Set(packet.behaviorContractSummary.requiredProbeKinds);

  const nativeOperations = plan.operations.map((operation) => {
    if (
      operation.findingId !== packet.finding.id ||
      !plan.findingIds.includes(operation.findingId)
    ) {
      throw new CandidateGuardError("invented_finding");
    }
    if (
      operation.evidenceReferenceIds.length === 0 ||
      !operation.evidenceReferenceIds.every(
        (id) =>
          evidenceIds.has(id) &&
          packet.finding.evidenceReferenceIds.includes(id) &&
          plan.evidenceReferenceIds.includes(id)
      )
    ) {
      throw new CandidateGuardError("invented_evidence");
    }
    requireUnique(operation.evidenceReferenceIds, "invented_evidence");
    if (
      !NPM_PACKAGE_NAME.test(operation.packageName) ||
      operation.packageName !== packet.finding.expectedPackageName ||
      !allowedPackages.has(operation.packageName) ||
      deniedPackages.has(operation.packageName)
    ) {
      throw new CandidateGuardError("disallowed_dependency");
    }
    if (
      !NPM_VERSION_RANGE.test(operation.versionRange) ||
      operation.versionRange !== packet.finding.recommendedVersionRange ||
      operation.dependencySection !== packet.finding.dependencySection
    ) {
      throw new CandidateGuardError("policy_violation");
    }
    if (
      !writableFiles.has(operation.manifestPath) ||
      lockfiles.has(operation.manifestPath) ||
      !plan.affectedFiles.includes(operation.manifestPath)
    ) {
      throw new CandidateGuardError("unknown_file");
    }
    return {
      dependencySection: operation.dependencySection,
      evidenceReferenceIds: [...operation.evidenceReferenceIds],
      findingId: operation.findingId,
      kind: "npm_package_add" as const,
      lockfilePolicy: "native-manager-generated" as const,
      manager: "npm" as const,
      manifestPath: operation.manifestPath,
      packageName: operation.packageName,
      versionRange: operation.versionRange
    };
  });

  if (
    plan.expectedGraphChanges.length !== plan.operations.length ||
    !plan.expectedGraphChanges.every(
      (change) =>
        change.findingId === packet.finding.id &&
        change.packageName === packet.finding.expectedPackageName &&
        change.change ===
          (packet.finding.dependencySection === "dependencies"
            ? "declare-runtime-dependency"
            : "declare-development-dependency")
    )
  ) {
    throw new CandidateGuardError("policy_violation");
  }

  if (
    !plan.expectedValidationImpact.every((impact) => requiredTargets.has(impact.targetId)) ||
    !plan.proposedValidationProbes.every(
      (probe) => requiredTargets.has(probe.targetId) && requiredProbeKinds.has(probe.kind)
    ) ||
    (requiredTargets.size > 0 &&
      (plan.expectedValidationImpact.length === 0 || plan.proposedValidationProbes.length === 0))
  ) {
    throw new CandidateGuardError("policy_violation");
  }

  return {
    guardVersion: CANDIDATE_GUARD_VERSION,
    nativeOperations,
    plan
  };
}

export function createDeterministicNpmQuickFix(
  packet: CandidateReasoningPacket
): AcceptedCandidatePlan {
  if (
    packet.finding.evidenceReferenceIds.length === 0 ||
    packet.capabilitySummary.writableManifestFiles.length !== 1
  ) {
    throw new CandidateGuardError("ambiguous_evidence");
  }
  const manifestPath = packet.capabilitySummary.writableManifestFiles[0];
  if (manifestPath === undefined) {
    throw new CandidateGuardError("ambiguous_evidence");
  }
  const targetId = packet.behaviorContractSummary.requiredTargetIds[0];
  const probeKind = packet.behaviorContractSummary.requiredProbeKinds[0];
  const plan: CandidatePlan = {
    affectedFiles: [manifestPath],
    assumptions: [],
    evidenceReferenceIds: [...packet.finding.evidenceReferenceIds],
    expectedGraphChanges: [
      {
        change:
          packet.finding.dependencySection === "dependencies"
            ? "declare-runtime-dependency"
            : "declare-development-dependency",
        findingId: packet.finding.id,
        packageName: packet.finding.expectedPackageName
      }
    ],
    expectedValidationImpact:
      targetId === undefined
        ? []
        : [
            {
              expectedOutcome: "REDACTED",
              rationale: "Reconstruct and test the declared dependency in a clean target.",
              targetId
            }
          ],
    findingIds: [packet.finding.id],
    operations: [
      {
        dependencySection: packet.finding.dependencySection,
        evidenceReferenceIds: [...packet.finding.evidenceReferenceIds],
        findingId: packet.finding.id,
        kind: "package_add",
        manager: "npm",
        manifestPath,
        packageName: packet.finding.expectedPackageName,
        versionRange: packet.finding.recommendedVersionRange
      }
    ],
    proposedValidationProbes:
      targetId === undefined || probeKind === undefined
        ? []
        : [{ kind: probeKind, probeId: "deterministic-probe-1", targetId }],
    rationale:
      "Declare the package observed by deterministic evidence using the native npm adapter.",
    risks: [],
    schemaVersion: 1
  };
  return guardCandidatePlan(packet, plan);
}

export async function candidatePlanSchemaReference(): Promise<StructuredOutputSchemaReference> {
  return {
    schemaDigest: await sha256Canonical(CANDIDATE_PLAN_JSON_SCHEMA),
    schemaId: CANDIDATE_PLAN_SCHEMA_ID,
    schemaVersion: CANDIDATE_PLAN_SCHEMA_VERSION
  };
}

export async function candidatePlanSchemaRegistration(): Promise<{
  readonly reference: StructuredOutputSchemaReference;
  readonly schema: CanonicalJsonValue;
}> {
  return {
    reference: await candidatePlanSchemaReference(),
    schema: CANDIDATE_PLAN_JSON_SCHEMA
  };
}

export function assertCandidatePacketHasNoSecrets(packet: CandidateReasoningPacket): void {
  try {
    assertSafeText(JSON.stringify(candidateReasoningPacketToJson(packet)), {
      rejectPromptInjection: true
    });
  } catch (error: unknown) {
    if (error instanceof BoundaryValidationError) {
      throw candidateErrorFromBoundary(error, "invalid_packet");
    }
    throw error;
  }
}
