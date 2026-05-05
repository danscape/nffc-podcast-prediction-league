import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import LatestGwResultsGraphic from "@/components/social-graphics/LatestGwResultsGraphic";
import type {
  LatestGwBonusResultRow,
  LatestGwResultSummaryRow,
  LatestGwTeamResultRow,
} from "@/components/social-graphics/LatestGwResultsGraphic";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1).replace(".0", "");
}

export default async function AdminSocialResultsPage() {
  const supabase = getSupabaseClient();

  const [
    { data: summaryData, error: summaryError },
    { data: teamData, error: teamError },
    { data: bonusData, error: bonusError },
  ] = await Promise.all([
    supabase.from("latest_confirmed_gw_result_summary").select("*").maybeSingle(),
    supabase
      .from("latest_confirmed_gw_team_results")
      .select("*")
      .order("rank", { ascending: true }),
    supabase
      .from("latest_confirmed_gw_bonus_results")
      .select("*")
      .order("rank", { ascending: true }),
  ]);

  const errorMessage =
    summaryError?.message ?? teamError?.message ?? bonusError?.message ?? null;

  const summary = (summaryData ?? null) as LatestGwResultSummaryRow | null;
  const teamRows = (teamData ?? []) as LatestGwTeamResultRow[];
  const bonusRows = (bonusData ?? []) as LatestGwBonusResultRow[];

  const bonusWinners = bonusRows.filter(
    (row) => Number(row.bonus_points ?? 0) > 0
  );

  const xPostText = [
    `🔮 ${summary?.gameweek_label ?? "Latest GW"} Prediction League results`,
    ``,
    summary
      ? `${summary.home_team} ${summary.home_score}-${summary.away_score} ${summary.away_team}`
      : "Latest result confirmed.",
    ``,
    teamRows[0]
      ? `🏆 Team of the week: ${teamRows[0].display_name} — ${formatPoints(
          teamRows[0].team_points
        )} pts`
      : null,
    bonusRows[0]
      ? `⚽ Top player: ${bonusRows[0].player_display_name} — ${formatPoints(
          bonusRows[0].total_points
        )} pts`
      : null,
    bonusWinners.length
      ? `🎯 Bonus watch: ${bonusWinners
          .slice(0, 3)
          .map((row) => row.player_display_name)
          .join(", ")}`
      : `🎯 No bonus points awarded this week`,
    ``,
    `#NFFC`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <main className="min-h-screen bg-[#F7F6F2] px-4 py-6 text-[#111111] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                🔮 Admin social
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-[#C8102E] md:text-5xl">
                Latest GW results
              </h1>
              <p className="mt-3 text-sm font-semibold text-neutral-600">
                Auto-updated from the most recent confirmed fixture.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/admin/social"
                className="rounded-full border border-[#111111] px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E]"
              >
                Back to social
              </Link>
              <Link
                href="/admin"
                className="rounded-full bg-[#111111] px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
              >
                Back to admin
              </Link>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
            <LatestGwResultsGraphic
              summary={summary}
              teamRows={teamRows}
              bonusRows={bonusRows}
            />
          </div>

          <div className="grid gap-6">
            <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black uppercase">X copy</h2>
                  <p className="text-sm font-semibold text-neutral-600">
                    Copy/paste caption for the latest confirmed result.
                  </p>
                </div>
              </div>

              <pre className="min-h-[220px] whitespace-pre-wrap rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold leading-6 text-[#111111]">
                {xPostText}
              </pre>
            </section>

            <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
              <h2 className="mb-3 text-2xl font-black uppercase">
                Weekly team results
              </h2>

              <div className="grid gap-2">
                {teamRows.map((row) => (
                  <div
                    key={row.team_id}
                    className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-3"
                  >
                    <div className="text-xl font-black text-[#C8102E]">
                      {row.rank}
                    </div>
                    <div>
                      <div className="font-black">{row.display_name}</div>
                      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                        {row.correct_predictions}/{row.players_counted} correct ·{" "}
                        {Math.round(Number(row.correct_percentage ?? 0))}%
                        {row.clean_sweep ? " · Clean sweep" : ""}
                        {row.blank ? " · Blank" : ""}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#111111] px-3 py-2 text-sm font-black text-white">
                      {formatPoints(row.team_points)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
