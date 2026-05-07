"use client";

import Link from "next/link";
import { useState } from "react";
import { getPredictionProfile, getProjectedForestPoints } from "@/lib/predictionProfiles";

type IndividualLeaderboardRow = {
  player_id: string;
  player_slug?: string | null;
  player_name: string;
  short_name: string | null;
  table_display_name?: string | null;
  team_name: string;
  team_display_name?: string | null;
  team_abbreviation?: string | null;
  base_points: number;
  streak_bonus: number;
  maverick_bonus: number;
  rogue_bonus: number;
  cup_bonus: number;
  bonus_points: number | null;
  total_points: number | null;
  points_this_week?: number | null;
  best_streak?: number | null;
  current_streak?: number | null;
  player_profile?: string | null;
  prediction_profile?: string | null;
  profile_label?: string | null;
  profile_tag?: string | null;
  projected_forest_points?: number | null;
  projected_points?: number | null;
  forest_points?: number | null;
  predicted_wins?: number | null;
  predicted_draws?: number | null;
  predicted_losses?: number | null;
  accuracy_percentage?: number | null;
  accuracy_whole_percentage?: number | null;
  individual_rank?: number | null;
  rank_position?: number | null;
  rank?: number | null;
  rank_change?: number | null;
};


function RankMovement({ change }: { change: number | null | undefined }) {
  if (change === null || change === undefined || change === 0) {
    return (
      <span className="mt-0.5 block text-[0.58rem] font-black leading-none text-[#777777]">
        —
      </span>
    );
  }

  if (change > 0) {
    return (
      <span className="mt-0.5 block text-[0.58rem] font-black leading-none text-[var(--stat-green,#22e55e)]">
        ▲{change}
      </span>
    );
  }

  return (
    <span className="mt-0.5 block text-[0.58rem] font-black leading-none text-[var(--stat-wrong,#ff3030)]">
      ▼{Math.abs(change)}
    </span>
  );
}

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(2).replace(".00", "");
}

function formatPercent(value: number | null | undefined) {
  return `${Math.round(Number(value ?? 0))}%`;
}


function getEstimatedPreviousIndividualRanks(rows: IndividualLeaderboardRow[]) {
  const previousRows = [...rows].sort((a, b) => {
    const previousA =
      Number(a.total_points ?? 0) - Number(a.points_this_week ?? 0);
    const previousB =
      Number(b.total_points ?? 0) - Number(b.points_this_week ?? 0);

    if (previousB !== previousA) return previousB - previousA;

    const accuracyDifference =
      Number(b.accuracy_percentage ?? 0) - Number(a.accuracy_percentage ?? 0);
    if (accuracyDifference !== 0) return accuracyDifference;

    return displayPlayerName(a).localeCompare(displayPlayerName(b));
  });

  return new Map(previousRows.map((row, index) => [row.player_id, index + 1]));
}

function getRank(row: IndividualLeaderboardRow, index: number) {
  return row.individual_rank ?? row.rank_position ?? row.rank ?? index + 1;
}

function displayPlayerName(row: IndividualLeaderboardRow) {
  return row.table_display_name ?? row.short_name ?? row.player_name;
}

function displayTeamShort(row: IndividualLeaderboardRow) {
  return row.team_abbreviation ?? row.team_display_name ?? row.team_name;
}

function displayPlayerProfile(row: IndividualLeaderboardRow) {
  return getPredictionProfile(row);
}

function getAccuracy(row: IndividualLeaderboardRow) {
  return (
    row.accuracy_whole_percentage ??
    Math.round(Number(row.accuracy_percentage ?? 0))
  );
}

function getBonusTotal(row: IndividualLeaderboardRow) {
  return (
    row.bonus_points ??
    Number(row.streak_bonus ?? 0) +
      Number(row.maverick_bonus ?? 0) +
      Number(row.rogue_bonus ?? 0) +
      Number(row.cup_bonus ?? 0)
  );
}

function valueTone(value: number | null | undefined, positiveTone: string) {
  return Number(value ?? 0) > 0 ? positiveTone : "text-[var(--stat-wrong,#ff3030)]";
}

export default function CompactIndividualLeaderboard({
  rows,
}: {
  rows: IndividualLeaderboardRow[];
}) {
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Set<string>>(
    () => new Set()
  );
  const previousIndividualRanks = getEstimatedPreviousIndividualRanks(rows);

  function togglePlayer(playerId: string) {
    setExpandedPlayerIds((current) => {
      const next = new Set(current);

      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }

      return next;
    });
  }

  const projectedPointRows = rows
    .map((row) => getProjectedForestPoints(row))
    .filter((value): value is number => value !== null);

  const averageProjectedForestPoints = projectedPointRows.length
    ? projectedPointRows.reduce((total, value) => total + value, 0) /
      projectedPointRows.length
    : null;

  const predictedDrawRows = rows
    .map((row) =>
      Number.isFinite(Number(row.predicted_draws))
        ? Number(row.predicted_draws)
        : null
    )
    .filter((value): value is number => value !== null);

  const averagePredictedDraws = predictedDrawRows.length
    ? predictedDrawRows.reduce((total, value) => total + value, 0) /
      predictedDrawRows.length
    : null;

  if (!rows.length) {
    return (
      <div className="border border-[#242424] bg-[var(--nffc-black,#000000)] px-3 py-4 text-sm font-black uppercase tracking-[0.12em] text-white">
        Player table not available yet.
      </div>
    );
  }

  return (
    <section className="bg-[var(--nffc-black,#000000)]">
      <div className="overflow-hidden border border-[#242424]">
        <div className="grid grid-cols-[26px_minmax(0,1fr)_42px_42px_46px_20px] border-b border-[var(--nffc-red,#e50914)] bg-[var(--nffc-black,#000000)] text-[0.52rem] font-black uppercase tracking-[0.08em] text-white">
          <div className="px-0.5 py-0.5 text-left text-[var(--nffc-red,#e50914)]">Rk</div>
          <div className="px-0.5 py-0.5 text-left">Name</div>
          <div className="px-0.5 py-0.5 text-left">Team</div>
          <div className="px-0.5 py-0.5 text-right">Acc</div>
          <div className="px-0.5 py-0.5 text-right">Pts</div>
          <div className="px-0.5 py-0.5 text-right">+</div>
        </div>

        {rows.map((row, index) => {
          const expanded = expandedPlayerIds.has(row.player_id);
          const bonusTotal = getBonusTotal(row);
          const totalPoints = Number(row.total_points ?? 0);

          return (
            <div
              key={row.player_id}
              className="border-b border-[#242424] bg-[var(--nffc-black,#000000)] last:border-b-0"
            >
              <div className="grid grid-cols-[26px_minmax(0,1fr)_42px_42px_46px_20px] items-center text-white">
                <div className="px-0.5 py-0.5 text-left text-base font-black uppercase leading-none text-[var(--nffc-red,#e50914)]">
                  <span>{getRank(row, index)}</span>
                  <RankMovement
                    change={
                      (previousIndividualRanks.get(row.player_id) ?? getRank(row, index)) -
                      getRank(row, index)
                    }
                  />
                </div>

                <div className="min-w-0 px-0.5 py-0.5">
                  {row.player_slug ? (
                    <Link
                      href={`/player/${row.player_slug}`}
                      className="block truncate text-[0.82rem] font-black uppercase leading-none tracking-[-0.02em] text-white"
                    >
                      {displayPlayerName(row)}
                    </Link>
                  ) : (
                    <div className="truncate text-[0.82rem] font-black uppercase leading-none tracking-[-0.02em] text-white">
                      {displayPlayerName(row)}
                    </div>
                  )}
                </div>

                <div className="truncate px-0.5 py-0.5 text-[0.68rem] font-black uppercase leading-none text-white">
                  {displayTeamShort(row)}
                </div>

                <div className="px-0.5 py-0.5 text-right text-[0.7rem] font-black uppercase leading-none text-[var(--stat-green,#22e55e)]">
                  {formatPercent(getAccuracy(row))}
                </div>

                <div className="px-0.5 py-0.5 text-right text-sm font-black uppercase leading-none text-[var(--stat-green,#22e55e)]">
                  {formatPoints(totalPoints)}
                </div>

                <button
                  type="button"
                  onClick={() => togglePlayer(row.player_id)}
                  className="px-0.5 py-0.5 text-right text-base font-black leading-none text-white"
                  aria-expanded={expanded}
                  aria-label={`Toggle ${displayPlayerName(row)} points breakdown`}
                >
                  {expanded ? "−" : "+"}
                </button>
              </div>

              {expanded && (
                <div className="border-t border-[#242424] bg-[var(--nffc-black,#000000)]">
                  <div className="grid grid-cols-[26px_minmax(0,1fr)]">
                    <div />
                    <div className="min-w-0 px-0.5 py-0.5">
                      <div className="whitespace-nowrap text-[0.5rem] font-black uppercase tracking-[0.02em] text-white">
                        <span className="text-[var(--stat-green,#22e55e)]">Base</span>{" "}
                        <span className={valueTone(row.base_points, "text-[var(--stat-green,#22e55e)]")}>
                          {formatPoints(row.base_points)}
                        </span>
                        <span className="px-0.5 text-[#666666]">+</span>

                        <span className="text-[var(--stat-yellow,#ffe44d)]">Streaker</span>{" "}
                        <span className={valueTone(row.streak_bonus, "text-[var(--stat-yellow,#ffe44d)]")}>
                          {formatPoints(row.streak_bonus)}
                        </span>
                        <span className="px-0.5 text-[#666666]">+</span>

                        <span className="text-[var(--stat-cyan,#59efff)]">Mav</span>{" "}
                        <span className={valueTone(row.maverick_bonus, "text-[var(--stat-cyan,#59efff)]")}>
                          {formatPoints(row.maverick_bonus)}
                        </span>
                      </div>

                      <div className="mt-0.5 whitespace-nowrap text-[0.5rem] font-black uppercase tracking-[0.02em] text-white">
                        <span className="text-[var(--stat-pink,#ff4fd8)]">Rogue</span>{" "}
                        <span className={valueTone(row.rogue_bonus, "text-[var(--stat-pink,#ff4fd8)]")}>
                          {formatPoints(row.rogue_bonus)}
                        </span>
                        <span className="px-0.5 text-[#666666]">+</span>

                        <span className="text-[var(--stat-green,#22e55e)]">Cup</span>{" "}
                        <span className={valueTone(row.cup_bonus, "text-[var(--stat-green,#22e55e)]")}>
                          {formatPoints(row.cup_bonus)}
                        </span>
                        <span className="px-0.5 text-[var(--nffc-red,#e50914)]">=</span>

                        <span className="text-white">Total</span>{" "}
                        <span className="text-[var(--stat-green,#22e55e)]">
                          {formatPoints(totalPoints)}
                        </span>
                      </div>

                      <div className="mt-0.5 whitespace-nowrap text-[0.5rem] font-black uppercase tracking-[0.04em] text-white">
                        <span className="text-[var(--stat-cyan,#59efff)]">
                          {displayPlayerProfile(row)}
                        </span>
                        <span className="px-0.5 text-[#666666]">/</span>
                        <span className="text-[var(--stat-yellow,#ffe44d)]">Best Streak</span>{" "}
                        <span className={valueTone(row.best_streak, "text-[var(--stat-yellow,#ffe44d)]")}>
                          {row.best_streak ?? 0}
                        </span>
                        <span className="px-0.5 text-[#666666]">/</span>
                        <span className="text-[var(--stat-yellow,#ffe44d)]">Current</span>{" "}
                        <span className={valueTone(row.current_streak, "text-[var(--stat-yellow,#ffe44d)]")}>
                          {row.current_streak ?? 0}
                        </span>
                      </div>

                      <div className="mt-0.5 text-[0.5rem] font-black uppercase tracking-[0.08em] text-[#8f8f8f]">
                        Bonus total {formatPoints(bonusTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
