import { describe, expect, it } from "vitest";

import { sha256 } from "../../domain/ingestion/canonical.js";
import {
  type NormalizedPersistenceError,
  type NormalizedEventBatchEnvelope
} from "../../queues/event-consumer.js";
import type {
  PostgresConnection,
  PostgresConnectionFactory,
  PostgresQueryResult
} from "./hyperdrive-postgres.js";
import { HyperdriveProcessedBatchMarkerPersistence } from "./processed-batch-postgres.js";

const digest = `sha256:${"1".repeat(64)}` as const;
const signature = btoa(String.fromCharCode(...new Uint8Array(64).fill(9)));

describe("HyperdriveProcessedBatchMarkerPersistence", () => {
  it("atomically inserts a verified stream anchor and marks the batch enqueued", async () => {
    const connection = new FakeConnection({
      anchorRows: [],
      batchRows: [{ last_sequence: "1" }]
    });
    const persistence = new HyperdriveProcessedBatchMarkerPersistence(factory(connection), {
      now: () => 1_700_000_000_000
    });

    const result = await persistence.persistEventBatch(envelope());

    expect(result).toEqual({ reconcileRequests: [] });
    expect(connection.operations()).toEqual([
      "BEGIN",
      "SELECT_BATCH",
      "SELECT_ANCHOR",
      "INSERT_ANCHOR",
      "UPDATE_BATCH",
      "COMMIT"
    ]);
    const insert = connection.calls.find((call) => call.operation === "INSERT_ANCHOR");
    expect(insert?.values?.slice(1)).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "44444444-4444-4444-8444-444444444444",
      1,
      digest,
      await signatureDigest(),
      1,
      1_700_000_000_000
    ]);
    expect(connection.closed).toBe(true);
  });

  it("treats an identical existing anchor as an idempotent replay", async () => {
    const connection = new FakeConnection({
      anchorRows: [
        {
          anchor_sequence: "1",
          credential_version: 1,
          event_digest: digest,
          signature_digest: await signatureDigest()
        }
      ],
      batchRows: [{ last_sequence: 1 }]
    });
    const persistence = new HyperdriveProcessedBatchMarkerPersistence(factory(connection));

    await expect(persistence.persistEventBatch(envelope())).resolves.toEqual({
      reconcileRequests: []
    });
    expect(connection.operations()).not.toContain("INSERT_ANCHOR");
    expect(connection.operations()).toContain("COMMIT");
  });

  it("rolls back and classifies a conflicting anchor as terminal", async () => {
    const connection = new FakeConnection({
      anchorRows: [
        {
          anchor_sequence: 1,
          credential_version: 1,
          event_digest: `sha256:${"2".repeat(64)}`,
          signature_digest: await signatureDigest()
        }
      ],
      batchRows: [{ last_sequence: 1 }]
    });
    const persistence = new HyperdriveProcessedBatchMarkerPersistence(factory(connection));

    await expect(persistence.persistEventBatch(envelope())).rejects.toMatchObject({
      code: "persistence_anchor_conflict",
      retryable: false
    } satisfies Partial<NormalizedPersistenceError>);
    expect(connection.operations()).toContain("ROLLBACK");
    expect(connection.operations()).not.toContain("UPDATE_BATCH");
    expect(connection.closed).toBe(true);
  });

  it("does not commit when the batch marker update affects no row", async () => {
    const connection = new FakeConnection({
      anchorRows: [],
      batchRows: [{ last_sequence: 1 }],
      updateRowCount: 0
    });
    const persistence = new HyperdriveProcessedBatchMarkerPersistence(factory(connection));

    await expect(persistence.persistEventBatch(envelope())).rejects.toMatchObject({
      code: "persistence_batch_mismatch",
      retryable: false
    } satisfies Partial<NormalizedPersistenceError>);
    expect(connection.operations()).toContain("ROLLBACK");
    expect(connection.operations()).not.toContain("COMMIT");
  });
});

interface QueryCall {
  readonly operation: string;
  readonly values?: readonly unknown[];
}

interface FakeConnectionOptions {
  readonly anchorRows: readonly unknown[];
  readonly batchRows: readonly unknown[];
  readonly updateRowCount?: number;
}

class FakeConnection implements PostgresConnection {
  readonly calls: QueryCall[] = [];
  closed = false;
  readonly #options: FakeConnectionOptions;

  constructor(options: FakeConnectionOptions) {
    this.#options = options;
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  query<Row>(text: string, values?: readonly unknown[]): Promise<PostgresQueryResult<Row>> {
    const operation = classifySql(text);
    this.calls.push(values === undefined ? { operation } : { operation, values });
    let rows: readonly unknown[] = [];
    let rowCount = 0;
    if (operation === "SELECT_BATCH") {
      rows = this.#options.batchRows;
      rowCount = rows.length;
    } else if (operation === "SELECT_ANCHOR") {
      rows = this.#options.anchorRows;
      rowCount = rows.length;
    } else if (operation === "INSERT_ANCHOR") {
      rowCount = 1;
    } else if (operation === "UPDATE_BATCH") {
      rowCount = this.#options.updateRowCount ?? 1;
    }
    return Promise.resolve({
      rowCount,
      rows: rows as readonly Row[]
    });
  }

  operations(): readonly string[] {
    return this.calls.map((call) => call.operation);
  }
}

function classifySql(text: string): string {
  const normalized = text.trim().replace(/\s+/gu, " ");
  if (normalized === "BEGIN" || normalized === "COMMIT" || normalized === "ROLLBACK") {
    return normalized;
  }
  if (normalized.startsWith("SELECT last_sequence FROM ingest_batches")) {
    return "SELECT_BATCH";
  }
  if (normalized.startsWith("SELECT anchor_sequence")) {
    return "SELECT_ANCHOR";
  }
  if (normalized.startsWith("INSERT INTO event_anchors")) {
    return "INSERT_ANCHOR";
  }
  if (normalized.startsWith("UPDATE ingest_batches")) {
    return "UPDATE_BATCH";
  }
  throw new Error(`Unexpected SQL in test: ${normalized}`);
}

function factory(connection: PostgresConnection): PostgresConnectionFactory {
  return {
    connect: () => Promise.resolve(connection)
  };
}

function envelope(): NormalizedEventBatchEnvelope {
  return {
    batchId: "batch-1",
    chainHead: digest,
    chainHeadSignature: signature,
    deviceId: "33333333-3333-4333-8333-333333333333",
    headers: [],
    lastSequence: 1,
    logicalDigest: digest,
    payloads: [],
    projectId: "22222222-2222-4222-8222-222222222222",
    schemaVersion: 1,
    signingKeyVersion: 1,
    streamId: "44444444-4444-4444-8444-444444444444",
    workspaceId: "11111111-1111-4111-8111-111111111111"
  };
}

async function signatureDigest(): Promise<string> {
  return sha256(Uint8Array.from(atob(signature), (character) => character.charCodeAt(0)));
}
