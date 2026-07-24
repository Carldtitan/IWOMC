import type {
  AdapterGap,
  AdapterIdentity,
  AdapterManifest,
  NpmDeclaredDependency,
  NpmDependencyKind,
  NpmLockedDependency,
  NpmProject,
  NpmRepositorySnapshot,
  NpmUsageEvidence,
  RepositoryAdapter,
  RepositoryFile,
  SourceLocation
} from "../types.js";

const adapterVersion = "1.0.0";
const ignoredSourceDirectories = new Set([
  ".git",
  ".next",
  "coverage",
  "dist",
  "node_modules",
  "vendor"
]);
const nodeBuiltins = new Set([
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib"
]);

export const npmAdapterManifest: AdapterManifest = Object.freeze({
  identity: Object.freeze({
    adapterId: "node/npm",
    adapterVersion,
    supportLevel: "native_validation" as const
  }),
  ecosystem: "npm",
  manager: "npm",
  managerVersions: Object.freeze(["10", "11"]),
  capabilities: Object.freeze({
    local_inventory: true,
    mutation: true,
    repository_parsing: true,
    validation: true
  }),
  generatedFiles: Object.freeze(["package-lock.json"]),
  precedence: Object.freeze(["package.json", "package-lock.json"]),
  conflictsWithManagers: Object.freeze(["bun", "pnpm", "yarn"])
});

export const npmRepositoryAdapter: RepositoryAdapter<NpmRepositorySnapshot> = Object.freeze({
  manifest: npmAdapterManifest,
  parse: parseNpmRepository
});

export class NpmAdapterError extends Error {
  readonly code: "invalid_path" | "invalid_repository";

  constructor(code: NpmAdapterError["code"], message: string) {
    super(message);
    this.name = "NpmAdapterError";
    this.code = code;
  }
}

export function parseNpmRepository(
  repositoryFiles: readonly RepositoryFile[],
  inputSourceId: string
): NpmRepositorySnapshot {
  if (inputSourceId.trim() === "") {
    throw new NpmAdapterError("invalid_repository", "inputSourceId is required");
  }

  const files = new Map<string, string>();
  for (const file of repositoryFiles) {
    const path = normalizeRepositoryPath(file.path);
    if (files.has(path)) {
      throw new NpmAdapterError("invalid_repository", `Duplicate repository path: ${path}`);
    }
    files.set(path, file.content);
  }

  const adapter = freezeAdapterIdentity(inputSourceId);
  const packageJsonPaths = [...files.keys()]
    .filter((path) => path === "package.json" || path.endsWith("/package.json"))
    .filter((path) => !hasIgnoredDirectory(path))
    .sort(compareText);
  const projectRoots = Object.freeze(
    packageJsonPaths.map((manifestPath) => directoryOf(manifestPath))
  );

  const projects = packageJsonPaths.map((manifestPath) =>
    parseProject(files, manifestPath, projectRoots, adapter)
  );

  return Object.freeze({
    adapter,
    projects: Object.freeze(projects)
  });
}

function parseProject(
  files: ReadonlyMap<string, string>,
  manifestPath: string,
  projectRoots: readonly string[],
  adapter: AdapterIdentity
): NpmProject {
  const projectRoot = directoryOf(manifestPath);
  const manifestContent = files.get(manifestPath);
  if (manifestContent === undefined) {
    throw new NpmAdapterError("invalid_repository", "Manifest disappeared during parsing");
  }

  const gaps: AdapterGap[] = [];
  const manifest = parseJsonObject(manifestContent);
  if (manifest === undefined) {
    gaps.push(gap("invalid_manifest", "package.json is not valid JSON object data", manifestPath));
  }
  const declared =
    manifest === undefined
      ? []
      : parseDeclarations(manifest, manifestContent, manifestPath, projectRoot, adapter);

  const lockPath = joinProjectPath(projectRoot, "package-lock.json");
  const lockContent = files.get(lockPath);
  let lockfileVersion: 2 | 3 | undefined;
  let locked: readonly NpmLockedDependency[] = [];
  if (lockContent !== undefined) {
    const parsedLock = parseLockfile(lockContent, lockPath, projectRoot, declared, adapter);
    gaps.push(...parsedLock.gaps);
    lockfileVersion = parsedLock.lockfileVersion;
    locked = parsedLock.locked;
  }

  const usage = scanProjectUsage(files, projectRoot, projectRoots, adapter);
  for (const item of usage) {
    if (item.certainty === "uncertain") {
      gaps.push(
        gap(
          item.kind === "dynamic_import" ? "uncertain_dynamic_use" : "uncertain_static_use",
          `${item.kind} evidence cannot prove executable necessity: ${item.name}`,
          item.sourceLocation.path,
          item.sourceLocation.line,
          item.sourceLocation.column
        )
      );
    }
  }

  return Object.freeze({
    declared: Object.freeze([...declared].sort(compareDeclared)),
    gaps: Object.freeze([...gaps].sort(compareGap)),
    locked: Object.freeze([...locked].sort(compareLocked)),
    ...(lockfileVersion === undefined ? {} : { lockfileVersion }),
    projectRoot,
    usage: Object.freeze([...usage].sort(compareUsage))
  });
}

function parseDeclarations(
  manifest: Readonly<Record<string, unknown>>,
  content: string,
  path: string,
  projectRoot: string,
  adapter: AdapterIdentity
): readonly NpmDeclaredDependency[] {
  const workspaceNames = workspacePackageNames(manifest);
  const groups: readonly [string, NpmDependencyKind][] = [
    ["dependencies", "production"],
    ["devDependencies", "development"],
    ["optionalDependencies", "optional"],
    ["peerDependencies", "peer"]
  ];
  const result: NpmDeclaredDependency[] = [];

  for (const [field, kind] of groups) {
    const dependencies = asObject(manifest[field]);
    if (dependencies === undefined) {
      continue;
    }
    for (const name of Object.keys(dependencies).sort(compareText)) {
      const specifier = dependencies[name];
      if (typeof specifier !== "string") {
        continue;
      }
      result.push(
        Object.freeze({
          adapter,
          direct: true as const,
          ecosystem: "npm" as const,
          kind,
          name,
          normalizedName: normalizeNpmPackageName(name),
          projectRoot,
          sourceLocation: sourceLocationFor(content, path, name),
          specifier,
          workspace: specifier.startsWith("workspace:") || workspaceNames.has(name)
        })
      );
    }
  }
  return result;
}

function parseLockfile(
  content: string,
  path: string,
  projectRoot: string,
  declared: readonly NpmDeclaredDependency[],
  adapter: AdapterIdentity
): {
  readonly gaps: readonly AdapterGap[];
  readonly locked: readonly NpmLockedDependency[];
  readonly lockfileVersion?: 2 | 3;
} {
  const lock = parseJsonObject(content);
  if (lock === undefined) {
    return {
      gaps: [gap("invalid_lockfile", "package-lock.json is not valid JSON object data", path)],
      locked: []
    };
  }
  const version = lock.lockfileVersion;
  if (version !== 2 && version !== 3) {
    return {
      gaps: [
        gap(
          "unsupported_lockfile_version",
          `Supported package-lock.json versions are 2 and 3; received ${String(version)}`,
          path
        )
      ],
      locked: []
    };
  }
  const packages = asObject(lock.packages);
  if (packages === undefined) {
    return {
      gaps: [
        gap("invalid_lockfile", "package-lock.json must contain the semantic packages map", path)
      ],
      locked: [],
      lockfileVersion: version
    };
  }

  const directKinds = new Map(
    declared.map((dependency) => [dependency.normalizedName, dependency.kind] as const)
  );
  const locked: NpmLockedDependency[] = [];
  for (const packagePath of Object.keys(packages).sort(compareText)) {
    if (packagePath === "") {
      continue;
    }
    const packageRecord = asObject(packages[packagePath]);
    if (packageRecord === undefined) {
      continue;
    }
    const inferredName = packageNameFromLockPath(packagePath);
    const name = typeof packageRecord.name === "string" ? packageRecord.name : inferredName;
    const packageVersion =
      typeof packageRecord.version === "string" ? packageRecord.version : undefined;
    if (name === undefined || packageVersion === undefined) {
      continue;
    }
    const normalizedName = normalizeNpmPackageName(name);
    const directKind = directKinds.get(normalizedName);
    const dependencyKind =
      directKind ??
      (packageRecord.optional === true
        ? "optional"
        : packageRecord.dev === true
          ? "development"
          : packageRecord.peer === true
            ? "peer"
            : "production");
    const direct = directKind !== undefined && isTopLevelPackagePath(packagePath);

    locked.push(
      Object.freeze({
        adapter,
        architecture: Object.freeze(stringArray(packageRecord.cpu)),
        dependencyKind,
        direct,
        ecosystem: "npm" as const,
        engines: Object.freeze(stringRecord(packageRecord.engines)),
        ...(typeof packageRecord.integrity === "string"
          ? { integrity: packageRecord.integrity }
          : {}),
        link: packageRecord.link === true,
        name,
        normalizedName,
        optional: packageRecord.optional === true,
        packagePath,
        platform: Object.freeze(stringArray(packageRecord.os)),
        projectRoot,
        ...(typeof packageRecord.resolved === "string" ? { resolved: packageRecord.resolved } : {}),
        sourceLocation: sourceLocationFor(content, path, packagePath),
        transitive: !direct,
        version: packageVersion,
        workspace: packageRecord.link === true || !packagePath.includes("node_modules/")
      })
    );
  }
  return {
    gaps: [],
    locked,
    lockfileVersion: version
  };
}

function scanProjectUsage(
  files: ReadonlyMap<string, string>,
  projectRoot: string,
  projectRoots: readonly string[],
  adapter: AdapterIdentity
): readonly NpmUsageEvidence[] {
  const result: NpmUsageEvidence[] = [];
  for (const [path, content] of [...files.entries()].sort(([left], [right]) =>
    compareText(left, right)
  )) {
    if (
      !isProjectSource(path, projectRoot) ||
      owningProjectRoot(path, projectRoots) !== projectRoot
    ) {
      continue;
    }
    scanUsagePattern(
      result,
      content,
      path,
      projectRoot,
      adapter,
      /\bimport\s+([^"'();]+?)\s+from\s+["']([^"']+)["']/gu,
      "static_import",
      (match) => importedBindingsAreUsed(match[1] ?? "", content, match.index + match[0].length)
    );
    scanUsagePattern(
      result,
      content,
      path,
      projectRoot,
      adapter,
      /\b(?:export)\s+[^"']*?\s+from\s+["']([^"']+)["']/gu,
      "static_import",
      () => true,
      1
    );
    scanUsagePattern(
      result,
      content,
      path,
      projectRoot,
      adapter,
      /\bimport\s*["']([^"']+)["']/gu,
      "side_effect_import",
      () => true,
      1
    );
    scanUsagePattern(
      result,
      content,
      path,
      projectRoot,
      adapter,
      /\brequire\s*\(\s*["']([^"']+)["']\s*\)/gu,
      "static_require",
      () => true,
      1
    );
    scanUsagePattern(
      result,
      content,
      path,
      projectRoot,
      adapter,
      /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
      "dynamic_import",
      () => false,
      1
    );
  }

  const unique = new Map<string, NpmUsageEvidence>();
  for (const evidence of result) {
    const key = [
      evidence.sourceLocation.path,
      evidence.sourceLocation.line,
      evidence.sourceLocation.column,
      evidence.kind,
      evidence.normalizedName
    ].join(":");
    unique.set(key, evidence);
  }
  return [...unique.values()];
}

function scanUsagePattern(
  output: NpmUsageEvidence[],
  content: string,
  path: string,
  projectRoot: string,
  adapter: AdapterIdentity,
  pattern: RegExp,
  kind: NpmUsageEvidence["kind"],
  isExecutable: (match: RegExpExecArray) => boolean,
  specifierGroup = 2
): void {
  let match = pattern.exec(content);
  while (match !== null) {
    const specifier = match[specifierGroup];
    if (specifier !== undefined) {
      const name = packageNameFromSpecifier(specifier);
      if (name !== undefined) {
        const executable = isExecutable(match);
        const dynamic = kind === "dynamic_import";
        output.push(
          Object.freeze({
            adapter,
            certainty: dynamic || !executable ? "uncertain" : "certain",
            ecosystem: "npm" as const,
            executable,
            kind,
            name,
            normalizedName: normalizeNpmPackageName(name),
            projectRoot,
            sourceLocation: sourceLocationAt(content, path, match.index),
            specifier
          })
        );
      }
    }
    match = pattern.exec(content);
  }
}

function importedBindingsAreUsed(clause: string, content: string, afterImport: number): boolean {
  const names = new Set<string>();
  const trimmedClause = clause.trim();
  if (trimmedClause.startsWith("type ")) {
    return false;
  }
  const withoutType = trimmedClause;
  const defaultMatch = /^([A-Za-z_$][\w$]*)/u.exec(withoutType);
  if (defaultMatch?.[1] !== undefined) {
    names.add(defaultMatch[1]);
  }
  const namespaceMatch = /\*\s+as\s+([A-Za-z_$][\w$]*)/u.exec(withoutType);
  if (namespaceMatch?.[1] !== undefined) {
    names.add(namespaceMatch[1]);
  }
  const namedMatch = /\{([^}]*)\}/u.exec(withoutType);
  if (namedMatch?.[1] !== undefined) {
    for (const entry of namedMatch[1].split(",")) {
      const rawEntry = entry.trim();
      if (rawEntry.startsWith("type ")) {
        continue;
      }
      const cleaned = rawEntry;
      const alias = /\bas\s+([A-Za-z_$][\w$]*)$/u.exec(cleaned)?.[1];
      const original = /^([A-Za-z_$][\w$]*)/u.exec(cleaned)?.[1];
      if (alias !== undefined) {
        names.add(alias);
      } else if (original !== undefined) {
        names.add(original);
      }
    }
  }
  const remainder = content.slice(afterImport);
  return [...names].some((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`, "u").test(remainder));
}

function packageNameFromSpecifier(specifier: string): string | undefined {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("#") ||
    specifier.startsWith("node:")
  ) {
    return undefined;
  }
  const segments = specifier.split("/");
  const name = specifier.startsWith("@")
    ? segments.length >= 2
      ? `${segments[0]}/${segments[1]}`
      : undefined
    : segments[0];
  if (name === undefined || nodeBuiltins.has(name)) {
    return undefined;
  }
  return name;
}

function normalizeNpmPackageName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeRepositoryPath(path: string): string {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\/+/u, "");
  const segments = normalized.split("/");
  if (
    normalized === "" ||
    normalized.startsWith("/") ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new NpmAdapterError("invalid_path", `Invalid repository-relative path: ${path}`);
  }
  return normalized;
}

function parseJsonObject(content: string): Readonly<Record<string, unknown>> | undefined {
  try {
    return asObject(JSON.parse(content) as unknown);
  } catch {
    return undefined;
  }
}

function asObject(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
}

function workspacePackageNames(manifest: Readonly<Record<string, unknown>>): ReadonlySet<string> {
  const names = new Set<string>();
  const workspaces = Array.isArray(manifest.workspaces)
    ? manifest.workspaces
    : asObject(manifest.workspaces)?.packages;
  if (Array.isArray(workspaces)) {
    for (const workspace of workspaces) {
      if (typeof workspace === "string" && !workspace.includes("*")) {
        names.add(workspace);
      }
    }
  }
  return names;
}

function sourceLocationFor(content: string, path: string, REDACTED: string): SourceLocation {
  const index = content.indexOf(`"${REDACTED}"`);
  return sourceLocationAt(content, path, Math.max(0, index));
}

function sourceLocationAt(content: string, path: string, index: number): SourceLocation {
  const preceding = content.slice(0, index);
  const lines = preceding.split(/\r?\n/u);
  return Object.freeze({
    column: (lines.at(-1)?.length ?? 0) + 1,
    line: lines.length,
    path
  });
}

function gap(
  code: AdapterGap["code"],
  message: string,
  path: string,
  line?: number,
  column?: number
): AdapterGap {
  return Object.freeze({
    code,
    message,
    sourceLocation: Object.freeze({
      ...(column === undefined ? {} : { column }),
      ...(line === undefined ? {} : { line }),
      path
    })
  });
}

function freezeAdapterIdentity(inputSourceId: string): AdapterIdentity {
  return Object.freeze({
    adapterId: npmAdapterManifest.identity.adapterId,
    adapterVersion,
    inputSourceId,
    supportLevel: npmAdapterManifest.identity.supportLevel
  });
}

function directoryOf(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function joinProjectPath(projectRoot: string, name: string): string {
  return projectRoot === "" ? name : `${projectRoot}/${name}`;
}

function hasIgnoredDirectory(path: string): boolean {
  return path.split("/").some((segment) => ignoredSourceDirectories.has(segment));
}

function isProjectSource(path: string, projectRoot: string): boolean {
  const relative =
    projectRoot === ""
      ? path
      : path.startsWith(`${projectRoot}/`)
        ? path.slice(projectRoot.length + 1)
        : undefined;
  if (relative === undefined || hasIgnoredDirectory(relative)) {
    return false;
  }
  return /\.(?:[cm]?[jt]sx?)$/u.test(relative);
}

function owningProjectRoot(path: string, projectRoots: readonly string[]): string {
  return (
    [...projectRoots]
      .filter((root) => root === "" || path.startsWith(`${root}/`))
      .sort((left, right) => right.length - left.length || compareText(left, right))[0] ?? ""
  );
}

function packageNameFromLockPath(path: string): string | undefined {
  const marker = "node_modules/";
  const index = path.lastIndexOf(marker);
  const remainder = index === -1 ? path : path.slice(index + marker.length);
  const segments = remainder.split("/");
  return remainder.startsWith("@")
    ? segments.length >= 2
      ? `${segments[0]}/${segments[1]}`
      : undefined
    : segments[0];
}

function isTopLevelPackagePath(path: string): boolean {
  if (!path.startsWith("node_modules/")) {
    return false;
  }
  const remainder = path.slice("node_modules/".length);
  return remainder.startsWith("@") ? remainder.split("/").length === 2 : !remainder.includes("/");
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").sort(compareText)
    : [];
}

function stringRecord(value: unknown): Readonly<Record<string, string>> {
  const object = asObject(value);
  if (object === undefined) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(object)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .sort(([left], [right]) => compareText(left, right))
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en");
}

function compareDeclared(left: NpmDeclaredDependency, right: NpmDeclaredDependency): number {
  return compareText(
    `${left.normalizedName}:${left.kind}:${left.specifier}`,
    `${right.normalizedName}:${right.kind}:${right.specifier}`
  );
}

function compareLocked(left: NpmLockedDependency, right: NpmLockedDependency): number {
  return compareText(left.packagePath, right.packagePath);
}

function compareUsage(left: NpmUsageEvidence, right: NpmUsageEvidence): number {
  return compareText(
    `${left.sourceLocation.path}:${String(left.sourceLocation.line).padStart(8, "0")}:${left.normalizedName}:${left.kind}`,
    `${right.sourceLocation.path}:${String(right.sourceLocation.line).padStart(8, "0")}:${right.normalizedName}:${right.kind}`
  );
}

function compareGap(left: AdapterGap, right: AdapterGap): number {
  return compareText(
    `${left.sourceLocation.path}:${left.code}:${left.message}`,
    `${right.sourceLocation.path}:${right.code}:${right.message}`
  );
}
