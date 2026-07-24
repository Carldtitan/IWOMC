export { AdapterRegistry, observedOnlyProfiles } from "./registry.js";
export {
  NpmAdapterError,
  npmAdapterManifest,
  npmRepositoryAdapter,
  parseNpmRepository
} from "./node/npm.js";
export {
  parsePythonInstalledGraph,
  parsePythonRepository,
  pipAdapterManifest,
  pipRepositoryAdapter,
  pythonOperations,
  pythonTargetMatrix,
  uvAdapterManifest,
  uvRepositoryAdapter
} from "./python/python.js";
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
  PythonDeclaredDependency,
  PythonEnvironmentScope,
  PythonInstalledPackage,
  PythonLockedDependency,
  PythonManager,
  PythonOperation,
  PythonProject,
  PythonRepositorySnapshot,
  PythonTarget,
  PythonUsageEvidence,
  RepositoryAdapter,
  RepositoryFile,
  RepositorySnapshot,
  SourceLocation
} from "./types.js";

export const adaptersPackageStatus = "npm-native-validation-python-observed-only" as const;
