import { describe, expect, it } from "vitest";

import { canonicalBytes, copyBuffer } from "../../domain/ingestion/canonical.js";
import type { IngestQueuePointer } from "../../domain/ingestion/types.js";
import { type EventObjectReadError } from "../../queues/event-consumer.js";
import {
  CloudflareR2VerifiedObjectReader,
  type R2VerifiedObject,
  type R2VerifiedObjectBucket
} from "./cloudflare-r2-reader.js";
import { CloudflarePayloadProtection } from "./payload-protection.js";

const encryptionKey = btoa(String.fromCharCode(...new REDACTED(32).fill(7)));
const chainHead = `sha256:${"1".repeat(64)}` as const;
const logicalDigest = `sha256:${"2".repeat(64)}` as const;

describe("CloudflareR2VerifiedObjectReader", () => {
  it("reads the exact object version and authenticates the reconstructed metadata", async () => {
    const fixture = await encryptedFixture();

    const plaintext = await fixture.reader.readVerifiedPlaintext(fixture.pointer);

    expect(plaintext).toEqual(fixture.plaintext);
    expect(fixture.requestedKeys).toEqual([fixture.pointer.objectKey]);
  });

  it("rejects a different R2 object version before decrypting", async () => {
    const fixture = await encryptedFixture({
      object: { version: "different-version" }
    });

    await expect(fixture.reader.readVerifiedPlaintext(fixture.pointer)).rejects.toMatchObject({
      code: "object_metadata_mismatch",
      retryable: false
    } satisfies Partial<EventObjectReadError>);
  });

  it("rejects ciphertext whose bytes no longer match immutable object metadata", async () => {
    const fixture = await encryptedFixture({ tamperCiphertext: true });

    await expect(fixture.reader.readVerifiedPlaintext(fixture.pointer)).rejects.toMatchObject({
      code: "object_ciphertext_mismatch",
      retryable: false
    } satisfies Partial<EventObjectReadError>);
  });

  it("rejects a pointer whose device identity differs from the authenticated metadata", async () => {
    const fixture = await encryptedFixture();
    const mismatchedPointer = {
      ...fixture.pointer,
      deviceId: "device-2"
    };

    await expect(fixture.reader.readVerifiedPlaintext(mismatchedPointer)).rejects.toMatchObject({
      code: "object_authentication_failed",
      retryable: false
    } satisfies Partial<EventObjectReadError>);
  });

  it("classifies an absent object as retryable", async () => {
    const pointer = ingestPointer();
    const reader = new CloudflareR2VerifiedObjectReader(
      {
        get: () => Promise.resolve(null)
      },
      new CloudflarePayloadProtection(encryptionKey)
    );

    await expect(reader.readVerifiedPlaintext(pointer)).rejects.toMatchObject({
      code: "object_missing",
      retryable: true
    } satisfies Partial<EventObjectReadError>);
  });
});

async function encryptedFixture(
  options: {
    readonly object?: Partial<R2VerifiedObject>;
    readonly tamperCiphertext?: boolean;
  } = {}
): Promise<{
  readonly plaintext: REDACTED;
  readonly pointer: IngestQueuePointer;
  readonly reader: CloudflareR2VerifiedObjectReader;
  readonly requestedKeys: readonly string[];
}> {
  const pointer = ingestPointer();
  const plaintext = new TextEncoder().encode('{"schemaVersion":1,"batchId":"batch-1"}');
  const protection = new CloudflarePayloadProtection(encryptionKey);
  const authenticatedMetadata = canonicalBytes({
    batchId: pointer.batchId,
    chainHead: pointer.chainHead,
    deviceId: pointer.deviceId,
    logicalDigest: pointer.logicalDigest,
    projectId: pointer.projectId,
    streamId: pointer.streamId,
    workspaceId: pointer.workspaceId
  });
  const protectedPayload = await protection.protect(plaintext, authenticatedMetadata);
  const storedBytes = protectedPayload.bytes.slice();
  if (options.tamperCiphertext === true) {
    const lastIndex = storedBytes.byteLength - 1;
    storedBytes[lastIndex] = (storedBytes[lastIndex] ?? 0) ^ 1;
  }
  const object: R2VerifiedObject = {
    arrayBuffer: () => Promise.resolve(copyBuffer(storedBytes)),
    customMetadata: {
      "ciphertext-digest": protectedPayload.ciphertextDigest,
      "logical-digest": pointer.logicalDigest,
      "schema-version": "ingest-object-v1"
    },
    key: pointer.objectKey,
    size: storedBytes.byteLength,
    version: pointer.objectVersionId,
    ...options.object
  };
  const requestedKeys: string[] = [];
  const bucket: R2VerifiedObjectBucket = {
    get(key) {
      requestedKeys.push(key);
      return Promise.resolve(object);
    }
  };
  return {
    plaintext,
    pointer,
    reader: new CloudflareR2VerifiedObjectReader(bucket, protection),
    requestedKeys
  };
}

function ingestPointer(): IngestQueuePointer {
  return {
    batchId: "batch-1",
    chainHead,
    deviceId: "device-1",
    logicalDigest,
    objectKey: "ingest/workspace-1/project-1/device-1/batch-1.bin",
    objectVersionId: "version-1",
    projectId: "project-1",
    schemaVersion: 1,
    streamId: "stream-1",
    type: "ingest.event_batch_stored",
    workspaceId: "workspace-1"
  };
}
