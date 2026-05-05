export type IndividualLeaderboardLike = {
  player_id: string;
  player_name: string;
  short_name: string | null;
  table_display_name?: string | null;
  team_name: string;
  team_display_name?: string | null;
  team_abbreviation?: string | null;
  total_points: number;
  base_points?: number | null;
  streak_bonus?: number | null;
  maverick_bonus?: number | null;
  rogue_bonus?: number | null;
  cup_bonus?: number | null;
  bonus_points?: number | null;
  correct_predictions?: number | null;
  fixtures_scored?: number | null;
  accuracy_percentage?: number | null;
  accuracy_whole_percentage?: number | null;
  best_streak?: number | null;
  current_streak?: number | null;
  team_logo_url?: string | null;
  team_logo_alt?: string | null;
};

export type TeamLeaderboardLike = {
  team_id: string;
  team_name: string;
  display_name: string | null;
  x_handle?: string | null;
  total_team_points: number;
  clean_sweeps: number;
  blanks: number;
  best_player_accuracy_percentage: number;
  logo_url?: string | null;
  logo_alt?: string | null;
  brand_colour?: string | null;
  mvp_player_id?: string | null;
  mvp_player_name?: string | null;
  mvp_short_name?: string | null;
  mvp_accuracy_percentage?: number | null;
  latest_gameweek?: number | null;
  latest_gameweek_label?: string | null;
  latest_opponent_short?: string | null;
  points_this_week?: number | null;
};

export function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatIndividualPoints(value: number | null | undefined) {
  return String(Math.round(Number(value ?? 0)));
}

export function formatTeamPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

export function formatCompactPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1).replace(".0", "");
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "0%";
  return `${Math.round(Number(value))}%`;
}

export function displayPlayerName(row: IndividualLeaderboardLike) {
  return row.table_display_name ?? row.short_name ?? row.player_name;
}

export function displayIndividualTeamName(row: IndividualLeaderboardLike) {
  return row.team_display_name ?? row.team_name;
}

export function displayTeamName(row: TeamLeaderboardLike) {
  return row.display_name ?? row.team_name;
}

export function displayMvpName(row: TeamLeaderboardLike) {
  return row.mvp_short_name ?? row.mvp_player_name ?? "—";
}

export function getBonusPoints(row: IndividualLeaderboardLike) {
  return (
    row.bonus_points ??
    Number(row.streak_bonus ?? 0) +
      Number(row.maverick_bonus ?? 0) +
      Number(row.rogue_bonus ?? 0) +
      Number(row.cup_bonus ?? 0)
  );
}

export function getAccuracyWhole(row: IndividualLeaderboardLike) {
  return (
    row.accuracy_whole_percentage ??
    Math.round(Number(row.accuracy_percentage ?? 0))
  );
}

export function getMvpAccuracy(row: TeamLeaderboardLike) {
  return row.mvp_accuracy_percentage ?? row.best_player_accuracy_percentage;
}

export function sortIndividualLeaderboard<T extends IndividualLeaderboardLike>(
  rows: T[]
) {
  return [...rows].sort((a, b) => {
    const pointsDiff = Number(b.total_points ?? 0) - Number(a.total_points ?? 0);
    if (pointsDiff !== 0) return pointsDiff;

    const accuracyDiff = getAccuracyWhole(b) - getAccuracyWhole(a);
    if (accuracyDiff !== 0) return accuracyDiff;

    return displayPlayerName(a).localeCompare(displayPlayerName(b));
  });
}

export function sortTeamLeaderboard<T extends TeamLeaderboardLike>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const pointsDiff =
      Number(b.total_team_points ?? 0) - Number(a.total_team_points ?? 0);
    if (pointsDiff !== 0) return pointsDiff;

    const sweepsDiff = Number(b.clean_sweeps ?? 0) - Number(a.clean_sweeps ?? 0);
    if (sweepsDiff !== 0) return sweepsDiff;

    const blanksDiff = Number(a.blanks ?? 0) - Number(b.blanks ?? 0);
    if (blanksDiff !== 0) return blanksDiff;

    const mvpDiff = Number(getMvpAccuracy(b) ?? 0) - Number(getMvpAccuracy(a) ?? 0);
    if (mvpDiff !== 0) return mvpDiff;

    return displayTeamName(a).localeCompare(displayTeamName(b));
  });
}