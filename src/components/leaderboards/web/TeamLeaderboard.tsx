import Image from "next/image";
import Link from "next/link";
import {
  displayMvpName,
  displayTeamName,
  formatPercent,
  formatTeamPoints,
  getMvpAccuracy,
} from "@/lib/leaderboards/leaderboardFormatters";
import type { TeamLeaderboardLike } from "@/lib/leaderboards/leaderboardFormatters";
import LeaderboardMiniStat from "./LeaderboardMiniStat";

type TeamLeaderboardProps = {
  rows: TeamLeaderboardLike[];
  title?: string;
  subtitle?: string;
  countLabel?: string;
  emptyText?: string;
};

function TeamIdentity({
  row,
  size = "desktop",
}: {
  row: TeamLeaderboardLike;
  size?: "desktop" | "mobile";
}) {
  const teamName = displayTeamName(row);
  const logoSizeClass = size === "mobile" ? "h-10 w-10" : "h-9 w-9";
  const fallbackSizeClass =
    size === "mobile"
      ? "h-10 w-10 text-sm"
      : "h-9 w-9 text-xs";

  const logo = row.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={row.logo_url}
      alt={row.logo_alt ?? teamName}
      className={`${logoSizeClass} border border-[#242424] bg-[var(--nffc-black,#000000)] object-cover`}
    />
  ) : (
    <div
      className={`flex ${fallbackSizeClass} items-center justify-center border border-[#242424] bg-[var(--nffc-black,#000000)] font-black text-[var(--nffc-red,#e50914)]`}
    >
      {row.team_name.slice(0, 2).toUpperCase()}
    </div>
  );

  const nameClass =
    size === "mobile"
      ? "truncate text-3xl font-black uppercase leading-tight text-white"
      : "text-4xl font-black uppercase leading-tight text-white transition group-hover:text-[var(--nffc-red,#e50914)]";

  const content = (
    <>
      {logo}
      <div className={nameClass}>{teamName}</div>
    </>
  );

  if (!row.slug) {
    return <div className="flex items-center gap-3">{content}</div>;
  }

  return (
    <Link href={`/team/${row.slug}`} className="group flex items-center gap-3">
      {content}
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


function getEstimatedPreviousTeamRanks(rows: TeamLeaderboardLike[]) {
  const previousRows = [...rows].sort((a, b) => {
    const previousA =
      Number(a.total_team_points ?? 0) - Number(a.points_this_week ?? 0);
    const previousB =
      Number(b.total_team_points ?? 0) - Number(b.points_this_week ?? 0);

    if (previousB !== previousA) return previousB - previousA;

    const sweepDifference = Number(b.clean_sweeps ?? 0) - Number(a.clean_sweeps ?? 0);
    if (sweepDifference !== 0) return sweepDifference;

    const blankDifference = Number(a.blanks ?? 0) - Number(b.blanks ?? 0);
    if (blankDifference !== 0) return blankDifference;

    return displayTeamName(a).localeCompare(displayTeamName(b));
  });

  return new Map(previousRows.map((row, index) => [row.team_id, index + 1]));
}

export default function TeamLeaderboard({
  rows,
  title = "Team leaderboard",
  subtitle = "Ranked by team points, then clean sweeps, blanks and MVP accuracy.",
  countLabel,
  emptyText = "Team leaderboard not available yet.",
}: TeamLeaderboardProps) {
  const latestLabel =
    rows.find((row) => row.latest_gameweek_label)?.latest_gameweek_label ?? null;
  const previousTeamRanks = getEstimatedPreviousTeamRanks(rows);

  return (
    <section className="bg-[var(--nffc-black,#000000)]">
      <div className="mb-3">
        <LeaderboardTableHeader title={title} />

        <div className="mt-3 flex flex-col gap-2 text-base font-black uppercase tracking-[0.08em] text-white sm:flex-row sm:items-center sm:justify-between">
          <p>{subtitle}</p>
          <div className="text-[var(--nffc-red,#e50914)]">
            {countLabel ??
              `${rows.length} teams${latestLabel ? ` / latest ${latestLabel}` : ""}`}
          </div>
        </div>
      </div>

      <div className="hidden border border-[#242424] xl:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-[var(--nffc-red,#e50914)] bg-[var(--nffc-black,#000000)] text-2xl font-black uppercase tracking-[0.14em] text-white">
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-4 py-4">
                POS
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-4 py-4">
                TEAM
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-4 py-4 text-center text-[var(--stat-green,#22e55e)]">
                SCORE
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-4 py-4 text-center text-[var(--stat-cyan,#59efff)]">
                SWEEPS
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-4 py-4 text-center text-[var(--stat-wrong,#ff3030)]">
                BLANKS
              </th>
              <th className="sticky top-0 z-10 border-r border-[#242424] bg-[var(--nffc-black,#000000)] px-4 py-4 text-center text-[var(--stat-green,#22e55e)]">
                THIS GW
              </th>
              <th className="sticky top-0 z-10 bg-[var(--nffc-black,#000000)] px-4 py-4">
                MVP
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length ? (
              rows.map((row, index) => {
                const mvpAccuracy = getMvpAccuracy(row);

                return (
                  <tr
                    key={row.team_id}
                    className="border-b border-[#242424] bg-[var(--nffc-black,#000000)] text-white last:border-b-0"
                  >
                    <td className="border-r border-[#242424] px-4 py-2 text-3xl font-black text-[var(--nffc-red,#e50914)]">
                      <RankCell rank={index + 1} row={{ previous_rank: previousTeamRanks.get(row.team_id) ?? null }} />
                    </td>

                    <td className="border-r border-[#242424] px-4 py-2.5">
                      <TeamIdentity row={row} />
                    </td>

                    <td className="border-r border-[#242424] px-4 py-2 text-center text-4xl font-black leading-none text-[var(--stat-green,#22e55e)]">
                      {formatTeamPoints(row.total_team_points)}
                    </td>

                    <td className="border-r border-[#242424] px-4 py-2 text-center text-3xl font-black text-[var(--stat-cyan,#59efff)]">
                      {row.clean_sweeps}
                    </td>

                    <td className="border-r border-[#242424] px-4 py-2 text-center text-3xl font-black text-[var(--stat-wrong,#ff3030)]">
                      {row.blanks}
                    </td>

                    <td className="border-r border-[#242424] px-4 py-2 text-center text-3xl font-black text-[var(--stat-green,#22e55e)]">
                      {formatTeamPoints(row.points_this_week)}
                    </td>

                    <td className="px-4 py-2">
                      <div className="text-xl font-black uppercase text-white">
                        {displayMvpName(row)}
                        <span className="px-2 text-[var(--nffc-red,#e50914)]">/</span>
                        <span className="text-[var(--stat-green,#22e55e)]">
                          {formatPercent(mvpAccuracy)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-6 text-sm font-black uppercase tracking-[0.12em] text-white" colSpan={7}>
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 xl:hidden">
        {rows.length ? (
          rows.map((row, index) => {
            const mvpAccuracy = getMvpAccuracy(row);

            return (
              <div
                key={row.team_id}
                className="border border-[#242424] bg-[var(--nffc-black,#000000)] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="text-2xl font-black text-[var(--nffc-red,#e50914)]">
                      <RankCell rank={index + 1} row={{ previous_rank: previousTeamRanks.get(row.team_id) ?? null }} />
                    </div>

                    <div className="min-w-0">
                      <TeamIdentity row={row} size="mobile" />

                      <div className="mt-1 truncate text-sm font-black uppercase tracking-[0.12em] text-white">
                        MVP {displayMvpName(row)} /{" "}
                        <span className="text-[var(--stat-green,#22e55e)]">
                          {formatPercent(mvpAccuracy)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-4xl font-black leading-none text-[var(--stat-green,#22e55e)]">
                    {formatTeamPoints(row.total_team_points)}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5 text-xs font-bold">
                  <LeaderboardMiniStat
                    label="Sweeps"
                    value={row.clean_sweeps}
                    tone="border-[var(--stat-cyan,#59efff)] bg-[var(--nffc-black,#000000)] text-[var(--stat-cyan,#59efff)]"
                  />
                  <LeaderboardMiniStat
                    label="Blanks"
                    value={row.blanks}
                    tone="border-[var(--stat-wrong,#ff3030)] bg-[var(--nffc-black,#000000)] text-[var(--stat-wrong,#ff3030)]"
                  />
                  <LeaderboardMiniStat
                    label="This GW"
                    value={formatTeamPoints(row.points_this_week)}
                    tone="border-[var(--stat-green,#22e55e)] bg-[var(--nffc-black,#000000)] text-[var(--stat-green,#22e55e)]"
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
      className={`inline-flex min-w-[64px] items-center justify-center border bg-[var(--nffc-black,#000000)] px-3 py-1.5 text-xl font-black ${
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
