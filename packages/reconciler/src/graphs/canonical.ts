import type { EvidenceAttribute, ResourceIdentity, SourceLocation } from "./types.js";

type CanonicalValue =
  | boolean
  | null
  | number
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

export function stableId(prefix: string, value: CanonicalValue): string {
  const canonical = canonicalJson(value);
  let hash = 0xcbf29ce484222325n;
  for (const character of `${prefix}:${canonical}`) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `${prefix}_${hash.toString(16).padStart(16, "0")}`;
}

export function canonicalJson(value: CanonicalValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (isCanonicalArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort(compareText)
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalJson(
          (value as Readonly<Record<string, CanonicalValue>>)[key] ?? null
        )}`
    )
    .join(",")}}`;
}

export function canonicalIdentity(identity: ResourceIdentity): ResourceIdentity {
  return Object.freeze({
    ...(identity.architecture === undefined
      ? {}
      : { architecture: identity.architecture.trim().toLowerCase() }),
    ecosystem: identity.ecosystem.trim().toLowerCase(),
    ...(identity.layerId === undefined ? {} : { layerId: identity.layerId }),
    normalizedName: normalizeResourceName(identity.ecosystem, identity.normalizedName),
    ...(identity.packageSource === undefined ? {} : { packageSource: identity.packageSource }),
    ...(identity.platform === undefined
      ? {}
      : { platform: identity.platform.trim().toLowerCase() }),
    ...(identity.realmId === undefined ? {} : { realmId: identity.realmId }),
    ...(identity.scope === undefined ? {} : { scope: identity.scope }),
    ...(identity.versionOrConstraint === undefined
      ? {}
      : { versionOrConstraint: identity.versionOrConstraint })
  });
}

export function resourceMatchKey(identity: ResourceIdentity): string {
  return canonicalJson({
    architecture: identity.architecture ?? null,
    ecosystem: identity.ecosystem,
    layerId: identity.layerId ?? null,
    normalizedName: identity.normalizedName,
    packageSource: identity.packageSource ?? null,
    platform: identity.platform ?? null,
    realmId: identity.realmId ?? null,
    scope: identity.scope ?? null
  });
}

export function identityCanonicalValue(identity: ResourceIdentity): CanonicalValue {
  return {
    architecture: identity.architecture ?? null,
    ecosystem: identity.ecosystem,
    layerId: identity.layerId ?? null,
    normalizedName: identity.normalizedName,
    packageSource: identity.packageSource ?? null,
    platform: identity.platform ?? null,
    realmId: identity.realmId ?? null,
    scope: identity.scope ?? null,
    versionOrConstraint: identity.versionOrConstraint ?? null
  };
}

export function sourceLocationCanonicalValue(location: SourceLocation | undefined): CanonicalValue {
  return {
    column: location?.column ?? null,
    endColumn: location?.endColumn ?? null,
    endLine: location?.endLine ?? null,
    line: location?.line ?? null,
    path: location?.path ?? ""
  };
}

export function attributesCanonicalValue(
  attributes: Readonly<Record<string, EvidenceAttribute>> | undefined
): CanonicalValue {
  if (attributes === undefined) {
    return {};
  }
  const result: Record<string, CanonicalValue> = {};
  for (const key of Object.keys(attributes).sort(compareText)) {
    const value = attributes[key];
    if (value !== undefined) {
      result[key] = isEvidenceAttributeArray(value) ? [...value].sort(compareText) : value;
    }
  }
  return result;
}

export function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en");
}

function normalizeResourceName(ecosystem: string, name: string): string {
  const trimmed = name.trim();
  return ecosystem.trim().toLowerCase() === "npm" ? trimmed.toLowerCase() : trimmed;
}

function isCanonicalArray(value: CanonicalValue): value is readonly CanonicalValue[] {
  return Array.isArray(value);
}

export function isEvidenceAttributeArray(value: EvidenceAttribute): value is readonly string[] {
  return typeof value === "object";
}
