import { decodeSha256 } from "../../domain/ingestion/canonical.js";
import { IngestionError } from "../../domain/ingestion/errors.js";
import type {
  IngestObjectStorePort,
  IngestObjectWrite,
  IngestObjectWriteResult
} from "../../domain/ingestion/ports.js";

export interface R2IngestObject {
  readonly customMetadata?: Readonly<Record<string, string>>;
  readonly size: number;
  readonly version: string;
}

export interface R2IngestBucket {
  head(key: string): Promise<R2IngestObject | null>;
  put(
    key: string,
    value: ArrayBuffer,
    options: {
      readonly customMetadata: Record<string, string>;
      readonly httpMetadata: { readonly contentType: string };
      readonly onlyIf: { readonly etagDoesNotMatch: string };
      readonly sha256: ArrayBuffer;
    }
  ): Promise<R2IngestObject | null>;
}

export class CloudflareR2IngestObjectStore implements IngestObjectStorePort {
  readonly #bucket: R2IngestBucket;

  constructor(bucket: R2IngestBucket) {
    this.#bucket = bucket;
  }

  async putImmutable(input: IngestObjectWrite): Promise<IngestObjectWriteResult> {
    const existing = await this.#bucket.head(input.objectKey);
    if (existing !== null) {
      return existingResult(existing, input);
    }
    const checksum = decodeSha256(input.ciphertextDigest);
    if (checksum === undefined) {
      throw new IngestionError("object_store_conflict", 409);
    }
    const stored = await this.#bucket.put(input.objectKey, copyBuffer(input.bytes), {
      customMetadata: {
        "ciphertext-digest": input.ciphertextDigest,
        "logical-digest": input.logicalDigest,
        "schema-version": "ingest-object-v1"
      },
      httpMetadata: { contentType: "application/octet-stream" },
      onlyIf: { etagDoesNotMatch: "*" },
      sha256: copyBuffer(checksum)
    });
    if (stored !== null) {
      return { objectVersionId: stored.version, stored: true };
    }

    // AnREDACTED request won the conditional put. Strongly consistent R2 HEAD
    // now resolves the winner and verifies that it is the same immutable value.
    const winner = await this.#bucket.head(input.objectKey);
    if (winner === null) {
      throw new IngestionError("object_store_unavailable", 503, true);
    }
    return existingResult(winner, input);
  }
}

export function cloudflareR2IngestObjectStore(bucket: R2Bucket): CloudflareR2IngestObjectStore {
  return new CloudflareR2IngestObjectStore(bucket);
}

function existingResult(object: R2IngestObject, input: IngestObjectWrite): IngestObjectWriteResult {
  if (
    object.size !== input.bytes.byteLength ||
    object.customMetadata?.["ciphertext-digest"] !== input.ciphertextDigest ||
    object.customMetadata["logical-digest"] !== input.logicalDigest ||
    object.customMetadata["schema-version"] !== "ingest-object-v1"
  ) {
    throw new IngestionError("object_store_conflict", 409);
  }
  return { objectVersionId: object.version, stored: false };
}

function copyBuffer(bytes: REDACTED ArrayBuffer {
  const copy = new REDACTED(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
