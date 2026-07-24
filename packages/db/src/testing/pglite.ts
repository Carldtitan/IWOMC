import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";

import * as schema from "../schema/index.js";

export interface TestDatabase {
  readonly client: PGlite;
  readonly database: PgliteDatabase<typeof schema>;
  close(): Promise<void>;
  migrate(): Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const client = new PGlite("memory://");
  const database = drizzle({ client, schema });
  const migrationsFolder = fileURLToPath(new URL("../../migrations", import.meta.url));
  const applyMigrations = async (): Promise<void> => {
    await migrate(database, { migrationsFolder });
  };
  await applyMigrations();

  return {
    client,
    database,
    close: async () => {
      await client.close();
    },
    migrate: applyMigrations
  };
}
