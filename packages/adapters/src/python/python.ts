import type {
  AdapterGap,
  AdapterIdentity,
  AdapterManifest,
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
  RepositoryFile
} from "../types.js";

const adapterVersion = "1.0.0";
const ignoredDirectories = new Set([".git", ".venv", "dist", "site-packages", "venv"]);
const standardLibrary = new Set([
  "argparse",
  "asyncio",
  "collections",
  "contextlib",
  "csv",
  "dataclasses",
  "datetime",
  "functools",
  "hashlib",
  "http",
  "importlib",
  "io",
  "itertools",
  "json",
  "logging",
  "math",
  "os",
  "pathlib",
  "re",
  "shutil",
  "sqlite3",
  "subprocess",
  "sys",
  "tempfile",
  "threading",
  "time",
  "typing",
  "unittest",
  "urllib",
  "uuid"
]);

export const pipAdapterManifest = manifest("pip");
export const uvAdapterManifest = manifest("uv");

export const pipRepositoryAdapter: RepositoryAdapter<PythonRepositorySnapshot> = Object.freeze({
  manifest: pipAdapterManifest,
  parse: (files: readonly RepositoryFile[], inputSourceId: string) =>
    parsePythonRepository(files, inputSourceId, "pip")
});

export const uvRepositoryAdapter: RepositoryAdapter<PythonRepositorySnapshot> = Object.freeze({
  manifest: uvAdapterManifest,
  parse: (files: readonly RepositoryFile[], inputSourceId: string) =>
    parsePythonRepository(files, inputSourceId, "uv")
});

export const pythonTargetMatrix: readonly PythonTarget[] = Object.freeze([
  target("pip", "25.1", "3.12.11", "python:3.12.11-slim-bookworm@sha256:required-at-deploy"),
  target("uv", "0.7.12", "3.12.11", "ghcr.io/astral-sh/uv:0.7.12-python3.12-bookworm-slim")
]);

export function parsePythonRepository(
  repositoryFiles: readonly RepositoryFile[],
  inputSourceId: string,
  preferredManager?: PythonManager
): PythonRepositorySnapshot {
  if (inputSourceId.trim() === "") throw new Error("inputSourceId is required");
  const files = new Map(
    repositoryFiles.map((file) => [normalizePath(file.path), file.content] as const)
  );
  const roots = discoverRoots([...files.keys()]);
  const manager = preferredManager ?? (files.has("uv.lock") ? "uv" : "pip");
  const adapter = identity(manager, inputSourceId);
  const projects = roots.map((root) => parseProject(files, root, manager, adapter, roots));
  return Object.freeze({ adapter, projects: Object.freeze(projects) });
}

export function parsePythonInstalledGraph(
  output: string,
  environmentScope: PythonEnvironmentScope
): readonly PythonInstalledPackage[] {
  const value: unknown = JSON.parse(output);
  if (!Array.isArray(value)) throw new Error("pip/uv inventory must be a JSON array");
  return Object.freeze(
    value
      .map((item) => {
        if (!isObject(item) || typeof item.name !== "string" || typeof item.version !== "string") {
          throw new Error("invalid pip/uv inventory row");
        }
        const editable = item.editable_project_location;
        return Object.freeze({
          ecosystem: "pypi" as const,
          environmentScope,
          name: item.name,
          normalizedName: normalizeName(item.name),
          version: item.version,
          ...(typeof editable === "string"
            ? { editableProjectLocation: redactLocalReference(editable) }
            : {})
        });
      })
      .sort((left, right) => left.normalizedName.localeCompare(right.normalizedName))
  );
}

export function pythonOperations(
  manager: PythonManager,
  packageName = ""
): readonly PythonOperation[] {
  const packageArgs = packageName === "" ? [] : [packageName];
  if (manager === "uv") {
    return Object.freeze([
      operation("add", "uv", ["add", ...packageArgs]),
      operation("remove", "uv", ["remove", ...packageArgs]),
      operation("update", "uv", ["lock", "--upgrade-package", ...packageArgs]),
      operation("lock", "uv", ["lock"]),
      operation("frozen_install", "uv", ["sync", "--frozen"]),
      operation("graph", "uv", ["tree"]),
      operation("build", "uv", ["build"]),
      operation("test", "uv", ["run", "pytest"])
    ]);
  }
  return Object.freeze([
    operation("add", "pip", ["install", ...packageArgs]),
    operation("remove", "pip", ["uninstall", "-y", ...packageArgs]),
    operation("update", "pip", ["install", "--upgrade", ...packageArgs]),
    operation("lock", "pip", ["freeze"]),
    operation("frozen_install", "pip", ["install", "--require-hashes", "-r", "requirements.txt"]),
    operation("graph", "pip", ["inspect"]),
    operation("build", "python", ["-m", "build"]),
    operation("test", "python", ["-m", "pytest"])
  ]);
}

function parseProject(
  files: ReadonlyMap<string, string>,
  root: string,
  manager: PythonManager,
  adapter: AdapterIdentity,
  roots: readonly string[]
): PythonProject {
  const declared: PythonDeclaredDependency[] = [];
  const gaps: AdapterGap[] = [];
  const requirements = [...files.entries()].filter(
    ([path]) =>
      directory(path) === root && /^requirements(?:[-.][^/]*)?\.txt$/i.test(baseName(path))
  );
  for (const [path, content] of requirements) {
    parseRequirements(content, path, root, adapter, declared, gaps);
  }
  const pyprojectPath = join(root, "pyproject.toml");
  const pyproject = files.get(pyprojectPath);
  let pythonConstraint: string | undefined;
  if (pyproject !== undefined) {
    const result = parsePyproject(pyproject, pyprojectPath, root, adapter);
    declared.push(...result.declared);
    pythonConstraint = result.pythonConstraint;
  }
  const locked = parseUvLock(
    files.get(join(root, "uv.lock")),
    join(root, "uv.lock"),
    root,
    adapter,
    declared
  );
  const usage = scanUsage(files, root, roots, adapter);
  return Object.freeze({
    declared: Object.freeze(uniqueDeclarations(declared)),
    gaps: Object.freeze(gaps),
    locked: Object.freeze(locked),
    manager,
    projectRoot: root,
    ...(pythonConstraint === undefined ? {} : { pythonConstraint }),
    usage: Object.freeze(usage)
  });
}

function parseRequirements(
  content: string,
  path: string,
  root: string,
  adapter: AdapterIdentity,
  output: PythonDeclaredDependency[],
  gaps: AdapterGap[]
): void {
  const lines = content.split(/\r?\n/);
  let indexIdentity: string | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (line === "" || line.startsWith("#")) continue;
    if (/^(--index-url|--extra-index-url)\s+/.test(line)) {
      indexIdentity = redactIndex(line.replace(/^\S+\s+/, ""));
      continue;
    }
    if (line.startsWith("-r ") || line.startsWith("--requirement ")) continue;
    const editable = line.startsWith("-e ") || line.startsWith("--editable ");
    const specifier = editable ? line.replace(/^(?:-e|--editable)\s+/, "") : line;
    if (!editable && line.startsWith("-")) {
      gaps.push(gap("invalid_manifest", "Unsupported requirement option", path, index + 1));
      continue;
    }
    const parsed = dependency(specifier);
    if (parsed === undefined) {
      gaps.push(gap("invalid_manifest", "Unsupported requirement syntax", path, index + 1));
      continue;
    }
    output.push(
      declaration(parsed, specifier, editable, indexIdentity, path, index + 1, root, adapter)
    );
  }
}

function parsePyproject(
  content: string,
  path: string,
  root: string,
  adapter: AdapterIdentity
): { declared: PythonDeclaredDependency[]; pythonConstraint?: string } {
  const declared: PythonDeclaredDependency[] = [];
  let section = "";
  let pythonConstraint: string | undefined;
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
    if (sectionMatch?.[1] !== undefined) {
      section = sectionMatch[1];
      continue;
    }
    const pythonMatch = /^requires-python\s*=\s*["']([^"']+)["']/.exec(line);
    if (section === "project" && pythonMatch?.[1] !== undefined) pythonConstraint = pythonMatch[1];
    if (
      (section === "project" && line.startsWith("dependencies")) ||
      (section.startsWith("project.optional-dependencies") && /^[A-Za-z0-9_-]+\s*=/.test(line))
    ) {
      for (const match of line.matchAll(/["']([^"']+)["']/g)) {
        const specifier = match[1];
        if (specifier === undefined) continue;
        const parsed = dependency(specifier);
        if (parsed !== undefined) {
          declared.push(
            declaration(parsed, specifier, false, undefined, path, index + 1, root, adapter)
          );
        }
      }
    } else if (section === "tool.uv.sources") {
      const source = /^([A-Za-z0-9_.-]+)\s*=\s*\{(.+)\}$/.exec(line);
      if (source?.[1] !== undefined && source[2] !== undefined) {
        const local = /(?:path|git)\s*=\s*["']([^"']+)["']/.exec(source[2])?.[1];
        declared.push(
          declaration(
            {
              name: source[1],
              extras: [],
              ...(local === undefined ? {} : { localReference: local })
            },
            local ?? "*",
            /editable\s*=\s*true/.test(source[2]),
            undefined,
            path,
            index + 1,
            root,
            adapter
          )
        );
      }
    }
  }
  return { declared, ...(pythonConstraint === undefined ? {} : { pythonConstraint }) };
}

function parseUvLock(
  content: string | undefined,
  path: string,
  root: string,
  adapter: AdapterIdentity,
  declared: readonly PythonDeclaredDependency[]
): readonly PythonLockedDependency[] {
  if (content === undefined) return [];
  const direct = new Set(declared.map((item) => item.normalizedName));
  const packages = content.split(/^\[\[package\]\]\s*$/m).slice(1);
  return packages.flatMap((block, index) => {
    const name = /^name\s*=\s*["']([^"']+)["']/m.exec(block)?.[1];
    const version = /^version\s*=\s*["']([^"']+)["']/m.exec(block)?.[1];
    if (name === undefined || version === undefined) return [];
    const normalizedName = normalizeName(name);
    const marker = /^marker\s*=\s*["']([^"']+)["']/m.exec(block)?.[1];
    return [
      Object.freeze({
        adapter,
        direct: direct.has(normalizedName),
        ecosystem: "pypi" as const,
        ...(marker === undefined ? {} : { marker }),
        name,
        normalizedName,
        projectRoot: root,
        sourceLocation: { path, line: index + 1 },
        transitive: !direct.has(normalizedName),
        version
      })
    ];
  });
}

function scanUsage(
  files: ReadonlyMap<string, string>,
  root: string,
  roots: readonly string[],
  adapter: AdapterIdentity
): readonly PythonUsageEvidence[] {
  const result: PythonUsageEvidence[] = [];
  for (const [path, content] of files) {
    if (!path.endsWith(".py") || !withinRoot(path, root, roots) || ignored(path)) continue;
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      for (const match of line.matchAll(/^\s*(?:from|import)\s+([A-Za-z_][\w.]*)/g)) {
        addUsage(result, match[1], "static_import", "certain", path, index + 1, root, adapter);
      }
      for (const match of line.matchAll(
        /importlib\.import_module\(\s*([^)"']+|["']([^"']+)["'])/g
      )) {
        addUsage(
          result,
          match[2] ?? match[1],
          "dynamic_import",
          match[2] ? "certain" : "uncertain",
          path,
          index + 1,
          root,
          adapter
        );
      }
    }
  }
  return result;
}

function addUsage(
  output: PythonUsageEvidence[],
  rawName: string | undefined,
  kind: PythonUsageEvidence["kind"],
  certainty: PythonUsageEvidence["certainty"],
  path: string,
  line: number,
  root: string,
  adapter: AdapterIdentity
): void {
  const name = rawName?.split(".")[0];
  if (name === undefined || standardLibrary.has(name)) return;
  output.push(
    Object.freeze({
      adapter,
      certainty,
      ecosystem: "pypi",
      kind,
      name,
      normalizedName: normalizeName(name),
      projectRoot: root,
      sourceLocation: { path, line }
    })
  );
}

interface ParsedDependency {
  name: string;
  extras: string[];
  marker?: string;
  localReference?: string;
}

function dependency(specifier: string): ParsedDependency | undefined {
  const [requirement = "", marker] = specifier.split(/\s*;\s*/, 2);
  const local = /^([A-Za-z0-9][A-Za-z0-9_.-]*)(?:\[([^\]]+)\])?\s*@\s*(.+)$/.exec(
    requirement
  );
  if (local?.[1] !== undefined && local[3] !== undefined) {
    return {
      name: local[1],
      extras: splitExtras(local[2]),
      localReference: local[3],
      ...(marker === undefined ? {} : { marker })
    };
  }
  const match = /^([A-Za-z0-9][A-Za-z0-9_.-]*)(?:\[([^\]]+)\])?/.exec(requirement);
  if (match?.[1] === undefined) return undefined;
  return {
    name: match[1],
    extras: splitExtras(match[2]),
    ...(marker === undefined ? {} : { marker })
  };
}

function declaration(
  parsed: ParsedDependency,
  specifier: string,
  editable: boolean,
  indexIdentity: string | undefined,
  path: string,
  line: number,
  root: string,
  adapter: AdapterIdentity
): PythonDeclaredDependency {
  const localReference =
    parsed.localReference === undefined ? undefined : redactLocalReference(parsed.localReference);
  const redactedSpecifier =
    parsed.localReference === undefined || localReference === undefined
      ? specifier
      : specifier.replace(parsed.localReference, localReference);
  return Object.freeze({
    adapter,
    direct: true,
    editable,
    ecosystem: "pypi",
    extras: Object.freeze(parsed.extras),
    ...(indexIdentity === undefined ? {} : { indexIdentity }),
    ...(localReference === undefined ? {} : { localReference }),
    ...(parsed.marker === undefined ? {} : { marker: parsed.marker }),
    name: parsed.name,
    normalizedName: normalizeName(parsed.name),
    projectRoot: root,
    sourceLocation: { path, line },
    specifier: redactedSpecifier
  });
}

function discoverRoots(paths: readonly string[]): readonly string[] {
  const roots = new Set<string>();
  for (const path of paths) {
    if (
      baseName(path) === "pyproject.toml" ||
      baseName(path) === "uv.lock" ||
      /^requirements(?:[-.][^/]*)?\.txt$/i.test(baseName(path))
    )
      roots.add(directory(path));
  }
  return [...roots].sort();
}

function uniqueDeclarations(
  items: readonly PythonDeclaredDependency[]
): PythonDeclaredDependency[] {
  return [
    ...new Map(items.map((item) => [`${item.normalizedName}:${item.specifier}`, item])).values()
  ].sort((left, right) => left.normalizedName.localeCompare(right.normalizedName));
}

function manifest(manager: PythonManager): AdapterManifest {
  return Object.freeze({
    identity: Object.freeze({
      adapterId: `python/${manager}`,
      adapterVersion,
      supportLevel: "observed_only"
    }),
    ecosystem: "pypi",
    manager,
    managerVersions: Object.freeze([]),
    capabilities: Object.freeze({
      local_inventory: true,
      mutation: false,
      repository_parsing: true,
      validation: false
    }),
    generatedFiles: Object.freeze(manager === "uv" ? ["uv.lock"] : []),
    precedence: Object.freeze(
      manager === "uv" ? ["pyproject.toml", "uv.lock"] : ["pyproject.toml", "requirements.txt"]
    ),
    conflictsWithManagers: Object.freeze(
      manager === "uv" ? ["pip", "poetry", "conda"] : ["uv", "poetry", "conda"]
    )
  });
}

function identity(manager: PythonManager, inputSourceId: string): AdapterIdentity {
  return Object.freeze({ ...manifest(manager).identity, inputSourceId });
}
function target(
  manager: PythonManager,
  managerVersion: string,
  pythonVersion: string,
  baseImage: string
): PythonTarget {
  return Object.freeze({
    architecture: "x86_64",
    baseImage,
    manager,
    managerVersion,
    platform: "linux",
    pythonVersion,
    supportLevel: "observed_only"
  });
}
function operation(
  kind: PythonOperation["kind"],
  executable: PythonOperation["executable"],
  args: readonly string[]
): PythonOperation {
  return Object.freeze({ args: Object.freeze(args), executable, kind });
}
function gap(code: AdapterGap["code"], message: string, path: string, line: number): AdapterGap {
  return Object.freeze({ code, message, sourceLocation: { path, line } });
}
function splitExtras(value: string | undefined): string[] {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .sort() ?? []
  );
}
function redactIndex(value: string): string {
  try {
    return `index:${new URL(value).hostname.toLowerCase()}`;
  } catch {
    return "index:invalid";
  }
}
function redactLocalReference(value: string): string {
  const trimmed = value.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//iu.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      parsed.username = "";
      parsed.password = "";
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    } catch {
      return "<redacted-remote-reference>";
    }
  }
  if (/^[^/@\s]+@[^/:\s]+:/u.test(trimmed)) {
    return trimmed.replace(/^[^@]+@/u, "<redacted>@");
  }
  return trimmed;
}
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[-_.]+/g, "-");
}
function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "");
}
function baseName(path: string): string {
  return path.split("/").at(-1) ?? "";
}
function directory(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
}
function join(root: string, name: string): string {
  return root === "" ? name : `${root}/${name}`;
}
function ignored(path: string): boolean {
  return path.split("/").some((part) => ignoredDirectories.has(part));
}
function withinRoot(path: string, root: string, roots: readonly string[]): boolean {
  if (root !== "" && !path.startsWith(`${root}/`)) return false;
  return !roots.some(
    (candidate) =>
      candidate !== root &&
      candidate.startsWith(root === "" ? "" : `${root}/`) &&
      path.startsWith(`${candidate}/`)
  );
}
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
