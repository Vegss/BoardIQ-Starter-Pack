import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const placeholderValues = new Set([
  "",
  "your_supabase_url",
  "your_supabase_key",
  "paste-your-supabase-url-here",
  "paste-your-anon-key-here",
]);

function usable(value: string | undefined) {
  return Boolean(value && !placeholderValues.has(value.trim().toLowerCase()));
}

export function supabaseConfiguration() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_KEY?.trim();

  return {
    configured: usable(url) && usable(key),
    url,
    key,
  };
}

/**
 * Use this helper from Next.js route handlers and Server Components only.
 * It keeps Supabase access on the server and out of browser code.
 */
export function getSupabaseServerClient(): SupabaseClient {
  const { configured, url, key } = supabaseConfiguration();

  if (!configured || !url || !key) {
    throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_KEY to .env.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
