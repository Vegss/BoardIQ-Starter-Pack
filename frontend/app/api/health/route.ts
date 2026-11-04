import { NextResponse } from "next/server";

import { supabaseConfiguration } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { configured, url, key } = supabaseConfiguration();
  const supabase = {
    configured,
    reachable: false,
    message: "Add SUPABASE_URL and SUPABASE_KEY to .env to connect a database.",
  };

  if (configured && url && key) {
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
        headers: { apikey: key },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });

      if (response.ok) {
        supabase.reachable = true;
        supabase.message = "Supabase is connected.";
      } else {
        supabase.message = "Supabase responded, but rejected the connection details.";
      }
    } catch {
      supabase.message = "Supabase could not be reached. Check the URL, key, and internet connection.";
    }
  }

  return NextResponse.json({
    status: "ok",
    application: { running: true, service: "my-prototype" },
    supabase,
  });
}
