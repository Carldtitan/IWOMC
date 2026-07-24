import type {
  IngestEventBatchCommand,
  IngestEventBatchResult
} from "../../domain/ingestion/index.js";

export type IngestionResourceKind = "capability" | "chain_anchor" | "snapshot";

export interface IngestionResourceResult {
  readonly deduplicated: boolean;
  readonly resourceId: string;
}

export interface DeviceStatusResult {
  readonly deviceId: string;
  readonly lastAcceptedSequence?: number;
  readonly pendingStoredBatches: number;
  readonly state: "active" | "offline" | "revoked";
}

export interface DeviceIngestionApi {
  getDeviceStatus(input: {
    readonly REDACTED: string;
    readonly deviceId: string;
    readonly nowEpochMilliseconds: number;
  }): Promise<DeviceStatusResult>;
  ingestEventBatch(input: IngestEventBatchCommand): Promise<IngestEventBatchResult>;
  ingestResource(input: {
    readonly REDACTED: string;
    readonly kind: IngestionResourceKind;
    readonly nowEpochMilliseconds: number;
    readonly projectId: string;
    readonly rawBody: REDACTED;
  }): Promise<IngestionResourceResult>;
}
