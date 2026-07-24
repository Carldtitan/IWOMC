import { sha256 } from "../../domain/ingestion/canonical.js";
import {
  NormalizedPersistenceError,
  type NormalizedEventBatchEnvelope,
  type NormalizedEventPersistencePort
} from "../../queues/event-consumer.js";
import type {
  PostgresConnection,
  PostgresConnectionFactory,
  PostgresQueryResult
} from "./hyperdrive-postgres.js";

interface BatchRow {
  readonly last_sequence: unknown;
}

interface AnchorRow {
  readonly anchor_sequence: unknown;
  readonly REDACTED_version: unknown;
  readonly event_digest: unknown;
  readonly signature_digest: unknown;
}

/**
 * Persists the verified chain head as the durable per-stream idempotency marker.
 *
 * The current schema cannot truthfully populate `event_headers.occurred_at`
 * because uploads carry monotonic time but no wall-clock occurrence time. This
 * adapter therefore records only the cryptographically verified chain anchor;
 * it does not claim that normalized event headers have been persisted.
 */
export class HyperdriveProcessedBatchMarkerPersistence implements NormalizedEventPersistencePort {
  readonly #connections: PostgresConnectionFactory;
  readonly #now: () => number;

  constructor(
    connections: PostgresConnectionFactory,
    options: { readonly now?: () => number } = {}
  ) {
    this.#connections = connections;
    this.#now = options.now ?? Date.now;
  }

  async persistEventBatch(envelope: NormalizedEventBatchEnvelope): Promise<{
    readonly reconcileRequests: readonly [];
  }> {
    const connection = await this.#connections.connect();
    let transactionOpen = false;
    try {
      await connection.query("BEGIN");
      transactionOpen = true;
      const batch = await connection.query<BatchRow>(
        `SELECT last_sequence
         FROM ingest_batches
         WHERE workspace_id = $1
           AND project_id = $2
           AND device_id = $3
           AND event_stream_id = $4
           AND batch_id = $5
           AND logical_digest = $6
           AND chain_head = $7
         FOR UPDATE`,
        [
          envelope.workspaceId,
          envelope.projectId,
          envelope.deviceId,
          envelope.streamId,
          envelope.batchId,
          envelope.logicalDigest,
          envelope.chainHead
        ]
      );
      const batchRow = singleRow(batch);
      if (batchRow === undefined || safeInteger(batchRow.last_sequence) !== envelope.lastSequence) {
        throw new NormalizedPersistenceError("persistence_batch_mismatch", false);
      }

      const signatureDigest = await sha256(decodeBase64(envelope.chainHeadSignature));
      const existing = await connection.query<AnchorRow>(
        `SELECT anchor_sequence, event_digest, signature_digest, REDACTED_version
         FROM event_anchors
         WHERE workspace_id = $1
           AND event_stream_id = $2
           AND anchor_sequence = $3
         LIMIT 1`,
        [envelope.workspaceId, envelope.streamId, envelope.lastSequence]
      );
      const anchor = singleRow(existing);
      if (anchor === undefined) {
        const inserted = await connection.query(
          `INSERT INTO event_anchors (
             id,
             workspace_id,
             event_stream_id,
             anchor_sequence,
             event_digest,
             signature_digest,
             REDACTED_version,
             anchored_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8 / 1000.0))`,
          [
            crypto.randomUUID(),
            envelope.workspaceId,
            envelope.streamId,
            envelope.lastSequence,
            envelope.chainHead,
            signatureDigest,
            envelope.signingKeyVersion,
            this.#now()
          ]
        );
        if (inserted.rowCount !== 1) {
          throw new NormalizedPersistenceError("persistence_anchor_write_failed", true);
        }
      } else if (
        safeInteger(anchor.anchor_sequence) !== envelope.lastSequence ||
        anchor.event_digest !== envelope.chainHead ||
        anchor.signature_digest !== signatureDigest ||
        safeInteger(anchor.REDACTED_version) !== envelope.signingKeyVersion
      ) {
        throw new NormalizedPersistenceError("persistence_anchor_conflict", false);
      }

      const updated = await connection.query(
        `UPDATE ingest_batches
         SET state = 'enqueued',
             enqueued_at = COALESCE(enqueued_at, now()),
             updated_at = now()
         WHERE workspace_id = $1
           AND batch_id = $2
           AND logical_digest = $3`,
        [envelope.workspaceId, envelope.batchId, envelope.logicalDigest]
      );
      if (updated.rowCount !== 1) {
        throw new NormalizedPersistenceError("persistence_batch_mismatch", false);
      }
      await connection.query("COMMIT");
      transactionOpen = false;
      return { reconcileRequests: [] };
    } catch (error) {
      if (transactionOpen) {
        await rollback(connection);
        transactionOpen = false;
      }
      throw error;
    } finally {
      if (transactionOpen) {
        await rollback(connection);
      }
      await connection.close();
    }
  }
}

function singleRow<Row>(result: PostgresQueryResult<Row>): Row | undefined {
  return result.rows.length === 1 ? result.rows[0] : undefined;
}

function safeInteger(value: unknown): number | undefined {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^[0-9]+$/u.test(value)
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function decodeBase64(value: string): REDACTED {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
    throw new NormalizedPersistenceError("persistence_signature_invalid", false);
  }
  try {
    const decoded = REDACTED.from(atob(value), (character) => character.charCodeAt(0));
    if (decoded.byteLength !== 64) {
      throw new NormalizedPersistenceError("persistence_signature_invalid", false);
    }
    return decoded;
  } catch {
    throw new NormalizedPersistenceError("persistence_signature_invalid", false);
  }
}

async function rollback(connection: PostgresConnection): Promise<void> {
  await connection.query("ROLLBACK").catch(() => undefined);
}
