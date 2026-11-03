"use client";

import { useEffect, useState } from "react";

type ConnectionState = "checking" | "connected" | "needs-setup" | "unavailable";

type HealthResponse = {
  backend?: { running?: boolean };
  supabase?: { configured?: boolean; reachable?: boolean; message?: string };
};

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

function StatusCard({
  name,
  state,
  detail,
}: {
  name: string;
  state: ConnectionState;
  detail: string;
}) {
  const icon = state === "connected" ? "✓" : state === "checking" ? "…" : "!";
  const colour =
    state === "connected"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : state === "checking"
        ? "border-slate-200 bg-slate-50 text-slate-700"
        : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <section className={`rounded-xl border p-5 text-left ${colour}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-lg font-bold shadow-sm" aria-hidden="true">
          {icon}
        </span>
        <h2 className="font-semibold">{name}</h2>
      </div>
      <p className="mt-3 text-sm leading-6">{detail}</p>
    </section>
  );
}

export default function Home() {
  const [backendState, setBackendState] = useState<ConnectionState>("checking");
  const [databaseState, setDatabaseState] = useState<ConnectionState>("checking");
  const [backendDetail, setBackendDetail] = useState("Checking the local API…");
  const [databaseDetail, setDatabaseDetail] = useState("Checking Supabase setup…");

  useEffect(() => {
    const controller = new AbortController();

    async function checkConnections() {
      try {
        const response = await fetch(`${apiUrl}/health`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("The API returned an error.");

        const health: HealthResponse = await response.json();
        setBackendState(health.backend?.running ? "connected" : "unavailable");
        setBackendDetail(
          health.backend?.running
            ? `Connected to the BoardIQ API at ${apiUrl}.`
            : "The API responded, but did not report itself as ready.",
        );

        if (health.supabase?.reachable) {
          setDatabaseState("connected");
        } else if (health.supabase?.configured) {
          setDatabaseState("unavailable");
        } else {
          setDatabaseState("needs-setup");
        }
        setDatabaseDetail(health.supabase?.message ?? "Supabase status is unavailable.");
      } catch (error) {
        if (controller.signal.aborted) return;
        setBackendState("unavailable");
        setDatabaseState("unavailable");
        setBackendDetail(`We could not reach the API at ${apiUrl}. Start Docker Desktop, then run bash setup.sh.`);
        setDatabaseDetail("Supabase will be checked once the API is running.");
      }
    }

    void checkConnections();
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 sm:p-12">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-700">BoardIQ Prototype Sandbox</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Your workshop space is ready.</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
          Describe the board tool you want to create to your AI assistant. These checks show whether your building blocks are connected.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatusCard name="Frontend" state="connected" detail="This BoardIQ page is open and ready for your idea." />
          <StatusCard name="Backend" state={backendState} detail={backendDetail} />
          <StatusCard name="Supabase Database" state={databaseState} detail={databaseDetail} />
        </div>
        {databaseState === "needs-setup" && (
          <p className="mt-6 rounded-lg bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm ring-1 ring-slate-200">
            To connect a database, run <code className="rounded bg-slate-100 px-1.5 py-0.5 font-medium">bash setup.sh</code> in this project folder and paste your Supabase project URL and anon key when asked.
          </p>
        )}
      </div>
    </main>
  );
}
