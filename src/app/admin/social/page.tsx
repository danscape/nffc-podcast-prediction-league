"use client";

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
  kickoff_at: string | null;
  status: string;
  result_confirmed: boolean;
  home_score: number | null;
  away_score: number | null;
  forest_result: PredictionValue | null;
  updated_at: string | null;
};

type CurrentPredictionRow = {
  player_id: string;
  fixture_id: string;
  prediction: PredictionValue;
};

type PlayerRow = {
  id: string;
  team_id: string | null;
  active: boolean;
  joined_gameweek: number;
};

type TeamRow = {
  id: string;
  team_name: string;
  display_name: string | null;
  abbreviation: string | null;
  x_handle: string | null;
};

type ForecastSplit = {
  forestWinCount: number;
  drawCount: number;
  opponentWinCount: number;
  total: number;
  forestWinPct: number;
  drawPct: number;
  opponentWinPct: number;
  difficultyScore: number;
};

type TeamForecast = ForecastSplit & {
  team_id: string;
  team_name: string;
  display_name: string | null;
  abbreviation: string | null;
  x_handle: string | null;
};

type NextMatchForecast = {
  fixture: FixtureRow;
  split: ForecastSplit;
  difficultyRank: number | null;
  difficultyTotal: number;
  optimisticTeam: TeamForecast | null;
  pessimisticTeam: TeamForecast | null;
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

function formatKickoff(value: string | null) {
  if (!value) return "Kickoff TBC";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Kickoff TBC";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(date);
}

function formatOrdinal(value: number) {
  const suffixes = ["th", "st", "nd", "rd"];
  const lastTwoDigits = value % 100;
  const suffix =
    suffixes[(lastTwoDigits - 20) % 10] ??
    suffixes[lastTwoDigits] ??
    suffixes[0];

  return `${value}${suffix}`;
}

function clubLogoSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFixtureTeams(fixture: FixtureRow) {
  const forestName = "Nottingham Forest";

  if (fixture.venue === "H") {
    return {
      homeName: forestName,
      awayName: fixture.opponent,
      forestLabel: "Forest win",
      opponentLabel: `${fixture.opponent_short} win`,
    };
  }

  return {
    homeName: fixture.opponent,
    awayName: forestName,
    forestLabel: "Forest win",
    opponentLabel: `${fixture.opponent_short} win`,
  };
}

function calculateSplit(predictions: CurrentPredictionRow[]): ForecastSplit {
  const forestWinCount = predictions.filter(
    (prediction) => prediction.prediction === "W"
  ).length;
  const drawCount = predictions.filter(
    (prediction) => prediction.prediction === "D"
  ).length;
  const opponentWinCount = predictions.filter(
    (prediction) => prediction.prediction === "L"
  ).length;
  const total = predictions.length;

  const forestWinPct = total > 0 ? (forestWinCount / total) * 100 : 0;
  const drawPct = total > 0 ? (drawCount / total) * 100 : 0;
  const opponentWinPct = total > 0 ? (opponentWinCount / total) * 100 : 0;

  return {
    forestWinCount,
    drawCount,
    opponentWinCount,
    total,
    forestWinPct,
    drawPct,
    opponentWinPct,
    difficultyScore: opponentWinPct + drawPct * 0.5,
  };
}

function buildForecastPost(forecast: NextMatchForecast | null) {
  if (!forecast) {
    return [
      "🔮 NEXT MATCH FORECAST",
      "",
      "No upcoming fixture forecast is available yet.",
      "",
      "#NFFC",
    ].join("\n");
  }

  const { fixture, split, difficultyRank, difficultyTotal } = forecast;
  const fixtureTeams = getFixtureTeams(fixture);
  const matchTitle =
    fixture.venue === "H"
      ? `Nottingham Forest vs ${fixture.opponent}`
      : `${fixture.opponent} vs Nottingham Forest`;

  const difficultyLine =
    difficultyRank && difficultyTotal > 0
      ? `That ranks as the ${formatOrdinal(
          difficultyRank
        )} toughest fixture by prediction mood this season.`
      : "Difficulty ranking will update once more predictions are available.";

  const optimisticLine = forecast.optimisticTeam
    ? `Most optimistic team: ${
        forecast.optimisticTeam.display_name ?? forecast.optimisticTeam.team_name
      } (${formatPercent(forecast.optimisticTeam.forestWinPct)} Forest win)`
    : "Most optimistic team: TBC";

  const pessimisticLine = forecast.pessimisticTeam
    ? `Most cautious team: ${
        forecast.pessimisticTeam.display_name ?? forecast.pessimisticTeam.team_name
      } (${formatPercent(forecast.pessimisticTeam.opponentWinPct)} ${
        fixtureTeams.opponentLabel
      })`
    : "Most cautious team: TBC";

  return [
    "🔮 NEXT MATCH FORECAST",
    "",
    `${fixture.gameweek_label}: ${matchTitle}`,
    `${formatKickoff(fixture.kickoff_at)}`,
    "",
    `${formatPercent(split.forestWinPct)} predict a Forest win`,
    `${formatPercent(split.drawPct)} predict a draw`,
    `${formatPercent(split.opponentWinPct)} predict a ${fixture.opponent_short} win`,
    "",
    difficultyLine,
    "",
    optimisticLine,
    pessimisticLine,
    "",
    "#NFFC",
  ].join("\n");
}

export default function AdminSocialPage() {
  const [individualRows, setIndividualRows] = useState<IndividualLeaderboardRow[]>(
    []
  );
  const [teamRows, setTeamRows] = useState<TeamLeaderboardRow[]>([]);
  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
  const [currentPredictions, setCurrentPredictions] = useState<
    CurrentPredictionRow[]
  >([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
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
      { data: currentPredictionData, error: currentPredictionError },
      { data: playerData, error: playerError },
      { data: teamLookupData, error: teamLookupError },
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
          "id, gameweek, gameweek_label, opponent_short, opponent, venue, home_team, away_team, kickoff_at, status, result_confirmed, home_score, away_score, forest_result, updated_at"
        )
        .order("gameweek", { ascending: true })
        .range(0, 100),
      supabase
        .from("current_predictions")
        .select("player_id, fixture_id, prediction")
        .range(0, 5000),
      supabase
        .from("players")
        .select("id, team_id, active, joined_gameweek")
        .eq("active", true)
        .range(0, 1000),
      supabase
        .from("teams")
        .select("id, team_name, display_name, abbreviation, x_handle")
        .range(0, 1000),
    ]);

    if (
      individualError ||
      teamError ||
      fixtureError ||
      currentPredictionError ||
      playerError ||
      teamLookupError
    ) {
      setMessage(
        individualError?.message ??
          teamError?.message ??
          fixtureError?.message ??
          currentPredictionError?.message ??
          playerError?.message ??
          teamLookupError?.message ??
          "Could not load social output data."
      );
    }

    setIndividualRows((individualData ?? []) as IndividualLeaderboardRow[]);
    setTeamRows((teamData ?? []) as TeamLeaderboardRow[]);
    setFixtures((fixtureData ?? []) as FixtureRow[]);
    setCurrentPredictions(
      (currentPredictionData ?? []) as CurrentPredictionRow[]
    );
    setPlayers((playerData ?? []) as PlayerRow[]);
    setTeams((teamLookupData ?? []) as TeamRow[]);
    setLoading(false);
  }

  const playerById = useMemo(() => {
    return new Map(players.map((player) => [player.id, player]));
  }, [players]);

  const teamById = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  const completedFixtures = fixtures.filter((fixture) => fixture.result_confirmed);
  const lastConfirmedFixture = completedFixtures[completedFixtures.length - 1] ?? null;

  const nextFixture = useMemo(() => {
    const now = Date.now();

    const futureFixture = fixtures.find((fixture) => {
      if (fixture.result_confirmed) return false;
      if (!fixture.kickoff_at) return false;

      return new Date(fixture.kickoff_at).getTime() >= now;
    });

    return (
      futureFixture ??
      fixtures.find((fixture) => !fixture.result_confirmed) ??
      null
    );
  }, [fixtures]);

  const nextMatchForecast = useMemo<NextMatchForecast | null>(() => {
    if (!nextFixture) return null;

    const fixturePredictions = currentPredictions.filter((prediction) => {
      const player = playerById.get(prediction.player_id);

      return (
        prediction.fixture_id === nextFixture.id &&
        player?.active === true &&
        Number(player.joined_gameweek ?? 1) <= Number(nextFixture.gameweek)
      );
    });

    const split = calculateSplit(fixturePredictions);

    const difficultyRows = fixtures
      .map((fixture) => {
        const predictionsForFixture = currentPredictions.filter((prediction) => {
          const player = playerById.get(prediction.player_id);

          return (
            prediction.fixture_id === fixture.id &&
            player?.active === true &&
            Number(player.joined_gameweek ?? 1) <= Number(fixture.gameweek)
          );
        });

        const fixtureSplit = calculateSplit(predictionsForFixture);

        return {
          fixtureId: fixture.id,
          split: fixtureSplit,
        };
      })
      .filter((row) => row.split.total > 0)
      .sort((a, b) => b.split.difficultyScore - a.split.difficultyScore);

    const difficultyIndex = difficultyRows.findIndex(
      (row) => row.fixtureId === nextFixture.id
    );

    const teamForecasts = fixturePredictions.reduce<Record<string, TeamForecast>>(
      (state, prediction) => {
        const player = playerById.get(prediction.player_id);
        const teamId = player?.team_id;

        if (!teamId) return state;

        const team = teamById.get(teamId);

        if (!team) return state;

        const existing = state[teamId] ?? {
          team_id: team.id,
          team_name: team.team_name,
          display_name: team.display_name,
          abbreviation: team.abbreviation,
          x_handle: team.x_handle,
          forestWinCount: 0,
          drawCount: 0,
          opponentWinCount: 0,
          total: 0,
          forestWinPct: 0,
          drawPct: 0,
          opponentWinPct: 0,
          difficultyScore: 0,
        };

        const nextCounts = {
          ...existing,
          forestWinCount:
            existing.forestWinCount + (prediction.prediction === "W" ? 1 : 0),
          drawCount: existing.drawCount + (prediction.prediction === "D" ? 1 : 0),
          opponentWinCount:
            existing.opponentWinCount + (prediction.prediction === "L" ? 1 : 0),
          total: existing.total + 1,
        };

        return {
          ...state,
          [teamId]: {
            ...nextCounts,
            forestWinPct:
              nextCounts.total > 0
                ? (nextCounts.forestWinCount / nextCounts.total) * 100
                : 0,
            drawPct:
              nextCounts.total > 0
                ? (nextCounts.drawCount / nextCounts.total) * 100
                : 0,
            opponentWinPct:
              nextCounts.total > 0
                ? (nextCounts.opponentWinCount / nextCounts.total) * 100
                : 0,
            difficultyScore:
              nextCounts.total > 0
                ? (nextCounts.opponentWinCount / nextCounts.total) * 100 +
                  ((nextCounts.drawCount / nextCounts.total) * 100) * 0.5
                : 0,
          },
        };
      },
      {}
    );

    const teamForecastList = Object.values(teamForecasts).filter(
      (team) => team.total > 0
    );

    const optimisticTeam =
      [...teamForecastList].sort((a, b) => {
        if (b.forestWinPct !== a.forestWinPct) {
          return b.forestWinPct - a.forestWinPct;
        }

        return b.total - a.total;
      })[0] ?? null;

    const pessimisticTeam =
      [...teamForecastList].sort((a, b) => {
        if (b.opponentWinPct !== a.opponentWinPct) {
          return b.opponentWinPct - a.opponentWinPct;
        }

        return b.difficultyScore - a.difficultyScore;
      })[0] ?? null;

    return {
      fixture: nextFixture,
      split,
      difficultyRank: difficultyIndex >= 0 ? difficultyIndex + 1 : null,
      difficultyTotal: difficultyRows.length,
      optimisticTeam,
      pessimisticTeam,
    };
  }, [currentPredictions, fixtures, nextFixture, playerById, teamById]);

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

  const forecastPost = useMemo(() => {
    return buildForecastPost(nextMatchForecast);
  }, [nextMatchForecast]);

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
                Generate weekly post copy, preview social graphics and check
                leaderboard data for X output.
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
          <AdminStat
            label="Team handles"
            value={teamRows.filter((team) => team.x_handle).length}
          />
          <AdminStat
            label="Forecast picks"
            value={nextMatchForecast?.split.total ?? 0}
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
            <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <NextMatchForecastGraphic forecast={nextMatchForecast} />
              <PostCard
                title="Next match forecast post"
                text={forecastPost}
                copied={copied === "forecast"}
                onCopy={() => copyText("forecast", forecastPost)}
                compact
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

function NextMatchForecastGraphic({
  forecast,
}: {
  forecast: NextMatchForecast | null;
}) {
  if (!forecast) {
    return (
      <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
        <div className="rounded-[2rem] border border-[#111111] bg-[#111111] p-8 text-white">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-[#F7F6F2]">
            Next Match Forecast
          </div>
          <div className="mt-4 text-4xl font-black uppercase text-[#C8102E]">
            No upcoming fixture
          </div>
          <p className="mt-3 max-w-xl text-sm font-semibold text-neutral-300">
            Forecast data will appear once an upcoming fixture and stored
            predictions are available.
          </p>
        </div>
      </section>
    );
  }

  const { fixture, split, difficultyRank, difficultyTotal } = forecast;
  const fixtureTeams = getFixtureTeams(fixture);
  const difficultyText =
    difficultyRank && difficultyTotal > 0
      ? `${formatOrdinal(difficultyRank)} toughest of ${difficultyTotal}`
      : "Ranking TBC";

  return (
    <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase">Next Match Forecast</h2>
          <p className="text-sm text-neutral-600">
            Auto-updating graphic preview for the next fixture.
          </p>
        </div>
        <div className="rounded-full border border-[#D9D6D1] px-4 py-2 text-xs font-black uppercase tracking-wide text-neutral-600">
          {split.total} predictions counted
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#111111] bg-[#111111] text-white shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,_#C8102E_0,_#111111_38%,_#111111_100%)] p-5 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="text-[0.68rem] font-black uppercase tracking-[0.28em] text-white/75">
              🔮 NFFC Podcast Prediction League
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-[0.68rem] font-black uppercase tracking-wide text-[#111111]">
              {fixture.gameweek_label}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-8">
            <ClubLogo name={fixtureTeams.homeName} />
            <div className="text-center text-3xl font-black uppercase text-white/80">
              v
            </div>
            <ClubLogo name={fixtureTeams.awayName} />
          </div>

          <div className="mt-7 text-center">
            <div className="text-3xl font-black uppercase leading-none md:text-5xl">
              {fixtureTeams.homeName}
            </div>
            <div className="mt-2 text-lg font-black uppercase tracking-[0.3em] text-[#C8102E]">
              versus
            </div>
            <div className="mt-2 text-3xl font-black uppercase leading-none md:text-5xl">
              {fixtureTeams.awayName}
            </div>
            <div className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-white/70">
              {formatKickoff(fixture.kickoff_at)}
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <ForecastPercentCard
              label={fixtureTeams.forestLabel}
              value={split.forestWinPct}
              count={split.forestWinCount}
            />
            <ForecastPercentCard
              label="Draw"
              value={split.drawPct}
              count={split.drawCount}
            />
            <ForecastPercentCard
              label={fixtureTeams.opponentLabel}
              value={split.opponentWinPct}
              count={split.opponentWinCount}
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <ForecastInsight
              label="Difficulty rank"
              value={difficultyText}
              helper="By prediction mood"
            />
            <ForecastInsight
              label="Most optimistic"
              value={
                forecast.optimisticTeam
                  ? forecast.optimisticTeam.display_name ??
                    forecast.optimisticTeam.team_name
                  : "TBC"
              }
              helper={
                forecast.optimisticTeam
                  ? `${formatPercent(
                      forecast.optimisticTeam.forestWinPct
                    )} Forest win`
                  : "Waiting for team data"
              }
            />
            <ForecastInsight
              label="Most cautious"
              value={
                forecast.pessimisticTeam
                  ? forecast.pessimisticTeam.display_name ??
                    forecast.pessimisticTeam.team_name
                  : "TBC"
              }
              helper={
                forecast.pessimisticTeam
                  ? `${formatPercent(
                      forecast.pessimisticTeam.opponentWinPct
                    )} ${fixture.opponent_short} win`
                  : "Waiting for team data"
              }
            />
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-neutral-500">
        Logo files are read from public/club-logos. Missing logos fall back to
        text badges.
      </p>
    </section>
  );
}

function ClubLogo({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  const isForest = name.toLowerCase().includes("nottingham forest");
  const src = isForest
    ? "/club-logos/nottingham-forest.png"
    : `/club-logos/${clubLogoSlug(name)}.png`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-white p-4 shadow-sm md:h-36 md:w-36">
        {failed ? (
          <div className="text-center text-xl font-black uppercase leading-none text-[#111111]">
            {name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 3)}
          </div>
        ) : (
          <img
            src={src}
            alt={`${name} logo`}
            className="max-h-full max-w-full object-contain"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className="max-w-[12rem] text-center text-xs font-black uppercase tracking-wide text-white/75">
        {name}
      </div>
    </div>
  );
}

function ForecastPercentCard({
  label,
  value,
  count,
}: {
  label: string;
  value: number;
  count: number;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white p-4 text-[#111111]">
      <div className="text-[0.68rem] font-black uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-5xl font-black text-[#C8102E]">
        {formatPercent(value)}
      </div>
      <div className="mt-1 text-xs font-black uppercase tracking-wide text-neutral-500">
        {count} picks
      </div>
    </div>
  );
}

function ForecastInsight({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/25 p-4">
      <div className="text-[0.68rem] font-black uppercase tracking-wide text-white/50">
        {label}
      </div>
      <div className="mt-1 text-lg font-black uppercase text-white">{value}</div>
      <div className="mt-1 text-xs font-bold text-white/55">{helper}</div>
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
  compact = false,
}: {
  title: string;
  text: string;
  copied: boolean;
  onCopy: () => void;
  compact?: boolean;
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

      <pre
        className={`whitespace-pre-wrap rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold leading-6 text-[#111111] ${
          compact ? "min-h-[360px]" : "min-h-[260px]"
        }`}
      >
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
