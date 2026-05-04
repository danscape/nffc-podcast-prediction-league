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
import {
  getBlankTone,
  getSweepTone,
  getWeeklyPointsTone,
} from "./LeaderboardPills";

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
  const logoSizeClass = size === "mobile" ? "h-9 w-9 rounded-xl" : "h-8 w-8 rounded-lg";
  const fallbackSizeClass =
    size === "mobile"
      ? "h-9 w-9 rounded-xl text-xs"
      : "h-8 w-8 rounded-lg text-[0.65rem]";

  const logo = row.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={row.logo_url}
      alt={row.logo_alt ?? teamName}
      className={`${logoSizeClass} border border-[#D9D6D1] bg-white object-cover`}
    />
  ) : (
    <div
      className={`flex ${fallbackSizeClass} items-center justify-center border border-[#D9D6D1] bg-[#F7F6F2] font-black text-[#C8102E]`}
    >
      {row.team_name.slice(0, 2).toUpperCase()}
    </div>
  );

  if (!row.slug) {
    return (
      <div className="flex items-center gap-2">
        {logo}
        <div
          className={
            size === "mobile"
              ? "truncate text-base font-black leading-tight"
              : "text-base font-black leading-tight text-[#111111] xl:text-lg"
          }
        >
          {teamName}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/team/${row.slug}`}
      className="group flex items-center gap-2"
    >
      {logo}
      <div
        className={
          size === "mobile"
            ? "truncate text-base font-black leading-tight underline decoration-[#C8102E]/25 underline-offset-4 transition group-hover:text-[#C8102E]"
            : "text-base font-black leading-tight text-[#111111] underline decoration-[#C8102E]/25 underline-offset-4 transition group-hover:text-[#C8102E] xl:text-lg"
        }
      >
        {teamName}
      </div>
    </Link>
  );
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
          {countLabel ??
            `${rows.length} teams${latestLabel ? ` · latest ${latestLabel}` : ""}`}
        </div>
      </div>

      <div className="hidden max-h-[calc(100vh-190px)] overflow-auto rounded-2xl border border-[#D9D6D1] xl:block">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-white">
                POS
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-white">
                TEAM
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-center text-white">
                TOTAL
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-center text-white">
                SWEEPS
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-center text-white">
                BLANKS
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-center text-white">
                THIS WEEK
              </th>
              <th className="sticky top-0 z-10 bg-[#111111] px-2 py-2 text-white">
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
                    className="border-b border-[#E7E2DA] last:border-b-0"
                  >
                    <td className="px-2 py-2 text-lg font-black text-[#111111]">
                      {index + 1}
                    </td>

                    <td className="px-2 py-2">
                      <TeamIdentity row={row} />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <CompactPill value={formatTeamPoints(row.total_team_points)} />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <CompactPill value={row.clean_sweeps} tone={getSweepTone()} />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <CompactPill value={row.blanks} tone={getBlankTone()} />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <CompactPill
                        value={formatTeamPoints(row.points_this_week)}
                        tone={getWeeklyPointsTone()}
                      />
                    </td>

                    <td className="px-2 py-2">
                      <div className="text-sm font-black text-[#111111]">
                        {displayMvpName(row)} / {formatPercent(mvpAccuracy)}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-6 text-neutral-600" colSpan={7}>
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
                className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamIdentity row={row} size="mobile" />

                    <div className="min-w-0">
                      <div className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#C8102E]">
                        POS {index + 1}
                      </div>

                      <div className="mt-0.5 truncate text-[0.68rem] font-bold uppercase tracking-wide text-neutral-600">
                        MVP {displayMvpName(row)} / {formatPercent(mvpAccuracy)}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 rounded-xl bg-[#111111] px-3 py-1.5 text-right text-sm font-black text-white">
                    {formatTeamPoints(row.total_team_points)}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs font-bold">
                  <LeaderboardMiniStat
                    label="Sweeps"
                    value={row.clean_sweeps}
                    tone={getSweepTone()}
                  />
                  <LeaderboardMiniStat
                    label="Blanks"
                    value={row.blanks}
                    tone={getBlankTone()}
                  />
                  <LeaderboardMiniStat
                    label="This GW"
                    value={formatTeamPoints(row.points_this_week)}
                    tone={getWeeklyPointsTone()}
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
      className={`inline-flex min-w-[54px] items-center justify-center rounded-lg border px-2 py-1 text-sm font-black ${
        tone ?? "border-[#E7E2DA] bg-[#F7F6F2] text-[#111111]"
      }`}
    >
      {value}
    </span>
  );
}