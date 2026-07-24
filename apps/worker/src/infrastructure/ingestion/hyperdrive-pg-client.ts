import { Client } from "pg";

import {
  HyperdrivePostgresIngestionDriver,
  type HyperdrivePostgresIngestionOptions,
  type PostgresConnection,
  type PostgresConnectionFactory,
  type PostgresQueryResult
} from "./hyperdrive-postgres.js";

export interface HyperdriveBinding {
  readonly connectionString: string;
}

/**
 * Creates a short-lived node-postgres Client over Hyperdrive. Hyperdrive owns
 * connection pooling, so the Worker closes its client after each unit of work
 * rather than retaining a process-global database pool.
 */
export class HyperdrivePostgresConnectionFactory implements PostgresConnectionFactory {
  readonly #connectionString: string;

  constructor(connectionString: string) {
    if (connectionString.trim().length === 0) {
      throw new Error("Hyperdrive connectionString is required.");
    }
    this.#connectionString = connectionString;
  }

  async connect(): Promise<PostgresConnection> {
    const client = new Client({
      application_name: "environment-REDACTED-ingestion",
      connectionString: this.#connectionString
    });
    try {
      await client.connect();
    } catch (error) {
      await client.end().catch(() => undefined);
      throw error;
    }
    return {
      close: () => client.end(),
      async query<Row>(
        text: string,
        values: readonly unknown[] = []
      ): Promise<PostgresQueryResult<Row>> {
        const result = await client.query(text, [...values]);
        return {
          rowCount: result.rowCount,
          rows: result.rows as readonly Row[]
        };
      }
    };
  }
}

export function hyperdrivePostgresIngestionDriver(
  binding: HyperdriveBinding,
  options: HyperdrivePostgresIngestionOptions = {}
): HyperdrivePostgresIngestionDriver {
  return new HyperdrivePostgresIngestionDriver(
    new HyperdrivePostgresConnectionFactory(binding.connectionString),
    options
  );
}
