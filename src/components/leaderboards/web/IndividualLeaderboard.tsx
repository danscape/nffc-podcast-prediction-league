import Link from "next/link";
import {
  displayIndividualTeamName,
  displayPlayerName,
  formatIndividualPoints,
  getAccuracyWhole,
  getBonusPoints,
} from "@/lib/leaderboards/leaderboardFormatters";
import type { IndividualLeaderboardLike } from "@/lib/leaderboards/leaderboardFormatters";
import LeaderboardMiniStat from "./LeaderboardMiniStat";
import { getAccuracyTone } from "./LeaderboardPills";

type IndividualLeaderboardRow = IndividualLeaderboardLike & {
  player_slug?: string | null;
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
      className={`${className} transition hover:text-[#C8102E] hover:underline hover:decoration-2 hover:underline-offset-4`}
    >
      {name}
    </Link>
  );
}

export default function IndividualLeaderboard({
  rows,
  title = "Individual leaderboard",
  subtitle = "Ranked by total score, then accuracy.",
  countLabel,
  emptyText = "Individual leaderboard not available yet.",
}: IndividualLeaderboardProps) {
  return (
    <section className="rounded-3xl border border-[#D9D6D1] bg-white p-3 shadow-sm md:p-4">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black uppercase md:text-2xl">{title}</h2>
          <p className="text-xs font-semibold text-neutral-600 md:text-sm">
            {subtitle}
          </p>
        </div>

        <div className="text-xs font-bold uppercase tracking-wide text-[#C8102E] md:text-sm">
          {countLabel ?? `${rows.length} players`}
        </div>
      </div>

      <div className="hidden max-h-[calc(100vh-190px)] overflow-auto rounded-2xl border border-[#D9D6D1] 2xl:block">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-white">
                Rank
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-white">
                Player
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-white">
                Team
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-center text-white">
                Total
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-center text-white">
                Base
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-center text-white">
                Bonus
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-center text-white">
                Correct
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-center text-white">
                Accuracy
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-center text-white">
                Best
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-center text-white">
                Current
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
                    className="border-b border-[#E7E2DA] last:border-b-0"
                  >
                    <td className="px-2 py-2 text-lg font-black text-[#C8102E]">
                      {index + 1}
                    </td>

                    <td className="px-2 py-2">
                      <PlayerName
                        row={row}
                        className="block text-base font-black leading-tight text-[#111111] xl:text-lg"
                      />
                    </td>

                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {row.team_logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.team_logo_url}
                            alt={
                              row.team_logo_alt ?? displayIndividualTeamName(row)
                            }
                            className="h-8 w-8 rounded-lg border border-[#D9D6D1] bg-white object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D9D6D1] bg-[#F7F6F2] text-[0.65rem] font-black text-[#C8102E]">
                            {row.team_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="text-sm font-black leading-tight">
                          {displayIndividualTeamName(row)}
                        </div>
                      </div>
                    </td>

                    <td className="px-2 py-2 text-center text-2xl font-black leading-none text-[#111111]">
                      {formatIndividualPoints(row.total_points)}
                    </td>

                    <td className="px-2 py-2 text-center">
                      <CompactPill value={formatIndividualPoints(row.base_points)} />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <CompactPill
                        value={formatIndividualPoints(getBonusPoints(row))}
                      />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <CompactPill
                        value={`${row.correct_predictions ?? 0}/${
                          row.fixtures_scored ?? 0
                        }`}
                      />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <CompactPill
                        value={`${accuracy}%`}
                        tone={getAccuracyTone(accuracy)}
                      />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <CompactPill value={row.best_streak ?? 0} />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <CompactPill value={row.current_streak ?? 0} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-6 text-neutral-600" colSpan={10}>
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
                className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#C8102E]">
                      Rank {index + 1}
                    </div>

                    <PlayerName
                      row={row}
                      className="mt-0.5 block truncate text-lg font-black text-[#111111]"
                    />

                    <div className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-neutral-700">
                      {row.team_logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.team_logo_url}
                          alt={row.team_logo_alt ?? displayIndividualTeamName(row)}
                          className="h-6 w-6 rounded-md border border-[#D9D6D1] bg-white object-cover"
                        />
                      ) : null}

                      <span className="truncate font-bold">
                        {displayIndividualTeamName(row)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 rounded-xl bg-[#111111] px-3 py-1.5 text-base font-black text-white">
                    {formatIndividualPoints(row.total_points)}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs font-bold md:grid-cols-6">
                  <LeaderboardMiniStat
                    label="Base"
                    value={formatIndividualPoints(row.base_points)}
                  />
                  <LeaderboardMiniStat
                    label="Bonus"
                    value={formatIndividualPoints(getBonusPoints(row))}
                  />
                  <LeaderboardMiniStat
                    label="Correct"
                    value={`${row.correct_predictions ?? 0}/${
                      row.fixtures_scored ?? 0
                    }`}
                  />
                  <LeaderboardMiniStat
                    label="Accuracy"
                    value={`${accuracy}%`}
                    tone={getAccuracyTone(accuracy)}
                  />
                  <LeaderboardMiniStat label="Best" value={row.best_streak ?? 0} />
                  <LeaderboardMiniStat
                    label="Current"
                    value={row.current_streak ?? 0}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-600">
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
      className={`inline-flex min-w-[50px] items-center justify-center rounded-lg border px-2 py-1 text-sm font-black ${
        tone ?? "border-[#E7E2DA] bg-[#F7F6F2] text-[#111111]"
      }`}
    >
      {value}
    </span>
  );
}
