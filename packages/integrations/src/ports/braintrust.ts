import type { ExternalOperationContext, ExternalOperationReceipt, Sha256Digest } from "./common.js";

export type TraceOperation =
  "capture" | "reconcile" | "generate-candidate" | "validate" | "publish" | "cleanup";

export type TraceOutcome = "succeeded" | "failed" | "cancelled" | "timed-out";

export interface AllowlistedTraceRecord {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly organizationPseudonym: Sha256Digest;
  readonly projectPseudonym: Sha256Digest;
  readonly runPseudonym: Sha256Digest;
  readonly operation: TraceOperation;
  readonly outcome: TraceOutcome;
  readonly startedAt: string;
  readonly durationMs: number;
  readonly attemptCount: number;
  readonly inputDigest: Sha256Digest;
  readonly outputDigest?: Sha256Digest;
  readonly failureClass?:
    "application" | "configuration" | "provider" | "policy" | "timeout" | "unknown";
  readonly modelId?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly cachedInputTokens?: number;
  readonly candidateCount?: number;
  readonly validationTargetCount?: number;
  readonly validationPassCount?: number;
  readonly estimatedCostMicros?: number;
  readonly adapterVersion: string;
  readonly policyVersion: string;
}

export interface ExportAllowlistedTracesRequest {
  readonly context: ExternalOperationContext;
  readonly projectName: string;
  readonly records: readonly AllowlistedTraceRecord[];
  readonly maxRecords: number;
  readonly maxEncodedBytes: number;
}

export interface ExportAllowlistedTracesResult {
  readonly acceptedRecords: number;
  readonly rejectedRecords: number;
  readonly batchDigest: Sha256Digest;
  readonly receipt: ExternalOperationReceipt;
}

export interface BraintrustPort {
  exportAllowlistedTraces(
    request: ExportAllowlistedTracesRequest
  ): Promise<ExportAllowlistedTracesResult>;
}
