export type IngestionErrorCode =
  | "batch_conflict"
  | "batch_too_large"
  | "device_key_mismatch"
  | "invalid_batch"
  | "invalid_chain"
  | "invalid_signature"
  | "metadata_unavailable"
  | "object_store_conflict"
  | "object_store_unavailable"
  | "out_of_order"
  | "project_forbidden"
  | "queue_unavailable"
  | "secret_detected"
  | "unauthorized_device";

const safeMessages: Readonly<Record<IngestionErrorCode, string>> = Object.freeze({
  batch_conflict: "The batch identifier is already bound to different content.",
  batch_too_large: "The upload batch exceeds the permitted size.",
  device_key_mismatch: "The batch signing key is not authorized for this device.",
  invalid_batch: "The upload batch is invalid.",
  invalid_chain: "The upload batch hash chain is invalid.",
  invalid_signature: "The upload batch signature is invalid.",
  metadata_unavailable: "Ingestion metadata is temporarily unavailable.",
  object_store_conflict: "The immutable object key is bound to different content.",
  object_store_unavailable: "Durable object storage is temporarily unavailable.",
  out_of_order: "The upload batch does not continue the accepted stream.",
  project_forbidden: "The device is not authorized for this project.",
  queue_unavailable: "The stored batch is awaiting queue delivery.",
  secret_detected: "The upload batch failed the server-side secret guard.",
  unauthorized_device: "The device credential is invalid."
});

export class IngestionError extends Error {
  readonly code: IngestionErrorCode;
  readonly retryable: boolean;
  readonly status: 400 | 401 | 403 | 409 | 413 | 503;

  constructor(code: IngestionErrorCode, status: IngestionError["status"], retryable = false) {
    super(safeMessages[code]);
    this.name = "IngestionError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}
