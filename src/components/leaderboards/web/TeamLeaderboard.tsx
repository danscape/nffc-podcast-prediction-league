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
  LeaderboardValuePill,
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
    <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase">{title}</h2>
          <p className="text-sm text-neutral-600">{subtitle}</p>
        </div>

        <div className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
          {countLabel ?? `${rows.length} teams${latestLabel ? ` · latest ${latestLabel}` : ""}`}
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#D9D6D1] xl:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#111111] text-white">
            <tr>
              <th className="px-4 py-4">POS</th>
              <th className="px-4 py-4">TEAM</th>
              <th className="px-4 py-4 text-center">TOTAL SCORE</th>
              <th className="px-4 py-4 text-center">CLEAN SWEEPS</th>
              <th className="px-4 py-4 text-center">BLANKS</th>
              <th className="px-4 py-4 text-center">POINTS THIS WEEK</th>
              <th className="px-4 py-4">SEASON MVP</th>
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
                    <td className="px-4 py-5 text-2xl font-black text-[#111111]">
                      {index + 1}
                    </td>

                    <td className="px-4 py-5">
                      <div className="flex items-center gap-4">
                        {row.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.logo_url}
                            alt={row.logo_alt ?? displayTeamName(row)}
                            className="h-14 w-14 rounded-2xl border border-[#D9D6D1] bg-white object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] text-sm font-black text-[#C8102E]">
                            {row.team_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <div className="text-[2rem] font-black leading-tight text-[#111111]">
                            {displayTeamName(row)}
                          </div>

                          <div className="mt-1 text-sm font-semibold text-neutral-500">
                            {row.x_handle ?? "No X handle"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-center">
                      <LeaderboardValuePill
                        value={formatTeamPoints(row.total_team_points)}
                        size="xl"
                      />
                    </td>

                    <td className="px-4 py-5 text-center">
                      <LeaderboardValuePill
                        value={row.clean_sweeps}
                        tone={getSweepTone()}
                        size="lg"
                      />
                    </td>

                    <td className="px-4 py-5 text-center">
                      <LeaderboardValuePill
                        value={row.blanks}
                        tone={getBlankTone()}
                        size="lg"
                      />
                    </td>

                    <td className="px-4 py-5 text-center">
                      <LeaderboardValuePill
                        value={formatTeamPoints(row.points_this_week)}
                        tone={getWeeklyPointsTone()}
                        size="lg"
                      />
                    </td>

                    <td className="px-4 py-5">
                      <div className="flex flex-col gap-2">
                        <div className="text-lg font-black text-[#111111]">
                          {displayMvpName(row)}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-[#D9D6D1] bg-[#F7F6F2] px-3 py-1 text-sm font-black text-[#111111]">
                            {formatPercent(mvpAccuracy)}
                          </span>

                          {row.latest_gameweek_label && (
                            <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                              {row.latest_gameweek_label}
                            </span>
                          )}
                        </div>
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

      <div className="grid gap-3 xl:hidden">
        {rows.length ? (
          rows.map((row, index) => {
            const mvpAccuracy = getMvpAccuracy(row);

            return (
              <div
                key={row.team_id}
                className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {row.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.logo_url}
                        alt={row.logo_alt ?? displayTeamName(row)}
                        className="h-14 w-14 rounded-2xl border border-[#D9D6D1] bg-white object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D9D6D1] bg-white text-sm font-black text-[#C8102E]">
                        {row.team_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                        POS {index + 1}
                      </div>

                      <div className="mt-1 text-2xl font-black leading-tight">
                        {displayTeamName(row)}
                      </div>

                      <div className="text-sm font-semibold text-neutral-600">
                        {row.x_handle ?? "No X handle"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black uppercase text-neutral-500">
                      Total
                    </div>

                    <div className="text-3xl font-black text-[#111111]">
                      {formatTeamPoints(row.total_team_points)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold">
                  <LeaderboardMiniStat
                    label="Clean Sweeps"
                    value={row.clean_sweeps}
                    tone={getSweepTone()}
                  />
                  <LeaderboardMiniStat
                    label="Blanks"
                    value={row.blanks}
                    tone={getBlankTone()}
                  />
                  <LeaderboardMiniStat
                    label="This Week"
                    value={formatTeamPoints(row.points_this_week)}
                    tone={getWeeklyPointsTone()}
                  />
                  <LeaderboardMiniStat
                    label="Latest GW"
                    value={row.latest_gameweek_label ?? "—"}
                  />
                  <LeaderboardMiniStat
                    label="Season MVP"
                    value={displayMvpName(row)}
                  />
                  <LeaderboardMiniStat
                    label="MVP Accuracy"
                    value={formatPercent(mvpAccuracy)}
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