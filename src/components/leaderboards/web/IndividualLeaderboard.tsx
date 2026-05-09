import Image from "next/image";
import Link from "next/link";
import {
  displayIndividualTeamName,
  displayPlayerName,
  formatIndividualPoints,
  getAccuracyWhole,
} from "@/lib/leaderboards/leaderboardFormatters";
import type { IndividualLeaderboardLike } from "@/lib/leaderboards/leaderboardFormatters";
import LeaderboardMiniStat from "./LeaderboardMiniStat";

type IndividualLeaderboardRow = IndividualLeaderboardLike & {
  player_slug?: string | null;
  points_this_week?: number | null;
};

type IndividualLeaderboardProps = {
  rows: IndividualLeaderboardRow[];
  title?: string;
  subtitle?: string;
  countLabel?: string;
  emptyText?: string;
};

function playerHref(row: IndividualLeaderboardRow) {
  return row.player_slug ? `/player/${row.player_slug}` : null;
}

function PlayerName({
  row,
  className,
}: {
  row: IndividualLeaderboardRow;
  className: string;
}) {
  const href = playerHref(row);
  const name = displayPlayerName(row);

  if (!href) {
    return <div className={className}>{name}</div>;
  }

  return (
    <Link
      href={href}
      className={`${className} transition hover:text-[var(--nffc-red,#e50914)] hover:underline hover:decoration-2 hover:underline-offset-4`}
    >
      {name}
    </Link>
  );
}


type RankMovementRow = {
  previous_rank?: number | null;
  rank_change?: number | null;
};

function getRankMovement(row: RankMovementRow, currentRank: number) {
  if (typeof row.rank_change === "number") {
    return row.rank_change;
  }

  if (typeof row.previous_rank === "number" && row.previous_rank > 0) {
    return row.previous_rank - currentRank;
  }

  return 0;
}

function RankCell({
  rank,
  row,
}: {
  rank: number;
  row: RankMovementRow;
}) {
  const movement = getRankMovement(row, rank);

  return (
    <div className="grid grid-cols-[2ch_3.5ch] items-center gap-1">
      <span className="tabular-nums">{rank}</span>

      {movement > 0 ? (
        <span className="text-base font-black leading-none text-[var(--stat-green,#22e55e)]">
          ▲{movement}
        </span>
      ) : movement < 0 ? (
        <span className="text-base font-black leading-none text-[var(--stat-wrong,#ff3030)]">
          ▼{Math.abs(movement)}
        </span>
      ) : (
        <span className="text-base font-black leading-none text-[#777777]">–</span>
      )}
    </div>
  );
}


function getEstimatedPreviousIndividualRanks(rows: IndividualLeaderboardRow[]) {
  const previousRows = [...rows].sort((a, b) => {
    const previousA =
      Number(a.total_points ?? 0) - Number(a.points_this_week ?? 0);
    const previousB =
      Number(b.total_points ?? 0) - Number(b.points_this_week ?? 0);

    if (previousB !== previousA) return previousB - previousA;

    const accuracyDifference = Number(b.accuracy_percentage ?? 0) - Number(a.accuracy_percentage ?? 0);
    if (accuracyDifference !== 0) return accuracyDifference;

    return displayPlayerName(a).localeCompare(displayPlayerName(b));
  });

  return new Map(previousRows.map((row, index) => [row.player_id, index + 1]));
}

export default function IndividualLeaderboard({
  rows,
  title = "Individual leaderboard",
  subtitle = "Ranked by total score, then accuracy.",
  countLabel,
  emptyText = "Individual leaderboard not available yet.",
}: IndividualLeaderboardProps) {
  const previousIndividualRanks = getEstimatedPreviousIndividualRanks(rows);

  return (
    <section className="bg-[var(--nffc-black,#000000)]">
      <div className="mb-3">
        <LeaderboardTableHeader title={title} />

        <div className="mt-1.5 flex flex-col gap-2 text-sm font-black uppercase tracking-[0.08em] text-white sm:flex-row sm:items-center sm:justify-between">
          <p>{subtitle}</p>
          <div className="text-[var(--nffc-red,#e50914)]">
            {countLabel ?? `${rows.length} players`}
          </div>
        </div>
      </div>

      <div className="hidden border border-[#242424] 2xl:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-[var(--nffc-red,#e50914)] bg-[var(--nffc-black,#000000)] text-lg font-black uppercase tracking-[0.11em] text-white">
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-2.5 py-2">
                POS
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-2.5 py-2">
                PLAYER
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-2.5 py-2">
                TEAM
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-2.5 py-2 text-center text-[var(--stat-green,#22e55e)]">
                SCORE
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-2.5 py-2 text-center text-[var(--stat-green,#22e55e)]">
                BASE
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-2.5 py-2 text-center text-[var(--stat-yellow,#ffe44d)]">
                STREAKER
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-2.5 py-2 text-center text-[var(--stat-cyan,#59efff)]">
                MAVERICK
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-2.5 py-2 text-center text-[var(--stat-pink,#ff4fd8)]">
                ROGUE
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-2.5 py-2 text-center text-[var(--stat-orange,#ff9f1c)]">
                CUP
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-2.5 py-2 text-center text-[var(--stat-green,#22e55e)]">
                ACC.
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-2.5 py-2 text-center">
                BEST STREAK
              </th>
              <th className="sticky top-0 z-10 bg-[var(--nffc-black,#000000)] px-2.5 py-2 text-center">
                CURRENT STREAK
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length ? (
              rows.map((row, index) => {
                const accuracy = getAccuracyWhole(row);

                return (
                  <tr
                    key={row.player_id}
                    className="border-b border-[#242424] bg-[var(--nffc-black,#000000)] text-white last:border-b-0"
                  >
                    <td className="border-r border-[#242424] px-2.5 py-1 text-xl font-black text-[var(--nffc-red,#e50914)]">
                      <RankCell rank={index + 1} row={{ previous_rank: previousIndividualRanks.get(row.player_id) ?? null }} />
                    </td>

                    <td className="border-r border-[#242424] px-2.5 py-1">
                      <PlayerName
                        row={row}
                        className="block text-xl font-black uppercase leading-tight text-white"
                      />
                    </td>

                    <td className="border-r border-[#242424] px-2.5 py-1">
                      <div className="flex items-center gap-3">
                        {row.team_logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.team_logo_url}
                            alt={
                              row.team_logo_alt ?? displayIndividualTeamName(row)
                            }
                            className="h-6 w-6 border border-[#242424] bg-[var(--nffc-black,#000000)] object-cover"
                          />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center border border-[#242424] bg-[var(--nffc-black,#000000)] text-[0.6rem] font-black text-[var(--nffc-red,#e50914)]">
                            {row.team_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="text-sm font-black uppercase leading-tight text-white">
                          {displayIndividualTeamName(row)}
                        </div>
                      </div>
                    </td>

                    <td className="border-r border-[#242424] px-2.5 py-1 text-center text-2xl font-black leading-none text-[var(--stat-green,#22e55e)]">
                      {formatIndividualPoints(row.total_points)}
                    </td>

                    <td className="border-r border-[#242424] px-2.5 py-1 text-center text-xl font-black text-[var(--stat-green,#22e55e)]">
                      {formatIndividualPoints(row.base_points)}
                    </td>

                    <td className="border-r border-[#242424] px-2.5 py-1 text-center text-xl font-black text-[var(--stat-yellow,#ffe44d)]">
                      {formatIndividualPoints(row.streak_bonus)}
                    </td>

                    <td className="border-r border-[#242424] px-2.5 py-1 text-center text-xl font-black text-[var(--stat-cyan,#59efff)]">
                      {formatIndividualPoints(row.maverick_bonus)}
                    </td>

                    <td className="border-r border-[#242424] px-2.5 py-1 text-center text-xl font-black text-[var(--stat-pink,#ff4fd8)]">
                      {formatIndividualPoints(row.rogue_bonus)}
                    </td>

                    <td className="border-r border-[#242424] px-2.5 py-1 text-center text-xl font-black text-[var(--stat-orange,#ff9f1c)]">
                      {formatIndividualPoints(row.cup_bonus)}
                    </td>

                    <td className="border-r border-[#242424] px-2.5 py-1 text-center">
                      <CompactPill
                        value={`${accuracy}%`}
                        tone="border-[var(--stat-green,#22e55e)] text-[var(--stat-green,#22e55e)]"
                      />
                    </td>

                    <td className="border-r border-[#242424] px-2.5 py-1 text-center">
                      <CompactPill value={row.best_streak ?? 0} />
                    </td>

                    <td className="px-2.5 py-1 text-center">
                      <CompactPill
                        value={row.current_streak ?? 0}
                        tone={
                          Number(row.current_streak ?? 0) > 0
                            ? "border-[var(--stat-green,#22e55e)] text-[var(--stat-green,#22e55e)]"
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-6 text-sm font-black uppercase tracking-[0.12em] text-white" colSpan={12}>
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 2xl:hidden">
        {rows.length ? (
          rows.map((row, index) => {
            const accuracy = getAccuracyWhole(row);

            return (
              <div
                key={row.player_id}
                className="border border-[#242424] bg-[var(--nffc-black,#000000)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-2xl font-black uppercase tracking-[0.08em] text-[var(--nffc-red,#e50914)]">
                      <RankCell rank={index + 1} row={{ previous_rank: previousIndividualRanks.get(row.player_id) ?? null }} />
                    </div>

                    <PlayerName
                      row={row}
                      className="mt-1 block truncate text-3xl font-black uppercase text-white"
                    />

                    <div className="mt-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-white">
                      {row.team_logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.team_logo_url}
                          alt={row.team_logo_alt ?? displayIndividualTeamName(row)}
                          className="h-6 w-6 border border-[#242424] bg-[var(--nffc-black,#000000)] object-cover"
                        />
                      ) : null}

                      <span className="truncate">
                        {displayIndividualTeamName(row)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-4xl font-black leading-none text-[var(--stat-green,#22e55e)]">
                    {formatIndividualPoints(row.total_points)}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5 text-xs font-bold md:grid-cols-6">
                  <LeaderboardMiniStat
                    label="Base"
                    value={formatIndividualPoints(row.base_points)}
                    tone="border-[var(--stat-green,#22e55e)] bg-[var(--nffc-black,#000000)] text-[var(--stat-green,#22e55e)]"
                  />
                  <LeaderboardMiniStat
                    label="Streaker"
                    value={formatIndividualPoints(row.streak_bonus)}
                    tone="border-[var(--stat-yellow,#ffe44d)] bg-[var(--nffc-black,#000000)] text-[var(--stat-yellow,#ffe44d)]"
                  />
                  <LeaderboardMiniStat
                    label="Maverick"
                    value={formatIndividualPoints(row.maverick_bonus)}
                    tone="border-[var(--stat-cyan,#59efff)] bg-[var(--nffc-black,#000000)] text-[var(--stat-cyan,#59efff)]"
                  />
                  <LeaderboardMiniStat
                    label="Rogue"
                    value={formatIndividualPoints(row.rogue_bonus)}
                    tone="border-[var(--stat-pink,#ff4fd8)] bg-[var(--nffc-black,#000000)] text-[var(--stat-pink,#ff4fd8)]"
                  />
                  <LeaderboardMiniStat
                    label="Accuracy"
                    value={`${accuracy}%`}
                    tone="border-[var(--stat-green,#22e55e)] bg-[var(--nffc-black,#000000)] text-[var(--stat-green,#22e55e)]"
                  />
                  <LeaderboardMiniStat label="Best" value={row.best_streak ?? 0} />
                  <LeaderboardMiniStat
                    label="Current"
                    value={row.current_streak ?? 0}
                    tone={
                      Number(row.current_streak ?? 0) > 0
                        ? "border-[var(--stat-green,#22e55e)] bg-[var(--nffc-black,#000000)] text-[var(--stat-green,#22e55e)]"
                        : undefined
                    }
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="border border-[#242424] bg-[var(--nffc-black,#000000)] p-4 text-sm font-black uppercase tracking-[0.12em] text-white">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

function CompactPill({
  value,
  tone,
}: {
  value: string | number;
  tone?: string;
}) {
  return (
    <span
      className={`inline-flex min-w-[44px] items-center justify-center border bg-[var(--nffc-black,#000000)] px-1.5 py-0.5 text-sm font-black ${
        tone ?? "border-white text-white"
      }`}
    >
      {value}
    </span>
  );
}


function LeaderboardTableHeader({ title }: { title: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_250px] items-center bg-[var(--nffc-red,#e50914)]">
      <h2 className="px-5 py-2 text-3xl font-black uppercase tracking-[0.08em] text-white md:text-4xl">
        {title}
      </h2>

      <div className="flex h-full items-center justify-end bg-[var(--nffc-red,#e50914)] px-2">
        <Image
          src="/brand/nffc-podcast-prediction-league-banner.png"
          alt="NFFC Podcast Prediction League"
          width={520}
          height={145}
          className="h-14 w-auto object-contain"
        />
      </div>
    </div>
  );
}
