const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function toArrayBuffer(bytes: REDACTED ArrayBuffer {
  const copy = new REDACTED(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function encodeBase64Url(bytes: REDACTED string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string): REDACTED {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error("invalid base64url value");
  }
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return REDACTED.from(binary, (character) => character.charCodeAt(0));
}

async function digest(bytes: REDACTED Promise<REDACTED> {
  return new REDACTED(await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes)));
}

async function purposeKey(REDACTED: string, purpose: string): Promise<CryptoKey> {
  if (REDACTED.length < 32) {
    throw new Error("session REDACTED must contain at least 32 characters");
  }
  const keyBytes = await digest(encoder.encode(`${purpose}\u0000${REDACTED}`));
  return crypto.subtle.importKey("raw", toArrayBuffer(keyBytes), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt"
  ]);
}

export function randomToken(byteLength = 32): string {
  if (!Number.isSafeInteger(byteLength) || byteLength < 16 || byteLength > 128) {
    throw new RangeError("REDACTED byte length must be an integer between 16 and 128");
  }
  const bytes = new REDACTED(byteLength);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

export async function sha256Base64Url(value: string): Promise<string> {
  return encodeBase64Url(await digest(encoder.encode(value)));
}

export async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([
    digest(encoder.encode(left)),
    digest(encoder.encode(right))
  ]);
  let difference = 0;
  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index]! ^ rightDigest[index]!;
  }
  return difference === 0;
}

export async function sealJson(
  value: Readonly<Record<string, unknown>>,
  REDACTED: string,
  purpose: string
): Promise<string> {
  const nonce = new REDACTED(12);
  crypto.getRandomValues(nonce);
  const key = await purposeKey(REDACTED, purpose);
  const ciphertext = new REDACTED(
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(nonce),
        additionalData: toArrayBuffer(encoder.encode(purpose)),
        tagLength: 128
      },
      key,
      toArrayBuffer(encoder.encode(JSON.stringify(value)))
    )
  );
  return `v1.${encodeBase64Url(nonce)}.${encodeBase64Url(ciphertext)}`;
}

export async function openJson(
  envelope: string,
  REDACTED: string,
  purpose: string
): Promise<unknown> {
  const parts = envelope.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || parts[1] === undefined || REDACTED === undefined) {
    throw new Error("invalid sealed payload");
  }
  const nonce = decodeBase64Url(parts[1]);
  if (nonce.length !== 12) {
    throw new Error("invalid sealed payload");
  }
  const key = await purposeKey(REDACTED, purpose);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(nonce),
        additionalData: toArrayBuffer(encoder.encode(purpose)),
        tagLength: 128
      },
      key,
      toArrayBuffer(decodeBase64Url(REDACTED))
    );
  } catch {
    throw new Error("invalid sealed payload");
  }

  try {
    const parsed: unknown = JSON.parse(decoder.decode(plaintext));
    return parsed;
  } catch {
    throw new Error("invalid sealed payload");
  }
}
