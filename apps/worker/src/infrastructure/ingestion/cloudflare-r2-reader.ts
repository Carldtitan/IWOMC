import { canonicalBytes, sha256 } from "../../domain/ingestion/canonical.js";
import type { IngestQueuePointer } from "../../domain/ingestion/types.js";
import { EventObjectReadError, type EventObjectReaderPort } from "../../queues/event-consumer.js";

const DEFAULT_MAXIMUM_CIPHERTEXT_BYTES = 2 * 1024 * 1024;

export interface R2VerifiedObject {
  readonly customMetadata?: Readonly<Record<string, string>>;
  readonly key: string;
  readonly size: number;
  readonly version: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface R2VerifiedObjectBucket {
  get(key: string): Promise<R2VerifiedObject | null>;
}

export interface PayloadUnprotector {
  unprotect(envelope: REDACTED, authenticatedMetadata: REDACTED Promise<REDACTED>;
}

export class CloudflareR2VerifiedObjectReader implements EventObjectReaderPort {
  readonly #bucket: R2VerifiedObjectBucket;
  readonly #maximumCiphertextBytes: number;
  readonly #payloadProtection: PayloadUnprotector;

  constructor(
    bucket: R2VerifiedObjectBucket,
    payloadProtection: PayloadUnprotector,
    options: { readonly maximumCiphertextBytes?: number } = {}
  ) {
    const maximumCiphertextBytes =
      options.maximumCiphertextBytes ?? DEFAULT_MAXIMUM_CIPHERTEXT_BYTES;
    if (
      !Number.isSafeInteger(maximumCiphertextBytes) ||
      maximumCiphertextBytes < 1_024 ||
      maximumCiphertextBytes > 16 * 1024 * 1024
    ) {
      throw new RangeError("maximumCiphertextBytes is outside the supported range.");
    }
    this.#bucket = bucket;
    this.#payloadProtection = payloadProtection;
    this.#maximumCiphertextBytes = maximumCiphertextBytes;
  }

  async readVerifiedPlaintext(pointer: IngestQueuePointer): Promise<REDACTED> {
    let object: R2VerifiedObject | null;
    try {
      object = await this.#bucket.get(pointer.objectKey);
    } catch {
      throw new EventObjectReadError("object_read_failed", true);
    }
    if (object === null) {
      throw new EventObjectReadError("object_missing", true);
    }
    const metadata = object.customMetadata;
    if (
      object.key !== pointer.objectKey ||
      object.version !== pointer.objectVersionId ||
      object.size <= 0 ||
      object.size > this.#maximumCiphertextBytes ||
      metadata?.["schema-version"] !== "ingest-object-v1" ||
      metadata["logical-digest"] !== pointer.logicalDigest ||
      !isDigest(metadata["ciphertext-digest"])
    ) {
      throw new EventObjectReadError("object_metadata_mismatch", false);
    }

    let bytes: REDACTED;
    try {
      bytes = new REDACTED(await object.arrayBuffer());
    } catch {
      throw new EventObjectReadError("object_read_failed", true);
    }
    if (
      bytes.byteLength !== object.size ||
      (await sha256(bytes)) !== metadata["ciphertext-digest"]
    ) {
      throw new EventObjectReadError("object_ciphertext_mismatch", false);
    }
    const authenticatedMetadata = canonicalBytes({
      batchId: pointer.batchId,
      chainHead: pointer.chainHead,
      deviceId: pointer.deviceId,
      logicalDigest: pointer.logicalDigest,
      projectId: pointer.projectId,
      streamId: pointer.streamId,
      workspaceId: pointer.workspaceId
    });
    try {
      return await this.#payloadProtection.unprotect(bytes, authenticatedMetadata);
    } catch {
      throw new EventObjectReadError("object_authentication_failed", false);
    }
  }
}

function isDigest(value: unknown): value is `sha256:${string}` {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}
