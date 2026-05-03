"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import IndividualLeaderboard from "@/components/leaderboards/web/IndividualLeaderboard";
import TeamLeaderboard from "@/components/leaderboards/web/TeamLeaderboard";

type PredictionValue = "W" | "D" | "L";

type IndividualLeaderboardRow = {
  player_id: string;
  player_name: string;
  short_name: string | null;
  table_display_name?: string | null;
  team_name: string;
  base_points: number;
  streak_bonus: number;
  maverick_bonus: number;
  rogue_bonus: number;
  cup_bonus: number;
  total_points: number;
  correct_predictions: number;
  fixtures_scored: number;
  accuracy_percentage: number;
  bonus_points: number | null;
  accuracy_whole_percentage: number | null;
  best_streak: number | null;
  current_streak: number | null;
  team_display_name?: string | null;
  team_abbreviation?: string | null;
  team_logo_url?: string | null;
  team_logo_alt?: string | null;
  team_brand_colour?: string | null;
};

type TeamLeaderboardRow = {
  team_id: string;
  team_name: string;
  display_name: string | null;
  x_handle: string | null;
  total_team_points: number;
  clean_sweeps: number;
  blanks: number;
  best_player_accuracy_percentage: number;
  logo_url: string | null;
  logo_alt: string | null;
  brand_colour: string | null;
  mvp_player_id?: string | null;
  mvp_player_name?: string | null;
  mvp_short_name?: string | null;
  mvp_accuracy_percentage?: number | null;
  latest_gameweek?: number | null;
  latest_gameweek_label?: string | null;
  latest_opponent_short?: string | null;
  points_this_week?: number | null;
};

type FixtureRow = {
  id: string;
  gameweek: number;
  gameweek_label: string;
  opponent_short: string;
  venue: "H" | "A";
  status: string;
  result_confirmed: boolean;
  home_score: number | null;
  away_score: number | null;
  forest_result: PredictionValue | null;
  updated_at: string | null;
};

export default function AdminLeaderboardsPage() {
  const [individualRows, setIndividualRows] = useState<
    IndividualLeaderboardRow[]
  >([]);
  const [teamRows, setTeamRows] = useState<TeamLeaderboardRow[]>([]);
  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"individual" | "teams">("individual");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  async function loadLeaderboards() {
    setLoading(true);
    setMessage(null);

    const [
      { data: individualData, error: individualError },
      { data: teamData, error: teamError },
      { data: fixtureData, error: fixtureError },
    ] = await Promise.all([
      supabase
        .from("individual_leaderboard")
        .select("*")
        .order("total_points", { ascending: false })
        .order("accuracy_whole_percentage", { ascending: false })
        .order("player_name", { ascending: true })
        .range(0, 1000),
      supabase
        .from("team_leaderboard")
        .select("*")
        .order("total_team_points", { ascending: false })
        .order("clean_sweeps", { ascending: false })
        .order("blanks", { ascending: true })
        .order("best_player_accuracy_percentage", { ascending: false })
        .order("team_name", { ascending: true })
        .range(0, 1000),
      supabase
        .from("fixtures")
        .select(
          "id, gameweek, gameweek_label, opponent_short, venue, status, result_confirmed, home_score, away_score, forest_result, updated_at"
        )
        .order("gameweek", { ascending: true })
        .range(0, 100),
    ]);

    if (individualError || teamError || fixtureError) {
      setMessage(
        individualError?.message ??
          teamError?.message ??
          fixtureError?.message ??
          "Could not load leaderboards."
      );
    }

    setIndividualRows((individualData ?? []) as IndividualLeaderboardRow[]);
    setTeamRows((teamData ?? []) as TeamLeaderboardRow[]);
    setFixtures((fixtureData ?? []) as FixtureRow[]);
    setLoading(false);
  }

  const completedFixtures = fixtures.filter((fixture) => fixture.result_confirmed);
  const lastConfirmedFixture =
    completedFixtures[completedFixtures.length - 1] ?? null;

  const filteredIndividualRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return individualRows;

    return individualRows.filter((row) =>
      [
        row.player_name,
        row.short_name,
        row.table_display_name,
        row.team_name,
        row.team_display_name,
        row.team_abbreviation,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [individualRows, query]);

  const filteredTeamRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return teamRows;

    return teamRows.filter((row) =>
      [
        row.team_name,
        row.display_name,
        row.x_handle,
        row.mvp_player_name,
        row.mvp_short_name,
        row.latest_gameweek_label,
        row.latest_opponent_short,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [teamRows, query]);

  return (
    <main className="min-h-screen bg-[#F7F6F2] px-4 py-6 text-[#111111] sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                🔮 Admin
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-[#C8102E] md:text-5xl">
                Leaderboards
              </h1>
              <p className="mt-3 text-sm font-semibold text-neutral-600">
                Review individual and team tables after confirmed results.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={loadLeaderboards}
                className="w-full rounded-full bg-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E] sm:w-fit"
              >
                Refresh
              </button>
              <Link
                href="/admin"
                className="w-full rounded-full border border-[#111111] px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E] sm:w-fit"
              >
                Back to admin
              </Link>
            </div>
          </div>
        </header>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {message}
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <AdminStat label="Players" value={individualRows.length} />
          <AdminStat label="Teams" value={teamRows.length} />
          <AdminStat label="Completed GWs" value={completedFixtures.length} />
          <AdminStat
            label="Remaining GWs"
            value={Math.max(0, fixtures.length - completedFixtures.length)}
          />
        </section>

        {lastConfirmedFixture && (
          <section className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
              Last confirmed result
            </div>
            <div className="mt-2 text-2xl font-black">
              {lastConfirmedFixture.gameweek_label} —{" "}
              {lastConfirmedFixture.opponent_short} {lastConfirmedFixture.venue}
            </div>
            <div className="mt-1 text-sm font-semibold text-neutral-600">
              Score:{" "}
              {lastConfirmedFixture.home_score === null ||
              lastConfirmedFixture.away_score === null
                ? "Not entered"
                : `${lastConfirmedFixture.home_score}-${lastConfirmedFixture.away_score}`}{" "}
              · Forest result: {lastConfirmedFixture.forest_result ?? "—"}
            </div>
          </section>
        )}

        <section className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
                Search
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search players, teams or MVPs"
                className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTab("individual")}
                className={`rounded-full px-5 py-3 text-xs font-black uppercase tracking-wide transition ${
                  tab === "individual"
                    ? "bg-[#111111] text-white"
                    : "border border-[#111111] text-[#111111] hover:border-[#C8102E] hover:text-[#C8102E]"
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setTab("teams")}
                className={`rounded-full px-5 py-3 text-xs font-black uppercase tracking-wide transition ${
                  tab === "teams"
                    ? "bg-[#111111] text-white"
                    : "border border-[#111111] text-[#111111] hover:border-[#C8102E] hover:text-[#C8102E]"
                }`}
              >
                Teams
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-6 text-xl font-black uppercase text-[#C8102E] shadow-sm">
            Loading leaderboards…
          </div>
        ) : tab === "individual" ? (
          <IndividualLeaderboard rows={filteredIndividualRows} />
        ) : (
          <TeamLeaderboard rows={filteredTeamRows} />
        )}
      </section>
    </main>
  );
}

function AdminStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#D9D6D1] bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black text-[#C8102E]">{value}</div>
    </div>
  );
}