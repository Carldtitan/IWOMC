export { AdapterRegistry, observedOnlyProfiles } from "./registry.js";
export {
  NpmAdapterError,
  npmAdapterManifest,
  npmRepositoryAdapter,
  parseNpmRepository
} from "./node/npm.js";
export type {
  AdapterCapability,
  AdapterGap,
  AdapterIdentity,
  AdapterManifest,
  AdapterSupportLevel,
  NpmDeclaredDependency,
  NpmDependencyKind,
  NpmLockedDependency,
  NpmProject,
  NpmRepositorySnapshot,
  NpmUsageEvidence,
  NpmUseKind,
  ObservedOnlyProfile,
  RepositoryAdapter,
  RepositoryFile,
  SourceLocation
} from "./types.js";

export const adaptersPackageStatus = "npm-native-validation" as const;
