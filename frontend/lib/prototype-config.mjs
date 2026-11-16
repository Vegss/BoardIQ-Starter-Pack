/** Shared validation for runtime, provisioning and migrations. */
export function prototypeSchema(value = process.env.SUPABASE_SCHEMA) {
  const schema = value?.trim();
  if (!schema || !/^prototype_[a-z0-9_]+$/.test(schema) || schema.length > 63) {
    throw new Error("SUPABASE_SCHEMA must be an assigned prototype_ schema. Public and system schemas are not allowed.");
  }
  return schema;
}

export function quoteIdentifier(value) {
  return '"' + value.replaceAll('"', '""') + '"';
}

export async function assertPrototypeConnection(client, schema) {
  const result = await client.query(
    "SELECT current_user AS role, has_schema_privilege(current_user, $1, 'USAGE') AS allowed",
    [schema],
  );
  if (result.rows[0]?.role !== schema || !result.rows[0]?.allowed) {
    throw new Error("Use the restricted database login assigned to this prototype, not an administrator connection.");
  }
}
