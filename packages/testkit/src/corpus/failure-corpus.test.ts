import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CanonicalSha256Hasher } from "../runtime/content-hasher.js";
import {
  DirectoryCorpusSource,
  loadFailureCorpusSet,
  type CorpusTextSource,
  type CorpusValidationError
} from "./failure-corpus.js";

const corpusRoot = resolve("fixtures/failure-corpora/v1");
const corpusFileNames = [
  "graph-rules.json",
  "manifest.json",
  "provider-lifecycles.json",
  "security-secrets.json",
  "validation-failures.json"
] as const;

class MemoryCorpusSource implements CorpusTextSource {
  constructor(private readonly files: ReadonlyMap<string, string>) {}

  async readUtf8(relativePath: string): Promise<string> {
    const content = this.files.get(relativePath);
    if (content === undefined) {
      throw new Error(`Missing in-memory corpus file: ${relativePath}`);
    }
    return Promise.resolve(content);
  }
}

async function readCorpusFiles(): Promise<Map<string, string>> {
  const entries = await Promise.all(
    corpusFileNames.map(
      async (fileName) => [fileName, await readFile(resolve(corpusRoot, fileName), "utf8")] as const
    )
  );
  return new Map(entries);
}

function requireFile(files: ReadonlyMap<string, string>, path: string): string {
  const content = files.get(path);
  if (content === undefined) {
    throw new Error(`Test setup is missing ${path}`);
  }
  return content;
}

async function replaceCorpusAndHash(
  files: ReadonlyMap<string, string>,
  path: string,
  replacement: string
): Promise<Map<string, string>> {
  const hasher = new CanonicalSha256Hasher();
  const previous = requireFile(files, path);
  const previousHash = await hasher.hashText(previous);
  const replacementHash = await hasher.hashText(replacement);
  const manifest = requireFile(files, "manifest.json");
  const updatedManifest = manifest.replace(previousHash, replacementHash);
  if (updatedManifest === manifest) {
    throw new Error(`Test setup could not find ${previousHash} in manifest.json`);
  }

  return new Map(files).set(path, replacement).set("manifest.json", updatedManifest);
}

describe("deterministic failure corpus", () => {
  it("loads all required versioned fixtures with exact expected outcomes", async () => {
    const source = new DirectoryCorpusSource(corpusRoot);
    const first = await loadFailureCorpusSet(source);
    const second = await loadFailureCorpusSet(source);

    expect(second).toEqual(first);
    expect(first.manifest).toMatchObject({
      schemaVersion: 1,
      corpusSetVersion: "1.0.0",
      hashAlgorithm: "sha256"
    });
    expect(
      Object.fromEntries(first.corpora.map((corpus) => [corpus.corpusId, corpus.fixtures.length]))
    ).toEqual({
      "graph-rules": 7,
      "provider-lifecycles": 6,
      "security-secrets": 8,
      "validation-failures": 11
    });

    const fixtureIds = first.corpora.flatMap((corpus) =>
      corpus.fixtures.map((fixture) => fixture.fixtureId)
    );
    expect(new Set(fixtureIds).size).toBe(32);
    expect(fixtureIds).toHaveLength(32);

    const providerCorpus = first.corpora.find(
      (corpus) => corpus.category === "provider-lifecycles"
    );
    expect(providerCorpus?.fixtures.map((fixture) => fixture.fixtureId)).toEqual([
      "provider-failed-session",
      "provider-human-modified-command",
      "provider-interrupted-session",
      "provider-missing-terminal-event",
      "provider-normal-session",
      "provider-subagent-session"
    ]);

    const validationAndRuleFixtures = first.corpora
      .filter(
        (corpus) => corpus.category === "validation-failures" || corpus.category === "graph-rules"
      )
      .flatMap((corpus) => corpus.fixtures);
    expect(validationAndRuleFixtures).not.toHaveLength(0);
    for (const fixture of validationAndRuleFixtures) {
      expect(fixture.expected.verified, fixture.fixtureId).toBe(false);
    }
  });

  it("contains synthetic redaction cases without preserving detected plaintext", async () => {
    const loaded = await loadFailureCorpusSet(new DirectoryCorpusSource(corpusRoot));
    const securityCorpus = loaded.corpora.find((corpus) => corpus.category === "security-secrets");
    expect(securityCorpus).toBeDefined();

    const detectedFixtures =
      securityCorpus?.fixtures.filter((fixture) => fixture.expected.secretDetected === true) ?? [];
    expect(detectedFixtures).toHaveLength(7);

    for (const fixture of detectedFixtures) {
      const syntheticValue = fixture.input.syntheticValue;
      const redactedValue = fixture.expected.redactedValue;
      expect(typeof syntheticValue, fixture.fixtureId).toBe("string");
      expect(typeof redactedValue, fixture.fixtureId).toBe("string");
      expect(redactedValue, fixture.fixtureId).not.toBe(syntheticValue);
      expect(fixture.expected.plaintextPersistence, fixture.fixtureId).toBe("forbidden");
    }

    const benignControl = securityCorpus?.fixtures.find(
      (fixture) => fixture.fixtureId === "secret-benign-high-entropy-control"
    );
    expect(benignControl?.expected).toMatchObject({
      outcome: "allowed",
      secretDetected: false,
      reasonCode: "benign-digest-control"
    });
  });

  it("rejects a byte-level fixture change when the manifest hash is unchanged", async () => {
    const files = await readCorpusFiles();
    const graphRules = requireFile(files, "graph-rules.json");
    const tampered = graphRules.replace(
      "Concurrent human and agent dependency actions",
      "Tampered human and agent dependency actions"
    );
    expect(tampered).not.toBe(graphRules);
    files.set("graph-rules.json", tampered);

    await expect(loadFailureCorpusSet(new MemoryCorpusSource(files))).rejects.toEqual(
      expect.objectContaining<Partial<CorpusValidationError>>({
        code: "digest_mismatch"
      })
    );
  });

  it("rejects traversal paths before reading any corpus entry", async () => {
    const files = await readCorpusFiles();
    const manifest = requireFile(files, "manifest.json");
    const unsafeManifest = manifest.replace(
      '"path": "graph-rules.json"',
      '"path": "../graph-rules.json"'
    );
    expect(unsafeManifest).not.toBe(manifest);
    files.set("manifest.json", unsafeManifest);

    await expect(loadFailureCorpusSet(new MemoryCorpusSource(files))).rejects.toEqual(
      expect.objectContaining<Partial<CorpusValidationError>>({
        code: "unsafe_path"
      })
    );
  });

  it("rejects malformed expected results even when their new digest is pinned", async () => {
    const files = await readCorpusFiles();
    const graphRules = requireFile(files, "graph-rules.json");
    const malformed = graphRules.replace(
      '"outcome": "uncertain",',
      '"unexpectedOutcome": "uncertain",'
    );
    expect(malformed).not.toBe(graphRules);
    const updatedFiles = await replaceCorpusAndHash(files, "graph-rules.json", malformed);

    await expect(loadFailureCorpusSet(new MemoryCorpusSource(updatedFiles))).rejects.toEqual(
      expect.objectContaining<Partial<CorpusValidationError>>({
        code: "invalid_corpus"
      })
    );
  });

  it("rejects duplicate fixture identifiers even when their new digest is pinned", async () => {
    const files = await readCorpusFiles();
    const providerLifecycles = requireFile(files, "provider-lifecycles.json");
    const duplicate = providerLifecycles.replace(
      '"fixtureId": "provider-human-modified-command"',
      '"fixtureId": "provider-failed-session"'
    );
    expect(duplicate).not.toBe(providerLifecycles);
    const updatedFiles = await replaceCorpusAndHash(files, "provider-lifecycles.json", duplicate);

    await expect(loadFailureCorpusSet(new MemoryCorpusSource(updatedFiles))).rejects.toEqual(
      expect.objectContaining<Partial<CorpusValidationError>>({
        code: "duplicate_identifier"
      })
    );
  });
});
