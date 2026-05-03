import Link from "next/link";

type IndividualLeaderboardRow = {
  player_id: string;
  player_slug?: string | null;
  player_name: string;
  short_name: string | null;
  table_display_name?: string | null;
  team_name: string;
  team_display_name?: string | null;
  total_points: number;
  accuracy_whole_percentage: number | null;
  accuracy_percentage: number;
};

function displayPlayerName(row: IndividualLeaderboardRow) {
  return row.table_display_name ?? row.short_name ?? row.player_name;
}

function displayTeamName(row: IndividualLeaderboardRow) {
  return row.team_display_name ?? row.team_name;
}

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1).replace(".0", "");
}

function formatAccuracy(row: IndividualLeaderboardRow) {
  const accuracy =
    row.accuracy_whole_percentage ??
    Math.round(Number(row.accuracy_percentage ?? 0));

  return `${accuracy}%`;
}

function playerHref(row: IndividualLeaderboardRow) {
  return row.player_slug ? `/player/${row.player_slug}` : null;
}

function CompactPlayerName({ row }: { row: IndividualLeaderboardRow }) {
  const href = playerHref(row);
  const name = displayPlayerName(row);

  if (!href) {
    return <div className="truncate text-base font-black text-[#111111]">{name}</div>;
  }

  return (
    <Link
      href={href}
      className="block truncate text-base font-black text-[#111111] transition hover:text-[#C8102E] hover:underline hover:decoration-2 hover:underline-offset-4"
    >
      {name}
    </Link>
  );
}

export default function CompactIndividualLeaderboard({
  rows,
}: {
  rows: IndividualLeaderboardRow[];
}) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-600">
        Individual leaderboard not available yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D9D6D1] bg-white">
      {rows.map((row, index) => (
        <div
          key={row.player_id}
          className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-[#E7E2DA] px-4 py-3 last:border-b-0"
        >
          <div className="text-lg font-black text-[#C8102E]">{index + 1}</div>

          <div className="min-w-0">
            <CompactPlayerName row={row} />

            <div className="mt-1 truncate text-xs font-bold uppercase tracking-wide text-neutral-500">
              {displayTeamName(row)} · {formatAccuracy(row)}
            </div>
          </div>

          <div className="rounded-xl bg-[#111111] px-3 py-2 text-right text-sm font-black text-white">
            {formatPoints(row.total_points)}
          </div>
        </div>
      ))}
    </div>
  );
}
