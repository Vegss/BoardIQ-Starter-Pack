export const dynamic = "force-dynamic";

export default async function Home() {
  const response = await fetch("http://backend:8000/api/hello");
  const data = await response.json();

  return (
    <main className="grid min-h-screen place-content-center gap-3 bg-slate-50 p-8 text-center text-slate-900">
      <h1 className="text-3xl font-semibold">BoardIQ starter</h1>
      <p className="text-slate-600">{data.message}</p>
    </main>
  );
}