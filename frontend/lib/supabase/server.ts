import "server-only";

import { createClient } from "@supabase/supabase-js";
import { prototypeSchema } from "../prototype-config.mjs";

let cachedBucket: ReturnType<ReturnType<typeof createClient>["storage"]["from"]> | undefined;
let expiresAt = 0;
let login: Promise<NonNullable<typeof cachedBucket>> | undefined;

export function storageConfiguration() {
  return {
    configured: Boolean(
      process.env.SUPABASE_URL && process.env.SUPABASE_KEY &&
      process.env.SUPABASE_STORAGE_EMAIL && process.env.SUPABASE_STORAGE_PASSWORD &&
      process.env.SUPABASE_STORAGE_BUCKET,
    ),
    bucket: process.env.SUPABASE_STORAGE_BUCKET,
  };
}

/** Storage only. Database queries belong in lib/database/server.ts. */
export async function getPrototypeStorage() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY) {
    throw new Error("Administrator API keys belong in .env.admin, not participant runtime settings.");
  }
  const { configured, bucket } = storageConfiguration();
  if (!configured || !bucket) throw new Error("Import the private prototype configuration before using files.");
  const key = process.env.SUPABASE_KEY!;
  if (!key.startsWith("sb_publishable_")) throw new Error("Storage requires the publishable key, not an administrator key.");
  if (cachedBucket && Date.now() < expiresAt - 60_000) return cachedBucket;
  if (login) return login;
  login = signInToStorage(bucket, key);
  try {
    return await login;
  } finally {
    login = undefined;
  }
}

async function signInToStorage(bucket: string, key: string) {
  const client = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: process.env.SUPABASE_STORAGE_EMAIL!,
    password: process.env.SUPABASE_STORAGE_PASSWORD!,
  });
  if (error) throw new Error("The prototype storage login was rejected. Ask the workshop organiser to check its access.");
  const claims = JSON.parse(Buffer.from(data.session!.access_token.split('.')[1], 'base64url').toString());
  if (claims.role !== `${prototypeSchema()}_storage`) {
    throw new Error("The storage account must use its assigned restricted role.");
  }
  expiresAt = (data.session!.expires_at ?? 0) * 1_000;
  cachedBucket = client.storage.from(bucket);
  return cachedBucket;
}
