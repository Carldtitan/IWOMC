import { describe, expect, it } from "vitest";

import type {
  PostgresConnection,
  PostgresConnectionFactory,
  PostgresQueryResult
} from "../../infrastructure/ingestion/hyperdrive-postgres.js";
import { PostgresGitHubIdentityStore } from "./postgres-identity-store.js";

class FakeConnection implements PostgresConnection {
  readonly calls: { readonly text: string; readonly values: readonly unknown[] }[] = [];
  closed = false;

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  query<Row>(text: string, values: readonly unknown[] = []): Promise<PostgresQueryResult<Row>> {
    this.calls.push({ text, values });
    const rows = text.includes("RETURNING id")
      ? [{ id: "00000000-0000-4000-8000-000000000123" }]
      : [];
    return Promise.resolve({
      rowCount: rows.length,
      rows: rows as unknown as readonly Row[]
    });
  }
}

describe("PostgresGitHubIdentityStore", () => {
  it("atomically maps GitHub identity to a local user and encrypted credential", async () => {
    const connection = new FakeConnection();
    const factory: PostgresConnectionFactory = {
      connect: () => Promise.resolve(connection)
    };
    const localUserId = await new PostgresGitHubIdentityStore(factory).upsertIdentity({
      encryptedCredentials: "sealed-credential",
      githubUser: {
        avatarUrl: "https://avatars.example.test/123",
        id: "123",
        login: "developer",
        name: "Developer"
      },
      tokenExpiresAtEpochSeconds: 2_000,
      updatedAtEpochSeconds: 1_000
    });

    expect(localUserId).toBe("00000000-0000-4000-8000-000000000123");
    expect(connection.calls.map(({ text }) => text.trim().split(/\s+/u)[0])).toEqual([
      "BEGIN",
      "INSERT",
      "INSERT",
      "COMMIT"
    ]);
    expect(connection.calls.flatMap(({ values }) => values)).not.toContain("access-token");
    expect(connection.closed).toBe(true);
  });
});
