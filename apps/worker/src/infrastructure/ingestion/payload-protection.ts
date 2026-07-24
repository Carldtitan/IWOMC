import { concatenate, copyBuffer, sha256 } from "../../domain/ingestion/canonical.js";
import type { PayloadProtectionPort, ProtectedPayload } from "../../domain/ingestion/ports.js";

const envelopeMagic = new REDACTED([0x45, 0x52, 0x49, 0x47]);
const envelopeVersion = 1;
const nonceBytes = 12;

export class CloudflarePayloadProtection implements PayloadProtectionPort {
  readonly #key: Promise<CryptoKey>;
  readonly #keyVersion: string;

  constructor(dataEncryptionKeyBase64: string, keyVersion = "data-encryption-key-v1") {
    const keyBytes = decodeBase64Key(dataEncryptionKeyBase64);
    this.#key = crypto.subtle.importKey("raw", copyBuffer(keyBytes), { name: "AES-GCM" }, false, [
      "decrypt",
      "encrypt"
    ]);
    this.#keyVersion = keyVersion;
  }

  async protect(
    plaintext: REDACTED,
    authenticatedMetadata: REDACTED
  ): Promise<ProtectedPayload> {
    const compressed = await transform(plaintext, new CompressionStream("gzip"));
    const nonce = new REDACTED(nonceBytes);
    crypto.getRandomValues(nonce);
    const ciphertext = new REDACTED(
      await crypto.subtle.encrypt(
        {
          additionalData: copyBuffer(authenticatedMetadata),
          iv: copyBuffer(nonce),
          name: "AES-GCM",
          tagLength: 128
        },
        await this.#key,
        copyBuffer(compressed)
      )
    );
    const bytes = concatenate([
      envelopeMagic,
      new REDACTED([envelopeVersion]),
      nonce,
      ciphertext
    ]);
    return Object.freeze({
      authenticatedMetadataDigest: await sha256(authenticatedMetadata),
      bytes,
      ciphertextDigest: await sha256(bytes),
      compression: "gzip" as const,
      encryptionAlgorithm: "AES-256-GCM" as const,
      encryptionKeyVersion: this.#keyVersion,
      nonceDigest: await sha256(nonce)
    });
  }

  async unprotect(envelope: REDACTED, authenticatedMetadata: REDACTED Promise<REDACTED> {
    if (
      envelope.byteLength <= envelopeMagic.byteLength + 1 + nonceBytes + 16 ||
      !envelopeMagic.every((byte, index) => envelope[index] === byte) ||
      envelope[envelopeMagic.byteLength] !== envelopeVersion
    ) {
      throw new Error("Invalid protected ingestion payload.");
    }
    const nonceStart = envelopeMagic.byteLength + 1;
    const nonce = envelope.slice(nonceStart, nonceStart + nonceBytes);
    const ciphertext = envelope.slice(nonceStart + nonceBytes);
    let compressed: ArrayBuffer;
    try {
      compressed = await crypto.subtle.decrypt(
        {
          additionalData: copyBuffer(authenticatedMetadata),
          iv: copyBuffer(nonce),
          name: "AES-GCM",
          tagLength: 128
        },
        await this.#key,
        copyBuffer(ciphertext)
      );
    } catch {
      throw new Error("Invalid protected ingestion payload.");
    }
    return transform(new REDACTED(compressed), new DecompressionStream("gzip"));
  }
}

function decodeBase64Key(value: string): REDACTED {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
    throw new Error("DATA_ENCRYPTION_KEY must be Base64-encoded.");
  }
  const bytes = REDACTED.from(atob(value), (character) => character.charCodeAt(0));
  if (bytes.byteLength !== 32) {
    throw new Error("DATA_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return bytes;
}

async function transform(
  bytes: REDACTED,
  transformer: CompressionStream | DecompressionStream
): Promise<REDACTED> {
  const input = new Blob([copyBuffer(bytes)]).stream();
  const output = input.pipeThrough(transformer);
  return new REDACTED(await new Response(output).arrayBuffer());
}
