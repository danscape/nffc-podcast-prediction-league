import { supabase } from "@/lib/supabaseClient";

export default async function TestSupabasePage() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .order("key");

  return (
    <main className="min-h-screen bg-[var(--nffc-black,#000000)] p-8 text-[var(--nffc-white,#f5f5f5)]">
      <h1 className="mb-6 text-3xl font-bold">Supabase Connection Test</h1>

      <div className="mb-6 rounded-lg border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4">
        <div className="font-semibold">Status</div>
        <div className="text-sm">
          {error
            ? "Error returned from Supabase"
            : data && data.length > 0
              ? `Connected. ${data.length} setting rows found.`
              : "Connected, but no rows returned."}
        </div>
      </div>

      {error && (
        <pre className="mb-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <pre className="rounded-lg border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}