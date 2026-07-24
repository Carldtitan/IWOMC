import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const migrationDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/db/migrations"
);
const connectionString = process.env.DATABASE_DIRECT_URL?.trim();

if (!connectionString) {
  throw new Error("DATABASE_DIRECT_URL is required.");
}

const migrationNames = (await readdir(migrationDirectory))
  .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/u.test(name))
  .sort();
if (migrationNames.length === 0) {
  throw new Error("No database migrations were found.");
}

const client = new Client({
  application_name: "environment-reconciler-migrator",
  connectionString
});

await client.connect();
try {
  await client.query("SELECT pg_advisory_lock(hashtext('environment-reconciler:migrations:v1'))");
  await client.query(`
    CREATE TABLE IF NOT EXISTS environment_reconciler_migrations (
      name text PRIMARY KEY,
      sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  for (const name of migrationNames) {
    const sql = await readFile(resolve(migrationDirectory, name), "utf8");
    const digest = createHash("sha256").update(sql, "utf8").digest("hex");
    const existing = await client.query(
      "SELECT sha256 FROM environment_reconciler_migrations WHERE name = $1",
      [name]
    );
    if (existing.rows.length > 0) {
      if (existing.rows[0]?.sha256 !== digest) {
        throw new Error(`Previously applied migration ${name} has changed.`);
      }
      console.log(`unchanged ${name}`);
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO environment_reconciler_migrations (name, sha256) VALUES ($1, $2)",
        [name, digest]
      );
      await client.query("COMMIT");
      console.log(`applied ${name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client
    .query("SELECT pg_advisory_unlock(hashtext('environment-reconciler:migrations:v1'))")
    .catch(() => undefined);
  await client.end();
}
