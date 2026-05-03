"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type PredictionValue = "W" | "D" | "L";

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
  forest_result: PredictionValue | null;
  kickoff_at?: string | null;
  updated_at: string | null;
};

type CurrentPredictionRow = {
  fixture_id: string;
  player_id: string;
  prediction: PredictionValue;
};

type PlayerTeamRow = {
  id: string;
  team_id: string | null;
  teams:
    | {
        team_name: string;
        display_name: string | null;
        abbreviation: string | null;
      }
    | {
        team_name: string;
        display_name: string | null;
        abbreviation: string | null;
      }[]
    | null;
};

type FixturePredictionStats = {
  total: number;
  forestWinCount: number;
  drawCount: number;
  opponentWinCount: number;
  forestWinPercent: number;
  drawPercent: number;
  opponentWinPercent: number;
  forestPositivePercent: number;
};

type DifficultyRank = {
  rank: number;
  totalFixtures: number;
  lossPercent: number;
};

type TeamOutlook = {
  teamName: string;
  abbreviation: string | null;
  total: number;
  forestWinPercent: number;
  drawPercent: number;
  opponentWinPercent: number;
  outlookLabel: string;
};

const clubLogoMap: Record<string, string> = {
  arsenal: "/club-logos/arsenal.png",
  "aston villa": "/club-logos/aston-villa.png",
  "aston-villa": "/club-logos/aston-villa.png",
  bournemouth: "/club-logos/bournemouth.png",
  brentford: "/club-logos/brentford.png",
  brighton: "/club-logos/brighton.png",
  burnley: "/club-logos/burnley.png",
  chelsea: "/club-logos/chelsea.png",
  "crystal palace": "/club-logos/crystal-palace.png",
  "crystal-palace": "/club-logos/crystal-palace.png",
  everton: "/club-logos/everton.png",
  fulham: "/club-logos/fulham.png",
  leeds: "/club-logos/leeds.png",
  "leeds united": "/club-logos/leeds.png",
  liverpool: "/club-logos/liverpool.png",
  "man city": "/club-logos/man-city.png",
  "manchester city": "/club-logos/man-city.png",
  "man united": "/club-logos/man-united.png",
  "manchester united": "/club-logos/man-united.png",
  newcastle: "/club-logos/newcastle.png",
  "newcastle united": "/club-logos/newcastle.png",
  forest: "/club-logos/nottingham-forest.png",
  "nottingham forest": "/club-logos/nottingham-forest.png",
  "nottingham forest fc": "/club-logos/nottingham-forest.png",
  sunderland: "/club-logos/sunderland.png",
  spurs: "/club-logos/tottenham.png",
  tottenham: "/club-logos/tottenham.png",
  "tottenham hotspur": "/club-logos/tottenham.png",
  "west ham": "/club-logos/west-ham.png",
  "west ham united": "/club-logos/west-ham.png",
  wolves: "/club-logos/wolves.png",
  wolverhampton: "/club-logos/wolves.png",
  "wolverhampton wanderers": "/club-logos/wolves.png",
};

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1).replace(".0", "");
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0%";
  }

  return `${Math.round(Number(value))}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Date TBC";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function resultWord(result: PredictionValue | null) {
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

function normaliseClubName(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\bfc\b/g, "")
    .replace(/\bafc\b/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getClubLogoPath(name: string | null | undefined) {
  const normalisedName = normaliseClubName(name);

  return (
    clubLogoMap[normalisedName] ??
    clubLogoMap[normalisedName.replaceAll(" ", "-")] ??
    null
  );
}

function getInitials(name: string | null | undefined) {
  const words = String(name ?? "")
    .replace(/fc$/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getFixtureDisplayTeams(fixture: FixtureRow | null) {
  if (!fixture) {
    return {
      forestName: "Nottingham Forest",
      opponentName: "Opponent",
      forestSideLabel: "Forest",
      opponentSideLabel: "Opponent",
    };
  }

  const isForestHome = fixture.venue === "H";

  return {
    forestName: "Nottingham Forest",
    opponentName: fixture.opponent_short || fixture.opponent,
    forestSideLabel: isForestHome ? fixture.home_team : fixture.away_team,
    opponentSideLabel: isForestHome ? fixture.away_team : fixture.home_team,
  };
}

function calculateFixturePredictionStats(
  fixture: FixtureRow | null,
  predictionRows: CurrentPredictionRow[]
): FixturePredictionStats {
  if (!fixture) {
    return {
      total: 0,
      forestWinCount: 0,
      drawCount: 0,
      opponentWinCount: 0,
      forestWinPercent: 0,
      drawPercent: 0,
      opponentWinPercent: 0,
      forestPositivePercent: 0,
    };
  }

  const fixturePredictions = predictionRows.filter(
    (row) => row.fixture_id === fixture.id
  );

  const total = fixturePredictions.length;
  const forestWinCount = fixturePredictions.filter(
    (row) => row.prediction === "W"
  ).length;
  const drawCount = fixturePredictions.filter(
    (row) => row.prediction === "D"
  ).length;
  const opponentWinCount = fixturePredictions.filter(
    (row) => row.prediction === "L"
  ).length;

  return {
    total,
    forestWinCount,
    drawCount,
    opponentWinCount,
    forestWinPercent: total ? (forestWinCount / total) * 100 : 0,
    drawPercent: total ? (drawCount / total) * 100 : 0,
    opponentWinPercent: total ? (opponentWinCount / total) * 100 : 0,
    forestPositivePercent: total ? ((forestWinCount + drawCount) / total) * 100 : 0,
  };
}

function getDifficultyRank(
  nextFixture: FixtureRow | null,
  fixtures: FixtureRow[],
  predictionRows: CurrentPredictionRow[]
): DifficultyRank | null {
  if (!nextFixture) return null;

  const rankedFixtures = fixtures
    .map((fixture) => {
      const stats = calculateFixturePredictionStats(fixture, predictionRows);

      return {
        fixtureId: fixture.id,
        lossPercent: stats.opponentWinPercent,
        predictionTotal: stats.total,
      };
    })
    .filter((item) => item.predictionTotal > 0)
    .sort((a, b) => b.lossPercent - a.lossPercent);

  const rankIndex = rankedFixtures.findIndex(
    (item) => item.fixtureId === nextFixture.id
  );

  if (rankIndex === -1) return null;

  return {
    rank: rankIndex + 1,
    totalFixtures: rankedFixtures.length,
    lossPercent: rankedFixtures[rankIndex].lossPercent,
  };
}

function getTeamObject(row: PlayerTeamRow) {
  if (Array.isArray(row.teams)) return row.teams[0] ?? null;
  return row.teams;
}

function getTeamOutlooks(
  nextFixture: FixtureRow | null,
  predictionRows: CurrentPredictionRow[],
  playerRows: PlayerTeamRow[]
) {
  if (!nextFixture) {
    return {
      mostOptimistic: null,
      mostPessimistic: null,
    };
  }

  const playerTeamMap = new Map<
    string,
    {
      teamName: string;
      abbreviation: string | null;
    }
  >();

  playerRows.forEach((player) => {
    const team = getTeamObject(player);

    if (!team) return;

    playerTeamMap.set(player.id, {
      teamName: team.display_name ?? team.team_name,
      abbreviation: team.abbreviation,
    });
  });

  const teamGroups = new Map<
    string,
    {
      teamName: string;
      abbreviation: string | null;
      predictions: PredictionValue[];
    }
  >();

  predictionRows
    .filter((row) => row.fixture_id === nextFixture.id)
    .forEach((row) => {
      const team = playerTeamMap.get(row.player_id);

      if (!team) return;

      const key = team.teamName;

      const existing = teamGroups.get(key);

      if (existing) {
        existing.predictions.push(row.prediction);
        return;
      }

      teamGroups.set(key, {
        teamName: team.teamName,
        abbreviation: team.abbreviation,
        predictions: [row.prediction],
      });
    });

  const outlooks: TeamOutlook[] = Array.from(teamGroups.values())
    .filter((group) => group.predictions.length > 0)
    .map((group) => {
      const total = group.predictions.length;
      const winCount = group.predictions.filter((value) => value === "W").length;
      const drawCount = group.predictions.filter((value) => value === "D").length;
      const lossCount = group.predictions.filter((value) => value === "L").length;
      const forestWinPercent = (winCount / total) * 100;
      const drawPercent = (drawCount / total) * 100;
      const opponentWinPercent = (lossCount / total) * 100;

      const outlookLabel =
        forestWinPercent >= 50
          ? "strongest Forest outlook"
          : opponentWinPercent >= 50
            ? "most cautious outlook"
            : "split outlook";

      return {
        teamName: group.teamName,
        abbreviation: group.abbreviation,
        total,
        forestWinPercent,
        drawPercent,
        opponentWinPercent,
        outlookLabel,
      };
    });

  const mostOptimistic =
    [...outlooks].sort((a, b) => {
      if (b.forestWinPercent !== a.forestWinPercent) {
        return b.forestWinPercent - a.forestWinPercent;
      }

      return (
        b.forestWinPercent +
        b.drawPercent -
        (a.forestWinPercent + a.drawPercent)
      );
    })[0] ?? null;

  const mostPessimistic =
    [...outlooks].sort((a, b) => {
      if (b.opponentWinPercent !== a.opponentWinPercent) {
        return b.opponentWinPercent - a.opponentWinPercent;
      }

      return a.forestWinPercent - b.forestWinPercent;
    })[0] ?? null;

  return {
    mostOptimistic,
    mostPessimistic,
  };
}

function buildPreviewPost({
  fixture,
  stats,
  difficultyRank,
  mostOptimistic,
  mostPessimistic,
}: {
  fixture: FixtureRow | null;
  stats: FixturePredictionStats;
  difficultyRank: DifficultyRank | null;
  mostOptimistic: TeamOutlook | null;
  mostPessimistic: TeamOutlook | null;
}) {
  if (!fixture) {
    return [
      "🔮 NFFC Podcast Prediction League",
      "",
      "Next GW preview will appear once an upcoming fixture is available.",
      "",
      "#NFFC",
    ].join("\n");
  }

  const opponentName = fixture.opponent_short || fixture.opponent;
  const difficultyLine = difficultyRank
    ? `Difficulty rating: ${difficultyRank.rank}/${difficultyRank.totalFixtures} hardest by prediction sentiment`
    : "Difficulty rating: TBC";

  const optimisticLine = mostOptimistic
    ? `${mostOptimistic.teamName} are the most positive: ${formatPercent(
        mostOptimistic.forestWinPercent
      )} Forest win`
    : null;

  const pessimisticLine = mostPessimistic
    ? `${mostPessimistic.teamName} are most cautious: ${formatPercent(
        mostPessimistic.opponentWinPercent
      )} ${opponentName} win`
    : null;

  return [
    "🔮 NFFC Podcast Prediction League",
    "",
    `${fixture.gameweek_label} preview: Forest ${
      fixture.venue === "H" ? "v" : "at"
    } ${opponentName}`,
    `${formatDateTime(fixture.kickoff_at)}`,
    "",
    `Prediction split from ${stats.total} players:`,
    `🟢 Forest win: ${formatPercent(stats.forestWinPercent)} (${stats.forestWinCount})`,
    `🟠 Draw: ${formatPercent(stats.drawPercent)} (${stats.drawCount})`,
    `🔴 ${opponentName} win: ${formatPercent(stats.opponentWinPercent)} (${stats.opponentWinCount})`,
    "",
    difficultyLine,
    optimisticLine,
    pessimisticLine,
    "",
    "#NFFC",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function AdminSocialPage() {
  const [individualRows, setIndividualRows] = useState<IndividualLeaderboardRow[]>(
    []
  );
  const [teamRows, setTeamRows] = useState<TeamLeaderboardRow[]>([]);
  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
  const [predictionRows, setPredictionRows] = useState<CurrentPredictionRow[]>([]);
  const [playerRows, setPlayerRows] = useState<PlayerTeamRow[]>([]);
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
      { data: playerData, error: playerError },
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
          "id, gameweek, gameweek_label, opponent_short, opponent, venue, home_team, away_team, status, result_confirmed, home_score, away_score, forest_result, kickoff_at, updated_at"
        )
        .order("gameweek", { ascending: true })
        .range(0, 100),
      supabase
        .from("players")
        .select("id, team_id, teams(team_name, display_name, abbreviation)")
        .eq("active", true)
        .range(0, 1000),
    ]);

    const loadedFixtures = (fixtureData ?? []) as FixtureRow[];
    const fixtureIds = loadedFixtures.map((fixture) => fixture.id);

    let loadedPredictionRows: CurrentPredictionRow[] = [];

    if (fixtureIds.length) {
      const { data: predictionData, error: predictionError } = await supabase
        .from("current_predictions")
        .select("fixture_id, player_id, prediction")
        .in("fixture_id", fixtureIds)
        .range(0, 5000);

      if (predictionError) {
        setMessage(predictionError.message);
      }

      loadedPredictionRows = (predictionData ?? []) as CurrentPredictionRow[];
    }

    if (individualError || teamError || fixtureError || playerError) {
      setMessage(
        individualError?.message ??
          teamError?.message ??
          fixtureError?.message ??
          playerError?.message ??
          "Could not load social output data."
      );
    }

    setIndividualRows((individualData ?? []) as IndividualLeaderboardRow[]);
    setTeamRows((teamData ?? []) as TeamLeaderboardRow[]);
    setFixtures(loadedFixtures);
    setPredictionRows(loadedPredictionRows);
    setPlayerRows((playerData ?? []) as PlayerTeamRow[]);
    setLoading(false);
  }

  const completedFixtures = fixtures.filter((fixture) => fixture.result_confirmed);
  const lastConfirmedFixture = completedFixtures[completedFixtures.length - 1] ?? null;

  const nextFixture = useMemo(() => {
    return fixtures.find((fixture) => !fixture.result_confirmed) ?? null;
  }, [fixtures]);

  const topIndividualRows = individualRows.slice(0, 10);
  const topTeamRows = teamRows.slice(0, 12);

  const topPlayer = individualRows[0] ?? null;
  const topTeam = teamRows[0] ?? null;

  const nextFixtureStats = useMemo(() => {
    return calculateFixturePredictionStats(nextFixture, predictionRows);
  }, [nextFixture, predictionRows]);

  const nextFixtureDifficultyRank = useMemo(() => {
    return getDifficultyRank(nextFixture, fixtures, predictionRows);
  }, [fixtures, nextFixture, predictionRows]);

  const { mostOptimistic, mostPessimistic } = useMemo(() => {
    return getTeamOutlooks(nextFixture, predictionRows, playerRows);
  }, [nextFixture, playerRows, predictionRows]);

  const nextFixtureTeams = getFixtureDisplayTeams(nextFixture);

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

  const previewPost = useMemo(() => {
    return buildPreviewPost({
      fixture: nextFixture,
      stats: nextFixtureStats,
      difficultyRank: nextFixtureDifficultyRank,
      mostOptimistic,
      mostPessimistic,
    });
  }, [mostOptimistic, mostPessimistic, nextFixture, nextFixtureDifficultyRank, nextFixtureStats]);

  const individualPost = useMemo(() => {
    const leaderName =
      topPlayer?.table_display_name ?? topPlayer?.short_name ?? topPlayer?.player_name;
    const accuracyName =
      bestAccuracyPlayer?.table_display_name ??
      bestAccuracyPlayer?.short_name ??
      bestAccuracyPlayer?.player_name;

    return [
      "🔮 NFFC Podcast Prediction League",
      "",
      `${lastConfirmedFixture ? scoreText(lastConfirmedFixture) : "Latest table update"}`,
      "",
      `🏆 Individual leader: ${leaderName ?? "TBC"} — ${formatPoints(
        topPlayer?.total_points
      )} pts`,
      `⚽ Best accuracy: ${accuracyName ?? "TBC"} — ${formatPercent(
        bestAccuracyPlayer?.accuracy_percentage
      )}`,
      "",
      "Top 5:",
      ...individualRows.slice(0, 5).map((row, index) => {
        const name = row.table_display_name ?? row.short_name ?? row.player_name;
        return `${index + 1}. ${name} — ${formatPoints(row.total_points)} pts`;
      }),
      "",
      "#NFFC",
    ].join("\n");
  }, [bestAccuracyPlayer, individualRows, lastConfirmedFixture, topPlayer]);

  const teamPost = useMemo(() => {
    const leaderName = topTeam?.display_name ?? topTeam?.team_name;

    return [
      "🔮 NFFC Podcast Prediction League",
      "",
      `${lastConfirmedFixture ? scoreText(lastConfirmedFixture) : "Latest team table update"}`,
      "",
      `🏆 Team leader: ${leaderName ?? "TBC"} — ${formatPoints(
        topTeam?.total_team_points
      )} pts`,
      "",
      "Top teams:",
      ...teamRows.slice(0, 5).map((row, index) => {
        const name = row.display_name ?? row.team_name;
        return `${index + 1}. ${name} — ${formatPoints(row.total_team_points)} pts`;
      }),
      "",
      teamHandles,
      "#NFFC",
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
      "🔮 Prediction League recap",
      "",
      `${lastConfirmedFixture ? scoreText(lastConfirmedFixture) : "Latest update"}`,
      "",
      `Forest ${
        lastConfirmedFixture ? resultWord(lastConfirmedFixture.forest_result) : "result"
      } reshuffles the table.`,
      "",
      `🏆 Individual leader: ${
        topPlayer?.table_display_name ??
        topPlayer?.short_name ??
        topPlayer?.player_name ??
        "TBC"
      }`,
      `🏆 Team leader: ${topTeam?.display_name ?? topTeam?.team_name ?? "TBC"}`,
      `⚽ Standout stat: ${bonusName ?? "TBC"} has ${formatPoints(
        bonusTotal
      )} bonus pts`,
      "",
      "#NFFC",
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
                Generate weekly post copy and preview graphics for X output.
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

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <AdminStat label="Completed GWs" value={completedFixtures.length} />
          <AdminStat label="Players" value={individualRows.length} />
          <AdminStat label="Teams" value={teamRows.length} />
          <AdminStat label="Prediction rows" value={predictionRows.length} />
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
            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <SocialPreviewGraphic
                fixture={nextFixture}
                stats={nextFixtureStats}
                difficultyRank={nextFixtureDifficultyRank}
                forestName={nextFixtureTeams.forestName}
                opponentName={nextFixtureTeams.opponentName}
                mostOptimistic={mostOptimistic}
                mostPessimistic={mostPessimistic}
              />

              <PostCard
                title="Next gameweek preview post"
                text={previewPost}
                copied={copied === "preview"}
                onCopy={() => copyText("preview", previewPost)}
              />
            </section>

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

function SocialPreviewGraphic({
  fixture,
  stats,
  difficultyRank,
  forestName,
  opponentName,
  mostOptimistic,
  mostPessimistic,
}: {
  fixture: FixtureRow | null;
  stats: FixturePredictionStats;
  difficultyRank: DifficultyRank | null;
  forestName: string;
  opponentName: string;
  mostOptimistic: TeamOutlook | null;
  mostPessimistic: TeamOutlook | null;
}) {
  const opponentWinLabel = `${opponentName} win`;
  const forestLogo = getClubLogoPath(forestName);
  const opponentLogo = getClubLogoPath(opponentName);

  return (
    <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-black uppercase">Next GW preview graphic</h2>
        <p className="text-sm text-neutral-600">
          Auto-updating layout for the upcoming fixture prediction split.
        </p>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#111111] bg-[#111111] text-white shadow-sm">
        <div className="relative aspect-[16/9] min-h-[560px] bg-[radial-gradient(circle_at_top_left,_#C8102E_0,_#7A0719_34%,_#111111_72%)] p-8">
          <div className="absolute inset-0 opacity-[0.08]">
            <div className="h-full w-full bg-[linear-gradient(135deg,_transparent_0,_transparent_47%,_#ffffff_47%,_#ffffff_53%,_transparent_53%,_transparent_100%)]" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="text-lg font-black uppercase tracking-[0.26em] text-white/80">
                    🔮 NFFC Podcast Prediction League
                  </div>
                  <h3 className="mt-2 text-6xl font-black uppercase leading-none tracking-tight text-white">
                    {fixture?.gameweek_label ?? "GW"}
                  </h3>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right backdrop-blur">
                  <div className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/60">
                    Kick-off
                  </div>
                  <div className="mt-1 text-lg font-black">
                    {formatDateTime(fixture?.kickoff_at)}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-5">
                <ClubLockup
                  name="Forest"
                  fullName={forestName}
                  logoPath={forestLogo}
                  align="left"
                />

                <div className="rounded-full border border-white/15 bg-white px-5 py-3 text-2xl font-black uppercase text-[#111111] shadow">
                  v
                </div>

                <ClubLockup
                  name={opponentName}
                  fullName={opponentName}
                  logoPath={opponentLogo}
                  align="right"
                />
              </div>
            </div>

            <div className="grid gap-5">
              <div className="grid grid-cols-3 gap-3">
                <PredictionSplitCard
                  label="Forest win"
                  value={stats.forestWinPercent}
                  count={stats.forestWinCount}
                  total={stats.total}
                  tone="green"
                />
                <PredictionSplitCard
                  label="Draw"
                  value={stats.drawPercent}
                  count={stats.drawCount}
                  total={stats.total}
                  tone="amber"
                />
                <PredictionSplitCard
                  label={opponentWinLabel}
                  value={stats.opponentWinPercent}
                  count={stats.opponentWinCount}
                  total={stats.total}
                  tone="red"
                />
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/10 backdrop-blur">
                <div className="grid h-8 grid-cols-[var(--forest)_var(--draw)_var(--opponent)]">
                  <div
                    className="bg-green-500"
                    style={
                      {
                        "--forest": `${Math.max(stats.forestWinPercent, 0)}fr`,
                      } as React.CSSProperties
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <GraphicInfoPill
                  label="Predictions counted"
                  value={stats.total || "N/A"}
                />
                <GraphicInfoPill
                  label="Difficulty rank"
                  value={
                    difficultyRank
                      ? `${difficultyRank.rank}/${difficultyRank.totalFixtures} hardest`
                      : "TBC"
                  }
                />
                <GraphicInfoPill
                  label="Forest positive"
                  value={formatPercent(stats.forestPositivePercent)}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <TeamMoodCard
                  label="Most positive team"
                  outlook={mostOptimistic}
                  fallback="No team split yet"
                  mode="positive"
                />
                <TeamMoodCard
                  label="Most cautious team"
                  outlook={mostPessimistic}
                  fallback="No team split yet"
                  mode="cautious"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClubLockup({
  name,
  fullName,
  logoPath,
  align,
}: {
  name: string;
  fullName: string;
  logoPath: string | null;
  align: "left" | "right";
}) {
  const isRight = align === "right";

  return (
    <div
      className={`flex items-center gap-5 ${
        isRight ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      <ClubLogo name={fullName} logoPath={logoPath} />
      <div>
        <div className="text-[0.72rem] font-black uppercase tracking-[0.25em] text-white/55">
          {isRight ? "Opponent" : "Home team"}
        </div>
        <div className="mt-1 text-4xl font-black uppercase leading-none text-white">
          {name}
        </div>
      </div>
    </div>
  );
}

function ClubLogo({
  name,
  logoPath,
}: {
  name: string;
  logoPath: string | null;
}) {
  return (
    <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white shadow-xl">
      {logoPath ? (
        <img
          src={logoPath}
          alt={`${name} logo`}
          className="h-[86%] w-[86%] object-contain"
        />
      ) : (
        <div className="flex h-[86%] w-[86%] items-center justify-center rounded-full bg-[#C8102E] text-3xl font-black text-white">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

function PredictionSplitCard({
  label,
  value,
  count,
  total,
  tone,
}: {
  label: string;
  value: number;
  count: number;
  total: number;
  tone: "green" | "amber" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "border-green-300 bg-green-500 text-white"
      : tone === "amber"
        ? "border-amber-300 bg-amber-400 text-[#111111]"
        : "border-red-300 bg-red-600 text-white";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <div className="text-[0.72rem] font-black uppercase tracking-[0.22em] opacity-80">
        {label}
      </div>
      <div className="mt-2 text-6xl font-black leading-none">
        {formatPercent(value)}
      </div>
      <div className="mt-2 text-sm font-black uppercase tracking-wide opacity-80">
        {count}/{total || 0} players
      </div>
    </div>
  );
}

function GraphicInfoPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
      <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/55">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function TeamMoodCard({
  label,
  outlook,
  fallback,
  mode,
}: {
  label: string;
  outlook: TeamOutlook | null;
  fallback: string;
  mode: "positive" | "cautious";
}) {
  const mainValue =
    mode === "positive"
      ? outlook?.forestWinPercent
      : outlook?.opponentWinPercent;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
      <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/55">
        {label}
      </div>
      {outlook ? (
        <>
          <div className="mt-1 text-xl font-black text-white">
            {outlook.teamName}
          </div>
          <div className="mt-1 text-sm font-bold text-white/70">
            {formatPercent(mainValue)} · {outlook.total} players
          </div>
        </>
      ) : (
        <div className="mt-1 text-xl font-black text-white/70">{fallback}</div>
      )}
    </div>
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
  children: ReactNode;
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