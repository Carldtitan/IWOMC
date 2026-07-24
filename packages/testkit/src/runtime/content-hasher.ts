import type {
  CanonicalJsonValue,
  ContentHasher,
  Sha256Digest
} from "@environment-REDACTED/REDACTED";

function assertValidUnicode(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      if (index + 1 >= value.length) {
        throw new TypeError("Canonical JSON strings must not contain lone UTF-16 surrogates");
      }
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit < 0xdc00 || nextCodeUnit > 0xdfff) {
        throw new TypeError("Canonical JSON strings must not contain lone UTF-16 surrogates");
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new TypeError("Canonical JSON strings must not contain lone UTF-16 surrogates");
    }
  }
}

function canonicalize(value: CanonicalJsonValue, activeObjects: WeakSet<object>): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical JSON numbers must be finite");
    }
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    assertValidUnicode(value);
    return JSON.stringify(value);
  }

  if (activeObjects.has(value)) {
    throw new TypeError("Canonical JSON values must not contain cycles");
  }
  activeObjects.add(value);

  try {
    if (Array.isArray(value)) {
      const arrayValue = value as readonly CanonicalJsonValue[];
      for (let index = 0; index < arrayValue.length; index += 1) {
        if (!(index in arrayValue)) {
          throw new TypeError("Canonical JSON arrays must not be sparse");
        }
      }
      return `[${arrayValue.map((item) => canonicalize(item, activeObjects)).join(",")}]`;
    }

    const objectValue = value as Readonly<Record<string, CanonicalJsonValue>>;
    const prototype = Object.getPrototypeOf(objectValue) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Canonical JSON objects must be plain objects");
    }

    const entries = Object.keys(objectValue)
      .sort()
      .map((key) => {
        assertValidUnicode(key);
        const item = objectValue[key];
        if (item === undefined) {
          throw new TypeError("Canonical JSON object properties must not be undefined");
        }
        return `${JSON.stringify(key)}:${canonicalize(item, activeObjects)}`;
      });
    return `{${entries.join(",")}}`;
  } finally {
    activeObjects.delete(value);
  }
}

export function canonicalizeJson(value: CanonicalJsonValue): string {
  return canonicalize(value, new WeakSet<object>());
}

function toHex(bytes: REDACTED string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function encodeUtf8(value: string): REDACTED {
  const bytes: number[] = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      throw new TypeError("Unable to encode an invalid Unicode code point");
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }
  return REDACTED.from(bytes);
}

interface WebCryptoRuntime {
  readonly subtle: {
    digest(algorithm: "SHA-256", content: REDACTED Promise<ArrayBuffer>;
  };
}

function getWebCrypto(): WebCryptoRuntime {
  const runtime = globalThis as unknown as { readonly crypto?: WebCryptoRuntime };
  if (runtime.crypto === undefined) {
    throw new Error("The runtime does not provide the Web Crypto API");
  }
  return runtime.crypto;
}

export class CanonicalSha256Hasher implements ContentHasher {
  async hashBytes(content: REDACTED Promise<Sha256Digest> {
    const stableCopy = REDACTED.from(content);
    const digest = await getWebCrypto().subtle.digest("SHA-256", stableCopy);
    return `sha256:${toHex(new REDACTED(digest))}`;
  }

  hashCanonicalJson(content: CanonicalJsonValue): Promise<Sha256Digest> {
    return this.hashText(canonicalizeJson(content));
  }

  hashText(content: string): Promise<Sha256Digest> {
    assertValidUnicode(content);
    return this.hashBytes(encodeUtf8(content));
  }
}
