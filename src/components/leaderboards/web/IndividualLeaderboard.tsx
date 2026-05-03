import {
  displayIndividualTeamName,
  displayPlayerName,
  formatIndividualPoints,
  getAccuracyWhole,
  getBonusPoints,
} from "@/lib/leaderboards/leaderboardFormatters";
import type { IndividualLeaderboardLike } from "@/lib/leaderboards/leaderboardFormatters";
import LeaderboardMiniStat from "./LeaderboardMiniStat";
import { LeaderboardValuePill, getAccuracyTone } from "./LeaderboardPills";

type IndividualLeaderboardProps = {
  rows: IndividualLeaderboardLike[];
  title?: string;
  subtitle?: string;
  countLabel?: string;
  emptyText?: string;
};

export default function IndividualLeaderboard({
  rows,
  title = "Individual leaderboard",
  subtitle = "Ranked by total score, then accuracy.",
  countLabel,
  emptyText = "Individual leaderboard not available yet.",
}: IndividualLeaderboardProps) {
  return (
    <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase">{title}</h2>
          <p className="text-sm text-neutral-600">{subtitle}</p>
        </div>

        <div className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
          {countLabel ?? `${rows.length} players`}
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#D9D6D1] 2xl:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#111111] text-white">
            <tr>
              <th className="px-4 py-4">Rank</th>
              <th className="px-4 py-4">Player</th>
              <th className="px-4 py-4">Team</th>
              <th className="px-4 py-4 text-center">Total Score</th>
              <th className="px-4 py-4 text-center">Base</th>
              <th className="px-4 py-4 text-center">Bonus</th>
              <th className="px-4 py-4 text-center">Correct</th>
              <th className="px-4 py-4 text-center">Accuracy</th>
              <th className="px-4 py-4 text-center">Best Streak</th>
              <th className="px-4 py-4 text-center">Current Streak</th>
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
                    <td className="px-4 py-5 text-2xl font-black text-[#C8102E]">
                      {index + 1}
                    </td>

                    <td className="px-4 py-5">
                      <div className="text-2xl font-black leading-tight">
                        {displayPlayerName(row)}
                      </div>

                      {row.short_name && row.short_name !== row.player_name && (
                        <div className="mt-1 text-xs text-neutral-500">
                          {row.player_name}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        {row.team_logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.team_logo_url}
                            alt={
                              row.team_logo_alt ?? displayIndividualTeamName(row)
                            }
                            className="h-12 w-12 rounded-xl border border-[#D9D6D1] bg-white object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#D9D6D1] bg-[#F7F6F2] text-xs font-black text-[#C8102E]">
                            {row.team_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="text-lg font-black leading-tight">
                          {displayIndividualTeamName(row)}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-center text-[2.2rem] font-black leading-none text-[#111111]">
                      {formatIndividualPoints(row.total_points)}
                    </td>

                    <td className="px-4 py-5 text-center">
                      <LeaderboardValuePill
                        value={formatIndividualPoints(row.base_points)}
                      />
                    </td>

                    <td className="px-4 py-5 text-center">
                      <LeaderboardValuePill
                        value={formatIndividualPoints(getBonusPoints(row))}
                      />
                    </td>

                    <td className="px-4 py-5 text-center">
                      <span className="inline-flex min-w-[100px] items-center justify-center rounded-xl border border-[#D9D6D1] bg-white px-3 py-2 text-xl font-black text-[#111111]">
                        {row.correct_predictions ?? 0}/{row.fixtures_scored ?? 0}
                      </span>
                    </td>

                    <td className="px-4 py-5 text-center">
                      <LeaderboardValuePill
                        value={`${accuracy}%`}
                        tone={getAccuracyTone(accuracy)}
                      />
                    </td>

                    <td className="px-4 py-5 text-center">
                      <LeaderboardValuePill value={row.best_streak ?? 0} />
                    </td>

                    <td className="px-4 py-5 text-center">
                      <LeaderboardValuePill value={row.current_streak ?? 0} />
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

      <div className="grid gap-3 2xl:hidden">
        {rows.length ? (
          rows.map((row, index) => {
            const accuracy = getAccuracyWhole(row);

            return (
              <div
                key={row.player_id}
                className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                      Rank {index + 1}
                    </div>

                    <div className="mt-1 text-2xl font-black">
                      {displayPlayerName(row)}
                    </div>

                    {row.short_name && row.short_name !== row.player_name && (
                      <div className="mt-1 text-sm text-neutral-500">
                        {row.player_name}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-neutral-700">
                      {row.team_logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.team_logo_url}
                          alt={row.team_logo_alt ?? displayIndividualTeamName(row)}
                          className="h-8 w-8 rounded-lg border border-[#D9D6D1] bg-white object-cover"
                        />
                      ) : null}

                      <span className="font-bold">
                        {displayIndividualTeamName(row)}
                      </span>
                    </div>
                  </div>

                  <div className="text-3xl font-black text-[#111111]">
                    {formatIndividualPoints(row.total_points)}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold md:grid-cols-4">
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
                  <LeaderboardMiniStat
                    label="Best Streak"
                    value={row.best_streak ?? 0}
                  />
                  <LeaderboardMiniStat
                    label="Current Streak"
                    value={row.current_streak ?? 0}
                  />
                  <LeaderboardMiniStat
                    label="Streaker"
                    value={formatIndividualPoints(row.streak_bonus)}
                  />
                  <LeaderboardMiniStat
                    label="Mav/Rogue/Cup"
                    value={`${formatIndividualPoints(
                      row.maverick_bonus
                    )}/${formatIndividualPoints(
                      row.rogue_bonus
                    )}/${formatIndividualPoints(row.cup_bonus)}`}
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