"use client";

import { useEffect, useState } from "react";

type ConnectionState = "checking" | "connected" | "needs-setup" | "unavailable";

type HealthResponse = {
  application?: { running?: boolean };
  supabase?: { configured?: boolean; reachable?: boolean; message?: string };
};

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
  const [applicationState, setApplicationState] = useState<ConnectionState>("checking");
  const [databaseState, setDatabaseState] = useState<ConnectionState>("checking");
  const [applicationDetail, setApplicationDetail] = useState("Checking this Next.js app…");
  const [databaseDetail, setDatabaseDetail] = useState("Checking Supabase setup…");

  useEffect(() => {
    const controller = new AbortController();

    async function checkConnections() {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("The app returned an error.");

        const health: HealthResponse = await response.json();
        setApplicationState(health.application?.running ? "connected" : "unavailable");
        setApplicationDetail(
          health.application?.running
            ? "This Next.js app and its built-in API are ready."
            : "The app responded, but did not report itself as ready.",
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
        setApplicationState("unavailable");
        setDatabaseState("unavailable");
        setApplicationDetail("We could not reach the app. Ask your AI assistant to continue the BoardIQ setup.");
        setDatabaseDetail("Supabase will be checked once the app is running.");
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <StatusCard name="My prototype" state={applicationState} detail={applicationDetail} />
          <StatusCard name="Supabase Database" state={databaseState} detail={databaseDetail} />
        </div>
        {databaseState === "needs-setup" && (
          <p className="mt-6 rounded-lg bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm ring-1 ring-slate-200">
            Ask your AI assistant to continue the BoardIQ setup. It will guide you to enter your Supabase project details in the right private place.
          </p>
        )}
      </div>
    </main>
  );
}
