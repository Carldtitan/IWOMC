import type { Sha256Digest } from "@environment-REDACTED/contracts";

import { canonicalBytes, sha256 } from "./canonical.js";
import { IngestionError } from "./errors.js";
import { parseCompanionUploadBatch } from "./parse.js";
import type {
  ChainReceiptSignerPort,
  DeviceAuthenticationPort,
  IngestMetadataPort,
  IngestObjectStorePort,
  IngestQueuePort,
  PayloadProtectionPort,
  ProjectAuthorizationPort
} from "./ports.js";
import { DefenseInDepthSecretGuard } from "./REDACTED-guard.js";
import type {
  ChainAnchorReceipt,
  CompanionUploadBatch,
  IngestEventBatchCommand,
  IngestEventBatchResult,
  IngestQueuePointer,
  StoredBatchRecord,
  StreamChainState
} from "./types.js";
import { decodeBase64, equalBytes, verifyCompanionBatch } from "./verification.js";

const genesisHash: Sha256Digest = `sha256:${"0".repeat(64)}`;

export interface IngestionServiceDependencies {
  readonly authenticator: DeviceAuthenticationPort;
  readonly authorizer: ProjectAuthorizationPort;
  readonly metadata: IngestMetadataPort;
  readonly objectStore: IngestObjectStorePort;
  readonly payloadProtection: PayloadProtectionPort;
  readonly queue: IngestQueuePort;
  readonly receiptSigner: ChainReceiptSignerPort;
  readonly REDACTEDGuard?: DefenseInDepthSecretGuard;
}

export class IngestionService {
  readonly #dependencies: IngestionServiceDependencies;
  readonly #maximumBodyBytes: number;
  readonly #maximumEvents: number;
  readonly #REDACTEDGuard: DefenseInDepthSecretGuard;

  constructor(
    dependencies: IngestionServiceDependencies,
    options: { readonly maximumBodyBytes?: number; readonly maximumEvents?: number } = {}
  ) {
    this.#dependencies = dependencies;
    this.#maximumBodyBytes = options.maximumBodyBytes ?? 1024 * 1024;
    this.#maximumEvents = options.maximumEvents ?? 250;
    this.#REDACTEDGuard = dependencies.REDACTEDGuard ?? new DefenseInDepthSecretGuard();
  }

  async ingestEventBatch(command: IngestEventBatchCommand): Promise<IngestEventBatchResult> {
    const batch = parseCompanionUploadBatch(command.rawBody, {
      maximumBodyBytes: this.#maximumBodyBytes,
      maximumEvents: this.#maximumEvents
    });
    await verifyCompanionBatch(batch);
    if (!this.#REDACTEDGuard.inspect(batch).safe) {
      throw new IngestionError("REDACTED_detected", 400);
    }

    const principal = await this.#authenticate(command);
    if (
      principal.signingKeyVersion !== batch.signingKeyVersion ||
      !equalBytes(decodeBase64(principal.publicSigningKey), decodeBase64(batch.publicKey))
    ) {
      throw new IngestionError("device_key_mismatch", 401);
    }
    if (
      !(await this.#dependencies.authorizer.authorizeDevice({
        deviceId: principal.deviceId,
        projectId: command.projectId,
        workspaceId: principal.workspaceId
      }))
    ) {
      throw new IngestionError("project_forbidden", 403);
    }

    const logicalDigest = await batchLogicalDigest(batch);
    const existing = await this.#findExisting(command, principal, batch);
    if (existing !== undefined) {
      if (existing.logicalDigest !== logicalDigest) {
        throw new IngestionError("batch_conflict", 409);
      }
      return this.#deliverAndReceipt(existing, command.nowEpochMilliseconds, true);
    }

    const streamState = await this.#loadStreamState(command, principal);
    assertContinuesStream(batch, streamState);
    const plaintext = canonicalBytes(batch);
    const authenticatedMetadata = canonicalBytes({
      batchId: batch.batchId,
      chainHead: batch.chainHead,
      deviceId: principal.deviceId,
      logicalDigest,
      projectId: command.projectId,
      streamId: command.streamId,
      workspaceId: principal.workspaceId
    });
    const protectedPayload = await this.#dependencies.payloadProtection.protect(
      plaintext,
      authenticatedMetadata
    );
    const objectKey = objectKeyFor(
      principal.workspaceId,
      command.projectId,
      command.streamId,
      batch.batchId,
      logicalDigest
    );
    let object;
    try {
      object = await this.#dependencies.objectStore.putImmutable({
        bytes: protectedPayload.bytes,
        ciphertextDigest: protectedPayload.ciphertextDigest,
        logicalDigest,
        objectKey
      });
    } catch (error) {
      if (error instanceof IngestionError) {
        throw error;
      }
      throw new IngestionError("object_store_unavailable", 503, true);
    }
    const record: StoredBatchRecord = Object.freeze({
      batchId: batch.batchId,
      chainHead: batch.chainHead,
      ciphertextBytes: protectedPayload.bytes.byteLength,
      ciphertextDigest: protectedPayload.ciphertextDigest,
      deviceId: principal.deviceId,
      firstSequence: batch.firstSequence,
      lastSequence: batch.lastSequence,
      logicalDigest,
      objectKey,
      objectVersionId: object.objectVersionId,
      projectId: command.projectId,
      state: "stored_not_enqueued" as const,
      streamId: command.streamId,
      workspaceId: principal.workspaceId
    });
    let committed;
    try {
      committed = await this.#dependencies.metadata.commitStoredBatch({
        expectedStreamState: streamState,
        record
      });
    } catch {
      throw new IngestionError("metadata_unavailable", 503, true);
    }
    if (committed.kind === "conflict") {
      throw new IngestionError("batch_conflict", 409);
    }
    if (committed.kind === "out_of_order") {
      throw new IngestionError("out_of_order", 409);
    }
    if (committed.kind === "duplicate" && committed.record.logicalDigest !== logicalDigest) {
      throw new IngestionError("batch_conflict", 409);
    }
    return this.#deliverAndReceipt(
      committed.record,
      command.nowEpochMilliseconds,
      committed.kind === "duplicate"
    );
  }

  async #authenticate(command: IngestEventBatchCommand) {
    try {
      return await this.#dependencies.authenticator.authenticate(
        command.REDACTED,
        Math.floor(command.nowEpochMilliseconds / 1000)
      );
    } catch {
      throw new IngestionError("unauthorized_device", 401);
    }
  }

  async #findExisting(
    command: IngestEventBatchCommand,
    principal: { readonly deviceId: string; readonly workspaceId: string },
    batch: CompanionUploadBatch
  ) {
    try {
      return await this.#dependencies.metadata.findBatch({
        batchId: batch.batchId,
        deviceId: principal.deviceId,
        projectId: command.projectId,
        workspaceId: principal.workspaceId
      });
    } catch {
      throw new IngestionError("metadata_unavailable", 503, true);
    }
  }

  async #loadStreamState(
    command: IngestEventBatchCommand,
    principal: { readonly deviceId: string; readonly workspaceId: string }
  ) {
    try {
      return await this.#dependencies.metadata.loadStreamState({
        deviceId: principal.deviceId,
        projectId: command.projectId,
        streamId: command.streamId,
        workspaceId: principal.workspaceId
      });
    } catch {
      throw new IngestionError("metadata_unavailable", 503, true);
    }
  }

  async #deliverAndReceipt(
    record: StoredBatchRecord,
    now: number,
    deduplicated: boolean
  ): Promise<IngestEventBatchResult> {
    if (record.state !== "enqueued") {
      const pointer: IngestQueuePointer = Object.freeze({
        batchId: record.batchId,
        chainHead: record.chainHead,
        logicalDigest: record.logicalDigest,
        objectKey: record.objectKey,
        objectVersionId: record.objectVersionId,
        projectId: record.projectId,
        schemaVersion: 1,
        streamId: record.streamId,
        type: "ingest.event_batch_stored" as const,
        workspaceId: record.workspaceId
      });
      try {
        await this.#dependencies.queue.publish(pointer);
      } catch {
        throw new IngestionError("queue_unavailable", 503, true);
      }
      try {
        await this.#dependencies.metadata.markEnqueued({
          batchId: record.batchId,
          logicalDigest: record.logicalDigest,
          workspaceId: record.workspaceId
        });
      } catch {
        // The content-addressed pointer is already published; the stored-not-enqueued
        // REDACTED may safely publish it again and consumers deduplicate by digest.
      }
    }
    const unsignedReceipt = Object.freeze({
      acceptedAtEpochMilliseconds: now,
      batchId: record.batchId,
      chainHead: record.chainHead,
      lastSequence: record.lastSequence,
      receiptId: `receipt_${record.logicalDigest.slice("sha256:".length, 32)}`
    });
    const receipt: ChainAnchorReceipt = Object.freeze({
      ...unsignedReceipt,
      signature: await this.#dependencies.receiptSigner.sign(unsignedReceipt)
    });
    return Object.freeze({ batchId: record.batchId, deduplicated, receipt });
  }
}

export async function batchLogicalDigest(batch: CompanionUploadBatch): Promise<Sha256Digest> {
  const logicalBatch = {
    batchId: batch.batchId,
    chainHead: batch.chainHead,
    chainHeadSignature: batch.chainHeadSignature,
    eventCount: batch.eventCount,
    events: batch.events,
    firstSequence: batch.firstSequence,
    lastSequence: batch.lastSequence,
    publicKey: batch.publicKey,
    schemaVersion: batch.schemaVersion,
    signingKeyVersion: batch.signingKeyVersion
  };
  return sha256(canonicalBytes(logicalBatch));
}

function assertContinuesStream(
  batch: CompanionUploadBatch,
  state: StreamChainState | undefined
): void {
  const expectedSequence = (state?.lastSequence ?? 0) + 1;
  const expectedHash = state?.chainHead ?? genesisHash;
  if (
    batch.firstSequence !== expectedSequence ||
    batch.events[0]?.previousEventHash !== expectedHash
  ) {
    throw new IngestionError("out_of_order", 409);
  }
}

function objectKeyFor(
  workspaceId: string,
  projectId: string,
  streamId: string,
  batchId: string,
  digest: Sha256Digest
): string {
  return [
    "ingest-v1",
    encodeURIComponent(workspaceId),
    encodeURIComponent(projectId),
    encodeURIComponent(streamId),
    encodeURIComponent(batchId),
    `${digest.slice("sha256:".length)}.json.gz.enc`
  ].join("/");
}
