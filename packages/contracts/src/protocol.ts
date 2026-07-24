import canonicalize from "canonicalize";
import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import type {
  BehaviorContract,
  OptimalityPolicy,
  ProtocolDocumentV1,
  Sha256Digest,
  ValidationAttestation
} from "./generated/protocol.js";
import protocolSchema from "./generated/protocol.schema.json" with { type: "json" };

export const SUPPORTED_PROTOCOL_VERSION = 1 as const;

export interface ProtocolValidationIssue {
  readonly instancePath: string;
  readonly keyword: string;
  readonly message: string;
  readonly schemaPath: string;
}

export class UnsupportedProtocolVersionError extends Error {
  readonly version: unknown;

  constructor(version: unknown) {
    super(`Unsupported protocol schema version: ${String(version)}`);
    this.name = "UnsupportedProtocolVersionError";
    this.version = version;
  }
}

export class ProtocolValidationError extends Error {
  readonly issues: readonly ProtocolValidationIssue[];

  constructor(issues: readonly ProtocolValidationIssue[]) {
    super("Protocol document did not satisfy the canonical schema.");
    this.name = "ProtocolValidationError";
    this.issues = issues;
  }
}

export class ProtocolJsonSyntaxError extends Error {
  constructor() {
    super("Protocol body is not valid JSON.");
    this.name = "ProtocolJsonSyntaxError";
  }
}

export class ProtocolMigrationError extends Error {
  readonly fromVersion: number;
  readonly toVersion: number;

  constructor(fromVersion: number, toVersion: number, reason: string) {
    super(`Invalid protocol migration ${fromVersion} -> ${toVersion}: ${reason}`);
    this.name = "ProtocolMigrationError";
    this.fromVersion = fromVersion;
    this.toVersion = toVersion;
  }
}

export interface ProtocolMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(value: Readonly<Record<string, unknown>>): unknown;
}

const ajv = new Ajv2020({
  allErrors: true,
  allowUnionTypes: false,
  strict: true,
  validateFormats: true
});
addFormats(ajv);
const validateProtocol: ValidateFunction<ProtocolDocumentV1> =
  ajv.compile<ProtocolDocumentV1>(protocolSchema);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationIssues(errors: ErrorObject[] | null | undefined): ProtocolValidationIssue[] {
  return (errors ?? []).map((error) => ({
    instancePath: error.instancePath,
    keyword: error.keyword,
    message: error.message ?? "schema validation failed",
    schemaPath: error.schemaPath
  }));
}

function schemaVersion(value: unknown): unknown {
  return isRecord(value) ? value.schemaVersion : undefined;
}

export function isProtocolDocument(value: unknown): value is ProtocolDocumentV1 {
  return schemaVersion(value) === SUPPORTED_PROTOCOL_VERSION && validateProtocol(value);
}

export function parseProtocolDocument(value: unknown): ProtocolDocumentV1 {
  const version = schemaVersion(value);
  if (version !== SUPPORTED_PROTOCOL_VERSION) {
    throw new UnsupportedProtocolVersionError(version);
  }

  if (!validateProtocol(value)) {
    throw new ProtocolValidationError(validationIssues(validateProtocol.errors));
  }

  return value;
}

export function parseProtocolJson(json: string): ProtocolDocumentV1 {
  try {
    return parseProtocolDocument(JSON.parse(json) as unknown);
  } catch (error) {
    if (
      error instanceof ProtocolValidationError ||
      error instanceof UnsupportedProtocolVersionError
    ) {
      throw error;
    }
    throw new ProtocolJsonSyntaxError();
  }
}

export function migrateProtocolDocument(
  value: unknown,
  migrations: readonly ProtocolMigration[]
): ProtocolDocumentV1 {
  let current: unknown = value;
  const visited = new Set<number>();
  const migrationsByVersion = new Map<number, ProtocolMigration>();
  for (const migration of migrations) {
    if (
      !Number.isInteger(migration.fromVersion) ||
      !Number.isInteger(migration.toVersion) ||
      migration.fromVersion < 0 ||
      migration.toVersion <= migration.fromVersion
    ) {
      throw new ProtocolMigrationError(
        migration.fromVersion,
        migration.toVersion,
        "versions must be non-negative integers and strictly increasing"
      );
    }
    if (migrationsByVersion.has(migration.fromVersion)) {
      throw new ProtocolMigrationError(
        migration.fromVersion,
        migration.toVersion,
        "fromVersion must be unique"
      );
    }
    migrationsByVersion.set(migration.fromVersion, migration);
  }

  while (schemaVersion(current) !== SUPPORTED_PROTOCOL_VERSION) {
    const version = schemaVersion(current);
    if (!Number.isInteger(version) || typeof version !== "number" || visited.has(version)) {
      throw new UnsupportedProtocolVersionError(version);
    }

    visited.add(version);
    const migration = migrationsByVersion.get(version);
    if (migration === undefined || !isRecord(current)) {
      throw new UnsupportedProtocolVersionError(version);
    }
    const migrated = migration.migrate(current);
    const migratedVersion = schemaVersion(migrated);
    if (migratedVersion !== migration.toVersion) {
      throw new ProtocolMigrationError(
        migration.fromVersion,
        migration.toVersion,
        `migration returned schemaVersion ${String(migratedVersion)}`
      );
    }
    current = migrated;
  }

  return parseProtocolDocument(current);
}

export function canonicalProtocolJson(value: ProtocolDocumentV1): string {
  const serialized = canonicalize(value);
  if (serialized === undefined) {
    throw new TypeError("Protocol document cannot be represented as canonical JSON.");
  }
  return serialized;
}

async function canonicalObjectDigest(value: Readonly<object>): Promise<Sha256Digest> {
  const serialized = canonicalize(value);
  if (serialized === undefined) {
    throw new TypeError("Object cannot be represented as canonical JSON.");
  }
  const canonical = new TextEncoder().encode(serialized);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", canonical));
  const hexadecimal = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hexadecimal}`;
}

export function canonicalProtocolDigest(value: ProtocolDocumentV1): Promise<Sha256Digest> {
  return canonicalObjectDigest(value);
}

function withoutDigestField<T extends object>(
  value: Readonly<T>,
  digestField: string
): Record<string, unknown> {
  const projection: Record<string, unknown> = { ...value };
  delete projection[digestField];
  return projection;
}

/** Compute a behavior contract's identity over every field except `contractDigest`. */
export function behaviorContractDigest(value: Readonly<BehaviorContract>): Promise<Sha256Digest> {
  return canonicalObjectDigest(withoutDigestField(value, "contractDigest"));
}

/** Compute an optimality policy's identity over every field except `policyDigest`. */
export function optimalityPolicyDigest(value: Readonly<OptimalityPolicy>): Promise<Sha256Digest> {
  return canonicalObjectDigest(withoutDigestField(value, "policyDigest"));
}

/** Compute an attestation's identity over every field except `attestationDigest`. */
export function validationAttestationDigest(
  value: Readonly<ValidationAttestation>
): Promise<Sha256Digest> {
  return canonicalObjectDigest(withoutDigestField(value, "attestationDigest"));
}
