import type { PostgresConnectionFactory } from "../../infrastructure/ingestion/hyperdrive-postgres.js";
import type { GitHubCredentialStore, StoredGitHubCredential } from "./credential-lifecycle.js";

interface CredentialRow {
  readonly disabled_at: unknown;
  readonly encrypted_credentials: unknown;
  readonly github_user_id: unknown;
  readonly refresh_lease_expires_at: unknown;
  readonly refresh_lease_id: unknown;
  readonly revoked_at: unknown;
  readonly token_expires_at: unknown;
  readonly user_id: unknown;
}

export class PostgresGitHubCredentialStore implements GitHubCredentialStore {
  readonly #connections: PostgresConnectionFactory;

  constructor(connections: PostgresConnectionFactory) {
    this.#connections = connections;
  }

  async findCredential(userId: string): Promise<StoredGitHubCredential | undefined> {
    const connection = await this.#connections.connect();
    try {
      const result = await connection.query<CredentialRow>(
        `SELECT c.user_id,
                u.github_user_id,
                c.encrypted_credentials,
                c.token_expires_at,
                c.refresh_lease_id,
                c.refresh_lease_expires_at,
                c.revoked_at,
                u.disabled_at
         FROM github_user_credentials c
         JOIN users u ON u.id = c.user_id
         WHERE c.user_id = $1`,
        [userId]
      );
      return result.rows[0] === undefined ? undefined : credential(result.rows[0]);
    } finally {
      await connection.close();
    }
  }

  async tryAcquireRefreshLease(input: {
    readonly leaseExpiresAtEpochSeconds: number;
    readonly leaseId: string;
    readonly nowEpochSeconds: number;
    readonly userId: string;
  }): Promise<boolean> {
    const connection = await this.#connections.connect();
    try {
      const result = await connection.query(
        `UPDATE github_user_credentials
         SET refresh_lease_id = $2,
             refresh_lease_expires_at = to_timestamp($3),
             updated_at = to_timestamp($4)
         WHERE user_id = $1
           AND revoked_at IS NULL
           AND EXISTS (
             SELECT 1
             FROM users
             WHERE users.id = github_user_credentials.user_id
               AND users.disabled_at IS NULL
           )
           AND (
             refresh_lease_id IS NULL
             OR refresh_lease_expires_at <= to_timestamp($4)
           )`,
        [input.userId, input.leaseId, input.leaseExpiresAtEpochSeconds, input.nowEpochSeconds]
      );
      return result.rowCount === 1;
    } finally {
      await connection.close();
    }
  }

  async completeRefresh(input: {
    readonly encryptedCredentials: string;
    readonly leaseId: string;
    readonly tokenExpiresAtEpochSeconds: number;
    readonly updatedAtEpochSeconds: number;
    readonly userId: string;
  }): Promise<boolean> {
    const connection = await this.#connections.connect();
    try {
      const result = await connection.query(
        `UPDATE github_user_credentials
         SET encrypted_credentials = $3,
             token_expires_at = to_timestamp($4),
             refresh_lease_id = NULL,
             refresh_lease_expires_at = NULL,
             updated_at = to_timestamp($5)
         WHERE user_id = $1
           AND refresh_lease_id = $2
           AND revoked_at IS NULL`,
        [
          input.userId,
          input.leaseId,
          input.encryptedCredentials,
          input.tokenExpiresAtEpochSeconds,
          input.updatedAtEpochSeconds
        ]
      );
      return result.rowCount === 1;
    } finally {
      await connection.close();
    }
  }

  async releaseRefreshLease(input: {
    readonly leaseId: string;
    readonly userId: string;
  }): Promise<void> {
    const connection = await this.#connections.connect();
    try {
      await connection.query(
        `UPDATE github_user_credentials
         SET refresh_lease_id = NULL,
             refresh_lease_expires_at = NULL,
             updated_at = now()
         WHERE user_id = $1
           AND refresh_lease_id = $2`,
        [input.userId, input.leaseId]
      );
    } finally {
      await connection.close();
    }
  }

  async revokeCredentialAndSessions(input: {
    readonly revokedAtEpochSeconds: number;
    readonly userId: string;
  }): Promise<void> {
    const connection = await this.#connections.connect();
    try {
      await connection.query("BEGIN");
      await connection.query(
        `UPDATE github_user_credentials
         SET revoked_at = COALESCE(revoked_at, to_timestamp($2)),
             refresh_lease_id = NULL,
             refresh_lease_expires_at = NULL,
             updated_at = to_timestamp($2)
         WHERE user_id = $1`,
        [input.userId, input.revokedAtEpochSeconds]
      );
      await connection.query(
        `UPDATE browser_sessions
         SET revoked_at = COALESCE(revoked_at, to_timestamp($2))
         WHERE user_id = $1`,
        [input.userId, input.revokedAtEpochSeconds]
      );
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      await connection.close();
    }
  }
}

function credential(row: CredentialRow): StoredGitHubCredential {
  const refreshLeaseExpiresAtEpochSeconds = dateEpoch(row.refresh_lease_expires_at);
  const revokedAtEpochSeconds = dateEpoch(row.revoked_at);
  const tokenExpiresAtEpochSeconds = dateEpoch(row.token_expires_at);
  const userDisabledAtEpochSeconds = dateEpoch(row.disabled_at);
  return {
    encryptedCredentials: text(row.encrypted_credentials, "encrypted credentials"),
    githubUserId: text(row.github_user_id, "GitHub user id"),
    ...(refreshLeaseExpiresAtEpochSeconds === undefined
      ? {}
      : { refreshLeaseExpiresAtEpochSeconds }),
    ...(row.refresh_lease_id === null || row.refresh_lease_id === undefined
      ? {}
      : { refreshLeaseId: text(row.refresh_lease_id, "refresh lease id") }),
    ...(revokedAtEpochSeconds === undefined ? {} : { revokedAtEpochSeconds }),
    ...(tokenExpiresAtEpochSeconds === undefined ? {} : { tokenExpiresAtEpochSeconds }),
    ...(userDisabledAtEpochSeconds === undefined ? {} : { userDisabledAtEpochSeconds }),
    userId: text(row.user_id, "user id")
  };
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Database returned invalid ${field}.`);
  }
  return value;
}

function dateEpoch(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Database returned an invalid timestamp.");
  }
  return parsed.getTime() / 1_000;
}
