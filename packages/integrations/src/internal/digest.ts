import type { CanonicalJsonValue, Sha256Digest } from "../ports/common.js";

function isCanonicalArray(value: CanonicalJsonValue): value is readonly CanonicalJsonValue[] {
  return Array.isArray(value);
}

function canonicalize(value: CanonicalJsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (isCanonicalArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
    .join(",")}}`;
}

export async function sha256Text(value: string): Promise<Sha256Digest> {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return `sha256:${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function canonicalJson(value: CanonicalJsonValue): string {
  return canonicalize(value);
}

export function sha256Canonical(value: CanonicalJsonValue): Promise<Sha256Digest> {
  return sha256Text(canonicalize(value));
}
