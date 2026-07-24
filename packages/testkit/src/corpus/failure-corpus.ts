import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import type {
  CanonicalJsonObject,
  ContentHasher,
  Sha256Digest
} from "@environment-reconciler/reconciler";

import { CanonicalSha256Hasher } from "../runtime/content-hasher.js";

export const FAILURE_CORPUS_SCHEMA_VERSION = 1 as const;

export type FailureCorpusCategory =
  "graph-rules" | "provider-lifecycles" | "security-secrets" | "validation-failures";

export interface FailureCorpusManifestEntry {
  readonly corpusId: string;
  readonly category: FailureCorpusCategory;
  readonly corpusVersion: string;
  readonly path: string;
  readonly contentHash: Sha256Digest;
  readonly fixtureCount: number;
}

export interface FailureCorpusManifest {
  readonly schemaVersion: typeof FAILURE_CORPUS_SCHEMA_VERSION;
  readonly corpusSetVersion: string;
  readonly hashAlgorithm: "sha256";
  readonly entries: readonly FailureCorpusManifestEntry[];
}

export interface FailureCorpusFixture {
  readonly fixtureId: string;
  readonly title: string;
  readonly description: string;
  readonly input: CanonicalJsonObject;
  readonly expected: CanonicalJsonObject & { readonly outcome: string };
}

export interface FailureCorpus {
  readonly schemaVersion: typeof FAILURE_CORPUS_SCHEMA_VERSION;
  readonly corpusId: string;
  readonly category: FailureCorpusCategory;
  readonly corpusVersion: string;
  readonly fixtures: readonly FailureCorpusFixture[];
}

export interface LoadedFailureCorpus extends FailureCorpus {
  readonly sourcePath: string;
  readonly contentHash: Sha256Digest;
}

export interface LoadedFailureCorpusSet {
  readonly manifest: FailureCorpusManifest;
  readonly corpora: readonly LoadedFailureCorpus[];
}

export interface CorpusTextSource {
  readUtf8(relativePath: string): Promise<string>;
}

export type CorpusValidationErrorCode =
  | "corpus_mismatch"
  | "digest_mismatch"
  | "duplicate_identifier"
  | "invalid_corpus"
  | "invalid_manifest"
  | "malformed_json"
  | "unsafe_path";

export class CorpusValidationError extends Error {
  constructor(
    readonly code: CorpusValidationErrorCode,
    message: string
  ) {
    super(message);
    this.name = "CorpusValidationError";
  }
}

const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SEMANTIC_VERSION_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;

function fail(code: CorpusValidationErrorCode, message: string): never {
  throw new CorpusValidationError(code, message);
}

function assertRecord(
  value: unknown,
  context: string,
  code: CorpusValidationErrorCode
): asserts value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(code, `${context} must be a JSON object`);
  }
}

function assertExactKeys(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
  context: string,
  code: CorpusValidationErrorCode
): void {
  const expected = new Set(expectedKeys);
  for (const key of expectedKeys) {
    if (!Object.hasOwn(value, key)) {
      fail(code, `${context} is missing required property "${key}"`);
    }
  }
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      fail(code, `${context} contains unsupported property "${key}"`);
    }
  }
}

function readString(
  value: Readonly<Record<string, unknown>>,
  key: string,
  context: string,
  code: CorpusValidationErrorCode
): string {
  const candidate = value[key];
  if (typeof candidate !== "string" || candidate.trim() === "") {
    fail(code, `${context}.${key} must be a non-empty string`);
  }
  return candidate;
}

function readInteger(
  value: Readonly<Record<string, unknown>>,
  key: string,
  context: string,
  code: CorpusValidationErrorCode
): number {
  const candidate = value[key];
  if (typeof candidate !== "number" || !Number.isSafeInteger(candidate)) {
    fail(code, `${context}.${key} must be a safe integer`);
  }
  return candidate;
}

function readIdentifier(
  value: Readonly<Record<string, unknown>>,
  key: string,
  context: string,
  code: CorpusValidationErrorCode
): string {
  const identifier = readString(value, key, context, code);
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    fail(code, `${context}.${key} must be a lower-case hyphenated identifier`);
  }
  return identifier;
}

function readSemanticVersion(
  value: Readonly<Record<string, unknown>>,
  key: string,
  context: string,
  code: CorpusValidationErrorCode
): string {
  const version = readString(value, key, context, code);
  if (!SEMANTIC_VERSION_PATTERN.test(version)) {
    fail(code, `${context}.${key} must be a three-component semantic version`);
  }
  return version;
}

function parseJson(text: string, sourcePath: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "unknown parser failure";
    return fail("malformed_json", `${sourcePath} is not valid JSON: ${detail}`);
  }
}

function parseCategory(
  value: string,
  context: string,
  code: CorpusValidationErrorCode
): FailureCorpusCategory {
  switch (value) {
    case "graph-rules":
    case "provider-lifecycles":
    case "security-secrets":
    case "validation-failures":
      return value;
    default:
      return fail(code, `${context} has unsupported corpus category "${value}"`);
  }
}

function validateRelativeJsonPath(path: string, context: string): void {
  if (
    path.includes("\\") ||
    isAbsolute(path) ||
    !path.endsWith(".json") ||
    path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    fail("unsafe_path", `${context} must be a safe relative JSON path`);
  }
}

function parseManifestEntry(value: unknown, index: number): FailureCorpusManifestEntry {
  const context = `manifest.entries[${String(index)}]`;
  assertRecord(value, context, "invalid_manifest");
  assertExactKeys(
    value,
    ["corpusId", "category", "corpusVersion", "path", "contentHash", "fixtureCount"],
    context,
    "invalid_manifest"
  );

  const contentHash = readString(value, "contentHash", context, "invalid_manifest");
  if (!SHA256_PATTERN.test(contentHash)) {
    fail("invalid_manifest", `${context}.contentHash must be a lower-case SHA-256 digest`);
  }

  const path = readString(value, "path", context, "invalid_manifest");
  validateRelativeJsonPath(path, `${context}.path`);

  const fixtureCount = readInteger(value, "fixtureCount", context, "invalid_manifest");
  if (fixtureCount <= 0) {
    fail("invalid_manifest", `${context}.fixtureCount must be positive`);
  }

  return {
    corpusId: readIdentifier(value, "corpusId", context, "invalid_manifest"),
    category: parseCategory(
      readString(value, "category", context, "invalid_manifest"),
      `${context}.category`,
      "invalid_manifest"
    ),
    corpusVersion: readSemanticVersion(value, "corpusVersion", context, "invalid_manifest"),
    path,
    contentHash: contentHash as Sha256Digest,
    fixtureCount
  };
}

function parseManifest(value: unknown): FailureCorpusManifest {
  const context = "manifest";
  assertRecord(value, context, "invalid_manifest");
  assertExactKeys(
    value,
    ["schemaVersion", "corpusSetVersion", "hashAlgorithm", "entries"],
    context,
    "invalid_manifest"
  );

  const schemaVersion = readInteger(value, "schemaVersion", context, "invalid_manifest");
  if (schemaVersion !== FAILURE_CORPUS_SCHEMA_VERSION) {
    fail(
      "invalid_manifest",
      `manifest.schemaVersion must be ${String(FAILURE_CORPUS_SCHEMA_VERSION)}`
    );
  }

  const hashAlgorithm = readString(value, "hashAlgorithm", context, "invalid_manifest");
  if (hashAlgorithm !== "sha256") {
    fail("invalid_manifest", 'manifest.hashAlgorithm must be "sha256"');
  }

  const rawEntries = value.entries;
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    fail("invalid_manifest", "manifest.entries must be a non-empty array");
  }
  const entryValues: readonly unknown[] = rawEntries;
  const entries = entryValues.map((entry, index) => parseManifestEntry(entry, index));

  const corpusIds = new Set<string>();
  const paths = new Set<string>();
  let previousCorpusId: string | undefined;
  for (const entry of entries) {
    if (corpusIds.has(entry.corpusId) || paths.has(entry.path)) {
      fail(
        "duplicate_identifier",
        `manifest contains duplicate corpus ID or path at "${entry.corpusId}"`
      );
    }
    if (previousCorpusId !== undefined && previousCorpusId >= entry.corpusId) {
      fail("invalid_manifest", "manifest entries must be sorted by corpusId");
    }
    corpusIds.add(entry.corpusId);
    paths.add(entry.path);
    previousCorpusId = entry.corpusId;
  }

  return {
    schemaVersion: FAILURE_CORPUS_SCHEMA_VERSION,
    corpusSetVersion: readSemanticVersion(value, "corpusSetVersion", context, "invalid_manifest"),
    hashAlgorithm: "sha256",
    entries
  };
}

function parseFixture(value: unknown, corpusId: string, index: number): FailureCorpusFixture {
  const context = `${corpusId}.fixtures[${String(index)}]`;
  assertRecord(value, context, "invalid_corpus");
  assertExactKeys(
    value,
    ["fixtureId", "title", "description", "input", "expected"],
    context,
    "invalid_corpus"
  );

  const input = value.input;
  const expected = value.expected;
  assertRecord(input, `${context}.input`, "invalid_corpus");
  assertRecord(expected, `${context}.expected`, "invalid_corpus");
  const outcome = readString(expected, "outcome", `${context}.expected`, "invalid_corpus");

  return {
    fixtureId: readIdentifier(value, "fixtureId", context, "invalid_corpus"),
    title: readString(value, "title", context, "invalid_corpus"),
    description: readString(value, "description", context, "invalid_corpus"),
    input: input as CanonicalJsonObject,
    expected: { ...expected, outcome }
  };
}

function parseCorpus(value: unknown, sourcePath: string): FailureCorpus {
  const context = `corpus "${sourcePath}"`;
  assertRecord(value, context, "invalid_corpus");
  assertExactKeys(
    value,
    ["schemaVersion", "corpusId", "category", "corpusVersion", "fixtures"],
    context,
    "invalid_corpus"
  );

  const schemaVersion = readInteger(value, "schemaVersion", context, "invalid_corpus");
  if (schemaVersion !== FAILURE_CORPUS_SCHEMA_VERSION) {
    fail(
      "invalid_corpus",
      `${context}.schemaVersion must be ${String(FAILURE_CORPUS_SCHEMA_VERSION)}`
    );
  }

  const rawFixtures = value.fixtures;
  if (!Array.isArray(rawFixtures) || rawFixtures.length === 0) {
    fail("invalid_corpus", `${context}.fixtures must be a non-empty array`);
  }
  const fixtureValues: readonly unknown[] = rawFixtures;
  const corpusId = readIdentifier(value, "corpusId", context, "invalid_corpus");
  const fixtures = fixtureValues.map((fixture, index) => parseFixture(fixture, corpusId, index));

  const fixtureIds = new Set<string>();
  let previousFixtureId: string | undefined;
  for (const fixture of fixtures) {
    if (fixtureIds.has(fixture.fixtureId)) {
      fail(
        "duplicate_identifier",
        `${context} contains duplicate fixture ID "${fixture.fixtureId}"`
      );
    }
    if (previousFixtureId !== undefined && previousFixtureId >= fixture.fixtureId) {
      fail("invalid_corpus", `${context} fixtures must be sorted by fixtureId`);
    }
    fixtureIds.add(fixture.fixtureId);
    previousFixtureId = fixture.fixtureId;
  }

  return {
    schemaVersion: FAILURE_CORPUS_SCHEMA_VERSION,
    corpusId,
    category: parseCategory(
      readString(value, "category", context, "invalid_corpus"),
      `${context}.category`,
      "invalid_corpus"
    ),
    corpusVersion: readSemanticVersion(value, "corpusVersion", context, "invalid_corpus"),
    fixtures
  };
}

async function loadCorpus(
  source: CorpusTextSource,
  entry: FailureCorpusManifestEntry,
  hasher: ContentHasher
): Promise<LoadedFailureCorpus> {
  const text = await source.readUtf8(entry.path);
  const actualHash = await hasher.hashText(text);
  if (actualHash !== entry.contentHash) {
    fail(
      "digest_mismatch",
      `${entry.path} digest mismatch: expected ${entry.contentHash}, received ${actualHash}`
    );
  }

  const corpus = parseCorpus(parseJson(text, entry.path), entry.path);
  if (
    corpus.corpusId !== entry.corpusId ||
    corpus.category !== entry.category ||
    corpus.corpusVersion !== entry.corpusVersion ||
    corpus.fixtures.length !== entry.fixtureCount
  ) {
    fail("corpus_mismatch", `${entry.path} metadata does not match its manifest entry`);
  }

  return {
    ...corpus,
    sourcePath: entry.path,
    contentHash: actualHash
  };
}

/**
 * Loads and verifies a complete corpus set. Hashes are checked over the exact
 * UTF-8 bytes before JSON parsing, so whitespace or line-ending drift is also
 * detected.
 */
export async function loadFailureCorpusSet(
  source: CorpusTextSource,
  manifestPath = "manifest.json",
  hasher: ContentHasher = new CanonicalSha256Hasher()
): Promise<LoadedFailureCorpusSet> {
  validateRelativeJsonPath(manifestPath, "manifestPath");
  const manifestText = await source.readUtf8(manifestPath);
  const manifest = parseManifest(parseJson(manifestText, manifestPath));
  const corpora = await Promise.all(
    manifest.entries.map((entry) => loadCorpus(source, entry, hasher))
  );

  const globalFixtureIds = new Set<string>();
  for (const corpus of corpora) {
    for (const fixture of corpus.fixtures) {
      if (globalFixtureIds.has(fixture.fixtureId)) {
        fail(
          "duplicate_identifier",
          `fixture ID "${fixture.fixtureId}" occurs in more than one corpus`
        );
      }
      globalFixtureIds.add(fixture.fixtureId);
    }
  }

  return { manifest, corpora };
}

export class DirectoryCorpusSource implements CorpusTextSource {
  readonly #rootDirectory: string;

  constructor(rootDirectory: string) {
    if (rootDirectory.trim() === "") {
      throw new TypeError("Corpus root directory must not be empty");
    }
    this.#rootDirectory = resolve(rootDirectory);
  }

  async readUtf8(relativePath: string): Promise<string> {
    validateRelativeJsonPath(relativePath, "corpus source path");
    const absolutePath = resolve(this.#rootDirectory, ...relativePath.split("/"));
    const pathFromRoot = relative(this.#rootDirectory, absolutePath);
    if (pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot)) {
      fail("unsafe_path", "Corpus source path escapes the configured root directory");
    }
    return readFile(absolutePath, "utf8");
  }
}
