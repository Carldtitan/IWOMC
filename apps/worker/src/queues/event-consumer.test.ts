import { describe, expect, it } from "vitest";

import type {
  CompanionUploadBatch,
  IngestQueuePointer,
  StoredBatchRecord
} from "../domain/ingestion/index.js";
import {
  EventBatchConsumer,
  normalizeEventBatch,
  recoverStoredNotEnqueued
} from "./event-consumer.js";

const digest = `sha256:${"1".repeat(64)}` as const;

describe("event queue consumer", () => {
  it("normalizes the verified upload envelope without losing chain headers", () => {
    const envelope = normalizeEventBatch(pointer(), batch());

    expect(envelope).toMatchObject({
      batchId: "batch-1",
      headers: [
        {
          actionType: "package.install",
          batchEventIndex: 0,
          eventDigest: digest,
          eventId: "event-1",
          localSequence: 1,
          previousEventDigest: `sha256:${"0".repeat(64)}`,
          source: "codex",
          sourceSequence: null
        }
      ],
      payloads: [{ package: "fixture" }],
      schemaVersion: 1
    });
    expect(Object.isFrozen(envelope.headers)).toBe(true);
  });

  it("retries transient object failures without persistence or reconciliation", async () => {
    const calls: string[] = [];
    const consumer = new EventBatchConsumer({
      deadLetters: { publish: () => Promise.resolve() },
      objects: {
        readVerifiedPlaintext() {
          calls.push("object");
          return Promise.reject(new Error("temporary"));
        }
      },
      persistence: {
        persistEventBatch() {
          calls.push("persist");
          return Promise.resolve({ reconcileRequests: [] });
        }
      },
      reconcileQueue: {
        publish() {
          calls.push("reconcile");
          return Promise.resolve();
        }
      }
    });
    await consumer.handleDelivery({
      acknowledge: () => calls.push("ack"),
      attempt: 1,
      pointer: pointer(),
      retry: () => calls.push("retry")
    });

    expect(calls).toEqual(["object", "retry"]);
  });

  it("dead-letters terminal stored-content failures after the retry budget", async () => {
    const calls: string[] = [];
    const consumer = new EventBatchConsumer({
      deadLetters: {
        publish(deadLetter) {
          calls.push(`dlq:${deadLetter.failureCode}`);
          return Promise.resolve();
        }
      },
      objects: {
        readVerifiedPlaintext() {
          return Promise.resolve(new TextEncoder().encode("{}"));
        }
      },
      persistence: {
        persistEventBatch() {
          calls.push("persist");
          return Promise.resolve({ reconcileRequests: [] });
        }
      },
      reconcileQueue: { publish: () => Promise.resolve() }
    });
    await consumer.handleDelivery({
      acknowledge: () => calls.push("ack"),
      attempt: 5,
      pointer: pointer(),
      retry: () => calls.push("retry")
    });

    expect(calls).toEqual(["dlq:stored_batch_invalid", "ack"]);
  });

  it("recovers stored-not-enqueued records in publish-then-mark order", async () => {
    const calls: string[] = [];
    const recovered = await recoverStoredNotEnqueued({
      listStoredNotEnqueued(limit) {
        calls.push(`list:${String(limit)}`);
        return Promise.resolve([record()]);
      },
      markEnqueued() {
        calls.push("mark");
        return Promise.resolve();
      },
      republish() {
        calls.push("publish");
        return Promise.resolve();
      }
    });

    expect(recovered).toBe(1);
    expect(calls).toEqual(["list:100", "publish", "mark"]);
  });
});

function pointer(): IngestQueuePointer {
  return {
    batchId: "batch-1",
    chainHead: digest,
    logicalDigest: digest,
    objectKey: "ingest/object",
    objectVersionId: "version-1",
    projectId: "project-1",
    schemaVersion: 1,
    streamId: "stream-1",
    type: "ingest.event_batch_stored",
    workspaceId: "workspace-1"
  };
}

function batch(): CompanionUploadBatch {
  return {
    attemptCount: 0,
    batchId: "batch-1",
    chainHead: digest,
    chainHeadSignature: "A".repeat(88),
    eventCount: 1,
    events: [
      {
        eventHash: digest,
        eventId: "event-1",
        localSequence: 1,
        payload: {
          actionType: "package.install",
          eventId: "event-1",
          payload: { package: "fixture" },
          redactionPolicyVersion: "redaction-v1",
          schemaVersion: 1,
          source: "codex",
          sourceSequence: null
        },
        previousEventHash: `sha256:${"0".repeat(64)}`,
        sourceSequence: null
      }
    ],
    firstSequence: 1,
    lastSequence: 1,
    publicKey: "A".repeat(44),
    schemaVersion: 1,
    signingKeyVersion: 1
  };
}

function record(): StoredBatchRecord {
  return {
    batchId: "batch-1",
    chainHead: digest,
    ciphertextBytes: 10,
    ciphertextDigest: digest,
    deviceId: "device-1",
    firstSequence: 1,
    lastSequence: 1,
    logicalDigest: digest,
    objectKey: "ingest/object",
    objectVersionId: "version-1",
    projectId: "project-1",
    state: "stored_not_enqueued",
    streamId: "stream-1",
    workspaceId: "workspace-1"
  };
}
