import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type * as schema from "./schema/index.js";

export type ReconcilerDatabase<TQueryResult extends PgQueryResultHKT> = PgDatabase<
  TQueryResult,
  typeof schema
>;

export type ReconcilerSchema = typeof schema;
