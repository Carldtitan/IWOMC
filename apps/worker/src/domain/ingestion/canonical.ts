import type { Sha256Digest } from "@environment-reconciler/contracts";

const encoder = new TextEncoder();

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Non-finite numbers cannot be canonicalized");
    }
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  throw new TypeError("Unsupported canonical JSON value");
}

export function canonicalBytes(value: unknown): Uint8Array {
  return encoder.encode(canonicalJson(value));
}

export async function sha256(bytes: Uint8Array): Promise<Sha256Digest> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", copyBuffer(bytes)));
  return `sha256:${toHex(digest)}`;
}

export function decodeSha256(value: string): Uint8Array | undefined {
  if (!/^sha256:[0-9a-f]{64}$/u.test(value)) {
    return undefined;
  }
  const hexadecimal = value.slice("sha256:".length);
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hexadecimal.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function copyBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function concatenate(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((size, part) => size + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

export function unsignedBigEndian(value: number): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value), false);
  return bytes;
}

export function lengthPrefixed(value: Uint8Array): Uint8Array {
  return concatenate([unsignedBigEndian(value.byteLength), value]);
}

export function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
