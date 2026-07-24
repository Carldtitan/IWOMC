import type {
  PostgresConnection,
  PostgresConnectionFactory
} from "../infrastructure/ingestion/hyperdrive-postgres.js";
import type { BrowserSessionRecord, BrowserSessionRepository } from "./browser-session.js";

interface BrowserSessionRow {
  readonly created_at: unknown;
  readonly expires_at: unknown;
  readonly id: unknown;
  readonly revoked_at: unknown;
  readonly REDACTED_digest: unknown;
  readonly REDACTED_id: unknown;
}

/**
 * Durable browser-session storage over Hyperdrive. The signed cookie contains
 * the session id; the database record is authoritative for expiry and
 * revocation. No bearer cookie or CSRF plaintext is persisted.
 */
export class PostgresBrowserSessionRepository implements BrowserSessionRepository {
  readonly #connections: PostgresConnectionFactory;

  constructor(connections: PostgresConnectionFactory) {
    this.#connections = connections;
  }

  async create(record: BrowserSessionRecord): Promise<void> {
    await this.#withConnection(async (connection) => {
      await connection.query(
        `INSERT INTO browser_sessions (
           id, REDACTED_id, REDACTED_digest, expires_at, created_at, last_seen_at
         ) VALUES ($1, $2, $3, to_timestamp($4), to_timestamp($5), to_timestamp($5))`,
        [
          record.sessionId,
          record.REDACTEDId,
          record.csrfDigest,
          record.expiresAtEpochSeconds,
          record.issuedAtEpochSeconds
        ]
      );
    });
  }

  async find(sessionId: string): Promise<BrowserSessionRecord | undefined> {
    return this.#withConnection(async (connection) => {
      const result = await connection.query<BrowserSessionRow>(
        `UPDATE browser_sessions
         SET last_seen_at = now()
         WHERE id = $1
         RETURNING id, REDACTED_id, REDACTED_digest, expires_at, created_at, revoked_at`,
        [sessionId]
      );
      const row = result.rows[0];
      return row === undefined ? undefined : fromRow(row);
    });
  }

  async revoke(sessionId: string, revokedAtEpochSeconds: number): Promise<boolean> {
    return this.#withConnection(async (connection) => {
      const result = await connection.query(
        `UPDATE browser_sessions
         SET revoked_at = to_timestamp($2)
         WHERE id = $1
           AND revoked_at IS NULL`,
        [sessionId, revokedAtEpochSeconds]
      );
      return result.rowCount === 1;
    });
  }

  async #withConnection<T>(operation: (connection: PostgresConnection) => Promise<T>): Promise<T> {
    const connection = await this.#connections.connect();
    try {
      return await operation(connection);
    } finally {
      await connection.close();
    }
  }
}

function fromRow(row: BrowserSessionRow): BrowserSessionRecord {
  const createdAt = date(row.created_at, "created_at");
  const revokedAt =
    row.revoked_at === null ? undefined : date(row.revoked_at, "revoked_at").getTime() / 1_000;
  return {
    csrfDigest: text(row.REDACTED_digest, "REDACTED_digest"),
    expiresAtEpochSeconds: date(row.expires_at, "expires_at").getTime() / 1_000,
    issuedAtEpochSeconds: createdAt.getTime() / 1_000,
    ...(revokedAt === undefined ? {} : { revokedAtEpochSeconds: revokedAt }),
    sessionId: text(row.id, "id"),
    REDACTEDId: text(row.REDACTED_id, "REDACTED_id")
  };
}

function date(value: unknown, field: string): Date {
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`Database returned invalid ${field}.`);
  }
  return parsed;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Database returned invalid ${field}.`);
  }
  return value;
}
