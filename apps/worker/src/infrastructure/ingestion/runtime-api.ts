import type { DeviceIngestionApi } from "../../api/ingestion/index.js";
import { IngestionError, IngestionService } from "../../domain/ingestion/index.js";
import { CloudflareIngestQueue } from "./cloudflare-queue.js";
import { CloudflareR2IngestObjectStore } from "./cloudflare-r2.js";
import {
  HyperdrivePostgresConnectionFactory,
  type HyperdriveBinding
} from "./hyperdrive-pg-client.js";
import { HyperdrivePostgresIngestionDriver } from "./hyperdrive-postgres.js";
import { CloudflarePayloadProtection } from "./payload-protection.js";
import { CloudflareChainReceiptSigner } from "./receipt-signer.js";

export interface CloudflareIngestionBindings {
  readonly DATABASE: HyperdriveBinding;
  readonly DATA_ENCRYPTION_KEY: string;
  readonly INGEST_QUEUE: Queue;
  readonly OBJECTS: R2Bucket;
}

/**
 * Composes the deployed ingestion path from real Cloudflare bindings. The
 * object is intentionally request-scoped: Hyperdrive owns pooling and the
 * driver opens a short-lived PostgreSQL client for each database unit of work.
 */
export function createCloudflareIngestionApi(
  environment: CloudflareIngestionBindings
): DeviceIngestionApi {
  const metadata = new HyperdrivePostgresIngestionDriver(
    new HyperdrivePostgresConnectionFactory(environment.DATABASE.connectionString)
  );
  const service = new IngestionService({
    authenticator: metadata,
    authorizer: metadata,
    metadata,
    objectStore: new CloudflareR2IngestObjectStore(environment.OBJECTS),
    payloadProtection: new CloudflarePayloadProtection(environment.DATA_ENCRYPTION_KEY),
    queue: new CloudflareIngestQueue(environment.INGEST_QUEUE),
    receiptSigner: new CloudflareChainReceiptSigner(environment.DATA_ENCRYPTION_KEY)
  });

  return {
    getDeviceStatus: (input) => metadata.getDeviceStatus(input),
    ingestEventBatch: (input) => service.ingestEventBatch(input),
    ingestResource: () => Promise.reject(new IngestionError("metadata_unavailable", 503, true))
  };
}
