export type AdapterSupportLevel =
  "full_native" | "native_validation" | "observed_only" | "unsupported";

export type AdapterCapability =
  "local_inventory" | "repository_parsing" | "mutation" | "validation";

export interface AdapterIdentity {
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly inputSourceId: string;
  readonly supportLevel: AdapterSupportLevel;
}

export interface AdapterManifest {
  readonly identity: Omit<AdapterIdentity, "inputSourceId">;
  readonly ecosystem: string;
  readonly manager: string;
  readonly managerVersions: readonly string[];
  readonly capabilities: Readonly<Record<AdapterCapability, boolean>>;
  readonly generatedFiles: readonly string[];
  readonly precedence: readonly string[];
  readonly conflictsWithManagers: readonly string[];
}

export interface RepositoryFile {
  readonly content: string;
  /** Repository-relative POSIX path. */
  readonly path: string;
}

export interface SourceLocation {
  readonly column?: number;
  readonly endColumn?: number;
  readonly endLine?: number;
  readonly line?: number;
  readonly path: string;
}

export type NpmDependencyKind = "development" | "optional" | "peer" | "production";

export interface NpmDeclaredDependency {
  readonly adapter: AdapterIdentity;
  readonly direct: true;
  readonly ecosystem: "npm";
  readonly kind: NpmDependencyKind;
  readonly name: string;
  readonly normalizedName: string;
  readonly projectRoot: string;
  readonly sourceLocation: SourceLocation;
  readonly specifier: string;
  readonly workspace: boolean;
}

export interface NpmLockedDependency {
  readonly adapter: AdapterIdentity;
  readonly architecture: readonly string[];
  readonly dependencyKind: NpmDependencyKind;
  readonly direct: boolean;
  readonly ecosystem: "npm";
  readonly engines: Readonly<Record<string, string>>;
  readonly integrity?: string;
  readonly link: boolean;
  readonly name: string;
  readonly normalizedName: string;
  readonly optional: boolean;
  readonly packagePath: string;
  readonly platform: readonly string[];
  readonly projectRoot: string;
  readonly resolved?: string;
  readonly sourceLocation: SourceLocation;
  readonly transitive: boolean;
  readonly version: string;
  readonly workspace: boolean;
}

export type NpmUseKind =
  | "dynamic_import"
  | "executable_reference"
  | "side_effect_import"
  | "static_import"
  | "static_require";

export interface NpmUsageEvidence {
  readonly adapter: AdapterIdentity;
  readonly certainty: "certain" | "uncertain";
  readonly ecosystem: "npm";
  readonly executable: boolean;
  readonly kind: NpmUseKind;
  readonly name: string;
  readonly normalizedName: string;
  readonly projectRoot: string;
  readonly sourceLocation: SourceLocation;
  readonly specifier: string;
}

export interface AdapterGap {
  readonly code:
    | "invalid_manifest"
    | "invalid_lockfile"
    | "unsupported_lockfile_version"
    | "unsupported_manager"
    | "uncertain_dynamic_use"
    | "uncertain_static_use";
  readonly message: string;
  readonly sourceLocation: SourceLocation;
}

export interface NpmProject {
  readonly declared: readonly NpmDeclaredDependency[];
  readonly gaps: readonly AdapterGap[];
  readonly locked: readonly NpmLockedDependency[];
  readonly lockfileVersion?: 2 | 3;
  readonly projectRoot: string;
  readonly usage: readonly NpmUsageEvidence[];
}

export interface NpmRepositorySnapshot {
  readonly adapter: AdapterIdentity;
  readonly projects: readonly NpmProject[];
}

export type PythonManager = "pip" | "uv";
export type PythonEnvironmentScope = "project" | "virtual_environment" | "REDACTED" | "global";

export interface PythonDeclaredDependency {
  readonly adapter: AdapterIdentity;
  readonly direct: boolean;
  readonly editable: boolean;
  readonly ecosystem: "pypi";
  readonly extras: readonly string[];
  readonly indexIdentity?: string;
  readonly localReference?: string;
  readonly marker?: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly projectRoot: string;
  readonly sourceLocation: SourceLocation;
  readonly specifier: string;
}

export interface PythonLockedDependency {
  readonly adapter: AdapterIdentity;
  readonly direct: boolean;
  readonly ecosystem: "pypi";
  readonly marker?: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly projectRoot: string;
  readonly sourceLocation: SourceLocation;
  readonly transitive: boolean;
  readonly version: string;
}

export interface PythonUsageEvidence {
  readonly adapter: AdapterIdentity;
  readonly certainty: "certain" | "uncertain";
  readonly ecosystem: "pypi";
  readonly kind: "executable_reference" | "static_import" | "dynamic_import";
  readonly name: string;
  readonly normalizedName: string;
  readonly projectRoot: string;
  readonly sourceLocation: SourceLocation;
}

export interface PythonProject {
  readonly declared: readonly PythonDeclaredDependency[];
  readonly gaps: readonly AdapterGap[];
  readonly locked: readonly PythonLockedDependency[];
  readonly manager: PythonManager;
  readonly projectRoot: string;
  readonly pythonConstraint?: string;
  readonly usage: readonly PythonUsageEvidence[];
}

export interface PythonRepositorySnapshot {
  readonly adapter: AdapterIdentity;
  readonly projects: readonly PythonProject[];
}

export interface PythonInstalledPackage {
  readonly ecosystem: "pypi";
  readonly editableProjectLocation?: string;
  readonly environmentScope: PythonEnvironmentScope;
  readonly name: string;
  readonly normalizedName: string;
  readonly version: string;
}

export interface PythonOperation {
  readonly args: readonly string[];
  readonly executable: "pip" | "python" | "uv";
  readonly kind:
    "add" | "remove" | "update" | "lock" | "frozen_install" | "graph" | "build" | "test";
}

export interface PythonTarget {
  readonly architecture: "x86_64";
  readonly baseImage: string;
  readonly manager: PythonManager;
  readonly managerVersion: string;
  readonly platform: "linux";
  readonly pythonVersion: string;
  readonly supportLevel: "observed_only";
}

export type RepositorySnapshot = NpmRepositorySnapshot | PythonRepositorySnapshot;

export interface RepositoryAdapter<TSnapshot> {
  readonly manifest: AdapterManifest;
  parse(files: readonly RepositoryFile[], inputSourceId: string): TSnapshot;
}

export interface ObservedOnlyProfile {
  readonly fileNames: readonly string[];
  readonly manager: string;
  readonly supportLevel: "observed_only";
}
