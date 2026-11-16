import "server-only";

import { Pool, type QueryResultRow } from "pg";
import { assertPrototypeConnection, prototypeSchema, quoteIdentifier } from "../prototype-config.mjs";

let pool: Pool | undefined;

export function databaseConfiguration() {
  try {
    const schema = prototypeSchema();
    return { configured: Boolean(process.env.SUPABASE_DB_URL?.trim()), schema };
  } catch {
    return { configured: false, schema: undefined };
  }
}

/** Use only in server routes/components. SQL runs inside the assigned schema. */
export async function queryDatabase<Row extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) {
  const schema = prototypeSchema();
  const connectionString = process.env.SUPABASE_DB_URL?.trim();
  if (!connectionString) throw new Error("Import the private prototype configuration before using the database.");
  pool ??= new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 10_000 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '10s'");
    await assertPrototypeConnection(client, schema);
    await client.query(`SET LOCAL search_path TO ${quoteIdentifier(schema)}`);
    const result = await client.query<Row>(sql, values);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
