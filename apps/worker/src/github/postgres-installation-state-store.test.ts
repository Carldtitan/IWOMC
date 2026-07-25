import { describe, expect, it } from "vitest";

import type {
  PostgresConnection,
  PostgresConnectionFactory,
  PostgresQueryResult
} from "../infrastructure/ingestion/hyperdrive-postgres.js";
import { GitHubInstallationLifecycleService } from "./installation-lifecycle.js";
import { PostgresGitHubInstallationStateStore } from "./postgres-installation-state-store.js";

class FakeConnection implements PostgresConnection {
  readonly calls: { readonly text: string; readonly values: readonly unknown[] }[] = [];
  rowCount = 1;

  close(): Promise<void> {
    return Promise.resolve();
  }

  query<Row>(text: string, values: readonly unknown[] = []): Promise<PostgresQueryResult<Row>> {
    this.calls.push({ text, values });
    return Promise.resolve({ rowCount: this.rowCount, rows: [] });
  }
}

function store(connection: FakeConnection): PostgresGitHubInstallationStateStore {
  const connections: PostgresConnectionFactory = {
    connect: () => Promise.resolve(connection)
  };
  return new PostgresGitHubInstallationStateStore(connections);
}

describe("PostgresGitHubInstallationStateStore", () => {
  it("authorizes only an exact linked active installation/repository pair", async () => {
    const connection = new FakeConnection();

    await expect(
      store(connection).isRepositoryCredentialAuthorized({
        installationId: "41",
        purpose: "contents_write",
        repositoryId: "73"
      })
    ).resolves.toBe(true);

    expect(connection.calls[0]?.values).toEqual(["41", "73", "contents_write"]);
    expect(connection.calls[0]?.text).toContain("gi.suspended_at IS NULL");
    expect(connection.calls[0]?.text).toContain("gi.deleted_at IS NULL");
    expect(connection.calls[0]?.text).toContain("r.provider_repository_id = $2");
    expect(connection.calls[0]?.text).toContain("r.archived = false");
  });

  it("persists suspension, unsuspension, and deletion without reviving a deleted link", async () => {
    const connection = new FakeConnection();
    const lifecycle = new GitHubInstallationLifecycleService(store(connection));

    await expect(
      lifecycle.apply({
        action: "suspend",
        occurredAtEpochSeconds: 2_000,
        providerInstallationId: "41"
      })
    ).resolves.toBe(true);
    await expect(
      lifecycle.apply({
        action: "unsuspend",
        occurredAtEpochSeconds: 2_100,
        providerInstallationId: "41"
      })
    ).resolves.toBe(true);
    await expect(
      lifecycle.apply({
        action: "deleted",
        occurredAtEpochSeconds: 2_200,
        providerInstallationId: "41"
      })
    ).resolves.toBe(true);

    expect(connection.calls[0]?.text).toContain("suspended_at = COALESCE");
    expect(connection.calls[1]?.text).toContain("deleted_at IS NULL");
    expect(connection.calls[2]?.text).toContain("deleted_at = COALESCE");
    expect(connection.calls.every(({ values }) => values[0] === "41")).toBe(true);
  });

  it("does not create state for a spoofed or unlinked installation", async () => {
    const connection = new FakeConnection();
    connection.rowCount = 0;
    const lifecycle = new GitHubInstallationLifecycleService(store(connection));

    await expect(
      lifecycle.apply({
        action: "created",
        occurredAtEpochSeconds: 2_000,
        providerInstallationId: "999"
      })
    ).resolves.toBe(false);
    await expect(
      lifecycle.apply({
        action: "suspend",
        occurredAtEpochSeconds: 2_000,
        providerInstallationId: "not-an-id"
      })
    ).resolves.toBe(false);
    expect(connection.calls).toHaveLength(1);
    expect(connection.calls[0]?.text.trim().startsWith("UPDATE")).toBe(true);
  });
});
