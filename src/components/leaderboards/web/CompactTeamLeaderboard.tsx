import Link from "next/link";

type TeamLeaderboardRow = {
  team_id: string;
  team_name: string;
  display_name: string | null;
  slug?: string | null;
  total_team_points: number;
  clean_sweeps: number;
  blanks: number;
};

function displayTeamName(row: TeamLeaderboardRow) {
  return row.display_name ?? row.team_name;
}

function formatTeamPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

export default function CompactTeamLeaderboard({
  rows,
}: {
  rows: TeamLeaderboardRow[];
}) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-600">
        Team leaderboard not available yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D9D6D1] bg-white">
      {rows.map((row, index) => {
        const teamName = displayTeamName(row);

        return (
          <div
            key={row.team_id}
            className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-[#E7E2DA] px-4 py-3 last:border-b-0"
          >
            <div className="text-lg font-black text-[#C8102E]">{index + 1}</div>

            <div className="min-w-0">
              {row.slug ? (
                <Link
                  href={`/team/${row.slug}`}
                  className="block truncate text-base font-black text-[#111111] underline decoration-[#C8102E]/25 underline-offset-4 transition hover:text-[#C8102E]"
                >
                  {teamName}
                </Link>
              ) : (
                <div className="truncate text-base font-black text-[#111111]">
                  {teamName}
                </div>
              )}
              <div className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-500">
                Sweeps {row.clean_sweeps} · Blanks {row.blanks}
              </div>
            </div>

            <div className="rounded-xl bg-[#111111] px-3 py-2 text-right text-sm font-black text-white">
              {formatTeamPoints(row.total_team_points)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
