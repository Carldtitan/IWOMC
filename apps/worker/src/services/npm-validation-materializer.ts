import type {
  DaytonaFileDownloadRequest,
  DaytonaFileUploadRequest
} from "@environment-reconciler/integrations";
import type {
  DaytonaSandboxReference,
  ExecuteDaytonaCommandRequest,
  ExecuteDaytonaCommandResult,
  ExternalOperationContext,
  Sha256Digest
} from "@environment-reconciler/integrations/ports";

const maximumArchiveBytes = 25 * 1_024 * 1_024;
const maximumExpandedArchiveBytes = 128 * 1_024 * 1_024;
const maximumExtractedFileBytes = 32 * 1_024 * 1_024;
const maximumExtractedBytes = 64 * 1_024 * 1_024;
const maximumArchiveEntries = 20_000;
const maximumArchivePathBytes = 1_024;
const maximumPackageJsonBytes = 2 * 1_024 * 1_024;
const maximumPackageLockBytes = 8 * 1_024 * 1_024;
const transferTimeoutMs = 2 * 60 * 1_000;
const commandTimeoutMs = 2 * 60 * 1_000;
const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const packageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u;
const registryVersionPattern =
  /^(?:[~^]?\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?|\d+\.\d+\.(?:x|\*)|\d+\.(?:x|\*)|(?:x|\*))$/u;
const dependencySections = ["dependencies", "devDependencies", "optionalDependencies"] as const;

const inventorySource = `
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const root = process.argv[1];
const destination = process.argv[2];
const inventory = {};
const walk = (directory, relativeDirectory) => {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const relative = relativeDirectory.length === 0
      ? entry.name
      : relativeDirectory + "/" + entry.name;
    const absolute = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolute);
    const mode = stat.mode & 0o777;
    if (stat.isSymbolicLink()) throw new Error("symbolic links are not materializable");
    if (stat.isDirectory()) {
      inventory[relative + "/"] = { kind: "directory", mode };
      walk(absolute, relative);
      continue;
    }
    if (!stat.isFile()) throw new Error("non-regular workspace entry");
    const bytes = fs.readFileSync(absolute);
    inventory[relative] = {
      kind: "file",
      mode,
      size: bytes.length,
      digest: crypto.createHash("sha256").update(bytes).digest("hex")
    };
  }
};
walk(root, "");
fs.writeFileSync(destination, JSON.stringify(inventory), { encoding: "utf8", flag: "wx", mode: 0o600 });
process.stdout.write(JSON.stringify({ entryCount: Object.keys(inventory).length }));
`;

const dependencyMutationSource = `
const fs = require("node:fs");
const path = require("node:path");
const section = process.argv[1];
const packageName = process.argv[2];
const operation = process.argv[3];
const version = process.argv[4];
const allowedSections = new Set(["dependencies", "devDependencies", "optionalDependencies"]);
if (!allowedSections.has(section)) throw new Error("invalid dependency section");
if (!/^(?:@[a-z0-9][a-z0-9._-]*\\/)?[a-z0-9][a-z0-9._-]*$/.test(packageName)) {
  throw new Error("invalid package name");
}
if (operation !== "set" && operation !== "remove") throw new Error("invalid operation");
const packagePath = path.join(process.cwd(), "package.json");
const raw = fs.readFileSync(packagePath, "utf8");
const document = JSON.parse(raw);
if (document === null || Array.isArray(document) || typeof document !== "object") {
  throw new Error("invalid package document");
}
if (operation === "set") {
  if (typeof version !== "string" || version.length === 0) throw new Error("missing version");
  const current = document[section];
  if (current !== undefined && (current === null || Array.isArray(current) || typeof current !== "object")) {
    throw new Error("invalid dependency section");
  }
  document[section] = { ...(current || {}), [packageName]: version };
  document[section] = Object.fromEntries(
    Object.entries(document[section]).sort(([left], [right]) => left.localeCompare(right))
  );
} else {
  const current = document[section];
  if (current !== undefined) {
    if (current === null || Array.isArray(current) || typeof current !== "object") {
      throw new Error("invalid dependency section");
    }
    delete current[packageName];
    if (Object.keys(current).length === 0) delete document[section];
  }
}
const indent = /^\\{\\r?\\n([ \\t]+)"/.exec(raw)?.[1] || "  ";
const eol = raw.includes("\\r\\n") ? "\\r\\n" : "\\n";
const trailing = raw.endsWith("\\n") ? eol : "";
const output = JSON.stringify(document, null, indent).replaceAll("\\n", eol) + trailing;
const temporary = path.join(process.cwd(), ".er-package-json-" + process.pid + ".tmp");
fs.writeFileSync(temporary, output, { encoding: "utf8", flag: "wx", mode: 0o600 });
fs.renameSync(temporary, packagePath);
`;

const verificationSource = `
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const root = process.argv[1];
const baselinePath = process.argv[2];
const allowed = new Set(["package.json", "package-lock.json"]);
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const current = {};
const walk = (directory, relativeDirectory) => {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const relative = relativeDirectory.length === 0
      ? entry.name
      : relativeDirectory + "/" + entry.name;
    const absolute = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolute);
    const mode = stat.mode & 0o777;
    if (stat.isSymbolicLink()) throw new Error("symbolic links are not materializable");
    if (stat.isDirectory()) {
      current[relative + "/"] = { kind: "directory", mode };
      walk(absolute, relative);
      continue;
    }
    if (!stat.isFile()) throw new Error("non-regular workspace entry");
    const bytes = fs.readFileSync(absolute);
    current[relative] = {
      kind: "file",
      mode,
      size: bytes.length,
      digest: crypto.createHash("sha256").update(bytes).digest("hex")
    };
  }
};
walk(root, "");
const paths = [...new Set([...Object.keys(baseline), ...Object.keys(current)])].sort();
const changed = paths.filter((entry) => JSON.stringify(baseline[entry]) !== JSON.stringify(current[entry]));
const unexpected = changed.filter((entry) => !allowed.has(entry));
if (unexpected.length > 0) {
  process.stderr.write(JSON.stringify({ unexpected }));
  process.exit(41);
}
process.stdout.write(JSON.stringify({ changed }));
`;

export type NpmDependencySection = (typeof dependencySections)[number];

export type NpmDependencyOperation =
  | {
      readonly kind: "set";
      readonly packageName: string;
      readonly section: NpmDependencySection;
      readonly version: string;
    }
  | {
      readonly kind: "remove";
      readonly packageName: string;
      readonly section: NpmDependencySection;
    };

export interface NpmValidationMaterializeInput {
  readonly archive: Uint8Array;
  readonly archiveDigest: Sha256Digest;
  readonly archiveFormat: "tar.gz";
  readonly operation: NpmDependencyOperation;
  readonly operationKey: string;
  readonly registryHostDigests: readonly Sha256Digest[];
  readonly sandbox: DaytonaSandboxReference;
}

export interface NpmValidationMaterialization {
  readonly changedPaths: readonly ("package-lock.json" | "package.json")[];
  readonly packageJson: Uint8Array;
  readonly packageJsonDigest: Sha256Digest;
  readonly packageLock: Uint8Array;
  readonly packageLockDigest: Sha256Digest;
}

export interface NpmMaterializationDaytona {
  downloadFile(request: DaytonaFileDownloadRequest): Promise<Uint8Array>;
  executeCommand(request: ExecuteDaytonaCommandRequest): Promise<ExecuteDaytonaCommandResult>;
  uploadFile(request: DaytonaFileUploadRequest): Promise<void>;
}

export class NpmValidationMaterializationError extends Error {
  readonly code:
    | "invalid_input"
    | "archive_digest_mismatch"
    | "archive_too_large"
    | "invalid_archive"
    | "archive_limits_exceeded"
    | "unsupported_source"
    | "sandbox_command_failed"
    | "sandbox_output_invalid"
    | "unexpected_workspace_change"
    | "invalid_materialized_output";

  constructor(code: NpmValidationMaterializationError["code"]) {
    super(code);
    this.name = "NpmValidationMaterializationError";
    this.code = code;
  }
}

export class NpmValidationMaterializer {
  readonly #daytona: NpmMaterializationDaytona;

  constructor(daytona: NpmMaterializationDaytona) {
    this.#daytona = daytona;
  }

  async materialize(input: NpmValidationMaterializeInput): Promise<NpmValidationMaterialization> {
    validateInput(input);
    if (input.archive.byteLength > maximumArchiveBytes) {
      throw new NpmValidationMaterializationError("archive_too_large");
    }
    const actualArchiveDigest = await sha256(input.archive);
    if (actualArchiveDigest !== input.archiveDigest) {
      throw new NpmValidationMaterializationError("archive_digest_mismatch");
    }
    const inspection = await inspectTrustedTarGzipArchive(input.archive);
    if (!inspection.rootPackageJson) {
      throw new NpmValidationMaterializationError("unsupported_source");
    }

    const stagingRoot = `/tmp/environment-reconciler/${crypto.randomUUID()}`;
    const archivePath = `${stagingRoot}/source.tar.gz`;
    const workspacePath = `${stagingRoot}/workspace`;
    const baselinePath = `${stagingRoot}/baseline-inventory.json`;
    const npmCachePath = `${stagingRoot}/npm-cache`;

    await this.#run(input, "prepare", {
      arguments: ["-p", "--", workspacePath, npmCachePath],
      executable: "mkdir",
      network: "deny-all",
      workingDirectory: "/tmp"
    });
    await this.#daytona.uploadFile({
      bytes: input.archive,
      maximumBytes: maximumArchiveBytes,
      remotePath: archivePath,
      sandbox: input.sandbox,
      timeoutMs: transferTimeoutMs
    });
    const uploadedArchive = await this.#daytona.downloadFile({
      maximumBytes: maximumArchiveBytes,
      remotePath: archivePath,
      sandbox: input.sandbox,
      timeoutMs: transferTimeoutMs
    });
    if ((await sha256(uploadedArchive)) !== input.archiveDigest) {
      throw new NpmValidationMaterializationError("archive_digest_mismatch");
    }
    await this.#run(input, "extract", {
      arguments: [
        "--extract",
        "--gzip",
        "--file",
        archivePath,
        "--directory",
        workspacePath,
        "--strip-components=1",
        "--no-same-owner",
        "--no-same-permissions",
        "--delay-directory-restore"
      ],
      executable: "tar",
      network: "deny-all",
      workingDirectory: stagingRoot
    });

    const originalPackageJson = await this.#daytona.downloadFile({
      maximumBytes: maximumPackageJsonBytes,
      remotePath: `${workspacePath}/package.json`,
      sandbox: input.sandbox,
      timeoutMs: transferTimeoutMs
    });
    const originalDocument = parseAndValidatePackageJson(originalPackageJson);
    await this.#run(input, "inventory", {
      arguments: ["--input-type=commonjs", "--eval", inventorySource, workspacePath, baselinePath],
      executable: "node",
      network: "deny-all",
      workingDirectory: stagingRoot
    });
    await this.#run(input, "mutate", {
      arguments: [
        "--input-type=commonjs",
        "--eval",
        dependencyMutationSource,
        input.operation.section,
        input.operation.packageName,
        input.operation.kind,
        input.operation.kind === "set" ? input.operation.version : ""
      ],
      executable: "node",
      network: "deny-all",
      workingDirectory: workspacePath
    });
    await this.#run(input, "npm-lock", {
      arguments: [
        "install",
        "--package-lock-only=true",
        "--package-lock=true",
        "--ignore-scripts=true",
        "--audit=false",
        "--fund=false",
        "--workspaces=false",
        "--include-workspace-root=false",
        "--loglevel=error",
        `--cache=${npmCachePath}`,
        "--userconfig=/dev/null",
        "--globalconfig=/dev/null",
        "--registry=https://registry.npmjs.org/"
      ],
      executable: "npm",
      network: "allowlist",
      workingDirectory: workspacePath
    });
    const verification = await this.#run(input, "verify-tree", {
      arguments: [
        "--input-type=commonjs",
        "--eval",
        verificationSource,
        workspacePath,
        baselinePath
      ],
      executable: "node",
      network: "deny-all",
      workingDirectory: stagingRoot
    });
    const changedPaths = parseChangedPaths(verification.stdout.text);

    const [packageJson, packageLock] = await Promise.all([
      this.#daytona.downloadFile({
        maximumBytes: maximumPackageJsonBytes,
        remotePath: `${workspacePath}/package.json`,
        sandbox: input.sandbox,
        timeoutMs: transferTimeoutMs
      }),
      this.#daytona.downloadFile({
        maximumBytes: maximumPackageLockBytes,
        remotePath: `${workspacePath}/package-lock.json`,
        sandbox: input.sandbox,
        timeoutMs: transferTimeoutMs
      })
    ]);
    const materializedDocument = parseAndValidatePackageJson(packageJson);
    verifyPackageJsonOperation(originalDocument, materializedDocument, input.operation);
    verifyPackageLock(packageLock, input.operation);
    return {
      changedPaths,
      packageJson,
      packageJsonDigest: await sha256(packageJson),
      packageLock,
      packageLockDigest: await sha256(packageLock)
    };
  }

  async #run(
    input: NpmValidationMaterializeInput,
    phase: string,
    command: {
      readonly arguments: readonly string[];
      readonly executable: string;
      readonly network: "allowlist" | "deny-all";
      readonly workingDirectory: string;
    }
  ): Promise<ExecuteDaytonaCommandResult> {
    const result = await this.#daytona.executeCommand({
      arguments: command.arguments,
      context: operationContext(`${input.operationKey}:materialize:${phase}`, input.archiveDigest),
      executable: command.executable,
      maxOutputBytes: 64 * 1_024,
      networkPolicy:
        command.network === "allowlist"
          ? {
              allowedHostDigests: input.registryHostDigests,
              mode: "allowlist"
            }
          : { allowedHostDigests: [], mode: "deny-all" },
      sandbox: input.sandbox,
      secretBindings: [],
      timeoutMs: commandTimeoutMs,
      workingDirectory: command.workingDirectory
    });
    if (
      result.timedOut ||
      result.exitCode !== 0 ||
      result.stdout.truncated ||
      result.stderr.truncated
    ) {
      if (phase === "verify-tree" && result.exitCode === 41) {
        throw new NpmValidationMaterializationError("unexpected_workspace_change");
      }
      throw new NpmValidationMaterializationError("sandbox_command_failed");
    }
    return result;
  }
}

export interface TrustedTarInspection {
  readonly entryCount: number;
  readonly expandedBytes: number;
  readonly extractedBytes: number;
  readonly rootDirectory: string;
  readonly rootPackageJson: boolean;
}

export async function inspectTrustedTarGzipArchive(
  archive: Uint8Array
): Promise<TrustedTarInspection> {
  let stream: ReadableStream<Uint8Array>;
  try {
    stream = new Blob([copyBuffer(archive)]).stream().pipeThrough(new DecompressionStream("gzip"));
  } catch {
    throw new NpmValidationMaterializationError("invalid_archive");
  }
  const reader = new BoundedByteReader(stream, maximumExpandedArchiveBytes);
  const paths = new Map<string, "directory" | "file">();
  let rootDirectory: string | undefined;
  let rootPackageJson = false;
  let entryCount = 0;
  let extractedBytes = 0;
  let pendingPath: string | undefined;
  let pendingPax: Readonly<Record<string, string>> | undefined;

  try {
    for (;;) {
      const header = await reader.readExactly(512);
      if (header === undefined) {
        throw new NpmValidationMaterializationError("invalid_archive");
      }
      if (allZero(header)) {
        const second = await reader.readExactly(512);
        if (second === undefined || !allZero(second)) {
          throw new NpmValidationMaterializationError("invalid_archive");
        }
        await reader.assertRemainingZero();
        break;
      }
      validateTarHeader(header);
      const type = String.fromCharCode(header[156] ?? 0);
      const headerSize = parseTarOctal(header.subarray(124, 136));

      if (type === "x" || type === "g") {
        if (headerSize > 256 * 1_024) {
          throw new NpmValidationMaterializationError("archive_limits_exceeded");
        }
        const payload = await reader.readRequired(headerSize);
        await reader.skip(tarPadding(headerSize));
        const fields = parsePax(payload);
        if (type === "g") {
          if (
            fields.path !== undefined ||
            fields.linkpath !== undefined ||
            fields.size !== undefined
          ) {
            throw new NpmValidationMaterializationError("invalid_archive");
          }
        } else {
          if (pendingPax !== undefined) {
            throw new NpmValidationMaterializationError("invalid_archive");
          }
          pendingPax = fields;
        }
        continue;
      }
      if (type === "L") {
        if (headerSize > maximumArchivePathBytes + 1 || pendingPath !== undefined) {
          throw new NpmValidationMaterializationError("archive_limits_exceeded");
        }
        pendingPath = decodeTarText(await reader.readRequired(headerSize)).replace(/\0+$/u, "");
        await reader.skip(tarPadding(headerSize));
        continue;
      }
      if (type === "K") {
        throw new NpmValidationMaterializationError("invalid_archive");
      }

      const paxSize = pendingPax?.size;
      const size = paxSize === undefined ? headerSize : parsePaxSize(paxSize);
      const archivePath = pendingPax?.path ?? pendingPath ?? tarHeaderPath(header);
      if (pendingPax?.linkpath !== undefined) {
        throw new NpmValidationMaterializationError("invalid_archive");
      }
      pendingPax = undefined;
      pendingPath = undefined;
      const normalized = normalizeArchivePath(archivePath);
      rootDirectory ??= normalized.root;
      if (normalized.root !== rootDirectory) {
        throw new NpmValidationMaterializationError("invalid_archive");
      }

      let kind: "directory" | "file";
      if (type === "5") {
        if (size !== 0) {
          throw new NpmValidationMaterializationError("invalid_archive");
        }
        kind = "directory";
      } else if (type === "\0" || type === "0" || type === "7") {
        kind = "file";
        if (size > maximumExtractedFileBytes) {
          throw new NpmValidationMaterializationError("archive_limits_exceeded");
        }
        extractedBytes += size;
        if (extractedBytes > maximumExtractedBytes) {
          throw new NpmValidationMaterializationError("archive_limits_exceeded");
        }
      } else {
        // Symlinks, hard links, devices, FIFOs, and sparse entries are not
        // accepted because their extraction semantics can escape the root.
        throw new NpmValidationMaterializationError("invalid_archive");
      }

      if (normalized.relative.length > 0) {
        if (paths.has(normalized.relative)) {
          throw new NpmValidationMaterializationError("invalid_archive");
        }
        paths.set(normalized.relative, kind);
        rootPackageJson ||= normalized.relative === "package.json" && kind === "file";
        entryCount += 1;
        if (entryCount > maximumArchiveEntries) {
          throw new NpmValidationMaterializationError("archive_limits_exceeded");
        }
      }
      await reader.skip(size + tarPadding(size));
    }
  } catch (error) {
    if (error instanceof NpmValidationMaterializationError) {
      throw error;
    }
    throw new NpmValidationMaterializationError("invalid_archive");
  }

  if (
    rootDirectory === undefined ||
    pendingPath !== undefined ||
    pendingPax !== undefined ||
    hasFileAsParent(paths)
  ) {
    throw new NpmValidationMaterializationError("invalid_archive");
  }
  return {
    entryCount,
    expandedBytes: reader.totalBytes,
    extractedBytes,
    rootDirectory,
    rootPackageJson
  };
}

class BoundedByteReader {
  readonly #reader: ReadableStreamDefaultReader<Uint8Array>;
  readonly #maximumBytes: number;
  #chunk: Uint8Array<ArrayBufferLike> = new Uint8Array();
  #offset = 0;
  #ended = false;
  totalBytes = 0;

  constructor(stream: ReadableStream<Uint8Array>, maximumBytes: number) {
    this.#reader = stream.getReader();
    this.#maximumBytes = maximumBytes;
  }

  async readExactly(length: number): Promise<Uint8Array | undefined> {
    const result = new Uint8Array(length);
    let written = 0;
    while (written < length) {
      if (!(await this.#ensureChunk())) {
        if (written === 0) {
          return undefined;
        }
        throw new NpmValidationMaterializationError("invalid_archive");
      }
      const available = this.#chunk.byteLength - this.#offset;
      const take = Math.min(available, length - written);
      result.set(this.#chunk.subarray(this.#offset, this.#offset + take), written);
      this.#offset += take;
      written += take;
    }
    return result;
  }

  async readRequired(length: number): Promise<Uint8Array> {
    const result = await this.readExactly(length);
    if (result === undefined) {
      throw new NpmValidationMaterializationError("invalid_archive");
    }
    return result;
  }

  async skip(length: number): Promise<void> {
    let remaining = length;
    while (remaining > 0) {
      if (!(await this.#ensureChunk())) {
        throw new NpmValidationMaterializationError("invalid_archive");
      }
      const take = Math.min(this.#chunk.byteLength - this.#offset, remaining);
      this.#offset += take;
      remaining -= take;
    }
  }

  async assertRemainingZero(): Promise<void> {
    for (;;) {
      if (!(await this.#ensureChunk())) {
        return;
      }
      while (this.#offset < this.#chunk.byteLength) {
        if (this.#chunk[this.#offset] !== 0) {
          throw new NpmValidationMaterializationError("invalid_archive");
        }
        this.#offset += 1;
      }
    }
  }

  async #ensureChunk(): Promise<boolean> {
    while (this.#offset >= this.#chunk.byteLength) {
      if (this.#ended) {
        return false;
      }
      const next = await this.#reader.read();
      if (next.done) {
        this.#ended = true;
        return false;
      }
      this.#chunk = next.value;
      this.#offset = 0;
      this.totalBytes += next.value.byteLength;
      if (this.totalBytes > this.#maximumBytes) {
        await this.#reader.cancel();
        throw new NpmValidationMaterializationError("archive_limits_exceeded");
      }
    }
    return true;
  }
}

function validateInput(input: NpmValidationMaterializeInput): void {
  if (
    !isTarGzipFormat(input.archiveFormat) ||
    !digestPattern.test(input.archiveDigest) ||
    input.operationKey.length < 1 ||
    input.operationKey.length > 160 ||
    !/^[A-Za-z0-9._:-]+$/u.test(input.operationKey) ||
    !packageNamePattern.test(input.operation.packageName) ||
    !dependencySections.includes(input.operation.section) ||
    (input.operation.kind === "set" && !registryVersionPattern.test(input.operation.version)) ||
    input.registryHostDigests.length < 1 ||
    input.registryHostDigests.length > 8 ||
    !input.registryHostDigests.every((digest) => digestPattern.test(digest)) ||
    input.sandbox.sandboxId.length === 0 ||
    input.sandbox.providerResourceId.length === 0
  ) {
    throw new NpmValidationMaterializationError("invalid_input");
  }
}

function validateTarHeader(header: Uint8Array): void {
  const magic = decodeNullTerminated(header.subarray(257, 263));
  if (magic !== "ustar") {
    throw new NpmValidationMaterializationError("invalid_archive");
  }
  const expected = parseTarOctal(header.subarray(148, 156));
  let actual = 0;
  for (let index = 0; index < header.byteLength; index += 1) {
    actual += index >= 148 && index < 156 ? 32 : (header[index] ?? 0);
  }
  if (actual !== expected) {
    throw new NpmValidationMaterializationError("invalid_archive");
  }
}

function tarHeaderPath(header: Uint8Array): string {
  const name = decodeNullTerminated(header.subarray(0, 100));
  const prefix = decodeNullTerminated(header.subarray(345, 500));
  return prefix.length === 0 ? name : `${prefix}/${name}`;
}

function parseTarOctal(bytes: Uint8Array): number {
  if ((bytes[0] ?? 0) >= 0x80) {
    throw new NpmValidationMaterializationError("invalid_archive");
  }
  const text = decodeTarText(bytes).replaceAll("\0", "").trim();
  if (text.length === 0) {
    return 0;
  }
  if (!/^[0-7]+$/u.test(text)) {
    throw new NpmValidationMaterializationError("invalid_archive");
  }
  const value = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new NpmValidationMaterializationError("archive_limits_exceeded");
  }
  return value;
}

function parsePax(payload: Uint8Array): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  let offset = 0;
  while (offset < payload.byteLength) {
    let space = offset;
    while (space < payload.byteLength && payload[space] !== 32) {
      space += 1;
    }
    const lengthText = new TextDecoder().decode(payload.subarray(offset, space));
    if (!/^[1-9][0-9]*$/u.test(lengthText)) {
      throw new NpmValidationMaterializationError("invalid_archive");
    }
    const length = Number(lengthText);
    const end = offset + length;
    if (!Number.isSafeInteger(length) || end > payload.byteLength || payload[end - 1] !== 10) {
      throw new NpmValidationMaterializationError("invalid_archive");
    }
    const record = decodeTarText(payload.subarray(space + 1, end - 1));
    const separator = record.indexOf("=");
    if (separator < 1) {
      throw new NpmValidationMaterializationError("invalid_archive");
    }
    const key = record.slice(0, separator);
    if (key === "path" || key === "linkpath" || key === "size") {
      if (result[key] !== undefined) {
        throw new NpmValidationMaterializationError("invalid_archive");
      }
      result[key] = record.slice(separator + 1);
    }
    offset = end;
  }
  return result;
}

function parsePaxSize(value: string): number {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    throw new NpmValidationMaterializationError("invalid_archive");
  }
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new NpmValidationMaterializationError("archive_limits_exceeded");
  }
  return size;
}

function normalizeArchivePath(path: string): {
  readonly relative: string;
  readonly root: string;
} {
  const normalized = path.endsWith("/") ? path.slice(0, -1) : path;
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.includes("\\") ||
    hasControlCharacter(normalized) ||
    new TextEncoder().encode(normalized).byteLength > maximumArchivePathBytes
  ) {
    throw new NpmValidationMaterializationError("invalid_archive");
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new NpmValidationMaterializationError("invalid_archive");
  }
  const [root, ...relativeSegments] = segments;
  if (root === undefined || root.length === 0) {
    throw new NpmValidationMaterializationError("invalid_archive");
  }
  if (relativeSegments.some((segment) => segment === ".git" || segment === "node_modules")) {
    throw new NpmValidationMaterializationError("unsupported_source");
  }
  const relative = relativeSegments.join("/");
  if (relative === ".npmrc" || relative === "npm-shrinkwrap.json" || relative.endsWith("/.npmrc")) {
    throw new NpmValidationMaterializationError("unsupported_source");
  }
  return { relative, root };
}

function hasFileAsParent(paths: ReadonlyMap<string, "directory" | "file">): boolean {
  for (const path of paths.keys()) {
    const segments = path.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      if (paths.get(segments.slice(0, index).join("/")) === "file") {
        return true;
      }
    }
  }
  return false;
}

function parseAndValidatePackageJson(bytes: Uint8Array): Readonly<Record<string, unknown>> {
  const document = parseJsonObject(bytes);
  if (
    document.workspaces !== undefined ||
    document.overrides !== undefined ||
    document.bundleDependencies !== undefined ||
    document.bundledDependencies !== undefined ||
    (document.packageManager !== undefined &&
      (typeof document.packageManager !== "string" ||
        !/^npm@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(document.packageManager)))
  ) {
    throw new NpmValidationMaterializationError("unsupported_source");
  }
  for (const section of [...dependencySections, "peerDependencies"] as const) {
    const dependencies = document[section];
    if (dependencies === undefined) {
      continue;
    }
    if (
      !isPlainObject(dependencies) ||
      Object.entries(dependencies).some(
        ([name, version]) =>
          !packageNamePattern.test(name) ||
          typeof version !== "string" ||
          !registryVersionPattern.test(version)
      )
    ) {
      throw new NpmValidationMaterializationError("unsupported_source");
    }
  }
  return document;
}

function verifyPackageJsonOperation(
  original: Readonly<Record<string, unknown>>,
  materialized: Readonly<Record<string, unknown>>,
  operation: NpmDependencyOperation
): void {
  const section = materialized[operation.section];
  const value = isPlainObject(section) ? section[operation.packageName] : undefined;
  if (
    (operation.kind === "set" && value !== operation.version) ||
    (operation.kind === "remove" && value !== undefined)
  ) {
    throw new NpmValidationMaterializationError("invalid_materialized_output");
  }
  const normalizedOriginal = withoutOperationTarget(original, operation);
  const normalizedMaterialized = withoutOperationTarget(materialized, operation);
  if (canonicalJson(normalizedOriginal) !== canonicalJson(normalizedMaterialized)) {
    throw new NpmValidationMaterializationError("invalid_materialized_output");
  }
}

function verifyPackageLock(bytes: Uint8Array, operation: NpmDependencyOperation): void {
  const lock = parseJsonObject(bytes);
  if (
    !Number.isSafeInteger(lock.lockfileVersion) ||
    (lock.lockfileVersion as number) < 2 ||
    !isPlainObject(lock.packages) ||
    !isPlainObject(lock.packages[""])
  ) {
    throw new NpmValidationMaterializationError("invalid_materialized_output");
  }
  const root = lock.packages[""];
  const section = root[operation.section];
  const value = isPlainObject(section) ? section[operation.packageName] : undefined;
  if (
    (operation.kind === "set" && value !== operation.version) ||
    (operation.kind === "remove" && value !== undefined)
  ) {
    throw new NpmValidationMaterializationError("invalid_materialized_output");
  }
}

function withoutOperationTarget(
  document: Readonly<Record<string, unknown>>,
  operation: NpmDependencyOperation
): unknown {
  const clone = JSON.parse(JSON.stringify(document)) as Record<string, unknown>;
  const section = clone[operation.section];
  if (isPlainObject(section)) {
    delete section[operation.packageName];
    if (Object.keys(section).length === 0) {
      delete clone[operation.section];
    }
  }
  return clone;
}

function parseChangedPaths(value: string): readonly ("package-lock.json" | "package.json")[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new NpmValidationMaterializationError("sandbox_output_invalid");
  }
  if (
    !isPlainObject(parsed) ||
    !Array.isArray(parsed.changed) ||
    parsed.changed.some((path) => path !== "package.json" && path !== "package-lock.json")
  ) {
    throw new NpmValidationMaterializationError("sandbox_output_invalid");
  }
  return [...new Set(parsed.changed)] as readonly ("package-lock.json" | "package.json")[];
}

function parseJsonObject(bytes: Uint8Array): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!isPlainObject(value)) {
      throw new Error("not an object");
    }
    return value;
  } catch {
    throw new NpmValidationMaterializationError("invalid_materialized_output");
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

function operationContext(
  operationKey: string,
  requestDigest: Sha256Digest
): ExternalOperationContext {
  return {
    attemptNumber: 1,
    budget: { maxAttempts: 1, timeoutMs: commandTimeoutMs },
    operationKey,
    requestDigest
  };
}

async function sha256(bytes: Uint8Array): Promise<Sha256Digest> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", copyBuffer(bytes)));
  return `sha256:${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function copyBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function allZero(bytes: Uint8Array): boolean {
  return bytes.every((byte) => byte === 0);
}

function tarPadding(size: number): number {
  return (512 - (size % 512)) % 512;
}

function decodeNullTerminated(bytes: Uint8Array): string {
  const zero = bytes.indexOf(0);
  return decodeTarText(zero < 0 ? bytes : bytes.subarray(0, zero));
}

function decodeTarText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new NpmValidationMaterializationError("invalid_archive");
  }
}

function isTarGzipFormat(value: unknown): value is "tar.gz" {
  return value === "tar.gz";
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
  });
}
