import type { Sha256Digest } from "@environment-reconciler/contracts";

/**
 * Canonical upload document emitted by `crates/companion::spool::UploadBatch`.
 * Field names and nullability intentionally mirror its camel-case serde form.
 */
export interface CompanionUploadEvent {
  readonly eventHash: Sha256Digest;
  readonly eventId: string;
  readonly localSequence: number;
  readonly payload: CompanionStoredEventPayload;
  readonly previousEventHash: Sha256Digest;
  readonly sourceSequence: null | string;
}

export interface CompanionStoredEventPayload {
  readonly actionType: string;
  readonly eventId: string;
  readonly payload: unknown;
  readonly redactionPolicyVersion: string;
  readonly schemaVersion: 1;
  readonly source: string;
  readonly sourceSequence: null | string;
}

export interface CompanionUploadBatch {
  readonly attemptCount: number;
  readonly batchId: string;
  readonly chainHead: Sha256Digest;
  readonly chainHeadSignature: string;
  readonly eventCount: number;
  readonly events: readonly CompanionUploadEvent[];
  readonly firstSequence: number;
  readonly lastSequence: number;
  readonly publicKey: string;
  readonly schemaVersion: 1;
  readonly signingKeyVersion: number;
}

export interface DeviceBatchPrincipal {
  readonly deviceId: string;
  readonly publicSigningKey: string;
  readonly signingKeyVersion: number;
  readonly workspaceId: string;
}

export interface IngestEventBatchCommand {
  readonly credential: string;
  readonly nowEpochMilliseconds: number;
  readonly projectId: string;
  readonly rawBody: Uint8Array;
  readonly streamId: string;
}

export interface StoredBatchRecord {
  readonly batchId: string;
  readonly chainHead: Sha256Digest;
  readonly ciphertextBytes: number;
  readonly ciphertextDigest: Sha256Digest;
  readonly deviceId: string;
  readonly firstSequence: number;
  readonly lastSequence: number;
  readonly logicalDigest: Sha256Digest;
  readonly objectKey: string;
  readonly objectVersionId: string;
  readonly projectId: string;
  readonly state: "enqueued" | "stored_not_enqueued";
  readonly streamId: string;
  readonly workspaceId: string;
}

export interface StreamChainState {
  readonly chainHead: Sha256Digest;
  readonly lastSequence: number;
}

export interface IngestQueuePointer {
  readonly batchId: string;
  readonly chainHead: Sha256Digest;
  readonly deviceId: string;
  readonly logicalDigest: Sha256Digest;
  readonly objectKey: string;
  readonly objectVersionId: string;
  readonly projectId: string;
  readonly schemaVersion: 1;
  readonly streamId: string;
  readonly type: "ingest.event_batch_stored";
  readonly workspaceId: string;
}

export interface ChainAnchorReceipt {
  readonly acceptedAtEpochMilliseconds: number;
  readonly batchId: string;
  readonly chainHead: Sha256Digest;
  readonly lastSequence: number;
  readonly receiptId: string;
  readonly signature: string;
}

export interface IngestEventBatchResult {
  readonly batchId: string;
  readonly deduplicated: boolean;
  readonly receipt: ChainAnchorReceipt;
}
