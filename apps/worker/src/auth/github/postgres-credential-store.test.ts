import { describe, expect, it } from "vitest";

import type {
  PostgresConnection,
  PostgresConnectionFactory,
  PostgresQueryResult
} from "../../infrastructure/ingestion/hyperdrive-postgres.js";
import { PostgresGitHubCredentialStore } from "./postgres-credential-store.js";

class FakeConnection implements PostgresConnection {
  readonly calls: { readonly text: string; readonly values: readonly unknown[] }[] = [];
  row: Readonly<Record<string, unknown>> | undefined;

  close(): Promise<void> {
    return Promise.resolve();
  }

  query<Row>(text: string, values: readonly unknown[] = []): Promise<PostgresQueryResult<Row>> {
    this.calls.push({ text, values });
    const rows = text.includes("SELECT c.user_id") && this.row !== undefined ? [this.row] : [];
    return Promise.resolve({
      rowCount: text.startsWith("UPDATE") ? 1 : rows.length,
      rows: rows as readonly Row[]
    });
  }
}

function store(connection: FakeConnection): PostgresGitHubCredentialStore {
  const factory: PostgresConnectionFactory = {
    connect: () => Promise.resolve(connection)
  };
  return new PostgresGitHubCredentialStore(factory);
}

describe("PostgresGitHubCredentialStore", () => {
  it("loads encrypted credentials with authoritative identity and revocation state", async () => {
    const connection = new FakeConnection();
    connection.row = {
      disabled_at: null,
      encrypted_credentials: "sealed-token-pair",
      github_user_id: "123",
      refresh_lease_expires_at: null,
      refresh_lease_id: null,
      revoked_at: null,
      token_expires_at: new Date(2_000_000),
      user_id: "00000000-0000-4000-8000-000000000123"
    };

    await expect(
      store(connection).findCredential("00000000-0000-4000-8000-000000000123")
    ).resolves.toEqual({
      encryptedCredentials: "sealed-token-pair",
      githubUserId: "123",
      tokenExpiresAtEpochSeconds: 2_000,
      userId: "00000000-0000-4000-8000-000000000123"
    });
  });

  it("uses a conditional lease and atomically revokes credentials and sessions", async () => {
    const connection = new FakeConnection();
    const repository = store(connection);

    await expect(
      repository.tryAcquireRefreshLease({
        leaseExpiresAtEpochSeconds: 2_060,
        leaseId: "00000000-0000-4000-8000-000000000999",
        nowEpochSeconds: 2_000,
        userId: "00000000-0000-4000-8000-000000000123"
      })
    ).resolves.toBe(true);
    await repository.revokeCredentialAndSessions({
      revokedAtEpochSeconds: 2_100,
      userId: "00000000-0000-4000-8000-000000000123"
    });

    expect(connection.calls.some(({ text }) => text.includes("refresh_lease_expires_at <="))).toBe(
      true
    );
    expect(connection.calls.some(({ text }) => text.includes("users.disabled_at IS NULL"))).toBe(
      true
    );
    expect(connection.calls.map(({ text }) => text.trim().split(/\s+/u)[0]).slice(-4)).toEqual([
      "BEGIN",
      "UPDATE",
      "UPDATE",
      "COMMIT"
    ]);
  });
});
