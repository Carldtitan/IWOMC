import { describe, expect, it } from "vitest";

import type { StoredBatchRecord } from "../../domain/ingestion/types.js";
import { sha256Base64Url } from "../../security/crypto.js";
import {
  HyperdrivePostgresIngestionDriver,
  type PostgresConnection,
  type PostgresConnectionFactory,
  type PostgresQueryResult
} from "./hyperdrive-postgres.js";

const workspaceId = "REDACTED-8000-000000000001";
const projectId = "20000000-0000-4000-8000-000000000002";
const deviceId = "30000000-0000-4000-REDACTED";
const streamId = "40000000-0000-4000-8000-000000000004";
const REDACTEDId = "50000000-0000-4000-8000-000000000005";
const logicalDigest = `sha256:${"1".repeat(64)}` as const;
const ciphertextDigest = `sha256:${"2".repeat(64)}` as const;
const chainHead = `sha256:${"3".repeat(64)}` as const;
const publicSigningKey = btoa(String.fromCharCode(...new REDACTED(32).fill(9)));

describe("HyperdrivePostgresIngestionDriver", () => {
  it("authenticates a REDACTED by digest and never sends its REDACTED to PostgreSQL", async () => {
    const REDACTED = "REDACTED";
    const connection = new ScriptedConnection(async (sql) => {
      if (sql.includes("FROM device_REDACTEDs AS c")) {
        return rows({
          REDACTED_digest: await sha256Base64Url(REDACTED),
          REDACTED_revoked_at: null,
          device_id: deviceId,
          device_revoked_at: null,
          device_state: "online",
          expires_at: new Date("2030-01-01T00:00:00.000Z"),
          key_algorithm: "Ed25519",
          key_version: 2,
          public_signing_key: publicSigningKey,
          workspace_id: workspaceId
        });
      }
      if (sql.startsWith("UPDATE devices")) {
        return count(1);
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const driver = driverWith(connection);

    await expect(
      driver.authenticate(`er_device_v1.${REDACTEDId}.${REDACTED}`, 1_700_000_000)
    ).resolves.toEqual({
      deviceId,
      publicSigningKey,
      signingKeyVersion: 2,
      workspaceId
    });

    expect(connection.closed).toBe(true);
    expect(JSON.stringify(connection.calls)).not.toContain(REDACTED);
    expect(connection.calls[0]?.values).toEqual([REDACTEDId]);
  });

  it("rejects the wrong REDACTED REDACTED before updating device activity", async () => {
    const connection = new ScriptedConnection(async (sql) => {
      if (!sql.includes("FROM device_REDACTEDs AS c")) {
        throw new Error(`Unexpected SQL: ${sql}`);
      }
      return rows({
        REDACTED_digest: await sha256Base64Url("REDACTED"),
        REDACTED_revoked_at: null,
        device_id: deviceId,
        device_revoked_at: null,
        device_state: "online",
        expires_at: null,
        key_algorithm: "Ed25519",
        key_version: 1,
        public_signing_key: publicSigningKey,
        workspace_id: workspaceId
      });
    });

    await expect(
      driverWith(connection).authenticate(
        `er_device_v1.${REDACTEDId}.wrong_device_REDACTED_value_12345`,
        1_700_000_000
      )
    ).rejects.toThrow("Invalid device REDACTED");
    expect(connection.calls).toHaveLength(1);
    expect(connection.closed).toBe(true);
  });

  it("atomically records a stored object, reserves the batch, and advances the stream", async () => {
    const connection = new ScriptedConnection((sql) => {
      if (sql === "BEGIN" || sql === "COMMIT") {
        return count(null);
      }
      if (sql.includes("FROM event_streams") && sql.includes("FOR UPDATE")) {
        return rows({ chain_head: null, last_monotonic_sequence: "0" });
      }
      if (sql.includes("FROM ingest_batches AS b")) {
        return rows();
      }
      if (
        sql.startsWith("INSERT INTO object_metadata") ||
        sql.startsWith("INSERT INTO ingest_batches") ||
        sql.startsWith("UPDATE event_streams")
      ) {
        return count(1);
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const driver = driverWith(connection);

    await expect(
      driver.commitStoredBatch({ expectedStreamState: undefined, record: storedRecord() })
    ).resolves.toEqual({ kind: "created", record: storedRecord() });

    expect(connection.calls.map((call) => statementKind(call.sql))).toEqual([
      "BEGIN",
      "LOCK_STREAM",
      "FIND_BATCH",
      "INSERT_OBJECT",
      "INSERT_BATCH",
      "ADVANCE_STREAM",
      "COMMIT"
    ]);
    const advance = connection.calls.find((call) => call.sql.startsWith("UPDATE event_streams"));
    expect(advance?.values).toEqual([
      1,
      chainHead,
      workspaceId,
      projectId,
      deviceId,
      streamId,
      0,
      null
    ]);
    expect(connection.closed).toBe(true);
  });

  it("returns the durable duplicate without writing object metadata twice", async () => {
    const connection = new ScriptedConnection((sql) => {
      if (sql === "BEGIN" || sql === "COMMIT") {
        return count(null);
      }
      if (sql.includes("FROM event_streams") && sql.includes("FOR UPDATE")) {
        return rows({ chain_head: chainHead, last_monotonic_sequence: "1" });
      }
      if (sql.includes("FROM ingest_batches AS b")) {
        return rows(storedRow("enqueued"));
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(
      driverWith(connection).commitStoredBatch({
        expectedStreamState: { chainHead, lastSequence: 1 },
        record: storedRecord()
      })
    ).resolves.toEqual({
      kind: "duplicate",
      record: { ...storedRecord(), state: "enqueued" }
    });
    expect(connection.calls.some((call) => call.sql.startsWith("INSERT"))).toBe(false);
    expect(connection.calls.at(-1)?.sql).toBe("COMMIT");
  });

  it("rolls back before metadata writes when the locked stream no longer matches", async () => {
    const connection = new ScriptedConnection((sql) => {
      if (sql === "BEGIN" || sql === "ROLLBACK") {
        return count(null);
      }
      if (sql.includes("FROM event_streams") && sql.includes("FOR UPDATE")) {
        return rows({ chain_head: chainHead, last_monotonic_sequence: "9" });
      }
      if (sql.includes("FROM ingest_batches AS b")) {
        return rows();
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(
      driverWith(connection).commitStoredBatch({
        expectedStreamState: undefined,
        record: storedRecord()
      })
    ).resolves.toEqual({ kind: "out_of_order" });
    expect(connection.calls.map((call) => statementKind(call.sql))).toEqual([
      "BEGIN",
      "LOCK_STREAM",
      "FIND_BATCH",
      "ROLLBACK"
    ]);
  });

  it("marks queue delivery idempotently and requires the logical digest to match", async () => {
    const connection = new ScriptedConnection((sql, values) => {
      expect(sql).toContain("UPDATE ingest_batches");
      expect(values).toEqual([workspaceId, "batch-1", logicalDigest]);
      return count(1);
    });

    await expect(
      driverWith(connection).markEnqueued({
        batchId: "batch-1",
        logicalDigest,
        workspaceId
      })
    ).resolves.toBeUndefined();
    expect(connection.closed).toBe(true);
  });
});

class ScriptedConnection implements PostgresConnection {
  readonly calls: { readonly sql: string; readonly values: readonly unknown[] }[] = [];
  closed = false;
  readonly #respond: (
    sql: string,
    values: readonly unknown[]
  ) => Promise<PostgresQueryResult<unknown>> | PostgresQueryResult<unknown>;

  constructor(
    respond: (
      sql: string,
      values: readonly unknown[]
    ) => Promise<PostgresQueryResult<unknown>> | PostgresQueryResult<unknown>
  ) {
    this.#respond = respond;
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  async query<Row>(
    sql: string,
    values: readonly unknown[] = []
  ): Promise<PostgresQueryResult<Row>> {
    const normalized = sql.trim();
    this.calls.push({ sql: normalized, values });
    return (await this.#respond(normalized, values)) as PostgresQueryResult<Row>;
  }
}

class SingleConnectionFactory implements PostgresConnectionFactory {
  readonly #connection: PostgresConnection;

  constructor(connection: PostgresConnection) {
    this.#connection = connection;
  }

  connect(): Promise<PostgresConnection> {
    return Promise.resolve(this.#connection);
  }
}

function driverWith(connection: PostgresConnection): HyperdrivePostgresIngestionDriver {
  return new HyperdrivePostgresIngestionDriver(new SingleConnectionFactory(connection));
}

function rows(...values: readonly unknown[]): PostgresQueryResult<unknown> {
  return { rowCount: values.length, rows: values };
}

function count(rowCount: number | null): PostgresQueryResult<unknown> {
  return { rowCount, rows: [] };
}

function storedRecord(): StoredBatchRecord {
  return {
    batchId: "batch-1",
    chainHead,
    ciphertextBytes: 512,
    ciphertextDigest,
    deviceId,
    firstSequence: 1,
    lastSequence: 1,
    logicalDigest,
    objectKey: "ingest-v1/object",
    objectVersionId: "r2-version-1",
    projectId,
    state: "stored_not_enqueued",
    streamId,
    workspaceId
  };
}

function storedRow(state: StoredBatchRecord["state"]): Record<string, unknown> {
  return {
    batch_id: "batch-1",
    chain_head: chainHead,
    ciphertext_bytes: "512",
    ciphertext_digest: ciphertextDigest,
    device_id: deviceId,
    event_stream_id: streamId,
    first_sequence: "1",
    last_sequence: "1",
    logical_digest: logicalDigest,
    object_key: "ingest-v1/object",
    object_version_id: "r2-version-1",
    project_id: projectId,
    state,
    workspace_id: workspaceId
  };
}

function statementKind(sql: string): string {
  if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
    return sql;
  }
  if (sql.includes("FROM event_streams") && sql.includes("FOR UPDATE")) {
    return "LOCK_STREAM";
  }
  if (sql.includes("FROM ingest_batches AS b")) {
    return "FIND_BATCH";
  }
  if (sql.startsWith("INSERT INTO object_metadata")) {
    return "INSERT_OBJECT";
  }
  if (sql.startsWith("INSERT INTO ingest_batches")) {
    return "INSERT_BATCH";
  }
  if (sql.startsWith("UPDATE event_streams")) {
    return "ADVANCE_STREAM";
  }
  return sql;
}
