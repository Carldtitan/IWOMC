import { canonicalBytes, copyBuffer } from "../../domain/ingestion/canonical.js";
import type { ChainReceiptSignerPort } from "../../domain/ingestion/ports.js";
import type { ChainAnchorReceipt } from "../../domain/ingestion/types.js";

const receiptPurpose = new TextEncoder().encode("environment-reconciler:chain-receipt:v1");

export class CloudflareChainReceiptSigner implements ChainReceiptSignerPort {
  readonly #key: Promise<CryptoKey>;

  constructor(dataEncryptionKeyBase64: string) {
    const keyBytes = decodeBase64Key(dataEncryptionKeyBase64);
    this.#key = deriveReceiptKey(keyBytes);
  }

  async sign(unsignedReceipt: Omit<ChainAnchorReceipt, "signature">): Promise<string> {
    const signature = new Uint8Array(
      await crypto.subtle.sign("HMAC", await this.#key, copyBuffer(canonicalBytes(unsignedReceipt)))
    );
    return `hmac-sha256-v1.${base64Url(signature)}`;
  }
}

async function deriveReceiptKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", copyBuffer(keyBytes), "HKDF", false, [
    "deriveKey"
  ]);
  return crypto.subtle.deriveKey(
    {
      hash: "SHA-256",
      info: copyBuffer(receiptPurpose),
      name: "HKDF",
      salt: new ArrayBuffer(0)
    },
    baseKey,
    { hash: "SHA-256", length: 256, name: "HMAC" },
    false,
    ["sign", "verify"]
  );
}

function decodeBase64Key(value: string): Uint8Array {
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Error("DATA_ENCRYPTION_KEY must be valid Base64.");
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytes.byteLength !== 32) {
    throw new Error("DATA_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return bytes;
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}
