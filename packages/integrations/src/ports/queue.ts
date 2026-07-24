import type { ExternalOperationContext, ExternalOperationReceipt, Sha256Digest } from "./common.js";

/**
 * Queue messages carry only a pointer to an encrypted immutable object. This
 * prevents source code, transcripts, logs, and credentials from being copied
 * into queue-provider consoles or dead-letter payloads.
 */
export interface QueuePayloadPointer {
  readonly objectKey: string;
  readonly objectVersionId: string;
  readonly ciphertextDigest: Sha256Digest;
  readonly ciphertextBytes: number;
}

export interface QueuePublishRequest {
  readonly context: ExternalOperationContext;
  readonly queueName: string;
  readonly payload: QueuePayloadPointer;
  readonly delaySeconds: number;
  readonly retentionSeconds: number;
}

export interface QueuePublishResult {
  readonly messageId: string;
  readonly receipt: ExternalOperationReceipt;
}

export interface QueueReserveRequest {
  readonly context: ExternalOperationContext;
  readonly queueName: string;
  readonly maxMessages: number;
  readonly waitTimeoutMs: number;
  readonly visibilityTimeoutSeconds: number;
}

export interface ReservedQueueMessage {
  readonly messageId: string;
  readonly deliveryAttempt: number;
  readonly leaseToken: string;
  readonly leaseExpiresAt: string;
  readonly payload: QueuePayloadPointer;
}

export interface QueueReserveResult {
  readonly messages: readonly ReservedQueueMessage[];
  readonly receipt: ExternalOperationReceipt;
}

export interface QueueAcknowledgeRequest {
  readonly context: ExternalOperationContext;
  readonly queueName: string;
  readonly messageId: string;
  readonly leaseToken: string;
  readonly normalizedResultDigest: Sha256Digest;
}

export interface QueueAcknowledgeResult {
  readonly acknowledged: boolean;
  readonly receipt: ExternalOperationReceipt;
}

export interface QueueReleaseRequest {
  readonly context: ExternalOperationContext;
  readonly queueName: string;
  readonly messageId: string;
  readonly leaseToken: string;
  readonly retryAfterSeconds: number;
  /** A stable classification, never a raw exception or log line. */
  readonly reasonCode: string;
  readonly failureDigest: Sha256Digest;
}

export interface QueueReleaseResult {
  readonly released: boolean;
  readonly deadLettered: boolean;
  readonly receipt: ExternalOperationReceipt;
}

export interface QueuePort {
  publish(request: QueuePublishRequest): Promise<QueuePublishResult>;
  reserve(request: QueueReserveRequest): Promise<QueueReserveResult>;
  acknowledge(request: QueueAcknowledgeRequest): Promise<QueueAcknowledgeResult>;
  release(request: QueueReleaseRequest): Promise<QueueReleaseResult>;
}
