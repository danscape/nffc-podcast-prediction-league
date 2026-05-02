"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type PredictionValue = "W" | "D" | "L";

type IndividualLeaderboardRow = {
  player_id: string;
  player_name: string;
  short_name: string | null;
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

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "0%";
  return `${Math.round(Number(value))}%`;
}

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1).replace(".0", "");
}

function displayPlayerName(row: IndividualLeaderboardRow) {
  return row.short_name ?? row.player_name;
}

function displayMvpName(row: TeamLeaderboardRow) {
  return row.mvp_short_name ?? row.mvp_player_name ?? "—";
}

function getBonusPoints(row: IndividualLeaderboardRow) {
  return (
    row.bonus_points ??
    row.streak_bonus + row.maverick_bonus + row.rogue_bonus + row.cup_bonus
  );
}

function getAccuracyWhole(row: IndividualLeaderboardRow) {
  return row.accuracy_whole_percentage ?? Math.round(Number(row.accuracy_percentage ?? 0));
}

export default function AdminLeaderboardsPage() {
  const [individualRows, setIndividualRows] = useState<IndividualLeaderboardRow[]>(
    []
  );
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
      [row.player_name, row.short_name, row.team_name]
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

function IndividualLeaderboard({ rows }: { rows: IndividualLeaderboardRow[] }) {
  return (
    <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase">
            Individual leaderboard
          </h2>
          <p className="text-sm text-neutral-600">
            Ranked by total score, then accuracy.
          </p>
        </div>
        <div className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
          {rows.length} players
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#D9D6D1] 2xl:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#111111] text-white">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3 text-right">Total Score</th>
              <th className="px-4 py-3 text-right">Points</th>
              <th className="px-4 py-3 text-right">Bonus Pts</th>
              <th className="px-4 py-3 text-right">Correct</th>
              <th className="px-4 py-3 text-right">Accuracy</th>
              <th className="px-4 py-3 text-right">Best Streak</th>
              <th className="px-4 py-3 text-right">Current Streak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.player_id}
                className="border-b border-[#E7E2DA] last:border-b-0"
              >
                <td className="px-4 py-3 text-xl font-black text-[#C8102E]">
                  {index + 1}
                </td>
                <td className="px-4 py-3">
                  <div className="font-black">{displayPlayerName(row)}</div>
                  {row.short_name && row.short_name !== row.player_name && (
                    <div className="text-xs text-neutral-500">
                      {row.player_name}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-bold">{row.team_name}</td>
                <td className="px-4 py-3 text-right text-2xl font-black">
                  {formatPoints(row.total_points)}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {formatPoints(row.base_points)}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {formatPoints(getBonusPoints(row))}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {row.correct_predictions}/{row.fixtures_scored}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {getAccuracyWhole(row)}%
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {row.best_streak ?? 0}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {row.current_streak ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 2xl:hidden">
        {rows.map((row, index) => (
          <div
            key={row.player_id}
            className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                  Rank {index + 1}
                </div>
                <div className="mt-1 text-xl font-black">
                  {displayPlayerName(row)}
                </div>
                <div className="text-sm font-semibold text-neutral-600">
                  {row.team_name}
                </div>
              </div>
              <div className="text-3xl font-black text-[#C8102E]">
                {formatPoints(row.total_points)}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold md:grid-cols-4">
              <MiniStat label="Points" value={formatPoints(row.base_points)} />
              <MiniStat
                label="Bonus Pts"
                value={formatPoints(getBonusPoints(row))}
              />
              <MiniStat
                label="Correct"
                value={`${row.correct_predictions}/${row.fixtures_scored}`}
              />
              <MiniStat label="Accuracy" value={`${getAccuracyWhole(row)}%`} />
              <MiniStat label="Best Streak" value={row.best_streak ?? 0} />
              <MiniStat label="Current Streak" value={row.current_streak ?? 0} />
              <MiniStat label="Streaker" value={formatPoints(row.streak_bonus)} />
              <MiniStat
                label="Mav/Rogue/Cup"
                value={`${formatPoints(row.maverick_bonus)}/${formatPoints(
                  row.rogue_bonus
                )}/${formatPoints(row.cup_bonus)}`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamLeaderboard({ rows }: { rows: TeamLeaderboardRow[] }) {
  return (
    <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase">Team leaderboard</h2>
          <p className="text-sm text-neutral-600">
            Ranked by team points, then clean sweeps and blanks.
          </p>
        </div>
        <div className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
          {rows.length} teams
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#D9D6D1] xl:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#111111] text-white">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3 text-right">Points</th>
              <th className="px-4 py-3 text-right">Clean Sweeps</th>
              <th className="px-4 py-3 text-right">Blanks</th>
              <th className="px-4 py-3">MVP</th>
              <th className="px-4 py-3 text-right">MVP Accuracy</th>
              <th className="px-4 py-3">X</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.team_id}
                className="border-b border-[#E7E2DA] last:border-b-0"
              >
                <td className="px-4 py-3 text-xl font-black text-[#C8102E]">
                  {index + 1}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {row.logo_url ? (
                      <img
                        src={row.logo_url}
                        alt={row.logo_alt ?? row.display_name ?? row.team_name}
                        className="h-9 w-9 rounded-xl border border-[#D9D6D1] bg-white object-contain"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D9D6D1] bg-[#F7F6F2] text-xs font-black text-[#C8102E]">
                        {row.team_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-black">
                        {row.display_name ?? row.team_name}
                      </div>
                      {row.brand_colour && (
                        <div className="text-xs text-neutral-500">
                          Brand: {row.brand_colour}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-2xl font-black">
                  {formatPoints(row.total_team_points)}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {row.clean_sweeps}
                </td>
                <td className="px-4 py-3 text-right font-bold">{row.blanks}</td>
                <td className="px-4 py-3 font-bold">{displayMvpName(row)}</td>
                <td className="px-4 py-3 text-right font-bold">
                  {formatPercent(
                    row.mvp_accuracy_percentage ??
                      row.best_player_accuracy_percentage
                  )}
                </td>
                <td className="px-4 py-3 font-bold">{row.x_handle ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 xl:hidden">
        {rows.map((row, index) => (
          <div
            key={row.team_id}
            className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {row.logo_url ? (
                  <img
                    src={row.logo_url}
                    alt={row.logo_alt ?? row.display_name ?? row.team_name}
                    className="h-11 w-11 rounded-xl border border-[#D9D6D1] bg-white object-contain"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D9D6D1] bg-white text-xs font-black text-[#C8102E]">
                    {row.team_name.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                    Rank {index + 1}
                  </div>
                  <div className="mt-1 text-xl font-black">
                    {row.display_name ?? row.team_name}
                  </div>
                  <div className="text-sm font-semibold text-neutral-600">
                    {row.x_handle ?? "No X handle"}
                  </div>
                </div>
              </div>

              <div className="text-3xl font-black text-[#C8102E]">
                {formatPoints(row.total_team_points)}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold">
              <MiniStat label="Clean Sweeps" value={row.clean_sweeps} />
              <MiniStat label="Blanks" value={row.blanks} />
              <MiniStat label="MVP" value={displayMvpName(row)} />
              <MiniStat
                label="MVP Accuracy"
                value={formatPercent(
                  row.mvp_accuracy_percentage ??
                    row.best_player_accuracy_percentage
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
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

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}