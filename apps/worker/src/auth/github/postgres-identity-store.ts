import type { PostgresConnectionFactory } from "../../infrastructure/ingestion/hyperdrive-postgres.js";
import type { BrowserSessionRecord, BrowserSessionRepository } from "../browser-session.js";
import { PostgresBrowserSessionRepository } from "../postgres-browser-session.js";
import type { GitHubIdentityStore, StoredGitHubIdentity } from "./routes.js";

export class PostgresGitHubIdentityStore implements GitHubIdentityStore {
  readonly #connections: PostgresConnectionFactory;
  readonly #sessions: BrowserSessionRepository;

  constructor(connections: PostgresConnectionFactory) {
    this.#connections = connections;
    this.#sessions = new PostgresBrowserSessionRepository(connections);
  }

  create(record: BrowserSessionRecord): Promise<void> {
    return this.#sessions.create(record);
  }

  find(sessionId: string): Promise<BrowserSessionRecord | undefined> {
    return this.#sessions.find(sessionId);
  }

  revoke(sessionId: string, revokedAtEpochSeconds: number): Promise<boolean> {
    return this.#sessions.revoke(sessionId, revokedAtEpochSeconds);
  }

  async upsertIdentity(identity: StoredGitHubIdentity): Promise<string> {
    const connection = await this.#connections.connect();
    try {
      await connection.query("BEGIN");
      const proposedUserId = crypto.randomUUID();
      const user = await connection.query<{ readonly id: unknown }>(
        `INSERT INTO users (
           id, github_user_id, github_login, display_name, avatar_url
         ) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (github_user_id) DO UPDATE
         SET github_login = EXCLUDED.github_login,
             display_name = EXCLUDED.display_name,
             avatar_url = EXCLUDED.avatar_url,
             disabled_at = NULL,
             updated_at = now()
         RETURNING id`,
        [
          proposedUserId,
          identity.githubUser.id,
          identity.githubUser.login,
          identity.githubUser.name ?? null,
          identity.githubUser.avatarUrl
        ]
      );
      const localUserId = requiredText(user.rows[0]?.id, "user id");
      await connection.query(
        `INSERT INTO github_user_credentials (
           user_id, encrypted_credentials, token_expires_at, updated_at
         ) VALUES ($1, $2, $3, to_timestamp($4))
         ON CONFLICT (user_id) DO UPDATE
         SET encrypted_credentials = EXCLUDED.encrypted_credentials,
             token_expires_at = EXCLUDED.token_expires_at,
             updated_at = EXCLUDED.updated_at`,
        [
          localUserId,
          identity.encryptedCredentials,
          identity.tokenExpiresAtEpochSeconds === undefined
            ? null
            : new Date(identity.tokenExpiresAtEpochSeconds * 1_000),
          identity.updatedAtEpochSeconds
        ]
      );
      await connection.query("COMMIT");
      return localUserId;
    } catch (error) {
      await connection.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      await connection.close();
    }
  }
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Database returned invalid ${field}.`);
  }
  return value;
}
