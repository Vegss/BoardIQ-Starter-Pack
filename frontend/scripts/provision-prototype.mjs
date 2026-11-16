/** Run only on the organiser's computer with .env.admin. Never in builds. */
import { randomBytes } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { parseEnv } from "node:util";
import { prototypeSchema, quoteIdentifier } from "../lib/prototype-config.mjs";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value || value.includes("[YOUR-PASSWORD]") || /^\*+$/.test(value)) {
    throw new Error(`Set ${name} in the private .env.admin file before provisioning.`);
  }
  return value;
}

function quoteLiteral(value) {
  return "'" + value.replaceAll("'", "''") + "'";
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function auditPrivileges(client, role, allowedSchema) {
  const result = await client.query(`
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname NOT IN ($2, 'pg_catalog', 'information_schema')
      AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND has_schema_privilege($1, n.oid, 'USAGE')
      AND has_table_privilege($1, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    UNION ALL
    SELECT 1 FROM pg_namespace n
    WHERE n.nspname <> $2 AND n.nspname NOT LIKE 'pg_%'
      AND has_schema_privilege($1, n.oid, 'CREATE')
    UNION ALL
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname <> $2 AND n.nspname NOT LIKE 'pg_%' AND p.prosecdef
      AND p.prorettype <> 'event_trigger'::regtype
      AND has_schema_privilege($1, n.oid, 'USAGE')
      AND has_function_privilege($1, p.oid, 'EXECUTE')
    UNION ALL
    SELECT 1 WHERE has_database_privilege($1, current_database(), 'CREATE')
    LIMIT 1
  `, [role, allowedSchema]);
  if (result.rows.length) {
    throw new Error("Existing database privileges grant this login access outside its schema. Review inherited PUBLIC grants before issuing participant credentials.");
  }
}

async function main() {
  const adminFile = option("--admin-file");
  if (adminFile) {
    const settings = parseEnv(await readFile(adminFile, "utf8"));
    for (const key of ['SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL']) {
      process.env[key] = settings[key] ?? '';
    }
  }
  const name = option("--name");
  const output = option("--output");
  if (!name || !/^[a-z][a-z0-9-]{0,47}$/.test(name) || !output) {
    throw new Error("Use provision-prototype.mjs --name workshop-name --output /private/path/workshop-name.env.");
  }
  try {
    await access(output);
    throw new Error("The output file already exists. Choose a new name; existing credentials will not be replaced.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const url = new URL(required("SUPABASE_URL"));
  const publicKey = required("SUPABASE_KEY");
  const adminKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const dbUrl = new URL(required("SUPABASE_DB_URL"));
  if (url.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname)) {
    throw new Error("SUPABASE_URL must be your hosted Supabase project URL.");
  }
  if (!['postgres:', 'postgresql:'].includes(dbUrl.protocol)) {
    throw new Error("SUPABASE_DB_URL must be a PostgreSQL connection string.");
  }
  if (!publicKey.startsWith("sb_publishable_")) {
    throw new Error("Use the project's publishable key in SUPABASE_KEY.");
  }
  const projectRef = url.hostname.split(".")[0];
  const pooled = dbUrl.hostname.endsWith(".pooler.supabase.com");
  if ((pooled && decodeURIComponent(dbUrl.username) !== `postgres.${projectRef}`) ||
      (!pooled && dbUrl.hostname !== `db.${projectRef}.supabase.co`)) {
    throw new Error("The administrator database connection must match SUPABASE_URL. Use the same project's Connect dialog.");
  }
  if (!decodeURIComponent(dbUrl.password)) throw new Error("Enter the database password in .env.admin.");

  const id = randomBytes(10).toString("hex");
  const schema = prototypeSchema(`prototype_${id}`);
  const storageRole = `${schema}_storage`;
  const bucket = `prototype-${id}-files`;
  const password = randomBytes(32).toString("base64url");
  const storagePassword = randomBytes(32).toString("base64url");
  const email = `prototype-${id}@workshop.boardiq.invalid`;
  const admin = createClient(url.origin, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20_000) }) },
  });
  const client = new pg.Client({ connectionString: dbUrl.toString(), connectionTimeoutMillis: 10_000 });
  let userId;
  let bucketCreated = false;
  let committed = false;
  let stage = "database connection";
  try {
    await client.connect();
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    stage = "storage account creation";
    const { data, error } = await admin.auth.admin.createUser({
      email, password: storagePassword, email_confirm: true, role: storageRole,
      app_metadata: { boardiq_prototype: schema },
    });
    if (error || !data.user) throw new Error("Supabase rejected creation of the technical storage account. Check the administrator API key.");
    userId = data.user.id;
    if (!/^[0-9a-f-]{36}$/.test(userId)) throw new Error("Unexpected storage account ID.");
    if (data.user.role !== storageRole) throw new Error("Supabase rejected the restricted storage role.");

    // Bucket API calls must precede policy DDL: the latter locks Storage tables
    // until commit and would otherwise block the API from creating the bucket.
    stage = "private bucket creation";
    const bucketResult = await admin.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"],
    });
    if (bucketResult.error) throw new Error("Supabase rejected bucket creation. Check the administrator key and Storage settings.");
    bucketCreated = true;

    const templatePath = path.join(
      process.env.MIGRATIONS_DIR ?? path.resolve(process.cwd(), "../supabase/migrations"),
      "provisioning/20261116140000_create_prototype.sql",
    );
    const template = await readFile(templatePath, "utf8");
    const replacements = {
      ROLE: quoteIdentifier(schema), PASSWORD: quoteLiteral(password),
      STORAGE_ROLE: quoteIdentifier(storageRole),
      BUCKET: quoteLiteral(bucket), USER_ID: quoteLiteral(userId),
      OBJECT_GUARD: quoteIdentifier(`${schema}_objects_guard`),
      OBJECT_ALLOW: quoteIdentifier(`${schema}_objects_allow`),
      BUCKET_GUARD: quoteIdentifier(`${schema}_bucket_guard`),
      BUCKET_ALLOW: quoteIdentifier(`${schema}_bucket_allow`),
      BUCKET_INSERT_GUARD: quoteIdentifier(`${schema}_bucket_insert`),
      BUCKET_UPDATE_GUARD: quoteIdentifier(`${schema}_bucket_update`),
      BUCKET_DELETE_GUARD: quoteIdentifier(`${schema}_bucket_delete`),
    };
    const sql = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
      if (!(key in replacements)) throw new Error("Unknown token in provisioning SQL.");
      return replacements[key];
    });
    stage = "schema and storage permissions";
    await client.query(sql);
    stage = "database isolation checks";
    await auditPrivileges(client, schema, schema);
    await auditPrivileges(client, storageRole, 'storage');
    await client.query("COMMIT");
    committed = true;

    const prototypeUrl = new URL(dbUrl);
    prototypeUrl.username = pooled ? `${schema}.${projectRef}` : schema;
    prototypeUrl.password = password;
    const config = {
      SUPABASE_URL: url.origin, SUPABASE_KEY: publicKey,
      SUPABASE_DB_URL: prototypeUrl.toString(), SUPABASE_SCHEMA: schema,
      SUPABASE_STORAGE_BUCKET: bucket, SUPABASE_STORAGE_EMAIL: email,
      SUPABASE_STORAGE_PASSWORD: storagePassword,
    };
    await mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
    await writeFile(output, `# Private configuration for ${name}. Never commit or share publicly.\n` +
      Object.entries(config).map(([key, value]) => `${key}=${value}`).join("\n") + "\n",
    { mode: 0o600, flag: "wx" });
    console.log(`Created ${name}: restricted schema and private bucket. Configuration saved to the private output file.`);
  } catch (error) {
    console.error(`Provisioning stopped during ${stage}${error.code ? ` (database code ${error.code})` : ''}.`);
    if (!committed) {
      await client.query("ROLLBACK").catch(() => undefined);
      let cleanupFailed = false;
      if (bucketCreated) {
        const result = await admin.storage.deleteBucket(bucket);
        cleanupFailed ||= Boolean(result.error);
      }
      if (userId) {
        const result = await admin.auth.admin.deleteUser(userId);
        cleanupFailed ||= Boolean(result.error);
      }
      if (cleanupFailed) console.error(`Cleanup needs administrator attention for ${schema}. No participant credentials were issued.`);
    } else {
      console.error(`Provisioned ${schema}, but saving credentials failed. Administrator cleanup is required before retrying.`);
    }
    // Never print raw database/API errors or connection strings.
    if (error.message?.startsWith("Existing database privileges") || error.message?.startsWith("Authenticated users already") ||
        error.message?.startsWith("Supabase rejected") || error.message === "Unknown token in provisioning SQL.") {
      throw error;
    }
    throw new Error("Provisioning did not complete. Check the private administrator settings and database permissions.");
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  // Only our own messages are safe; filesystem errors may contain private paths.
  console.error(error.code ? "Provisioning could not access its private configuration or output file." : error.message);
  process.exitCode = 1;
});
