export { buildEvidenceGraphSet } from "./graphs/build.js";
export {
  canonicalIdentity,
  canonicalJson,
  resourceMatchKey,
  stableId
} from "./graphs/canonical.js";
export type {
  AdapterInputIdentity,
  Attribution,
  CaptureGap,
  EvidenceAttribute,
  EvidenceEdge,
  EvidenceEdgeInput,
  EvidenceGraph,
  EvidenceGraphSet,
  EvidenceGraphSetInput,
  EvidenceNode,
  EvidenceNodeInput,
  EvidenceReference,
  Finding,
  FindingConfidence,
  GraphKind,
  ReconciliationResult,
  ReconciliationUncertainty,
  ResourceIdentity,
  SourceLocation,
  SupportLevel
} from "./graphs/types.js";
export {
  npmUsedInstalledObservedUndeclaredRule,
  reconcileNpmUndeclaredDependencies
} from "./rules/npm-undeclared.js";
export {
  deterministicDisagreementRules,
  reconcileDeterministicDisagreements
} from "./rules/deterministic-disagreements.js";
export { buildNpmEvidenceGraphSet } from "./npm-checkpoint.js";
export * from "./behavior-contract/index.js";
export type {
  NpmCheckpointInput,
  NpmInstalledPackageInput,
  NpmObservedInstallInput,
  NpmRepositorySnapshotLike,
  NpmValidatedPackageInput
} from "./npm-checkpoint.js";

export const reconcilerPackageStatus = "seven-graphs-npm-rule" as const;

export type {
  CanonicalJsonObject,
  CanonicalJsonPrimitive,
  CanonicalJsonValue,
  Clock,
  ContentHasher,
  IdGenerator,
  Sha256Digest
} from "./ports/index.js";
