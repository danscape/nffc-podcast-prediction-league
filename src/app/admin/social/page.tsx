"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type IndividualLeaderboardRow = {
  player_id: string;
  player_name: string;
  short_name: string | null;
  table_display_name: string | null;
  team_name: string;
  team_display_name: string | null;
  team_abbreviation: string | null;
  total_points: number;
  base_points: number;
  streak_bonus: number;
  maverick_bonus: number;
  rogue_bonus: number;
  cup_bonus: number;
  correct_predictions: number;
  completed_predictions: number;
  accuracy_percentage: number;
  current_correct_streak: number;
};

type TeamLeaderboardRow = {
  team_id: string;
  team_name: string;
  display_name: string | null;
  abbreviation: string | null;
  x_handle: string | null;
  total_team_points: number;
  clean_sweeps: number;
  blanks: number;
  player_count: number;
  best_player_accuracy_percentage: number;
};

type FixtureRow = {
  id: string;
  gameweek: number;
  gameweek_label: string;
  opponent_short: string;
  opponent: string;
  venue: "H" | "A";
  home_team: string;
  away_team: string;
  status: string;
  result_confirmed: boolean;
  home_score: number | null;
  away_score: number | null;
  forest_result: "W" | "D" | "L" | null;
  updated_at: string | null;
};

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1).replace(".0", "");
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "0%";
  return `${Math.round(Number(value))}%`;
}

function resultWord(result: "W" | "D" | "L" | null) {
  if (result === "W") return "win";
  if (result === "D") return "draw";
  if (result === "L") return "defeat";
  return "result";
}

function scoreText(fixture: FixtureRow | null) {
  if (!fixture) return "No confirmed result yet.";
  if (fixture.home_score === null || fixture.away_score === null) {
    return `${fixture.gameweek_label}: ${fixture.opponent_short} ${fixture.venue}`;
  }

  return `${fixture.gameweek_label}: ${fixture.home_team} ${fixture.home_score}-${fixture.away_score} ${fixture.away_team}`;
}

export default function AdminSocialPage() {
  const [individualRows, setIndividualRows] = useState<IndividualLeaderboardRow[]>(
    []
  );
  const [teamRows, setTeamRows] = useState<TeamLeaderboardRow[]>([]);
  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSocialData();
  }, []);

  async function loadSocialData() {
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
        .order("accuracy_percentage", { ascending: false })
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
          "id, gameweek, gameweek_label, opponent_short, opponent, venue, home_team, away_team, status, result_confirmed, home_score, away_score, forest_result, updated_at"
        )
        .order("gameweek", { ascending: true })
        .range(0, 100),
    ]);

    if (individualError || teamError || fixtureError) {
      setMessage(
        individualError?.message ??
          teamError?.message ??
          fixtureError?.message ??
          "Could not load social output data."
      );
    }

    setIndividualRows((individualData ?? []) as IndividualLeaderboardRow[]);
    setTeamRows((teamData ?? []) as TeamLeaderboardRow[]);
    setFixtures((fixtureData ?? []) as FixtureRow[]);
    setLoading(false);
  }

  const completedFixtures = fixtures.filter((fixture) => fixture.result_confirmed);
  const lastConfirmedFixture = completedFixtures[completedFixtures.length - 1] ?? null;

  const topIndividualRows = individualRows.slice(0, 10);
  const topTeamRows = teamRows.slice(0, 12);

  const topPlayer = individualRows[0] ?? null;
  const topTeam = teamRows[0] ?? null;

  const bestAccuracyPlayer = useMemo(() => {
    return [...individualRows]
      .filter((row) => Number(row.completed_predictions ?? 0) > 0)
      .sort((a, b) => {
        if (Number(b.accuracy_percentage) !== Number(a.accuracy_percentage)) {
          return Number(b.accuracy_percentage) - Number(a.accuracy_percentage);
        }
        return Number(b.total_points) - Number(a.total_points);
      })[0];
  }, [individualRows]);

  const biggestBonusPlayer = useMemo(() => {
    return [...individualRows].sort((a, b) => {
      const aBonus =
        Number(a.streak_bonus ?? 0) +
        Number(a.maverick_bonus ?? 0) +
        Number(a.rogue_bonus ?? 0) +
        Number(a.cup_bonus ?? 0);

      const bBonus =
        Number(b.streak_bonus ?? 0) +
        Number(b.maverick_bonus ?? 0) +
        Number(b.rogue_bonus ?? 0) +
        Number(b.cup_bonus ?? 0);

      return bBonus - aBonus;
    })[0];
  }, [individualRows]);

  const teamHandles = useMemo(() => {
    return teamRows
      .map((team) => team.x_handle)
      .filter(Boolean)
      .filter((handle, index, array) => array.indexOf(handle) === index)
      .join(" ");
  }, [teamRows]);

  const individualPost = useMemo(() => {
    const leaderName =
      topPlayer?.table_display_name ?? topPlayer?.short_name ?? topPlayer?.player_name;
    const accuracyName =
      bestAccuracyPlayer?.table_display_name ??
      bestAccuracyPlayer?.short_name ??
      bestAccuracyPlayer?.player_name;

    return [
      `🔮 NFFC Podcast Prediction League`,
      ``,
      `${lastConfirmedFixture ? scoreText(lastConfirmedFixture) : "Latest table update"}`,
      ``,
      `🏆 Individual leader: ${leaderName ?? "TBC"} — ${formatPoints(
        topPlayer?.total_points
      )} pts`,
      `⚽ Best accuracy: ${accuracyName ?? "TBC"} — ${formatPercent(
        bestAccuracyPlayer?.accuracy_percentage
      )}`,
      ``,
      `Top 5:`,
      ...individualRows.slice(0, 5).map((row, index) => {
        const name = row.table_display_name ?? row.short_name ?? row.player_name;
        return `${index + 1}. ${name} — ${formatPoints(row.total_points)} pts`;
      }),
      ``,
      `#NFFC`,
    ].join("\n");
  }, [bestAccuracyPlayer, individualRows, lastConfirmedFixture, topPlayer]);

  const teamPost = useMemo(() => {
    const leaderName = topTeam?.display_name ?? topTeam?.team_name;

    return [
      `🔮 NFFC Podcast Prediction League`,
      ``,
      `${lastConfirmedFixture ? scoreText(lastConfirmedFixture) : "Latest team table update"}`,
      ``,
      `🏆 Team leader: ${leaderName ?? "TBC"} — ${formatPoints(
        topTeam?.total_team_points
      )} pts`,
      ``,
      `Top teams:`,
      ...teamRows.slice(0, 5).map((row, index) => {
        const name = row.display_name ?? row.team_name;
        return `${index + 1}. ${name} — ${formatPoints(row.total_team_points)} pts`;
      }),
      ``,
      teamHandles,
      `#NFFC`,
    ]
      .filter((line) => line !== "")
      .join("\n");
  }, [lastConfirmedFixture, teamHandles, teamRows, topTeam]);

  const recapPost = useMemo(() => {
    const bonusName =
      biggestBonusPlayer?.table_display_name ??
      biggestBonusPlayer?.short_name ??
      biggestBonusPlayer?.player_name;

    const bonusTotal =
      Number(biggestBonusPlayer?.streak_bonus ?? 0) +
      Number(biggestBonusPlayer?.maverick_bonus ?? 0) +
      Number(biggestBonusPlayer?.rogue_bonus ?? 0) +
      Number(biggestBonusPlayer?.cup_bonus ?? 0);

    return [
      `🔮 Prediction League recap`,
      ``,
      `${lastConfirmedFixture ? scoreText(lastConfirmedFixture) : "Latest update"}`,
      ``,
      `Forest ${lastConfirmedFixture ? resultWord(lastConfirmedFixture.forest_result) : "result"} reshuffles the table.`,
      ``,
      `🏆 Individual leader: ${
        topPlayer?.table_display_name ?? topPlayer?.short_name ?? topPlayer?.player_name ?? "TBC"
      }`,
      `🏆 Team leader: ${topTeam?.display_name ?? topTeam?.team_name ?? "TBC"}`,
      `⚽ Standout stat: ${bonusName ?? "TBC"} has ${formatPoints(
        bonusTotal
      )} bonus pts`,
      ``,
      `#NFFC`,
    ].join("\n");
  }, [biggestBonusPlayer, lastConfirmedFixture, topPlayer, topTeam]);

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);

    window.setTimeout(() => {
      setCopied(null);
    }, 2000);
  }

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
                Social output
              </h1>
              <p className="mt-3 text-sm font-semibold text-neutral-600">
                Generate weekly post copy and check leaderboard data for X output.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={loadSocialData}
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
          <AdminStat label="Completed GWs" value={completedFixtures.length} />
          <AdminStat label="Players" value={individualRows.length} />
          <AdminStat label="Teams" value={teamRows.length} />
          <AdminStat
            label="Team handles"
            value={teamRows.filter((team) => team.x_handle).length}
          />
        </section>

        {lastConfirmedFixture && (
          <section className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
              Latest confirmed fixture
            </div>
            <div className="mt-2 text-2xl font-black">
              {scoreText(lastConfirmedFixture)}
            </div>
            <div className="mt-1 text-sm font-semibold text-neutral-600">
              Forest result: {lastConfirmedFixture.forest_result ?? "—"} · Status:{" "}
              {lastConfirmedFixture.status}
            </div>
          </section>
        )}

        {loading ? (
          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-6 text-xl font-black uppercase text-[#C8102E] shadow-sm">
            Loading social output…
          </div>
        ) : (
          <div className="grid gap-6">
            <section className="grid gap-4 lg:grid-cols-3">
              <PostCard
                title="Individual leaderboard post"
                text={individualPost}
                copied={copied === "individual"}
                onCopy={() => copyText("individual", individualPost)}
              />
              <PostCard
                title="Team leaderboard post"
                text={teamPost}
                copied={copied === "team"}
                onCopy={() => copyText("team", teamPost)}
              />
              <PostCard
                title="Weekly recap post"
                text={recapPost}
                copied={copied === "recap"}
                onCopy={() => copyText("recap", recapPost)}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <LeaderboardPreview
                title="Individual top 10"
                description="Use this for the individual leaderboard graphic."
              >
                <div className="overflow-hidden rounded-2xl border border-[#D9D6D1]">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-[#111111] text-white">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-4 py-3">Pts</th>
                        <th className="px-4 py-3">Acc.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topIndividualRows.map((row, index) => (
                        <tr
                          key={row.player_id}
                          className="border-b border-[#E7E2DA] last:border-b-0"
                        >
                          <td className="px-4 py-3 font-black text-[#C8102E]">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 font-black">
                            {row.table_display_name ??
                              row.short_name ??
                              row.player_name}
                          </td>
                          <td className="px-4 py-3 text-neutral-600">
                            {row.team_abbreviation ??
                              row.team_display_name ??
                              row.team_name}
                          </td>
                          <td className="px-4 py-3 font-black">
                            {formatPoints(row.total_points)}
                          </td>
                          <td className="px-4 py-3 font-bold">
                            {formatPercent(row.accuracy_percentage)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </LeaderboardPreview>

              <LeaderboardPreview
                title="Team table"
                description="Use this for the team leaderboard graphic."
              >
                <div className="overflow-hidden rounded-2xl border border-[#D9D6D1]">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-[#111111] text-white">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-4 py-3">Pts</th>
                        <th className="px-4 py-3">CS</th>
                        <th className="px-4 py-3">Blank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topTeamRows.map((row, index) => (
                        <tr
                          key={row.team_id}
                          className="border-b border-[#E7E2DA] last:border-b-0"
                        >
                          <td className="px-4 py-3 font-black text-[#C8102E]">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-black">
                              {row.display_name ?? row.team_name}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {row.x_handle ?? "No X handle"}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-black">
                            {formatPoints(row.total_team_points)}
                          </td>
                          <td className="px-4 py-3 font-bold">
                            {row.clean_sweeps}
                          </td>
                          <td className="px-4 py-3 font-bold">{row.blanks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </LeaderboardPreview>
            </section>

            <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-black uppercase">Standout stats</h2>
                <p className="text-sm text-neutral-600">
                  Quick hooks for weekly captions and recap text.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MiniStat
                  label="Individual leader"
                  value={
                    topPlayer
                      ? `${
                          topPlayer.table_display_name ??
                          topPlayer.short_name ??
                          topPlayer.player_name
                        } · ${formatPoints(topPlayer.total_points)} pts`
                      : "TBC"
                  }
                />
                <MiniStat
                  label="Team leader"
                  value={
                    topTeam
                      ? `${topTeam.display_name ?? topTeam.team_name} · ${formatPoints(
                          topTeam.total_team_points
                        )} pts`
                      : "TBC"
                  }
                />
                <MiniStat
                  label="Best accuracy"
                  value={
                    bestAccuracyPlayer
                      ? `${
                          bestAccuracyPlayer.table_display_name ??
                          bestAccuracyPlayer.short_name ??
                          bestAccuracyPlayer.player_name
                        } · ${formatPercent(bestAccuracyPlayer.accuracy_percentage)}`
                      : "TBC"
                  }
                />
                <MiniStat
                  label="Most bonuses"
                  value={
                    biggestBonusPlayer
                      ? `${
                          biggestBonusPlayer.table_display_name ??
                          biggestBonusPlayer.short_name ??
                          biggestBonusPlayer.player_name
                        }`
                      : "TBC"
                  }
                />
              </div>
            </section>
          </div>
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

function PostCard({
  title,
  text,
  copied,
  onCopy,
}: {
  title: string;
  text: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <h2 className="text-xl font-black uppercase">{title}</h2>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-full bg-[#111111] px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre className="min-h-[260px] whitespace-pre-wrap rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold leading-6 text-[#111111]">
        {text}
      </pre>
    </div>
  );
}

function LeaderboardPreview({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-black uppercase">{title}</h2>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}