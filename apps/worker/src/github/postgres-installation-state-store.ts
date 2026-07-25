import type { PostgresConnectionFactory } from "../infrastructure/ingestion/hyperdrive-postgres.js";
import type { GitHubRepositoryCredentialPurpose } from "./types.js";
import type {
  GitHubInstallationLifecycleAction,
  GitHubInstallationStateStore
} from "./installation-lifecycle.js";

export class PostgresGitHubInstallationStateStore implements GitHubInstallationStateStore {
  readonly #connections: PostgresConnectionFactory;

  constructor(connections: PostgresConnectionFactory) {
    this.#connections = connections;
  }

  async isRepositoryCredentialAuthorized(input: {
    readonly installationId: string;
    readonly purpose: GitHubRepositoryCredentialPurpose;
    readonly repositoryId: string;
  }): Promise<boolean> {
    const connection = await this.#connections.connect();
    try {
      const result = await connection.query(
        `SELECT 1
         FROM github_installations gi
         JOIN repositories r
           ON r.github_installation_id = gi.id
          AND r.workspace_id = gi.workspace_id
         WHERE gi.github_installation_id = $1
           AND r.provider_repository_id = $2
           AND gi.suspended_at IS NULL
           AND gi.deleted_at IS NULL
           AND ($3 = 'contents_read' OR r.archived = false)
         LIMIT 1`,
        [input.installationId, input.repositoryId, input.purpose]
      );
      return result.rowCount === 1;
    } finally {
      await connection.close();
    }
  }

  async applyInstallationLifecycle(input: {
    readonly action: GitHubInstallationLifecycleAction;
    readonly occurredAtEpochSeconds: number;
    readonly providerInstallationId: string;
  }): Promise<boolean> {
    const connection = await this.#connections.connect();
    try {
      const result = await connection.query(lifecycleStatement(input.action), [
        input.providerInstallationId,
        input.occurredAtEpochSeconds
      ]);
      return result.rowCount === 1;
    } finally {
      await connection.close();
    }
  }
}

function lifecycleStatement(action: GitHubInstallationLifecycleAction): string {
  switch (action) {
    case "suspend":
      return `UPDATE github_installations
              SET suspended_at = COALESCE(suspended_at, to_timestamp($2)),
                  updated_at = to_timestamp($2)
              WHERE github_installation_id = $1
                AND deleted_at IS NULL`;
    case "unsuspend":
      return `UPDATE github_installations
              SET suspended_at = NULL,
                  updated_at = to_timestamp($2)
              WHERE github_installation_id = $1
                AND deleted_at IS NULL`;
    case "deleted":
      return `UPDATE github_installations
              SET deleted_at = COALESCE(deleted_at, to_timestamp($2)),
                  suspended_at = COALESCE(suspended_at, to_timestamp($2)),
                  updated_at = to_timestamp($2)
              WHERE github_installation_id = $1`;
    case "created":
    case "new_permissions_accepted":
      // Never create or revive a link from webhook display data. Linking is a
      // separate authenticated REDACTED flow; this only records activity for an
      // already-active installation.
      return `UPDATE github_installations
              SET updated_at = to_timestamp($2)
              WHERE github_installation_id = $1
                AND deleted_at IS NULL`;
  }
}
