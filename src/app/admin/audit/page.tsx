import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import AuditLogPanel, { type AuditLogRow } from "@/components/admin/AuditLogPanel";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseKey = supabaseServiceRoleKey ?? supabaseAnonKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

export default async function AdminAuditPage() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("prediction_change_audit")
    .select(
      "id, created_at, actor_type, actor_label, source, target_player_name, target_team_name, fixture_gameweek, fixture_label, fixture_opponent_short, fixture_venue, old_prediction, new_prediction"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as AuditLogRow[];

  return (
    <main className="min-h-screen bg-[var(--nffc-black,#000000)] px-3 py-4 font-mono text-[var(--nffc-white,#f5f5f5)] sm:px-4 lg:px-6">
      <section className="w-full max-w-none">
        <header className="mb-3 border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)]">
          <div className="bg-[var(--nffc-red,#e50914)] px-3 py-2 text-sm font-black uppercase tracking-[0.18em] text-white">
            Admin / Audit Terminal
          </div>

          <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-end md:p-6">
            <div>
              <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.04em] text-[var(--stat-yellow,#ffe44d)] md:text-7xl">
                Prediction Audit Log
              </h1>
              <p className="mt-3 max-w-4xl text-sm font-black uppercase leading-5 tracking-[0.08em] text-white md:text-base">
                Who changed what prediction and when.
              </p>
            </div>

            <Link
              href="/admin"
              className="border border-white bg-[var(--nffc-black,#000000)] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
            >
              Back To Admin
            </Link>
          </div>
        </header>

        <AuditLogPanel rows={rows} showSummary />
      </section>
    </main>
  );
}
