import SocialGraphicFrame from "./SocialGraphicFrame";
import {
  formatGraphicPercent,
  formatGraphicPoints,
  GraphicStatCard,
} from "./SocialGraphicBits";

export type LatestGwResultSummaryRow = {
  fixture_id: string;
  gameweek: number;
  gameweek_label: string;
  opponent: string;
  opponent_short: string;
  venue: "H" | "A";
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  forest_result: "W" | "D" | "L" | null;
  total_predictions: number;
  forest_win_count: number;
  draw_count: number;
  forest_loss_count: number;
  correct_count: number;
  forest_win_percent: number;
  draw_percent: number;
  forest_loss_percent: number;
  rogue_applied: boolean;
  maverick_applied: boolean;
};

export type LatestGwTeamResultRow = {
  rank: number;
  team_id: string;
  team_name: string;
  display_name: string;
  abbreviation: string | null;
  logo_url: string | null;
  logo_alt: string | null;
  brand_colour: string | null;
  players_counted: number;
  correct_predictions: number;
  correct_percentage: number;
  team_points: number;
  clean_sweep: boolean;
  blank: boolean;
};

export type LatestGwBonusResultRow = {
  rank: number;
  player_id: string;
  player_display_name: string;
  player_name: string;
  short_name: string | null;
  team_id: string | null;
  team_display_name: string | null;
  team_name: string | null;
  prediction: "W" | "D" | "L" | null;
  actual_result: "W" | "D" | "L" | null;
  base_points: number;
  streak_bonus: number;
  maverick_bonus: number;
  rogue_bonus: number;
  cup_bonus: number;
  total_points: number;
  correct_streak_after_fixture: number | null;
  bonus_points: number;
};

function resultLabel(result: "W" | "D" | "L" | null) {
  if (result === "W") return "Forest win";
  if (result === "D") return "Draw";
  if (result === "L") return "Forest defeat";
  return "Result TBC";
}

function scoreline(summary: LatestGwResultSummaryRow | null) {
  if (!summary) return "Latest result TBC";

  if (summary.home_score === null || summary.away_score === null) {
    return `${summary.gameweek_label}: Forest ${summary.venue === "H" ? "v" : "at"} ${summary.opponent_short}`;
  }

  return `${summary.gameweek_label}: ${summary.home_team} ${summary.home_score}-${summary.away_score} ${summary.away_team}`;
}

function topBonusLabel(row: LatestGwBonusResultRow) {
  if (Number(row.rogue_bonus ?? 0) > 0) return "Rogue bonus";
  if (Number(row.maverick_bonus ?? 0) > 0) return "Maverick bonus";
  if (Number(row.streak_bonus ?? 0) > 0) return "Streak bonus";
  if (Number(row.cup_bonus ?? 0) > 0) return "Cup bonus";
  if (Number(row.base_points ?? 0) > 0) return "Correct prediction";
  return "Weekly score";
}

function TeamRow({ row }: { row: LatestGwTeamResultRow }) {
  return (
    <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
      <div className="text-lg font-black text-white/70">{row.rank}</div>

      <div className="min-w-0">
        <div className="truncate text-base font-black text-white">
          {row.display_name ?? row.team_name}
        </div>
        <div className="mt-0.5 text-[0.62rem] font-black uppercase tracking-wide text-white/50">
          {row.correct_predictions}/{row.players_counted} correct ·{" "}
          {formatGraphicPercent(row.correct_percentage)}
        </div>
      </div>

      <div className="rounded-xl bg-white px-3 py-1 text-sm font-black text-[#111111]">
        {formatGraphicPoints(row.team_points)}
      </div>
    </div>
  );
}

function BonusRow({ row }: { row: LatestGwBonusResultRow }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
      <div className="min-w-0">
        <div className="truncate text-base font-black text-white">
          {row.player_display_name}
        </div>
        <div className="mt-0.5 text-[0.62rem] font-black uppercase tracking-wide text-white/50">
          {topBonusLabel(row)} · {row.team_display_name ?? row.team_name ?? "Team TBC"}
        </div>
      </div>

      <div className="rounded-xl bg-[#C8102E] px-3 py-1 text-sm font-black text-white">
        {formatGraphicPoints(row.total_points)}
      </div>
    </div>
  );
}

export default function LatestGwResultsGraphic({
  summary,
  teamRows,
  bonusRows,
}: {
  summary: LatestGwResultSummaryRow | null;
  teamRows: LatestGwTeamResultRow[];
  bonusRows: LatestGwBonusResultRow[];
}) {
  const topTeam = teamRows[0] ?? null;
  const bestPlayer = bonusRows[0] ?? null;

  const bonusWinners = bonusRows
    .filter((row) => Number(row.bonus_points ?? 0) > 0)
    .slice(0, 3);

  const fallbackRows = bonusRows
    .filter((row) => Number(row.total_points ?? 0) > 0)
    .slice(0, 3);

  const shownBonusRows = bonusWinners.length ? bonusWinners : fallbackRows;

  return (
    <SocialGraphicFrame title="GW Results" footer="#NFFC">
      <div className="grid gap-3">
        <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
          <div className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-white/55">
            Latest confirmed result
          </div>
          <div className="mt-2 text-2xl font-black uppercase leading-tight text-white">
            {scoreline(summary)}
          </div>
          <div className="mt-2 text-xs font-black uppercase tracking-wide text-white/65">
            {resultLabel(summary?.forest_result ?? null)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <GraphicStatCard
            label="Forest win"
            value={summary ? formatGraphicPercent(summary.forest_win_percent) : "0%"}
            subValue={summary ? `${summary.forest_win_count}/${summary.total_predictions}` : undefined}
          />
          <GraphicStatCard
            label="Draw"
            value={summary ? formatGraphicPercent(summary.draw_percent) : "0%"}
            subValue={summary ? `${summary.draw_count}/${summary.total_predictions}` : undefined}
          />
          <GraphicStatCard
            label="Forest loss"
            value={summary ? formatGraphicPercent(summary.forest_loss_percent) : "0%"}
            subValue={summary ? `${summary.forest_loss_count}/${summary.total_predictions}` : undefined}
          />
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/10">
          <div
            className="grid h-7"
            style={{
              gridTemplateColumns: `${Math.max(Number(summary?.forest_win_percent ?? 0), 0.01)}fr ${Math.max(
                Number(summary?.draw_percent ?? 0),
                0.01
              )}fr ${Math.max(Number(summary?.forest_loss_percent ?? 0), 0.01)}fr`,
            }}
          >
            <div className="bg-green-500" />
            <div className="bg-amber-400" />
            <div className="bg-red-600" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <GraphicStatCard
            label="Best team"
            value={topTeam?.display_name ?? "TBC"}
            subValue={
              topTeam ? `${formatGraphicPoints(topTeam.team_points)} pts this GW` : undefined
            }
          />
          <GraphicStatCard
            label="Top player"
            value={bestPlayer?.player_display_name ?? "TBC"}
            subValue={
              bestPlayer ? `${formatGraphicPoints(bestPlayer.total_points)} pts this GW` : undefined
            }
          />
        </div>

        <div className="grid gap-2">
          <div className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-white/55">
            Team results
          </div>
          {teamRows.slice(0, 4).map((row) => (
            <TeamRow key={row.team_id} row={row} />
          ))}
        </div>

        <div className="grid gap-2">
          <div className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-white/55">
            Bonus watch
          </div>
          {shownBonusRows.length ? (
            shownBonusRows.map((row) => (
              <BonusRow key={row.player_id} row={row} />
            ))
          ) : (
            <div className="rounded-2xl border border-white/15 bg-black/20 p-3 text-xs font-semibold text-white/65">
              No bonus points awarded this week.
            </div>
          )}
        </div>
      </div>
    </SocialGraphicFrame>
  );
}
