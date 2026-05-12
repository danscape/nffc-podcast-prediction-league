"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PublicMasthead from "@/components/layout/PublicMasthead";
import PublicPageShell from "@/components/layout/PublicPageShell";
import MobileCeefaxMasthead from "@/components/layout/MobileCeefaxMasthead";

type PredictionValue = "W" | "D" | "L";
type Tone = "green" | "yellow" | "cyan" | "pink" | "orange" | "red" | "white" | "muted";

type LatestResultSummaryRow = {
  fixture_id?: string | null;
  id?: string | null;
  gameweek?: number | null;
  gameweek_label?: string | null;
  opponent?: string | null;
  opponent_short?: string | null;
  venue?: "H" | "A" | string | null;
  home_team?: string | null;
  away_team?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  forest_result?: PredictionValue | null;
  actual_result?: PredictionValue | null;
  result_label?: string | null;
  correct_count?: number | null;
  total_predictions?: number | null;
  total_players?: number | null;
  prediction_count?: number | null;
  forest_win_count?: number | null;
  win_count?: number | null;
  draw_count?: number | null;
  forest_loss_count?: number | null;
  loss_count?: number | null;
  correct_percentage?: number | null;
  correct_pick_percentage?: number | null;
  maverick_applied?: boolean | null;
  rogue_applied?: boolean | null;
};

type LatestBonusResultRow = {
  player_id: string | null;
  player_name: string | null;
  short_name?: string | null;
  table_display_name?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  team_display_name?: string | null;
  display_name?: string | null;
  team_abbreviation?: string | null;
  abbreviation?: string | null;
  prediction?: PredictionValue | null;
  actual_result?: PredictionValue | null;
  forest_result?: PredictionValue | null;
  base_points?: number | null;
  streak_bonus?: number | null;
  maverick_bonus?: number | null;
  rogue_bonus?: number | null;
  cup_bonus?: number | null;
  bonus_points?: number | null;
  total_points?: number | null;
  is_correct?: boolean | null;
  correct?: boolean | null;
};

type LatestTeamResultRow = {
  team_id?: string | null;
  team_name?: string | null;
  display_name?: string | null;
  team_display_name?: string | null;
  abbreviation?: string | null;
  team_abbreviation?: string | null;
  x_handle?: string | null;
  players_correct?: number | null;
  correct_count?: number | null;
  player_count?: number | null;
  total_players?: number | null;
  accuracy_percentage?: number | null;
  correct_percentage?: number | null;
  team_points?: number | null;
  points_this_week?: number | null;
  weekly_team_points?: number | null;
  total_team_points?: number | null;
  sort_order?: number | null;
};

type TeamGroup = {
  key: string;
  teamName: string;
  abbreviation: string | null;
  xHandle: string | null;
  teamResult: LatestTeamResultRow | null;
  players: LatestBonusResultRow[];
};

const resultLabels: Record<PredictionValue, string> = {
  W: "Forest win",
  D: "Draw",
  L: "Forest defeat",
};

function toNumber(value: number | string | null | undefined) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

type WeeklyPlayerBoxToneSource = {
  base_points?: number | string | null;
  streak_bonus?: number | string | null;
  maverick_bonus?: number | string | null;
  rogue_bonus?: number | string | null;
  cup_bonus?: number | string | null;
};

function getWeeklyPlayerBoxTone(player: WeeklyPlayerBoxToneSource) {
  const basePoints = toNumber(player.base_points);
  const streakBonus = toNumber(player.streak_bonus);
  const maverickBonus = toNumber(player.maverick_bonus);
  const rogueBonus = toNumber(player.rogue_bonus);
  const cupBonus = toNumber(player.cup_bonus);

  if (rogueBonus > 0) return "pink";
  if (maverickBonus > 0) return "cyan";
  if (streakBonus > 0) return "yellow";
  if (basePoints > 0) return "green";
  if (cupBonus > 0) return "orange";

  return "red";
}

function getWeeklyPlayerNonCupPoints(player: WeeklyPlayerBoxToneSource) {
  return (
    toNumber(player.base_points) +
    toNumber(player.streak_bonus) +
    toNumber(player.maverick_bonus) +
    toNumber(player.rogue_bonus)
  );
}

function getWeeklyPlayerCupOnlyPoints(player: WeeklyPlayerBoxToneSource) {
  return getWeeklyPlayerNonCupPoints(player) <= 0 && toNumber(player.cup_bonus) > 0;
}


function formatPoints(value: number | string | null | undefined) {
  return toNumber(value).toFixed(0);
}

function formatTeamPoints(value: number | string | null | undefined) {
  return toNumber(value).toFixed(2);
}

function formatPercent(value: number | string | null | undefined) {
  return `${Math.round(toNumber(value))}%`;
}

function getActualResult(summary: LatestResultSummaryRow | null) {
  return summary?.forest_result ?? summary?.actual_result ?? null;
}

function getGameweekLabel(summary: LatestResultSummaryRow | null) {
  return summary?.gameweek_label ?? (summary?.gameweek ? `GW${summary.gameweek}` : "LATEST GW");
}

function getTotalPredictions(summary: LatestResultSummaryRow | null) {
  return summary?.total_predictions ?? summary?.total_players ?? summary?.prediction_count ?? 0;
}

function getCorrectCount(summary: LatestResultSummaryRow | null) {
  return summary?.correct_count ?? 0;
}

function getCorrectPercentage(summary: LatestResultSummaryRow | null) {
  const explicit = summary?.correct_percentage ?? summary?.correct_pick_percentage;

  if (explicit !== null && explicit !== undefined) return toNumber(explicit);

  const total = getTotalPredictions(summary);
  return total ? (getCorrectCount(summary) / total) * 100 : 0;
}

function getPredictionSplit(summary: LatestResultSummaryRow | null) {
  const win = summary?.forest_win_count ?? summary?.win_count ?? 0;
  const draw = summary?.draw_count ?? 0;
  const loss = summary?.forest_loss_count ?? summary?.loss_count ?? 0;
  const total = getTotalPredictions(summary) || win + draw + loss;

  return {
    W: {
      label: "Forest win",
      shortLabel: "W",
      count: win,
      percent: total ? (win / total) * 100 : 0,
      tone: "green" as Tone,
    },
    D: {
      label: "Draw",
      shortLabel: "D",
      count: draw,
      percent: total ? (draw / total) * 100 : 0,
      tone: "yellow" as Tone,
    },
    L: {
      label: "Forest defeat",
      shortLabel: "L",
      count: loss,
      percent: total ? (loss / total) * 100 : 0,
      tone: "red" as Tone,
    },
  };
}

function getScoreText(summary: LatestResultSummaryRow | null) {
  if (!summary) return "NO CONFIRMED RESULT";

  if (summary.home_score === null || summary.home_score === undefined) {
    const opponent = summary.opponent_short ?? summary.opponent ?? "OPP";
    return `${getGameweekLabel(summary)} // FOREST ${summary.venue === "A" ? "AT" : "V"} ${opponent}`;
  }

  return `${getGameweekLabel(summary)} // ${summary.home_team ?? "HOME"} ${summary.home_score}-${summary.away_score ?? "?"} ${summary.away_team ?? "AWAY"}`;
}

function getResultLabel(summary: LatestResultSummaryRow | null) {
  if (!summary) return "RESULT TBC";
  if (summary.result_label) return summary.result_label;

  const actual = getActualResult(summary);
  return actual ? resultLabels[actual] : "RESULT TBC";
}

function getPlayerName(row: LatestBonusResultRow) {
  return row.table_display_name ?? row.short_name ?? row.player_name ?? "Unknown";
}

function getTeamName(row: LatestBonusResultRow | LatestTeamResultRow) {
  return row.team_display_name ?? row.display_name ?? row.team_name ?? "Unassigned";
}

function getTeamAbbreviation(row: LatestBonusResultRow | LatestTeamResultRow) {
  return row.team_abbreviation ?? row.abbreviation ?? null;
}

function getTeamKey(row: LatestBonusResultRow | LatestTeamResultRow) {
  return row.team_id ?? getTeamName(row).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function getPlayerTotal(row: LatestBonusResultRow) {
  return toNumber(row.total_points);
}

function getBasePoints(row: LatestBonusResultRow) {
  return toNumber(row.base_points);
}

function getBonusTotal(row: LatestBonusResultRow) {
  if (row.bonus_points !== null && row.bonus_points !== undefined) return toNumber(row.bonus_points);

  return (
    toNumber(row.streak_bonus) +
    toNumber(row.maverick_bonus) +
    toNumber(row.rogue_bonus) +
    toNumber(row.cup_bonus)
  );
}

function isCorrectPick(row: LatestBonusResultRow, summary: LatestResultSummaryRow | null) {
  if (row.is_correct !== null && row.is_correct !== undefined) return Boolean(row.is_correct);
  if (row.correct !== null && row.correct !== undefined) return Boolean(row.correct);

  const actual = row.actual_result ?? row.forest_result ?? getActualResult(summary);
  if (row.prediction && actual) return row.prediction === actual;

  return getBasePoints(row) > 0;
}

function getTeamWeeklyPoints(row: LatestTeamResultRow | null | undefined) {
  return toNumber(row?.team_points ?? row?.points_this_week ?? row?.weekly_team_points);
}

function getTeamCorrectCount(row: LatestTeamResultRow | null | undefined) {
  return toNumber(row?.players_correct ?? row?.correct_count);
}

function getTeamPlayerCount(row: LatestTeamResultRow | null | undefined) {
  return toNumber(row?.player_count ?? row?.total_players);
}

function getTeamCorrectPercentage(row: LatestTeamResultRow | null | undefined) {
  const explicit = row?.correct_percentage ?? row?.accuracy_percentage;
  if (explicit !== null && explicit !== undefined) return toNumber(explicit);

  const total = getTeamPlayerCount(row);
  return total ? (getTeamCorrectCount(row) / total) * 100 : 0;
}

function getTopTeam(teamRows: LatestTeamResultRow[]) {
  return [...teamRows].sort((a, b) => {
    const pointsDiff = getTeamWeeklyPoints(b) - getTeamWeeklyPoints(a);
    if (pointsDiff !== 0) return pointsDiff;

    const correctDiff = getTeamCorrectPercentage(b) - getTeamCorrectPercentage(a);
    if (correctDiff !== 0) return correctDiff;

    return getTeamName(a).localeCompare(getTeamName(b));
  })[0] ?? null;
}

function getTopScorers(playerRows: LatestBonusResultRow[]) {
  const bestScore = Math.max(0, ...playerRows.map(getPlayerTotal));
  return playerRows.filter((row) => getPlayerTotal(row) === bestScore && bestScore > 0);
}

function getBonusWinnerNames(playerRows: LatestBonusResultRow[], bonusKey: keyof LatestBonusResultRow) {
  return playerRows
    .filter((row) => toNumber(row[bonusKey] as number | string | null | undefined) > 0)
    .map(getPlayerName)
    .filter((name, index, names) => names.indexOf(name) === index)
    .join(" + ");
}

function buildBonusPostLines(playerRows: LatestBonusResultRow[]) {
  const lines: string[] = [];

  const streakNames = getBonusWinnerNames(playerRows, "streak_bonus");
  const maverickNames = getBonusWinnerNames(playerRows, "maverick_bonus");
  const rogueNames = getBonusWinnerNames(playerRows, "rogue_bonus");
  const cupNames = getBonusWinnerNames(playerRows, "cup_bonus");

  if (streakNames) lines.push(`🟡 Streaker +1: ${streakNames}`);
  if (maverickNames) lines.push(`🩵 Maverick +2: ${maverickNames}`);
  if (rogueNames) lines.push(`💗 Rogue +3: ${rogueNames}`);
  if (cupNames) lines.push(`🟢 Cup specialist +3: ${cupNames}`);

  return lines.length ? lines : ["No bonuses awarded this GW."];
}


function buildTeamGroups(playerRows: LatestBonusResultRow[], teamRows: LatestTeamResultRow[], overallTeamRows: LatestTeamResultRow[] = []) {
  const teamResultMap = new Map<string, LatestTeamResultRow>();
  const overallRankMap = new Map<string, number>();

  overallTeamRows.forEach((team, index) => {
    overallRankMap.set(getTeamKey(team), index);
  });

  teamRows.forEach((team) => {
    teamResultMap.set(getTeamKey(team), team);
  });

  const groupMap = new Map<string, TeamGroup>();

  playerRows.forEach((player) => {
    const key = getTeamKey(player);
    const existing = groupMap.get(key);

    if (existing) {
      existing.players.push(player);
      return;
    }

    const teamResult = teamResultMap.get(key) ?? null;

    groupMap.set(key, {
      key,
      teamName: getTeamName(player),
      abbreviation: getTeamAbbreviation(player),
      xHandle: teamResult?.x_handle ?? null,
      teamResult,
      players: [player],
    });
  });

  teamRows.forEach((team) => {
    const key = getTeamKey(team);
    if (groupMap.has(key)) return;

    groupMap.set(key, {
      key,
      teamName: getTeamName(team),
      abbreviation: getTeamAbbreviation(team),
      xHandle: team.x_handle ?? null,
      teamResult: team,
      players: [],
    });
  });

  return Array.from(groupMap.values()).sort((a, b) => {
    const rankA = overallRankMap.get(a.key) ?? 9999;
    const rankB = overallRankMap.get(b.key) ?? 9999;

    if (rankA !== rankB) return rankA - rankB;

    const sortA = a.teamResult?.sort_order ?? 999;
    const sortB = b.teamResult?.sort_order ?? 999;
    if (sortA !== sortB) return sortA - sortB;

    return a.teamName.localeCompare(b.teamName);
  });
}

function buildWeeklyResultPost({
  summary,
  playerRows,
  teamRows,
}: {
  summary: LatestResultSummaryRow | null;
  playerRows: LatestBonusResultRow[];
  teamRows: LatestTeamResultRow[];
}) {
  if (!summary) {
    return [
      "🔮 NFFC Podcast Prediction League",
      "",
      "Latest weekly results will appear once a confirmed fixture is available.",
      "",
      "#NFFC",
    ].join("\n");
  }

  const topScorers = getTopScorers(playerRows);
  const topTeam = getTopTeam(teamRows);
  const topScorerText = topScorers.length ? topScorers.map(getPlayerName).join(" + ") : "TBC";

  const bonusLines = buildBonusPostLines(playerRows);

  return [
    "🔮 NFFC Podcast Prediction League",
    "",
    getScoreText(summary),
    `Correct result: ${getResultLabel(summary)}`,
    "",
    `🏆 Top scorer${topScorers.length === 1 ? "" : "s"}: ${topScorerText} — ${formatPoints(topScorers[0]?.total_points)} pts`,
    topTeam
      ? `🏆 Team of the week: ${getTeamName(topTeam)} — ${formatPercent(getTeamCorrectPercentage(topTeam))} correct / ${formatTeamPoints(getTeamWeeklyPoints(topTeam))} pts`
      : "🏆 Team of the week: TBC",
    ...bonusLines,
    "",
    "#NFFC",
  ].join("\n");
}

function getPlayerNameTone(player: LatestBonusResultRow, summary: LatestResultSummaryRow | null): Tone {
  return getWeeklyPlayerBoxTone(player);
  if (isCorrectPick(player, summary)) return "green";
  return "white";
}

export default function AdminSocialResultsPage() {
  const [summary, setSummary] = useState<LatestResultSummaryRow | null>(null);
  const [playerRows, setPlayerRows] = useState<LatestBonusResultRow[]>([]);
  const [teamRows, setTeamRows] = useState<LatestTeamResultRow[]>([]);
  const [overallTeamRows, setOverallTeamRows] = useState<LatestTeamResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void loadResultsData();
  }, []);

  async function loadResultsData() {
    setLoading(true);
    setMessage(null);

    const [summaryResult, playerResult, teamResult, overallTeamResult] = await Promise.all([
      supabase.from("latest_confirmed_gw_result_summary").select("*").maybeSingle(),
      supabase
        .from("latest_confirmed_gw_bonus_results")
        .select("*")
        .order("team_name", { ascending: true })
        .order("player_name", { ascending: true })
        .range(0, 2000),
      supabase.from("latest_confirmed_gw_team_results").select("*").range(0, 200),
      supabase
        .from("team_leaderboard")
        .select("*")
        .order("total_team_points", { ascending: false })
        .order("clean_sweeps", { ascending: false })
        .order("blanks", { ascending: true })
        .order("team_name", { ascending: true })
        .range(0, 200),
    ]);

    if (summaryResult.error || playerResult.error || teamResult.error || overallTeamResult.error) {
      setMessage(
        summaryResult.error?.message ??
          playerResult.error?.message ??
          teamResult.error?.message ??
          overallTeamResult.error?.message ??
          "Could not load latest confirmed GW results."
      );
    }

    setSummary((summaryResult.data ?? null) as LatestResultSummaryRow | null);
    setPlayerRows((playerResult.data ?? []) as LatestBonusResultRow[]);
    setTeamRows((teamResult.data ?? []) as LatestTeamResultRow[]);
    setOverallTeamRows((overallTeamResult.data ?? []) as LatestTeamResultRow[]);
    setLoading(false);
  }

  const teamGroups = useMemo(() => buildTeamGroups(playerRows, teamRows, overallTeamRows), [overallTeamRows, playerRows, teamRows]);
  const topScorers = useMemo(() => getTopScorers(playerRows), [playerRows]);
  const topTeam = useMemo(() => getTopTeam(teamRows), [teamRows]);
  const predictionSplit = useMemo(() => getPredictionSplit(summary), [summary]);
  const weeklyPost = useMemo(
    () => buildWeeklyResultPost({ summary, playerRows, teamRows }),
    [playerRows, summary, teamRows]
  );

  async function copyWeeklyPost() {
    await navigator.clipboard.writeText(weeklyPost);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <PublicPageShell compact mobileFullBleed>
      {message && (
        <div className="mb-4 border border-[var(--stat-wrong,#ff3030)] bg-[var(--nffc-black,#000000)] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-[var(--stat-wrong,#ff3030)]">
          {message}
        </div>
      )}

      {loading ? (
        <div className="border border-[#2a2a2a] bg-[var(--nffc-black,#000000)] px-4 py-8 text-center whitespace-normal break-words text-xl font-black uppercase tracking-[0.14em] text-white">
          Loading weekly results...
        </div>
      ) : (
        <>
          <MobileWeeklyResultsPage
            summary={summary}
            teamGroups={teamGroups}
          />

          <div className="hidden md:block">
            <Masthead />

            <SocialResultsGraphic
              summary={summary}
              teamGroups={teamGroups}
              topScorers={topScorers}
              topTeam={topTeam}
              predictionSplit={predictionSplit}
            />
          </div>
        </>
      )}
    </PublicPageShell>
  );
}


function MobileWeeklyResultsPage({
  summary,
  teamGroups,
}: {
  summary: LatestResultSummaryRow | null;
  teamGroups: TeamGroup[];
}) {
  const [expandedTeamKeys, setExpandedTeamKeys] = useState<Set<string>>(
    () => new Set()
  );
  const actual = getActualResult(summary);

  function toggleTeam(teamKey: string) {
    setExpandedTeamKeys((current) => {
      const next = new Set(current);

      if (next.has(teamKey)) {
        next.delete(teamKey);
      } else {
        next.add(teamKey);
      }

      return next;
    });
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden overflow-y-auto bg-[var(--nffc-black,#000000)] pb-20 text-white md:hidden">
      <MobileCeefaxMasthead active="results" />

      <section className="px-0 py-1">
        <h1 className="text-[1.75rem] font-black uppercase leading-none tracking-[-0.03em] text-white">
          Weekly Results
        </h1>

        <div className="mt-1 text-[0.8rem] font-black uppercase tracking-[0.1em] text-[var(--nffc-red,#e50914)]">
          {getScoreText(summary)}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-px bg-[#242424]">
          <MobileWeeklyHeaderStat
            label="Result"
            value={actual ?? "TBC"}
            tone={actual ? "green" : "white"}
          />
          <MobileWeeklyHeaderStat
            label="Correct"
            value={`${getCorrectCount(summary)}/${getTotalPredictions(summary)}`}
            tone={getCorrectCount(summary) > 0 ? "green" : "red"}
          />
          <MobileWeeklyHeaderStat
            label="Accuracy"
            value={formatPercent(getCorrectPercentage(summary))}
            tone={getCorrectPercentage(summary) > 0 ? "green" : "red"}
          />
        </div>
      </section>

      <MobileWeeklyDivider />

      <section>
        <MobileWeeklySectionHeader title="Team Results" />

        <div className="grid gap-px bg-[#242424]">
          <div className="grid grid-cols-[minmax(0,1fr)_52px_58px_22px] bg-[var(--nffc-black,#000000)] px-1 py-1 text-[0.56rem] font-black uppercase tracking-[0.08em] text-white">
            <div>Team</div>
            <div className="text-right">Correct</div>
            <div className="text-right">Score</div>
            <div />
          </div>

          {teamGroups.length ? (
            teamGroups.map((group) => {
              const expanded = expandedTeamKeys.has(group.key);
              const sortedPlayers = [...group.players].sort((a, b) => {
                const correctDiff =
                  Number(isCorrectPick(b, summary)) - Number(isCorrectPick(a, summary));
                if (correctDiff !== 0) return correctDiff;

                const pointsDiff = getPlayerTotal(b) - getPlayerTotal(a);
                if (pointsDiff !== 0) return pointsDiff;

                return getPlayerName(a).localeCompare(getPlayerName(b));
              });

              const totalPlayers = sortedPlayers.length;
              const correctPlayers = sortedPlayers.filter((player) =>
                isCorrectPick(player, summary)
              ).length;
              const fallbackCorrectPercentage = totalPlayers
                ? (correctPlayers / totalPlayers) * 100
                : 0;
              const correctPercentage =
                group.teamResult &&
                (group.teamResult.correct_percentage !== null ||
                  group.teamResult.accuracy_percentage !== null)
                  ? getTeamCorrectPercentage(group.teamResult)
                  : fallbackCorrectPercentage;
              const teamPoints = getTeamWeeklyPoints(group.teamResult);
              const scoreTone =
                teamPoints > 0
                  ? "text-[var(--stat-green,#22e55e)]"
                  : "text-[var(--stat-wrong,#ff3030)]";

              return (
                <article
                  key={group.key}
                  className="bg-[var(--nffc-black,#000000)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleTeam(group.key)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_52px_58px_22px] items-center gap-1 px-1 py-1 text-left"
                    aria-expanded={expanded}
                  >
                    <div className="truncate text-[0.82rem] font-black uppercase leading-none text-white">
                      {group.teamName}
                    </div>

                    <div
                      className={`text-right text-[0.72rem] font-black uppercase ${
                        correctPercentage > 0
                          ? "text-[var(--stat-green,#22e55e)]"
                          : "text-[var(--stat-wrong,#ff3030)]"
                      }`}
                    >
                      {formatPercent(correctPercentage)}
                    </div>

                    <div className={`text-right text-sm font-black uppercase ${scoreTone}`}>
                      {formatTeamPoints(teamPoints)}
                    </div>

                    <div className="text-right text-base font-black leading-none text-white">
                      {expanded ? "−" : "+"}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-[#242424]">
                      <div className="grid grid-cols-[minmax(0,1fr)_32px_32px_116px] bg-[var(--nffc-black,#000000)] px-1 py-1 text-[0.54rem] font-black uppercase tracking-[0.08em] text-[#8f8f8f]">
                        <div>Player</div>
                        <div className="text-right">Pick</div>
                        <div className="text-right">Res</div>
                        <div className="text-right">B+S+M+R+C</div>
                      </div>

                      {sortedPlayers.length ? (
                        sortedPlayers.map((player) => (
                          <MobileWeeklyPlayerResultRow
                            key={`${group.key}-${player.player_id ?? getPlayerName(player)}`}
                            player={player}
                            summary={summary}
                          />
                        ))
                      ) : (
                        <div className="px-1 py-2 text-[0.68rem] font-black uppercase tracking-[0.08em] text-[#8f8f8f]">
                          No player rows.
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          ) : (
            <div className="bg-[var(--nffc-black,#000000)] px-1 py-2 text-[0.72rem] font-black uppercase tracking-[0.08em] text-white">
              No team results available.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function MobileWeeklyPlayerResultRow({
  player,
  summary,
}: {
  player: LatestBonusResultRow;
  summary: LatestResultSummaryRow | null;
}) {
  const correct = isCorrectPick(player, summary);
  const result = player.actual_result ?? player.forest_result ?? getActualResult(summary);
  const basePoints = getBasePoints(player);
  const streakBonus = toNumber(player.streak_bonus);
  const maverickBonus = toNumber(player.maverick_bonus);
  const rogueBonus = toNumber(player.rogue_bonus);
  const cupBonus = toNumber(player.cup_bonus);
  const total = getPlayerTotal(player);
  const tone = correct
    ? "text-[var(--stat-green,#22e55e)]"
    : "text-[var(--stat-wrong,#ff3030)]";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_32px_32px_116px] items-center border-t border-[#181818] px-1 py-1">
      <div className={`truncate text-[0.72rem] font-black uppercase leading-none ${tone}`}>
        {getPlayerName(player)}
      </div>

      <div className={`text-right text-[0.7rem] font-black uppercase ${tone}`}>
        {player.prediction ?? "—"}
      </div>

      <div className="text-right text-[0.7rem] font-black uppercase text-white">
        {result ?? "—"}
      </div>

      <div className="text-right text-[0.58rem] font-black uppercase tracking-[0.01em] text-white">
        <span className={basePoints > 0 ? "text-[var(--stat-green,#22e55e)]" : "text-[var(--stat-wrong,#ff3030)]"}>{formatPoints(basePoints)}</span>
        <span className="text-[#666666]">+</span>
        <span className={streakBonus > 0 ? "text-[var(--stat-yellow,#ffe44d)]" : "text-[var(--stat-wrong,#ff3030)]"}>{formatPoints(streakBonus)}</span>
        <span className="text-[#666666]">+</span>
        <span className={maverickBonus > 0 ? "text-[var(--stat-cyan,#59efff)]" : "text-[var(--stat-wrong,#ff3030)]"}>{formatPoints(maverickBonus)}</span>
        <span className="text-[#666666]">+</span>
        <span className={rogueBonus > 0 ? "text-[var(--stat-pink,#ff4fd8)]" : "text-[var(--stat-wrong,#ff3030)]"}>{formatPoints(rogueBonus)}</span>
        <span className="text-[#666666]">+</span>
        <span className={cupBonus > 0 ? "text-[#ff9f1c]" : "text-[var(--stat-wrong,#ff3030)]"}>{formatPoints(cupBonus)}</span>
        <span className="px-0.5 text-[var(--nffc-red,#e50914)]">=</span>
        <span className={tone}>{formatPoints(total)}</span>
      </div>
    </div>
  );
}

function MobileWeeklyHeaderStat({
  label,
  value,
  tone = "white",
}: {
  label: string;
  value: string | number;
  tone?: "green" | "red" | "white";
}) {
  return (
    <div className="bg-[var(--nffc-black,#000000)] px-1 py-1.5">
      <div className="text-[0.56rem] font-black uppercase tracking-[0.12em] text-[#8f8f8f]">
        {label}
      </div>
      <div className={`mt-0.5 truncate text-[0.95rem] font-black uppercase leading-none ${textTone(tone)}`}>
        {value}
      </div>
    </div>
  );
}

function MobileWeeklyDivider() {
  return <div className="my-2 h-[2px] w-full bg-[var(--nffc-red,#e50914)]" />;
}

function MobileWeeklySectionHeader({ title }: { title: string }) {
  return (
    <h2 className="box-border w-full bg-[var(--nffc-red,#e50914)] px-1.5 py-0.5 text-base font-black uppercase tracking-[0.08em] text-white">
      {title}
    </h2>
  );
}


function Masthead() {
  return (
    <PublicMasthead active="weekly-results" title="Weekly Results Terminal" />
  );
}

function SocialResultsGraphic({
  summary,
  teamGroups,
  topScorers,
  topTeam,
  predictionSplit,
}: {
  summary: LatestResultSummaryRow | null;
  teamGroups: TeamGroup[];
  topScorers: LatestBonusResultRow[];
  topTeam: LatestTeamResultRow | null;
  predictionSplit: ReturnType<typeof getPredictionSplit>;
}) {
  const actual = getActualResult(summary);
  const topScorerText = topScorers.length
    ? `${topScorers.map(getPlayerName).join(" + ")} / ${formatPoints(topScorers[0]?.total_points)}`
    : "TBC";

  return (
    <section
 id="weekly-results-social-graphic"
 className="-mt-2 bg-[var(--nffc-black,#000000)] mb-12"
 >


 <div className="grid gap-[4px] bg-[var(--nffc-black,#000000)]">
 <CompactResultsHeader
 summary={summary}
 predictionSplit={predictionSplit}
 actual={actual}
 topScorerText={topScorerText}
 topTeam={topTeam}
 teamGroups={teamGroups}
 />

 <BonusStrip summary={summary} teamGroups={teamGroups} />
 <div
 className="h-8 bg-[var(--nffc-black,#000000)]"
 aria-hidden="true"
 />

 <section className="grid gap-[4px] bg-[var(--nffc-black,#000000)]">
 {teamGroups.map((group, index) => (
 <TeamResultRow
 key={group.key}
 group={group}
 rank={index + 1}
 summary={summary}
 isLast={index === teamGroups.length - 1}
 />
 ))}
 </section>
      </div>
    </section>
  );
}

function CompactResultsHeader({
  summary,
  predictionSplit,
  actual,
  topScorerText,
  topTeam,
  teamGroups,
}: {
  summary: LatestResultSummaryRow | null;
  predictionSplit: ReturnType<typeof getPredictionSplit>;
  actual: PredictionValue | null;
  topScorerText: string;
  topTeam: LatestTeamResultRow | null;
  teamGroups: TeamGroup[];
}) {
  const appliedBonuses = getAppliedBonusLabels(summary, teamGroups);

  return (
    <section className="bg-[var(--nffc-black,#000000)] px-2 pb-4 pt-1">
      <h2 className="truncate text-[clamp(2.35rem,3.45vw,4.55rem)] font-black uppercase leading-none tracking-[-0.055em] text-white">
        {getScoreText(summary)}
      </h2>

      <div className="mt-3 grid min-h-[52px] grid-cols-[190px_minmax(420px,1fr)_310px] items-end gap-5 bg-[var(--nffc-black,#000000)]">
        <InlinePredictionSplit
          split={predictionSplit}
          actual={getActualResult(summary)}
        />

        <div className="pl-4">
        <InlineInfoStat
          label="Top scorers"
          value={topScorerText}
          tone="green"
          className=""
        />
        </div>

        <InlineInfoStat
          label="Team of week"
          value={
            topTeam
              ? `${getTeamName(topTeam)} / ${formatTeamPoints(getTeamWeeklyPoints(topTeam))} pts`
              : "TBC"
          }
          tone="cyan"
          className=""
        />

        <div className="flex min-w-0 items-end justify-start gap-3">
          <div>
            <div className="text-[0.86rem] font-black uppercase tracking-[0.2em] text-[var(--nffc-muted,#a7a7a7)]">
              Bonuses
            </div>
            <div className="mt-1.5 flex flex-nowrap items-center gap-3">
              <InlineBonusStat
                label="Streaker"
                active={appliedBonuses.streaker}
                tone="yellow"
              />
              <InlineBonusStat
                label="Maverick"
                active={appliedBonuses.maverick}
                tone="cyan"
              />
              <InlineBonusStat
                label="Rogue"
                active={appliedBonuses.rogue}
                tone="pink"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function getAppliedBonusLabels(
  summary: LatestResultSummaryRow | null,
  teamGroups: TeamGroup[]
) {
  const source = (summary ?? {}) as Record<string, unknown>;
  const players = teamGroups.flatMap((group) => group.players);

  return {
    streaker:
      Boolean(source.streaker_applied) ||
      Boolean(source.streak_bonus_applied) ||
      Boolean(source.streaker_bonus_applied) ||
      players.some((player) => toNumber(player.streak_bonus) > 0),
    maverick:
      Boolean(source.maverick_applied) ||
      Boolean(source.maverick_bonus_applied) ||
      players.some((player) => toNumber(player.maverick_bonus) > 0),
    rogue:
      Boolean(source.rogue_applied) ||
      Boolean(source.rogue_bonus_applied) ||
      players.some((player) => toNumber(player.rogue_bonus) > 0),
  };
}


function InlinePredictionSplit({
  split,
  actual,
}: {
  split: ReturnType<typeof getPredictionSplit>;
  actual: PredictionValue | null;
}) {
  const items: { value: PredictionValue; percent: number; tone: Tone }[] = [
    { value: "W", percent: split.W.percent, tone: "green" },
    { value: "D", percent: split.D.percent, tone: "yellow" },
    { value: "L", percent: split.L.percent, tone: "red" },
  ];

  return (
    <div className="min-w-0">
      <div className="mb-1 text-[0.52rem] font-black uppercase tracking-[0.18em] text-[#8f8f8f]">
        Prediction Split
      </div>
      <div className="flex min-w-0 items-center gap-2 whitespace-nowrap text-xl font-black uppercase leading-none">
        {items.map((item, index) => {
          const active = actual === item.value;

          return (
            <div
              key={item.value}
              className={`flex items-baseline gap-1 ${
                active ? "border-2 border-current px-1.5 py-0.5" : ""
              } ${textTone(item.tone)}`}
            >
              <span>{item.value}</span>
              <span className="text-base">{formatPercent(item.percent)}</span>
              {index < items.length - 1 && !active ? (
                <span className="ml-1 text-[#666666]">/</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InlinePredictionStat({
  value,
  percent,
  active,
  tone,
}: {
  value: PredictionValue;
  percent: number;
  active: boolean;
  tone: Tone;
}) {
  const colour = active ? "text-[var(--stat-green,#22e55e)]" : textTone(tone);

  return (
    <div
      className={`flex min-w-0 items-baseline justify-center gap-1.5 px-2.5 py-1 ${
        active
          ? "shadow-[inset_0_0_0_2px_var(--stat-green,#22e55e)]"
          : ""
      }`}
    >
      <span className={`text-2xl font-black uppercase leading-none ${colour}`}>
        {value}
      </span>
      <span className={`text-2xl font-black leading-none ${colour}`}>
        {formatPercent(percent)}
      </span>
    </div>
  );
}

function InlineInfoStat({
  label,
  value,
  tone,
  className = "",
}: {
  label: string;
  value: string;
  tone: Tone;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="text-[0.86rem] font-black uppercase tracking-[0.2em] text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className={`mt-1 whitespace-normal break-words text-xl font-black uppercase leading-none ${textTone(tone)}`}>
        {value}
      </div>
    </div>
  );
}

function InlineBonusStat({
  label,
  active,
  tone,
}: {
  label: string;
  active: boolean;
  tone: "yellow" | "cyan" | "pink";
}) {
  const activeClass =
    tone === "yellow"
      ? "text-[var(--stat-yellow,#ffe44d)]"
      : tone === "cyan"
        ? "text-[var(--stat-cyan,#59efff)]"
        : "text-[var(--stat-pink,#ff4fd8)]";

  return (
    <span
      className={`shrink-0 text-base font-black uppercase tracking-[0.08em] ${
        active ? activeClass : "text-[#555555]"
      }`}
    >
      {active ? "● " : "○ "}
      {label}
    </span>
  );
}

function CompactPredictionPill({
  value,
  percent,
  active,
  tone,
}: {
  value: PredictionValue;
  percent: number;
  active: boolean;
  tone: Tone;
}) {
  return (
    <div
      className={`bg-[var(--nffc-black,#000000)] p-2 ${
        active ? "shadow-[inset_0_0_0_3px_var(--stat-green,#22e55e)]" : ""
      }`}
    >
      <div
        className={`text-center text-2xl font-black leading-none ${
          active ? "text-[var(--stat-green,#22e55e)]" : textTone(tone)
        }`}
      >
        {value}
      </div>
      <div
        className={`mt-1 text-center text-2xl font-black leading-none ${
          active ? "text-[var(--stat-green,#22e55e)]" : textTone(tone)
        }`}
      >
        {formatPercent(percent)}
      </div>
      {active && (
        <div className="mt-1 text-center text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--stat-green,#22e55e)]">
          correct
        </div>
      )}
    </div>
  );
}

function CompactSummaryBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <div className="bg-[var(--nffc-black,#000000)] p-2">
      <div className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className={`mt-1 whitespace-normal break-words text-xl font-black uppercase leading-tight ${textTone(tone)}`}>
        {value}
      </div>
    </div>
  );
}

function BonusStrip({
  summary,
  teamGroups,
}: {
  summary: LatestResultSummaryRow | null;
  teamGroups: TeamGroup[];
}) {
  const players = teamGroups.flatMap((group) => group.players);
  const streakApplied = players.some((player) => toNumber(player.streak_bonus) > 0);
  const maverickApplied =
    Boolean(summary?.maverick_applied) ||
    players.some((player) => toNumber(player.maverick_bonus) > 0);
  const rogueApplied =
    Boolean(summary?.rogue_applied) ||
    players.some((player) => toNumber(player.rogue_bonus) > 0);

  return null;
}

function BonusName({
  label,
  active,
  tone,
}: {
  label: string;
  active: boolean;
  tone: Tone;
}) {
  return (
    <div
      className={`flex items-center justify-center bg-[var(--nffc-black,#000000)] px-4 py-3 text-center whitespace-normal break-words text-xl font-black uppercase tracking-[0.18em] md:text-2xl ${
        active ? textTone(tone) : "text-[#555555]"
      }`}
    >
      {label}
    </div>
  );
}

function TeamResultRow({
  group,
  rank,
  summary,
  isLast,
}: {
  group: TeamGroup;
  rank: number;
  summary: LatestResultSummaryRow | null;
  isLast: boolean;
}) {
  const sortedPlayers = [...group.players].sort((a, b) => {
    const pointsDiff = getPlayerTotal(b) - getPlayerTotal(a);
    if (pointsDiff !== 0) return pointsDiff;

    const correctDiff = Number(isCorrectPick(b, summary)) - Number(isCorrectPick(a, summary));
    if (correctDiff !== 0) return correctDiff;

    return getPlayerName(a).localeCompare(getPlayerName(b));
  });

  const totalPlayers = sortedPlayers.length;
  const correctPlayers = sortedPlayers.filter((player) => isCorrectPick(player, summary)).length;
  const correctPercentage = totalPlayers ? (correctPlayers / totalPlayers) * 100 : 0;
  const teamPoints = getTeamWeeklyPoints(group.teamResult);

  return (
    <div className="grid gap-[3px] bg-[var(--nffc-black,#000000)] xl:grid-cols-[430px_minmax(0,1fr)]">
      <div
        className={`${
          isLast ? "" : "border-b-[4px] border-[#555555]"
        } bg-[var(--nffc-black,#000000)] px-3 py-2`}
      >
        <div className="flex items-start gap-3">
          <div className="px-2 py-1 text-2xl font-black leading-none text-[var(--nffc-red,#e50914)]">
            {String(rank).padStart(2, "0")}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate whitespace-normal break-words text-xl font-black uppercase leading-tight tracking-[0.04em] text-white md:text-2xl">
              {group.teamName}
            </div>

<div className="mt-3 flex flex-wrap items-center gap-2">
              <div
                className={` px-3 py-2 text-2xl font-black leading-none ${
                  correctPercentage > 0
                    ? "text-[var(--stat-green,#22e55e)]"
                    : "text-[var(--stat-wrong,#ff3030)]"
                }`}
              >
                {formatPercent(correctPercentage)}
              </div>

              <div
                className={`flex items-center gap-2  px-3 py-2 text-2xl font-black leading-none ${
                  teamPoints > 0
                    ? "text-[var(--stat-green,#22e55e)]"
                    : "text-[var(--stat-wrong,#ff3030)]"
                }`}
              >
                <span>{formatTeamPoints(teamPoints)}</span>
                <span className="text-xs font-black uppercase tracking-[0.14em] text-current">
                  pts
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid auto-rows-fr gap-[4px] bg-[var(--nffc-black,#000000)] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {sortedPlayers.length ? (
          <>
            {sortedPlayers.map((player) => (
              <PlayerScoreCard
                key={`${group.key}-${player.player_id ?? getPlayerName(player)}`}
                player={player}
                summary={summary}
              />
            ))}
          </>
        ) : (
          <div className="bg-[var(--nffc-black,#000000)] p-4 text-sm font-black uppercase tracking-[0.16em] text-[var(--nffc-muted,#a7a7a7)]">
            No player rows
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerScoreCard({
  player,
  summary,
}: {
  player: LatestBonusResultRow;
  summary: LatestResultSummaryRow | null;
}) {
  const basePoints = getBasePoints(player);
  const streakBonus = toNumber(player.streak_bonus);
  const maverickBonus = toNumber(player.maverick_bonus);
  const rogueBonus = toNumber(player.rogue_bonus);
  const cupBonus = toNumber(player.cup_bonus);
  const total = getPlayerTotal(player);
  const correct = isCorrectPick(player, summary);
  const boxClass = getPlayerScoreBoxClass({
    correct,
    total,
    streakBonus,
    maverickBonus,
    rogueBonus,
    cupBonus,
  });

  const scoreParts = [
    { value: basePoints, prefix: "" },
    { value: streakBonus, prefix: "(S)" },
    { value: maverickBonus, prefix: "(M)" },
    { value: rogueBonus, prefix: "(R)" },
    { value: cupBonus, prefix: "(C)" },
  ].filter((part) => part.value > 0);

  return (
    <article className={`grid min-h-[70px] min-w-0 grid-rows-[auto_1fr] outline outline-[3px] outline-[#555555] p-1.5 ${boxClass}`}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="truncate text-left text-lg font-black uppercase leading-none tracking-[0.01em] text-current md:text-xl">
          {getPlayerName(player)}
        </div>

        <div className="text-right whitespace-normal break-words text-xl font-black uppercase leading-none tracking-[0.08em] text-current md:text-2xl">
          {player.prediction ?? "-"}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 text-current">
        <div className="flex min-w-0 flex-nowrap items-center justify-start gap-1 overflow-hidden whitespace-nowrap text-left text-xs font-black uppercase leading-none md:text-sm">
          {scoreParts.length ? (
            <>
              {scoreParts.map((part, index) => (
                <span key={`${part.prefix || "base"}-${index}`} className="inline-flex shrink-0 items-center gap-1">
                  {index > 0 && <span className="text-current">+</span>}
                  <span>
                    {part.prefix}
                    {formatPoints(part.value)}
                  </span>
                </span>
              ))}
            </>
          ) : (
            <span>0</span>
          )}
        </div>

        <div className="flex shrink-0 items-end justify-end gap-2 text-right">
          <span className="pb-1 text-xl font-black leading-none text-current md:text-2xl">
            =
          </span>

          <span className="text-5xl font-black leading-none text-current">
            {formatPoints(total)}
          </span>

          <span className="pb-1 text-lg font-black uppercase tracking-[0.08em] text-current md:text-xl">
            Pts
          </span>
        </div>
      </div>
    </article>
  );
}

function getPlayerScoreBoxClass({
  correct,
  total,
  streakBonus,
  maverickBonus,
  rogueBonus,
  cupBonus,
}: {
  correct: boolean;
  total: number;
  streakBonus: number;
  maverickBonus: number;
  rogueBonus: number;
  cupBonus: number;
}) {
  if (rogueBonus > 0) return "bg-[var(--stat-pink,#ff4fd8)] text-black";
  if (maverickBonus > 0) return "bg-[var(--stat-cyan,#59efff)] text-black";
  if (streakBonus > 0) return "bg-[var(--stat-yellow,#ffe44d)] text-black";
  if (correct) return "bg-[var(--stat-green,#22e55e)] text-black";
  if (cupBonus > 0) return "bg-[#ff9f1c] text-black";
  if (total <= 0) return "bg-[var(--stat-wrong,#ff3030)] text-black";

  return "bg-[var(--nffc-black,#000000)] text-white";
}

function VoidedPlayerCard() {
  return (
    <div
      className="min-h-[70px] min-w-0 bg-[var(--nffc-black,#000000)]"
      aria-hidden="true"
    />
  );
}

function StatusChip({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`inline-flex border bg-[var(--nffc-black,#000000)] px-2.5 py-1.5 text-[0.78rem] font-black uppercase tracking-[0.12em] ${borderTextTone(tone)}`}>
      {label}
    </span>
  );
}

function textTone(tone: Tone) {
  if (tone === "green") return "text-[var(--stat-green,#22e55e)]";
  if (tone === "yellow") return "text-[var(--stat-yellow,#ffe44d)]";
  if (tone === "cyan") return "text-[var(--stat-cyan,#59efff)]";
  if (tone === "pink") return "text-[var(--stat-pink,#ff4fd8)]";
  if (tone === "orange") return "text-[#ff9f1c]";
  if (tone === "red") return "text-[var(--stat-wrong,#ff3030)]";
  if (tone === "white") return "text-[var(--nffc-white,#f5f5f5)]";
  return "text-[var(--nffc-muted,#a7a7a7)]";
}

function borderTextTone(tone: Tone) {
  if (tone === "green") return "border-[var(--stat-green,#22e55e)] text-[var(--stat-green,#22e55e)]";
  if (tone === "yellow") return "border-[var(--stat-yellow,#ffe44d)] text-[var(--stat-yellow,#ffe44d)]";
  if (tone === "cyan") return "border-[var(--stat-cyan,#59efff)] text-[var(--stat-cyan,#59efff)]";
  if (tone === "pink") return "border-[var(--stat-pink,#ff4fd8)] text-[var(--stat-pink,#ff4fd8)]";
  if (tone === "orange") return "border-[#ff9f1c] text-[#ff9f1c]";
  if (tone === "red") return "border-[var(--stat-wrong,#ff3030)] text-[var(--stat-wrong,#ff3030)]";
  if (tone === "white") return "border-[var(--nffc-white,#f5f5f5)] text-[var(--nffc-white,#f5f5f5)]";
  return "border-[var(--nffc-muted,#a7a7a7)] text-[var(--nffc-muted,#a7a7a7)]";
}
