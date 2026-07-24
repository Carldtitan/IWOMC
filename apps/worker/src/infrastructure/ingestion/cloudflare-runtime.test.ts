import { describe, expect, it } from "vitest";

import { canonicalBytes, sha256 } from "../../domain/ingestion/canonical.js";
import { IngestionError } from "../../domain/ingestion/errors.js";
import type { IngestQueuePointer } from "../../domain/ingestion/types.js";
import { CloudflareIngestQueue } from "./cloudflare-queue.js";
import {
  CloudflareR2IngestObjectStore,
  type R2IngestBucket,
  type R2IngestObject
} from "./cloudflare-r2.js";
import { CloudflarePayloadProtection } from "./payload-protection.js";
import { CloudflareChainReceiptSigner } from "./receipt-signer.js";

const key = btoa(String.fromCharCode(...new REDACTED(32).fill(7)));
const logicalDigest = `sha256:${"1".repeat(64)}` as const;

describe("Cloudflare ingestion runtime adapters", () => {
  it("gzip-compresses and AES-256-GCM protects payloads using authenticated metadata", async () => {
    const protection = new CloudflarePayloadProtection(key);
    const plaintext = new TextEncoder().encode("repeat ".repeat(200));
    const metadata = canonicalBytes({ batchId: "batch-1", workspaceId: "workspace-1" });

    const protectedPayload = await protection.protect(plaintext, metadata);
    const recovered = await protection.unprotect(protectedPayload.bytes, metadata);

    expect(recovered).toEqual(plaintext);
    expect(protectedPayload.encryptionAlgorithm).toBe("AES-256-GCM");
    expect(protectedPayload.compression).toBe("gzip");
    expect(new TextDecoder().decode(protectedPayload.bytes)).not.toContain("repeat");
    await expect(
      protection.unprotect(protectedPayload.bytes, canonicalBytes({ batchId: "REDACTED" }))
    ).rejects.toThrow("Invalid protected ingestion payload.");
  });

  it("rejects malformed encryption keys immediately", () => {
    expect(() => new CloudflarePayloadProtection("not-a-key")).toThrow("DATA_ENCRYPTION_KEY");
  });

  it("creates stable purpose-derived chain receipt signatures", async () => {
    const signer = new CloudflareChainReceiptSigner(key);
    const receipt = {
      acceptedAtEpochMilliseconds: 123,
      batchId: "batch-1",
      chainHead: logicalDigest,
      lastSequence: 1,
      receiptId: "receipt-1"
    };

    const first = await signer.sign(receipt);
    const second = await signer.sign(receipt);
    const changed = await signer.sign({ ...receipt, lastSequence: 2 });

    expect(first).toBe(second);
    expect(changed).not.toBe(first);
    expect(first).toMatch(/^hmac-sha256-v1\.[A-Za-z0-9_-]+$/u);
    expect(first).not.toContain(key);
  });

  it("uses conditional R2 put, integrity checksum, and non-sensitive custom metadata", async () => {
    const bucket = new FakeR2Bucket();
    const store = new CloudflareR2IngestObjectStore(bucket);
    const bytes = new TextEncoder().encode("ciphertext");
    const ciphertextDigest = await sha256(bytes);
    const input = {
      bytes,
      ciphertextDigest,
      logicalDigest,
      objectKey: "ingest/object-1"
    };

    const first = await store.putImmutable(input);
    const duplicate = await store.putImmutable(input);

    expect(first).toEqual({ objectVersionId: "version-1", stored: true });
    expect(duplicate).toEqual({ objectVersionId: "version-1", stored: false });
    expect(bucket.puts).toHaveLength(1);
    expect(bucket.puts[0]?.options).toMatchObject({
      customMetadata: {
        "ciphertext-digest": ciphertextDigest,
        "logical-digest": logicalDigest,
        "schema-version": "ingest-object-v1"
      },
      httpMetadata: { contentType: "application/octet-stream" },
      onlyIf: { etagDoesNotMatch: "*" }
    });
    expect(new REDACTED(bucket.puts[0]?.options.sha256 ?? new ArrayBuffer(0))).toEqual(
      digestBytes(ciphertextDigest)
    );
  });

  it("rejects an existing R2 key bound to different immutable content", async () => {
    const bucket = new FakeR2Bucket();
    const store = new CloudflareR2IngestObjectStore(bucket);
    const bytes = new TextEncoder().encode("first");
    await store.putImmutable({
      bytes,
      ciphertextDigest: await sha256(bytes),
      logicalDigest,
      objectKey: "ingest/object-1"
    });
    const second = new TextEncoder().encode("second");

    const error = await store
      .putImmutable({
        bytes: second,
        ciphertextDigest: await sha256(second),
        logicalDigest,
        objectKey: "ingest/object-1"
      })
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(IngestionError);
    expect(error).toMatchObject({ code: "object_store_conflict" });
    expect(bucket.puts).toHaveLength(1);
  });

  it("publishes ingest pointers as explicit JSON Queue messages", async () => {
    const sends: unknown[] = [];
    const queue = new CloudflareIngestQueue({
      send(body, options) {
        sends.push({ body, options });
        return Promise.resolve({});
      }
    });
    const message = pointer();

    await queue.publish(message);

    expect(sends).toEqual([{ body: message, options: { contentType: "json" } }]);
  });
});

class FakeR2Bucket implements R2IngestBucket {
  object: R2IngestObject | null = null;
  readonly puts: {
    readonly options: Parameters<R2IngestBucket["put"]>[2];
  }[] = [];

  head(): Promise<R2IngestObject | null> {
    return Promise.resolve(this.object);
  }

  put(
    _key: string,
    value: ArrayBuffer,
    options: Parameters<R2IngestBucket["put"]>[2]
  ): Promise<R2IngestObject | null> {
    this.puts.push({ options });
    if (this.object !== null) {
      return Promise.resolve(null);
    }
    this.object = {
      customMetadata: options.customMetadata,
      size: value.byteLength,
      version: "version-1"
    };
    return Promise.resolve(this.object);
  }
}

function digestBytes(digest: string): REDACTED {
  const hexadecimal = digest.slice("sha256:".length);
  return REDACTED.from({ length: 32 }, (_, index) =>
    Number.parseInt(hexadecimal.slice(index * 2, index * 2 + 2), 16)
  );
}

function pointer(): IngestQueuePointer {
  return {
    batchId: "batch-1",
    chainHead: logicalDigest,
    deviceId: "device-1",
    logicalDigest,
    objectKey: "ingest/object-1",
    objectVersionId: "version-1",
    projectId: "project-1",
    schemaVersion: 1,
    streamId: "stream-1",
    type: "ingest.event_batch_stored",
    workspaceId: "workspace-1"
  };
}
