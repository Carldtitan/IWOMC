import type { Sha256Digest } from "@environment-reconciler/contracts";

import {
  batchLogicalDigest,
  parseCompanionUploadBatch,
  verifyCompanionBatch,
  type CompanionUploadBatch,
  type IngestQueuePointer,
  type StoredBatchRecord
} from "../domain/ingestion/index.js";

export interface NormalizedEventHeader {
  readonly actionType: string;
  readonly batchEventIndex: number;
  readonly eventDigest: Sha256Digest;
  readonly eventId: string;
  readonly localSequence: number;
  readonly previousEventDigest: Sha256Digest;
  readonly source: string;
  readonly sourceSequence: null | string;
}

export interface NormalizedEventBatchEnvelope {
  readonly batchId: string;
  readonly chainHead: Sha256Digest;
  readonly headers: readonly NormalizedEventHeader[];
  readonly logicalDigest: Sha256Digest;
  readonly payloads: readonly unknown[];
  readonly projectId: string;
  readonly schemaVersion: 1;
  readonly streamId: string;
  readonly workspaceId: string;
}

export type ReconcileRequestReason =
  "manual_scan" | "material_action_stabilized" | "pr_update" | "session_end";

export interface ReconcileRequestedMessage {
  readonly checkpointId: string;
  readonly idempotencyKey: string;
  readonly kind: "checkpoint.reconcile_requested";
  readonly projectId: string;
  readonly reason: ReconcileRequestReason;
  readonly schemaVersion: 1;
  readonly sourceBatchId: string;
  readonly sourceLogicalDigest: Sha256Digest;
  readonly workspaceId: string;
}

export interface EventObjectReaderPort {
  readVerifiedPlaintext(pointer: IngestQueuePointer): Promise<Uint8Array>;
}

export interface NormalizedEventPersistencePort {
  persistEventBatch(envelope: NormalizedEventBatchEnvelope): Promise<{
    readonly reconcileRequests: readonly ReconcileRequestedMessage[];
  }>;
}

export interface ReconcileRequestQueuePort {
  publish(message: ReconcileRequestedMessage): Promise<void>;
}

export interface IngestionDeadLetter {
  readonly failureCode: string;
  readonly pointer: IngestQueuePointer;
  readonly sourceAttempt: number;
}

export interface IngestionDeadLetterPort {
  publish(deadLetter: IngestionDeadLetter): Promise<void>;
}

export interface StoredNotEnqueuedRecoveryPort {
  listStoredNotEnqueued(limit: number): Promise<readonly StoredBatchRecord[]>;
  markEnqueued(record: StoredBatchRecord): Promise<void>;
  republish(pointer: IngestQueuePointer): Promise<void>;
}

export class EventConsumerError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, retryable: boolean) {
    super("Event batch queue consumption failed.");
    this.name = "EventConsumerError";
    this.code = code;
    this.retryable = retryable;
  }
}

export class EventBatchConsumer {
  readonly #deadLetters: IngestionDeadLetterPort;
  readonly #objects: EventObjectReaderPort;
  readonly #persistence: NormalizedEventPersistencePort;
  readonly #reconcileQueue: ReconcileRequestQueuePort;

  constructor(dependencies: {
    readonly deadLetters: IngestionDeadLetterPort;
    readonly objects: EventObjectReaderPort;
    readonly persistence: NormalizedEventPersistencePort;
    readonly reconcileQueue: ReconcileRequestQueuePort;
  }) {
    this.#deadLetters = dependencies.deadLetters;
    this.#objects = dependencies.objects;
    this.#persistence = dependencies.persistence;
    this.#reconcileQueue = dependencies.reconcileQueue;
  }

  async consume(pointerValue: unknown): Promise<void> {
    const pointer = parsePointer(pointerValue);
    let plaintext: Uint8Array;
    try {
      plaintext = await this.#objects.readVerifiedPlaintext(pointer);
    } catch {
      throw new EventConsumerError("object_read_failed", true);
    }

    let batch: CompanionUploadBatch;
    try {
      batch = parseCompanionUploadBatch(plaintext, {
        maximumBodyBytes: 1024 * 1024,
        maximumEvents: 250
      });
      await verifyCompanionBatch(batch);
    } catch {
      throw new EventConsumerError("stored_batch_invalid", false);
    }
    if (
      batch.batchId !== pointer.batchId ||
      batch.chainHead !== pointer.chainHead ||
      (await batchLogicalDigest(batch)) !== pointer.logicalDigest
    ) {
      throw new EventConsumerError("pointer_content_mismatch", false);
    }

    const envelope = normalizeEventBatch(pointer, batch);
    let persisted;
    try {
      persisted = await this.#persistence.persistEventBatch(envelope);
    } catch {
      throw new EventConsumerError("normalization_persist_failed", true);
    }
    for (const request of persisted.reconcileRequests) {
      assertReconcileRequestBound(request, envelope);
      try {
        await this.#reconcileQueue.publish(request);
      } catch {
        throw new EventConsumerError("reconcile_publish_failed", true);
      }
    }
  }

  async handleDelivery(input: {
    readonly acknowledge: () => void;
    readonly attempt: number;
    readonly pointer: unknown;
    readonly retry: () => void;
  }): Promise<void> {
    try {
      await this.consume(input.pointer);
      input.acknowledge();
    } catch (error) {
      const classified =
        error instanceof EventConsumerError
          ? error
          : new EventConsumerError("unexpected_consumer_failure", true);
      if (classified.retryable && input.attempt < 5) {
        input.retry();
        return;
      }
      const pointer = parsePointer(input.pointer);
      await this.#deadLetters.publish({
        failureCode: classified.code,
        pointer,
        sourceAttempt: input.attempt
      });
      input.acknowledge();
    }
  }
}

export async function recoverStoredNotEnqueued(
  recovery: StoredNotEnqueuedRecoveryPort,
  limit = 100
): Promise<number> {
  const records = await recovery.listStoredNotEnqueued(limit);
  let recovered = 0;
  for (const record of records) {
    await recovery.republish(pointerFromRecord(record));
    await recovery.markEnqueued(record);
    recovered += 1;
  }
  return recovered;
}

export function normalizeEventBatch(
  pointer: IngestQueuePointer,
  batch: CompanionUploadBatch
): NormalizedEventBatchEnvelope {
  return Object.freeze({
    batchId: batch.batchId,
    chainHead: batch.chainHead,
    headers: Object.freeze(
      batch.events.map((event, index) =>
        Object.freeze({
          actionType: event.payload.actionType,
          batchEventIndex: index,
          eventDigest: event.eventHash,
          eventId: event.eventId,
          localSequence: event.localSequence,
          previousEventDigest: event.previousEventHash,
          source: event.payload.source,
          sourceSequence: event.sourceSequence
        })
      )
    ),
    logicalDigest: pointer.logicalDigest,
    payloads: Object.freeze(batch.events.map((event) => event.payload.payload)),
    projectId: pointer.projectId,
    schemaVersion: 1,
    streamId: pointer.streamId,
    workspaceId: pointer.workspaceId
  });
}

function parsePointer(value: unknown): IngestQueuePointer {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new EventConsumerError("invalid_pointer", false);
  }
  const pointer = value as Readonly<Record<string, unknown>>;
  if (
    pointer.schemaVersion !== 1 ||
    pointer.type !== "ingest.event_batch_stored" ||
    !isIdentifier(pointer.batchId) ||
    !isIdentifier(pointer.projectId) ||
    !isIdentifier(pointer.streamId) ||
    !isIdentifier(pointer.workspaceId) ||
    !isNonemptyString(pointer.objectKey, 1024) ||
    !isNonemptyString(pointer.objectVersionId, 256) ||
    !isDigest(pointer.chainHead) ||
    !isDigest(pointer.logicalDigest)
  ) {
    throw new EventConsumerError("invalid_pointer", false);
  }
  return Object.freeze({
    batchId: pointer.batchId,
    chainHead: pointer.chainHead,
    logicalDigest: pointer.logicalDigest,
    objectKey: pointer.objectKey,
    objectVersionId: pointer.objectVersionId,
    projectId: pointer.projectId,
    schemaVersion: 1,
    streamId: pointer.streamId,
    type: "ingest.event_batch_stored",
    workspaceId: pointer.workspaceId
  });
}

function assertReconcileRequestBound(
  request: ReconcileRequestedMessage,
  envelope: NormalizedEventBatchEnvelope
): void {
  if (
    request.workspaceId !== envelope.workspaceId ||
    request.projectId !== envelope.projectId ||
    request.sourceBatchId !== envelope.batchId ||
    request.sourceLogicalDigest !== envelope.logicalDigest ||
    !isIdentifier(request.checkpointId) ||
    !isIdentifier(request.idempotencyKey)
  ) {
    throw new EventConsumerError("invalid_reconcile_request", false);
  }
}

function pointerFromRecord(record: StoredBatchRecord): IngestQueuePointer {
  return Object.freeze({
    batchId: record.batchId,
    chainHead: record.chainHead,
    logicalDigest: record.logicalDigest,
    objectKey: record.objectKey,
    objectVersionId: record.objectVersionId,
    projectId: record.projectId,
    schemaVersion: 1,
    streamId: record.streamId,
    type: "ingest.event_batch_stored",
    workspaceId: record.workspaceId
  });
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u.test(value);
}

function isNonemptyString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function isDigest(value: unknown): value is Sha256Digest {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}
