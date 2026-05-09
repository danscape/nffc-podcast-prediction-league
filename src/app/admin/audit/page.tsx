import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type AuditRow = {
  id: string;
  created_at: string;
  actor_type: string;
  actor_label: string;
  source?: string | null;
  target_player_name: string;
  target_team_name: string | null;
  fixture_gameweek: number | null;
  fixture_label: string | null;
  fixture_opponent_short: string | null;
  fixture_venue: string | null;
  old_prediction: string | null;
  new_prediction: string | null;
};

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function fixtureLabel(row: AuditRow) {
  return [
    row.fixture_label ?? (row.fixture_gameweek ? `GW${row.fixture_gameweek}` : "GW?"),
    row.fixture_opponent_short,
    row.fixture_venue,
  ]
    .filter(Boolean)
    .join(" ");
}

function actorTone(actorType: string) {
  if (actorType === "admin") return "text-[var(--stat-yellow,#ffe44d)]";
  if (actorType === "player") return "text-[var(--stat-cyan,#59efff)]";
  return "text-white";
}

export default async function AdminAuditPage() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("prediction_change_audit")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as AuditRow[];

  return (
    <main className="min-h-screen bg-[var(--nffc-black,#000000)] px-3 py-4 font-mono text-[var(--nffc-white,#f5f5f5)] sm:px-4 lg:px-6">
      <section className="w-full max-w-none">
        <header className="border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)]">
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

        <section className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Rows" value={String(rows.length)} tone="white" />
          <Stat label="Admin changes" value={String(rows.filter((row) => row.actor_type === "admin").length)} tone="yellow" />
          <Stat label="Player changes" value={String(rows.filter((row) => row.actor_type === "player").length)} tone="cyan" />
          <Stat label="Historic" value={String(rows.filter((row) => row.actor_type === "historic" || row.source === "historic_current_state_backfill").length)} tone="orange" />
          <Stat label="Latest" value={rows[0] ? formatDateTime(rows[0].created_at) : "None"} tone="green" />
        </section>

        <section className="mt-3 border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)]">
          <div className="bg-[var(--nffc-red,#e50914)] px-3 py-2 text-sm font-black uppercase tracking-[0.14em] text-white md:text-lg">
            Latest Prediction Changes
          </div>

          <div className="hidden lg:block">
            <div className="grid grid-cols-[190px_140px_minmax(190px,1fr)_minmax(190px,1fr)_180px_90px_90px] border-b border-[var(--nffc-red,#e50914)] text-xs font-black uppercase tracking-[0.12em] text-white">
              <Cell head>When</Cell>
              <Cell head>Actor</Cell>
              <Cell head>Player</Cell>
              <Cell head>Team</Cell>
              <Cell head>Fixture</Cell>
              <Cell head>From</Cell>
              <Cell head last>To</Cell>
            </div>

            {rows.length ? (
              rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[190px_140px_minmax(190px,1fr)_minmax(190px,1fr)_180px_90px_90px] border-b border-[#242424] text-sm font-black uppercase tracking-[0.05em] text-white last:border-b-0"
                >
                  <Cell>{formatDateTime(row.created_at)}</Cell>
                  <Cell className={actorTone(row.actor_type)}>{row.actor_label}</Cell>
                  <Cell>{row.target_player_name}</Cell>
                  <Cell muted>{row.target_team_name ?? "—"}</Cell>
                  <Cell>{fixtureLabel(row)}</Cell>
                  <Cell className="text-[var(--stat-wrong,#ff3030)]">{row.old_prediction ?? (row.source === "historic_current_state_backfill" ? "BASE" : "—")}</Cell>
                  <Cell className="text-[var(--stat-green,#22e55e)]" last>{row.new_prediction ?? "—"}</Cell>
                </div>
              ))
            ) : (
              <div className="px-3 py-5 text-sm font-black uppercase tracking-[0.1em] text-[var(--nffc-muted,#a7a7a7)]">
                No audit rows recorded yet.
              </div>
            )}
          </div>

          <div className="grid gap-px bg-[#242424] lg:hidden">
            {rows.length ? (
              rows.map((row) => (
                <div key={row.id} className="bg-[var(--nffc-black,#000000)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-black uppercase text-white">
                        {row.target_player_name}
                      </div>
                      <div className="mt-1 truncate text-xs font-black uppercase tracking-[0.08em] text-[var(--nffc-muted,#a7a7a7)]">
                        {fixtureLabel(row)} / {row.target_team_name ?? "—"}
                      </div>
                    </div>

                    <div className="text-right text-lg font-black uppercase">
                      <span className="text-[var(--stat-wrong,#ff3030)]">{row.old_prediction ?? (row.source === "historic_current_state_backfill" ? "BASE" : "—")}</span>
                      <span className="px-1 text-[var(--nffc-muted,#a7a7a7)]">→</span>
                      <span className="text-[var(--stat-green,#22e55e)]">{row.new_prediction ?? "—"}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[#242424] pt-2 text-xs font-black uppercase tracking-[0.08em]">
                    <span className={actorTone(row.actor_type)}>{row.actor_label}</span>
                    <span className="text-[var(--nffc-muted,#a7a7a7)]">{formatDateTime(row.created_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-[var(--nffc-black,#000000)] px-3 py-5 text-sm font-black uppercase tracking-[0.08em] text-[var(--nffc-muted,#a7a7a7)]">
                No audit rows recorded yet.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function Cell({
  children,
  head = false,
  muted = false,
  last = false,
  className = "",
}: {
  children: React.ReactNode;
  head?: boolean;
  muted?: boolean;
  last?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        "px-3 py-3",
        last ? "" : "border-r border-[#242424]",
        head ? "text-white" : "",
        muted ? "text-[var(--nffc-muted,#a7a7a7)]" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "yellow" | "cyan" | "orange" | "white";
}) {
  const toneClass =
    tone === "green"
      ? "text-[var(--stat-green,#22e55e)]"
      : tone === "yellow"
        ? "text-[var(--stat-yellow,#ffe44d)]"
        : tone === "cyan"
          ? "text-[var(--stat-cyan,#59efff)]"
          : tone === "orange"
            ? "text-[var(--stat-orange,#ff9f1c)]"
            : "text-white";

  return (
    <div className="border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)]">
      <div className="border-b border-[#242424] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className={`px-3 py-3 text-lg font-black uppercase ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
