/** Apply each Supabase SQL migration once, using the private database URL. */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { assertPrototypeConnection, prototypeSchema, quoteIdentifier } from "../lib/prototype-config.mjs";

const databaseUrl = process.env.SUPABASE_DB_URL;
const migrationsDir = process.env.MIGRATIONS_DIR ?? path.resolve(process.cwd(), "../supabase/migrations");

async function migrationFiles() {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => path.join(migrationsDir, entry.name))
    .sort();
}

if (!databaseUrl) {
  console.log("SUPABASE_DB_URL is not configured; Supabase migrations were skipped.");
  process.exit(0);
}

const files = await migrationFiles();
const schema = prototypeSchema();
const ledger = `${quoteIdentifier(schema)}.boardiq_schema_migrations`;
console.log(`Checking ${files.length} Supabase migration(s) in ${migrationsDir}.`);

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query("BEGIN");
  await assertPrototypeConnection(client, schema);
  await client.query(`SET LOCAL search_path TO ${quoteIdentifier(schema)}`);
  await client.query("SELECT pg_advisory_xact_lock(hashtext(current_database()), hashtext($1))", [schema]);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${ledger} (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const result = await client.query(`SELECT filename, checksum FROM ${ledger}`);
  const applied = new Map(result.rows.map((row) => [row.filename, row.checksum]));

  for (const file of files) {
    const sql = await readFile(file, "utf8");
    const filename = path.basename(file);
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previousChecksum = applied.get(filename);

    if (previousChecksum) {
      if (previousChecksum !== checksum) {
        throw new Error(`Applied migration was changed: ${filename}. Create a new migration instead.`);
      }
      console.log(`Already applied: ${filename}`);
      continue;
    }

    if (sql.trim()) await client.query(sql);
    await client.query(
      `INSERT INTO ${ledger} (filename, checksum) VALUES ($1, $2)`,
      [filename, checksum],
    );
    console.log(`Applied: ${filename}`);
  }

  await client.query("COMMIT");
  console.log("Supabase migrations are up to date.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error("Supabase migration failed. Check the assigned schema, restricted connection and migration SQL.");
  process.exitCode = 1;
} finally {
  await client.end();
}
