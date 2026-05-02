import { supabase } from "@/lib/supabaseClient";

export default async function TestSupabasePage() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .order("key");

  return (
    <main className="min-h-screen bg-[#F7F6F2] p-8 text-[#111111]">
      <h1 className="mb-6 text-3xl font-bold">Supabase Connection Test</h1>

      <div className="mb-6 rounded-lg border border-[#D9D6D1] bg-white p-4">
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

      <pre className="rounded-lg border border-[#D9D6D1] bg-white p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}