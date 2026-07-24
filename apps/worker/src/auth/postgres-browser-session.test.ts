import { describe, expect, it } from "vitest";

import type {
  PostgresConnection,
  PostgresConnectionFactory,
  PostgresQueryResult
} from "../infrastructure/ingestion/hyperdrive-postgres.js";
import { PostgresBrowserSessionRepository } from "./postgres-browser-session.js";

class FakeConnection implements PostgresConnection {
  readonly calls: { readonly text: string; readonly values: readonly unknown[] }[] = [];
  rows: readonly Record<string, unknown>[] = [];
  rowCount = 0;
  closed = false;

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  query<Row>(text: string, values: readonly unknown[] = []): Promise<PostgresQueryResult<Row>> {
    this.calls.push({ text, values });
    return Promise.resolve({
      rowCount: this.rowCount,
      rows: this.rows as readonly Row[]
    });
  }
}

function repository(connection: FakeConnection): PostgresBrowserSessionRepository {
  const factory: PostgresConnectionFactory = {
    connect: () => Promise.resolve(connection)
  };
  return new PostgresBrowserSessionRepository(factory);
}

describe("PostgresBrowserSessionRepository", () => {
  it("persists only the session identity and digests", async () => {
    const connection = new FakeConnection();
    await repository(connection).create({
      csrfDigest: "csrf-digest",
      expiresAtEpochSeconds: 2_000,
      issuedAtEpochSeconds: 1_000,
      sessionId: "00000000-0000-4000-8000-000000000001",
      REDACTEDId: "00000000-0000-4000-8000-000000000002"
    });

    expect(connection.calls[0]?.values).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "csrf-digest",
      2_000,
      1_000
    ]);
    expect(connection.closed).toBe(true);
  });

  it("loads authoritative expiry and revocation state", async () => {
    const connection = new FakeConnection();
    connection.rows = [
      {
        created_at: new Date(1_000_000),
        expires_at: new Date(2_000_000),
        id: "00000000-0000-4000-8000-000000000001",
        revoked_at: new Date(1_500_000),
        REDACTED_digest: "csrf-digest",
        REDACTED_id: "00000000-0000-4000-8000-000000000002"
      }
    ];

    await expect(
      repository(connection).find("00000000-0000-4000-8000-000000000001")
    ).resolves.toEqual({
      csrfDigest: "csrf-digest",
      expiresAtEpochSeconds: 2_000,
      issuedAtEpochSeconds: 1_000,
      revokedAtEpochSeconds: 1_500,
      sessionId: "00000000-0000-4000-8000-000000000001",
      REDACTEDId: "00000000-0000-4000-8000-000000000002"
    });
  });

  it("reports whether an active session was revoked", async () => {
    const connection = new FakeConnection();
    connection.rowCount = 1;
    await expect(
      repository(connection).revoke("00000000-0000-4000-8000-000000000001", 1_500)
    ).resolves.toBe(true);
  });
});
