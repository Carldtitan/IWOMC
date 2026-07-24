import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  behaviorContractDigest,
  isProtocolDocument,
  migrateProtocolDocument,
  optimalityPolicyDigest,
  parseProtocolDocument,
  parseProtocolJson,
  ProtocolJsonSyntaxError,
  ProtocolMigrationError,
  ProtocolValidationError,
  UnsupportedProtocolVersionError,
  canonicalProtocolDigest,
  validationAttestationDigest
} from "../../packages/contracts/src/protocol.js";

interface ValidFixtureEntry {
  readonly rootType: string;
  readonly wireKind: string;
  readonly canonicalDigest: string;
  readonly document: unknown;
}

interface ValidFixtureSet {
  readonly fixtureVersion: number;
  readonly protocolSchemaVersion: number;
  readonly documentCount: number;
  readonly documents: readonly ValidFixtureEntry[];
}

interface InvalidFixtureEntry {
  readonly caseId: string;
  readonly expectedErrorCode: "unsupported_schema_version" | "invalid_value";
  readonly document: unknown;
}

interface InvalidFixtureSet {
  readonly cases: readonly InvalidFixtureEntry[];
}

interface AdditiveFixtureSet {
  readonly baseDocument: unknown;
  readonly documentWithOptionalField: unknown;
  readonly numericVersionEncodings: readonly {
    readonly encoding: string;
    readonly json: string;
    readonly canonicalDigest: string;
  }[];
  readonly timestampDocuments: readonly {
    readonly encoding: string;
    readonly canonicalDigest: string;
    readonly document: unknown;
  }[];
}

interface MigrationFixtureSet {
  readonly document: {
    readonly schemaVersion: 0;
    readonly kind: "workspace_legacy";
    readonly id: string;
    readonly displayName: string;
    readonly createdAt: string;
  };
}

interface SchemaManifest {
  readonly roots: readonly { readonly name: string }[];
}

function readFixture<T>(relativePath: string): T {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

const validFixtures = readFixture<ValidFixtureSet>("./fixtures/valid/protocol-documents.v1.json");
const invalidFixtures = readFixture<InvalidFixtureSet>(
  "./fixtures/invalid/protocol-documents.v1.json"
);
const additiveFixtures = readFixture<AdditiveFixtureSet>(
  "./fixtures/compatibility/additive-session.v1.json"
);
const migrationFixture = readFixture<MigrationFixtureSet>("./fixtures/migration/workspace.v0.json");
const schemaManifest = readFixture<SchemaManifest>(
  "../../packages/contracts/schema/v1/manifest.json"
);

describe("canonical protocol v1", () => {
  it("validates and canonically hashes every public wire payload", async () => {
    expect(validFixtures.fixtureVersion).toBe(1);
    expect(validFixtures.protocolSchemaVersion).toBe(1);
    expect(validFixtures.documents).toHaveLength(validFixtures.documentCount);
    expect(validFixtures.documentCount).toBe(67);

    const wireKinds = new Set<string>();
    const rootTypes = new Set<string>();
    for (const fixture of validFixtures.documents) {
      const parsed = parseProtocolDocument(fixture.document);
      expect(parsed).toEqual(fixture.document);
      expect(isProtocolDocument(fixture.document)).toBe(true);
      expect(await canonicalProtocolDigest(parsed)).toBe(fixture.canonicalDigest);
      wireKinds.add(fixture.wireKind);
      rootTypes.add(fixture.rootType);
    }

    expect(wireKinds.size).toBe(validFixtures.documentCount);
    expect([...rootTypes].sort()).toEqual(schemaManifest.roots.map(({ name }) => name).sort());
  });

  it("rejects every versioned negative golden fixture with the expected error class", () => {
    expect(invalidFixtures.cases).toHaveLength(7);

    for (const fixture of invalidFixtures.cases) {
      expect(isProtocolDocument(fixture.document), fixture.caseId).toBe(false);
      if (fixture.expectedErrorCode === "unsupported_schema_version") {
        expect(() => parseProtocolDocument(fixture.document), fixture.caseId).toThrow(
          UnsupportedProtocolVersionError
        );
      } else {
        expect(() => parseProtocolDocument(fixture.document), fixture.caseId).toThrow(
          ProtocolValidationError
        );
      }
    }
  });

  it("accepts an additive optional field without changing the schema version", () => {
    const base = parseProtocolDocument(additiveFixtures.baseDocument);
    const additive = parseProtocolDocument(additiveFixtures.documentWithOptionalField);

    expect(base.kind).toBe("session");
    expect(additive.kind).toBe("session");
    expect(additive).toHaveProperty("endedAt", "2026-01-02T04:05:06Z");
  });

  it("treats equivalent JSON integer encodings consistently", async () => {
    const digests = new Set<string>();
    for (const fixture of additiveFixtures.numericVersionEncodings) {
      const parsed = parseProtocolJson(fixture.json);
      const digest = await canonicalProtocolDigest(parsed);
      expect(digest, fixture.encoding).toBe(fixture.canonicalDigest);
      digests.add(digest);
    }
    expect(digests.size).toBe(1);
  });

  it("preserves offset and fractional RFC 3339 timestamp strings", async () => {
    for (const fixture of additiveFixtures.timestampDocuments) {
      const parsed = parseProtocolDocument(fixture.document);
      expect(parsed, fixture.encoding).toEqual(fixture.document);
      expect(await canonicalProtocolDigest(parsed), fixture.encoding).toBe(fixture.canonicalDigest);
    }
  });

  it("computes self-identities from explicit digest-excluding projections", async () => {
    const alternateDigest = `sha256:${"1".repeat(64)}`;

    const behavior = parseProtocolDocument(
      validFixtures.documents.find(({ wireKind }) => wireKind === "behavior_contract")?.document
    );
    if (behavior.kind !== "behavior_contract") {
      throw new Error("behavior contract fixture has the wrong discriminator");
    }
    const behaviorIdentity = await behaviorContractDigest(behavior);
    expect(await behaviorContractDigest({ ...behavior, contractDigest: alternateDigest })).toBe(
      behaviorIdentity
    );
    expect(await behaviorContractDigest({ ...behavior, version: behavior.version + 1 })).not.toBe(
      behaviorIdentity
    );

    const policy = parseProtocolDocument(
      validFixtures.documents.find(({ wireKind }) => wireKind === "optimality_policy")?.document
    );
    if (policy.kind !== "optimality_policy") {
      throw new Error("optimality policy fixture has the wrong discriminator");
    }
    const policyIdentity = await optimalityPolicyDigest(policy);
    expect(await optimalityPolicyDigest({ ...policy, policyDigest: alternateDigest })).toBe(
      policyIdentity
    );
    expect(await optimalityPolicyDigest({ ...policy, version: policy.version + 1 })).not.toBe(
      policyIdentity
    );

    const attestation = parseProtocolDocument(
      validFixtures.documents.find(({ wireKind }) => wireKind === "validation_attestation")
        ?.document
    );
    if (attestation.kind !== "validation_attestation") {
      throw new Error("validation attestation fixture has the wrong discriminator");
    }
    const attestationIdentity = await validationAttestationDigest(attestation);
    expect(
      await validationAttestationDigest({
        ...attestation,
        attestationDigest: alternateDigest
      })
    ).toBe(attestationIdentity);
    expect(
      await validationAttestationDigest({
        ...attestation,
        validatorVersion: `${attestation.validatorVersion}-changed`
      })
    ).not.toBe(attestationIdentity);
  });

  it("requires an explicit registered migration for a breaking version", () => {
    expect(() => parseProtocolDocument(migrationFixture.document)).toThrow(
      UnsupportedProtocolVersionError
    );
    expect(() => migrateProtocolDocument(migrationFixture.document, [])).toThrow(
      UnsupportedProtocolVersionError
    );

    const migrated = migrateProtocolDocument(migrationFixture.document, [
      {
        fromVersion: 0,
        toVersion: 1,
        migrate: (legacy) => ({
          schemaVersion: 1,
          kind: "workspace",
          workspaceId: legacy.id,
          name: legacy.displayName,
          createdAt: legacy.createdAt,
          retentionClass: "standard"
        })
      }
    ]);

    expect(migrated).toMatchObject({
      schemaVersion: 1,
      kind: "workspace",
      workspaceId: "workspace-legacy",
      name: "Migrated workspace"
    });

    expect(() =>
      migrateProtocolDocument(migrationFixture.document, [
        {
          fromVersion: 0,
          toVersion: 2,
          migrate: () => migrated
        }
      ])
    ).toThrow(ProtocolMigrationError);

    expect(() =>
      migrateProtocolDocument(migrationFixture.document, [
        { fromVersion: 0, toVersion: 1, migrate: () => migrated },
        { fromVersion: 0, toVersion: 2, migrate: () => migrated }
      ])
    ).toThrow(ProtocolMigrationError);
  });

  it("separates malformed JSON from a well-formed invalid protocol body", () => {
    expect(() => parseProtocolJson("{not-json")).toThrow(ProtocolJsonSyntaxError);
    expect(() => parseProtocolJson('{"schemaVersion":1,"kind":"workspace"}')).toThrow(
      ProtocolValidationError
    );
  });
});
