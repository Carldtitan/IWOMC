import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import canonicalize from "canonicalize";
import { compile } from "json-schema-to-typescript";
import { format, type Options, resolveConfig } from "prettier";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaDirectory = join(repositoryRoot, "packages", "contracts", "schema", "v1");
const protocolSchemaPath = join(schemaDirectory, "protocol.schema.json");
const bundledSchemaPath = join(schemaDirectory, "protocol.bundle.schema.json");
const generatedTypeScriptPath = join(
  repositoryRoot,
  "packages",
  "contracts",
  "src",
  "generated",
  "protocol.ts"
);
const generatedRuntimeSchemaPath = join(
  repositoryRoot,
  "packages",
  "contracts",
  "src",
  "generated",
  "protocol.schema.json"
);
const generatedRustPath = join(
  repositoryRoot,
  "crates",
  "companion",
  "src",
  "contracts",
  "generated",
  "protocol.rs"
);
const validFixturesPath = join(
  repositoryRoot,
  "tests",
  "contract",
  "fixtures",
  "valid",
  "protocol-documents.v1.json"
);
const invalidFixturesPath = join(
  repositoryRoot,
  "tests",
  "contract",
  "fixtures",
  "invalid",
  "protocol-documents.v1.json"
);
const additiveFixturesPath = join(
  repositoryRoot,
  "tests",
  "contract",
  "fixtures",
  "compatibility",
  "additive-session.v1.json"
);
const migrationFixturesPath = join(
  repositoryRoot,
  "tests",
  "contract",
  "fixtures",
  "migration",
  "workspace.v0.json"
);

const forbiddenPropertyNames = new Set([
  "authorizationUrl",
  "isVerified",
  "presignedUrl",
  "rawPrompt",
  "rawResponse",
  "secretValue",
  "stderr",
  "stdout"
]);

interface GeneratedArtifact {
  readonly path: string;
  readonly content: string;
}

interface SourceSchema {
  readonly fileName: string;
  readonly document: Record<string, unknown>;
  readonly definitions: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableJson(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableJson(item)])
  );
}

/**
 * Typify 0.7 ignores `const` and maps date-time strings to normalizing chrono values.
 * The Rust runtime still validates the untouched canonical schema first; this generator-only
 * projection preserves discriminators while keeping exact timestamp bytes in the wire types.
 */
function prepareRustGeneratorSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => prepareRustGeneratorSchema(item));
  }
  if (!isRecord(value)) {
    return value;
  }

  const rewritten = Object.fromEntries(
    Object.entries(value)
      .filter(([key, item]) => key !== "const" && !(key === "format" && item === "date-time"))
      .map(([key, item]) => [key, prepareRustGeneratorSchema(item)])
  );
  if (Object.hasOwn(value, "const")) {
    rewritten.enum = [structuredClone(value.const)];
  }
  return rewritten;
}

async function formatJson(value: unknown, prettierOptions: Readonly<Options>): Promise<string> {
  return format(JSON.stringify(stableJson(value)), {
    ...prettierOptions,
    endOfLine: "lf",
    parser: "json"
  });
}

function auditSchema(node: unknown, location = "#"): void {
  if (Array.isArray(node)) {
    node.forEach((item, index) => auditSchema(item, `${location}/${index}`));
    return;
  }

  if (!isRecord(node)) {
    return;
  }

  if (node.type === "object" && !Object.hasOwn(node, "additionalProperties")) {
    throw new Error(`${location}: every object schema must declare additionalProperties`);
  }

  const properties = node.properties;
  if (isRecord(properties)) {
    for (const propertyName of Object.keys(properties)) {
      if (forbiddenPropertyNames.has(propertyName)) {
        throw new Error(`${location}: forbidden durable property name "${propertyName}"`);
      }
    }
  }

  for (const [key, value] of Object.entries(node)) {
    auditSchema(value, `${location}/${key}`);
  }
}

function definitionKey(fileName: string, definitionName: string): string {
  return `${fileName}#/$defs/${definitionName}`;
}

function filePrefix(fileName: string): string {
  return fileName
    .replace(/\.schema\.json$/u, "")
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function rewriteReferences(
  node: unknown,
  sourceFileName: string,
  definitionNames: ReadonlyMap<string, string>
): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => rewriteReferences(item, sourceFileName, definitionNames));
  }
  if (!isRecord(node)) {
    return node;
  }

  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => {
      if (key !== "$ref" || typeof value !== "string") {
        return [key, rewriteReferences(value, sourceFileName, definitionNames)];
      }

      const match = /^(?:(?<file>[a-z][a-z0-9-]*\.schema\.json))?#\/\$defs\/(?<name>.+)$/u.exec(
        value
      );
      if (match?.groups?.name === undefined) {
        throw new Error(`${sourceFileName}: unsupported schema reference "${value}"`);
      }

      const referencedFileName: unknown = match.groups.file;
      const targetFileName =
        typeof referencedFileName === "string" ? referencedFileName : sourceFileName;
      const generatedName = definitionNames.get(definitionKey(targetFileName, match.groups.name));
      if (generatedName === undefined) {
        throw new Error(`${sourceFileName}: unresolved schema reference "${value}"`);
      }
      return ["$ref", `#/$defs/${generatedName}`];
    })
  );
}

async function linkSchemas(): Promise<Record<string, unknown>> {
  const fileNames = (await readdir(schemaDirectory))
    .filter(
      (fileName) =>
        fileName.endsWith(".schema.json") &&
        fileName !== "protocol.schema.json" &&
        fileName !== "protocol.bundle.schema.json"
    )
    .sort();
  const sources = await Promise.all(
    fileNames.map(async (fileName): Promise<SourceSchema> => {
      const parsed = JSON.parse(await readFile(join(schemaDirectory, fileName), "utf8")) as unknown;
      if (!isRecord(parsed) || !isRecord(parsed.$defs)) {
        throw new Error(`${fileName}: schema must contain an object-valued $defs`);
      }
      return { fileName, document: parsed, definitions: parsed.$defs };
    })
  );

  const occurrences = new Map<string, number>();
  for (const source of sources) {
    for (const name of Object.keys(source.definitions)) {
      occurrences.set(name, (occurrences.get(name) ?? 0) + 1);
    }
  }

  const definitionNames = new Map<string, string>();
  const usedNames = new Set<string>();
  for (const source of sources) {
    for (const name of Object.keys(source.definitions).sort()) {
      const generatedName =
        occurrences.get(name) === 1 ? name : `${filePrefix(source.fileName)}${name}`;
      if (usedNames.has(generatedName)) {
        throw new Error(`generated definition name collision: ${generatedName}`);
      }
      usedNames.add(generatedName);
      definitionNames.set(definitionKey(source.fileName, name), generatedName);
    }
  }

  const definitions: Record<string, unknown> = {};
  for (const source of sources) {
    for (const [name, definition] of Object.entries(source.definitions).sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      const generatedName = definitionNames.get(definitionKey(source.fileName, name));
      if (generatedName === undefined) {
        throw new Error(`missing generated definition name for ${source.fileName}#/$defs/${name}`);
      }
      definitions[generatedName] = rewriteReferences(definition, source.fileName, definitionNames);
    }
  }

  const parsedProtocol = JSON.parse(await readFile(protocolSchemaPath, "utf8")) as unknown;
  if (!isRecord(parsedProtocol)) {
    throw new Error("protocol.schema.json must contain a JSON object");
  }
  const rewrittenProtocol = rewriteReferences(
    parsedProtocol,
    "protocol.schema.json",
    definitionNames
  );
  if (!isRecord(rewrittenProtocol)) {
    throw new Error("linked protocol schema must contain a JSON object");
  }
  return { ...rewrittenProtocol, $defs: definitions };
}

function localReferenceTarget(
  reference: string,
  rootSchema: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  if (!reference.startsWith("#/")) {
    throw new Error(`fixture generation only supports local references: ${reference}`);
  }

  let current: unknown = rootSchema;
  for (const encodedSegment of reference.slice(2).split("/")) {
    const segment = encodedSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (!isRecord(current) || !Object.hasOwn(current, segment)) {
      throw new Error(`fixture generation could not resolve reference: ${reference}`);
    }
    current = current[segment];
  }
  if (!isRecord(current)) {
    throw new Error(`fixture generation reference is not a schema object: ${reference}`);
  }
  return current;
}

function sampleString(schema: Readonly<Record<string, unknown>>): string {
  if (schema.format === "date-time") {
    return "2026-01-02T03:04:05Z";
  }
  if (schema.format === "uri") {
    return "https://example.invalid/resource";
  }

  const pattern = typeof schema.pattern === "string" ? schema.pattern : undefined;
  let value =
    pattern === "^sha256:[a-f0-9]{64}$"
      ? `sha256:${"0".repeat(64)}`
      : pattern === "^(?:[a-f0-9]{40}|[a-f0-9]{64})$"
        ? "0".repeat(40)
        : pattern === "^[A-Za-z0-9+/]+={0,2}$"
          ? "AA=="
          : pattern === "^[A-Za-z0-9_-]+={0,2}$"
            ? "AA"
            : pattern === "^(?:0|[1-9][0-9]*)$"
              ? "0"
              : pattern === "^https?://"
                ? "https://example.invalid/resource"
                : pattern?.includes("[^./") === true
                  ? "fixture.txt"
                  : pattern === "^[A-Za-z0-9][A-Za-z0-9._:-]*$" || pattern === "^[A-Za-z0-9_-]+$"
                    ? "example"
                    : "example";

  const minimumLength =
    typeof schema.minLength === "number" && Number.isSafeInteger(schema.minLength)
      ? schema.minLength
      : 0;
  if (value.length < minimumLength) {
    value = value.padEnd(minimumLength, "x");
  }
  const maximumLength =
    typeof schema.maxLength === "number" && Number.isSafeInteger(schema.maxLength)
      ? schema.maxLength
      : undefined;
  if (maximumLength !== undefined && value.length > maximumLength) {
    value = value.slice(0, maximumLength);
  }
  if (pattern !== undefined && !new RegExp(pattern, "u").test(value)) {
    throw new Error(`fixture generator has no deterministic sample for pattern: ${pattern}`);
  }
  return value;
}

function synthesizeValue(
  schema: Readonly<Record<string, unknown>>,
  rootSchema: Readonly<Record<string, unknown>>,
  depth = 0
): unknown {
  if (depth > 128) {
    throw new Error("fixture generation exceeded the maximum schema depth");
  }

  if (typeof schema.$ref === "string") {
    return synthesizeValue(localReferenceTarget(schema.$ref, rootSchema), rootSchema, depth + 1);
  }
  if (Object.hasOwn(schema, "const")) {
    return structuredClone(schema.const);
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return structuredClone(schema.enum[0]);
  }
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const first = schema.oneOf[0];
    if (!isRecord(first)) {
      throw new Error("fixture generation encountered a non-object oneOf branch");
    }
    return synthesizeValue(first, rootSchema, depth + 1);
  }

  const schemaType = Array.isArray(schema.type)
    ? schema.type.find((value) => value !== "null")
    : schema.type;
  switch (schemaType) {
    case "object": {
      const properties = isRecord(schema.properties) ? schema.properties : {};
      const required = Array.isArray(schema.required) ? schema.required : [];
      const result: Record<string, unknown> = {};
      for (const propertyName of required) {
        if (typeof propertyName !== "string" || !isRecord(properties[propertyName])) {
          throw new Error(`required property lacks a schema: ${String(propertyName)}`);
        }
        result[propertyName] = synthesizeValue(properties[propertyName], rootSchema, depth + 1);
      }
      return result;
    }
    case "array": {
      if (!isRecord(schema.items)) {
        throw new Error("array schema must define object-valued items");
      }
      const minimumItems =
        typeof schema.minItems === "number" && Number.isSafeInteger(schema.minItems)
          ? schema.minItems
          : 0;
      return Array.from({ length: minimumItems }, () =>
        synthesizeValue(schema.items as Record<string, unknown>, rootSchema, depth + 1)
      );
    }
    case "string":
      return sampleString(schema);
    case "integer": {
      const minimum = typeof schema.minimum === "number" ? Math.ceil(schema.minimum) : 0;
      const maximum = typeof schema.maximum === "number" ? Math.floor(schema.maximum) : minimum;
      return Math.min(minimum, maximum);
    }
    case "number": {
      const minimum = typeof schema.minimum === "number" ? schema.minimum : 0;
      const maximum = typeof schema.maximum === "number" ? schema.maximum : minimum;
      return Math.min(minimum, maximum);
    }
    case "boolean":
      return false;
    case "null":
      return null;
    default:
      throw new Error(
        `fixture generation encountered unsupported schema type: ${String(schemaType)}`
      );
  }
}

function documentDigest(document: unknown): string {
  const serialized = canonicalize(document);
  if (serialized === undefined) {
    throw new Error("generated fixture cannot be represented as canonical JSON");
  }
  return `sha256:${createHash("sha256").update(serialized).digest("hex")}`;
}

function generatedFixtures(
  protocolSchema: Readonly<Record<string, unknown>>,
  validateProtocol: (value: unknown) => boolean
): {
  readonly valid: Record<string, unknown>;
  readonly invalid: Record<string, unknown>;
  readonly additive: Record<string, unknown>;
  readonly migration: Record<string, unknown>;
} {
  if (!Array.isArray(protocolSchema.oneOf)) {
    throw new Error("protocol schema must define a oneOf root");
  }

  const validDocuments: Record<string, unknown>[] = [];
  for (const rootReference of protocolSchema.oneOf) {
    if (!isRecord(rootReference) || typeof rootReference.$ref !== "string") {
      throw new Error("protocol oneOf entries must be local references");
    }
    const rootName = rootReference.$ref.split("/").at(-1);
    const rootDefinition = localReferenceTarget(rootReference.$ref, protocolSchema);
    const branches =
      Array.isArray(rootDefinition.oneOf) && rootDefinition.oneOf.length > 0
        ? rootDefinition.oneOf
        : [rootDefinition];

    for (const branch of branches) {
      if (!isRecord(branch)) {
        throw new Error(`protocol root ${String(rootName)} contains an invalid branch`);
      }
      const document = synthesizeValue(branch, protocolSchema);
      if (!isRecord(document) || typeof document.kind !== "string") {
        throw new Error(`protocol root ${String(rootName)} did not produce a wire document`);
      }
      if (!validateProtocol(document)) {
        throw new Error(
          `generated fixture for ${String(rootName)} (${document.kind}) failed protocol validation`
        );
      }
      validDocuments.push({
        rootType: rootName,
        wireKind: document.kind,
        canonicalDigest: documentDigest(document),
        document
      });
    }
  }

  const wireKinds = validDocuments.map((entry) => entry.wireKind);
  if (new Set(wireKinds).size !== wireKinds.length) {
    throw new Error("generated protocol fixtures contain duplicate wire kinds");
  }

  const findDocument = (rootType: string): Record<string, unknown> => {
    const fixture = validDocuments.find((entry) => entry.rootType === rootType);
    if (!isRecord(fixture?.document)) {
      throw new Error(`missing generated fixture for root type ${rootType}`);
    }
    return structuredClone(fixture.document);
  };

  const unsupportedVersion = findDocument("Workspace");
  unsupportedVersion.schemaVersion = 2;
  const unknownProperty = findDocument("Workspace");
  unknownProperty.unexpected = true;
  const invalidTimestamp = findDocument("Workspace");
  invalidTimestamp.createdAt = "not-a-timestamp";
  const invalidDigest = findDocument("ObjectMetadata");
  invalidDigest.contentDigest = "sha256:not-a-digest";
  const standaloneVerification = findDocument("ValidationAttestation");
  standaloneVerification.isVerified = true;
  const unscopedAttestation = findDocument("ValidationAttestation");
  delete unscopedAttestation.sourceInputDigest;
  const rawSecret = findDocument("SecretReference");
  rawSecret.secretValue = "synthetic-secret-that-must-never-be-durable";

  const invalidCases = [
    {
      caseId: "unsupported-schema-version",
      expectedErrorCode: "unsupported_schema_version",
      document: unsupportedVersion
    },
    {
      caseId: "unknown-durable-property",
      expectedErrorCode: "invalid_value",
      document: unknownProperty
    },
    {
      caseId: "invalid-rfc3339-timestamp",
      expectedErrorCode: "invalid_value",
      document: invalidTimestamp
    },
    {
      caseId: "invalid-sha256-digest",
      expectedErrorCode: "invalid_value",
      document: invalidDigest
    },
    {
      caseId: "standalone-verification-boolean",
      expectedErrorCode: "invalid_value",
      document: standaloneVerification
    },
    {
      caseId: "unscoped-validation-attestation",
      expectedErrorCode: "invalid_value",
      document: unscopedAttestation
    },
    {
      caseId: "raw-secret-property",
      expectedErrorCode: "invalid_value",
      document: rawSecret
    }
  ];
  for (const fixture of invalidCases) {
    if (validateProtocol(fixture.document)) {
      throw new Error(`invalid fixture unexpectedly passed validation: ${fixture.caseId}`);
    }
  }

  const baseSession = findDocument("Session");
  const sessionWithOptionalField = structuredClone(baseSession);
  sessionWithOptionalField.endedAt = "2026-01-02T04:05:06Z";
  if (!validateProtocol(baseSession) || !validateProtocol(sessionWithOptionalField)) {
    throw new Error("additive compatibility session fixtures must both validate");
  }

  const baseWorkspace = findDocument("Workspace");
  const baseWorkspaceJson = JSON.stringify(baseWorkspace);
  const numericVersionEncodings = [
    { encoding: "integer", json: baseWorkspaceJson },
    {
      encoding: "decimal",
      json: baseWorkspaceJson.replace('"schemaVersion":1', '"schemaVersion":1.0')
    },
    {
      encoding: "exponent",
      json: baseWorkspaceJson.replace('"schemaVersion":1', '"schemaVersion":1e0')
    }
  ].map((fixture) => {
    const parsed = JSON.parse(fixture.json) as unknown;
    if (!validateProtocol(parsed)) {
      throw new Error(`numeric schema-version fixture must validate: ${fixture.encoding}`);
    }
    return { ...fixture, canonicalDigest: documentDigest(parsed) };
  });

  const offsetTimestampDocument = findDocument("Workspace");
  offsetTimestampDocument.createdAt = "2026-01-02T04:04:05+01:00";
  const fractionalTimestampDocument = findDocument("Workspace");
  fractionalTimestampDocument.createdAt = "2026-01-02T03:04:05.123400Z";
  for (const document of [offsetTimestampDocument, fractionalTimestampDocument]) {
    if (!validateProtocol(document)) {
      throw new Error("RFC 3339 compatibility fixture must validate");
    }
  }

  return {
    valid: {
      fixtureVersion: 1,
      protocolSchemaVersion: 1,
      documentCount: validDocuments.length,
      documents: validDocuments
    },
    invalid: {
      fixtureVersion: 1,
      protocolSchemaVersion: 1,
      cases: invalidCases
    },
    additive: {
      fixtureVersion: 1,
      protocolSchemaVersion: 1,
      description:
        "A v1 reader accepts an older minimal payload and the same payload with an optional field already reserved by v1.",
      baseDocument: baseSession,
      documentWithOptionalField: sessionWithOptionalField,
      numericVersionEncodings,
      timestampDocuments: [
        {
          encoding: "offset",
          canonicalDigest: documentDigest(offsetTimestampDocument),
          document: offsetTimestampDocument
        },
        {
          encoding: "fractional",
          canonicalDigest: documentDigest(fractionalTimestampDocument),
          document: fractionalTimestampDocument
        }
      ]
    },
    migration: {
      fixtureVersion: 1,
      sourceSchemaVersion: 0,
      targetSchemaVersion: 1,
      document: {
        schemaVersion: 0,
        kind: "workspace_legacy",
        id: "workspace-legacy",
        displayName: "Migrated workspace",
        createdAt: "2026-01-02T03:04:05Z"
      }
    }
  };
}

async function buildArtifacts(temporaryDirectory: string): Promise<GeneratedArtifact[]> {
  const prettierOptions = (await resolveConfig(join(repositoryRoot, "package.json"))) ?? {};
  const bundled = await linkSchemas();

  auditSchema(bundled);

  const ajv = new Ajv2020({
    allErrors: true,
    allowUnionTypes: false,
    strict: true,
    validateFormats: true
  });
  addFormats(ajv);

  if (!ajv.validateSchema(bundled)) {
    throw new Error(`invalid protocol schema: ${ajv.errorsText(ajv.errors)}`);
  }
  const validateProtocol = ajv.compile(bundled);

  const bundledJson = await formatJson(bundled, prettierOptions);
  const fixtures = generatedFixtures(bundled, validateProtocol);
  const unformattedTypeScript = await compile(bundled, "ProtocolDocumentV1", {
    bannerComment:
      "/* eslint-disable */\n/** @generated by scripts/generate-contracts.ts. Do not edit. */",
    format: false,
    style: {
      bracketSpacing: true,
      printWidth: 100,
      semi: true,
      singleQuote: false,
      tabWidth: 2,
      trailingComma: "none",
      useTabs: false
    },
    unreachableDefinitions: true,
    unknownAny: false
  });
  const generatedTypeScript = await format(unformattedTypeScript, {
    ...prettierOptions,
    endOfLine: "lf",
    parser: "typescript"
  });

  const temporaryBundlePath = join(temporaryDirectory, "protocol.bundle.schema.json");
  const temporaryRustPath = join(temporaryDirectory, "protocol.rs");
  const rustGeneratorSchema = await formatJson(
    prepareRustGeneratorSchema(bundled),
    prettierOptions
  );
  await writeFile(temporaryBundlePath, rustGeneratorSchema, "utf8");

  execFileSync(
    "cargo",
    [
      "run",
      "--quiet",
      "-p",
      "environment-reconciler-contract-gen",
      "--",
      temporaryBundlePath,
      temporaryRustPath
    ],
    {
      cwd: repositoryRoot,
      stdio: "inherit"
    }
  );
  execFileSync("rustfmt", ["--edition", "2024", temporaryRustPath], {
    cwd: repositoryRoot,
    stdio: "inherit"
  });
  const generatedRust = await readFile(temporaryRustPath, "utf8");
  const [validFixturesJson, invalidFixturesJson, additiveFixturesJson, migrationFixturesJson] =
    await Promise.all([
      formatJson(fixtures.valid, prettierOptions),
      formatJson(fixtures.invalid, prettierOptions),
      formatJson(fixtures.additive, prettierOptions),
      formatJson(fixtures.migration, prettierOptions)
    ]);

  return [
    { path: bundledSchemaPath, content: bundledJson },
    { path: generatedRuntimeSchemaPath, content: bundledJson },
    { path: generatedTypeScriptPath, content: generatedTypeScript },
    { path: generatedRustPath, content: generatedRust },
    { path: validFixturesPath, content: validFixturesJson },
    { path: invalidFixturesPath, content: invalidFixturesJson },
    { path: additiveFixturesPath, content: additiveFixturesJson },
    { path: migrationFixturesPath, content: migrationFixturesJson }
  ];
}

async function checkArtifacts(artifacts: readonly GeneratedArtifact[]): Promise<void> {
  const drifted: string[] = [];

  for (const artifact of artifacts) {
    let current: string | undefined;
    try {
      current = await readFile(artifact.path, "utf8");
    } catch {
      current = undefined;
    }

    if (current !== artifact.content) {
      drifted.push(relative(repositoryRoot, artifact.path));
    }
  }

  if (drifted.length > 0) {
    throw new Error(
      `generated contract artifacts are missing or stale:\n${drifted
        .map((path) => `- ${path}`)
        .join("\n")}\nRun pnpm contracts:generate.`
    );
  }
}

async function writeArtifacts(artifacts: readonly GeneratedArtifact[]): Promise<void> {
  for (const artifact of artifacts) {
    await mkdir(dirname(artifact.path), { recursive: true });
    await writeFile(artifact.path, artifact.content, "utf8");
  }
}

async function main(): Promise<void> {
  const checkOnly = process.argv.slice(2).includes("--check");
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "environment-reconciler-contracts-"));

  try {
    const artifacts = await buildArtifacts(temporaryDirectory);
    if (checkOnly) {
      await checkArtifacts(artifacts);
    } else {
      await writeArtifacts(artifacts);
    }
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

await main();
