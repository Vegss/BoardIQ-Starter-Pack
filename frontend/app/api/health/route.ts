import { NextResponse } from "next/server";

import { databaseConfiguration, queryDatabase } from "../../../lib/database/server";
import { storageConfiguration } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { configured } = databaseConfiguration();
  const supabase = {
    configured,
    reachable: false,
    message: "Import the private configuration supplied by your workshop organiser to connect your database.",
  };

  if (configured) {
    try {
      await queryDatabase("SELECT 1");
      supabase.reachable = true;
      supabase.message = "Your prototype database is connected.";
    } catch {
      supabase.message = "Your prototype database could not be reached. Ask your AI assistant to check its private configuration.";
    }
  }

  return NextResponse.json({
    status: "ok",
    application: { running: true, service: "my-prototype" },
    supabase,
    storage: { configured: storageConfiguration().configured },
  });
}
