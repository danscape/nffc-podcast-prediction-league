import {
  displayPlayerName,
  displayTeamName,
  escapeHtml,
  formatCompactPoints,
  sortIndividualLeaderboard,
  sortTeamLeaderboard,
} from "./leaderboardFormatters";

import type {
  IndividualLeaderboardLike,
  TeamLeaderboardLike,
} from "./leaderboardFormatters";

type IndividualEmailRow = IndividualLeaderboardLike & {
  player_id?: string | null;
};

type TeamEmailRow = TeamLeaderboardLike & {
  team_id?: string | null;
  team_name: string;
  display_name?: string | null;
};

const tableShell =
  "width:100%;border-collapse:collapse;background:#000000;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:900;text-transform:uppercase;";

const headingCell =
  "padding:7px 5px;text-align:left;background:#000000;border-bottom:1px solid #E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;letter-spacing:0.08em;";

const bodyCell =
  "padding:7px 5px;border-bottom:1px solid #242424;background:#000000;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;";

function getPlayerRange(targetIndex: number, totalRows: number) {
  if (targetIndex < 0) {
    return {
      start: 0,
      end: Math.min(totalRows, 7),
    };
  }

  return {
    start: Math.max(0, targetIndex - 3),
    end: Math.min(totalRows, targetIndex + 4),
  };
}

function isSameTeam(row: TeamEmailRow, targetTeamName: string | null | undefined) {
  if (!targetTeamName) return false;

  const target = targetTeamName.trim().toLowerCase();

  return (
    row.team_name?.trim().toLowerCase() === target ||
    row.display_name?.trim().toLowerCase() === target ||
    displayTeamName(row).trim().toLowerCase() === target
  );
}

function wrapTable(title: string, table: string) {
  return `
    <div style="margin:10px 0 14px;background:#000000;border:1px solid #333333;">
      <div style="background:#E50914;padding:7px 9px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
        ${escapeHtml(title)}
      </div>
      ${table}
    </div>
  `;
}

export function buildEmailIndividualSnapshotText({
  rows,
  targetPlayerId,
}: {
  rows: IndividualEmailRow[];
  targetPlayerId: string;
}) {
  const sortedRows = sortIndividualLeaderboard(rows);
  const targetIndex = sortedRows.findIndex(
    (row) => row.player_id === targetPlayerId
  );

  if (!sortedRows.length) return "Individual leaderboard not available yet.";

  const { start, end } = getPlayerRange(targetIndex, sortedRows.length);

  return sortedRows
    .slice(start, end)
    .map((row, localIndex) => {
      const rank = start + localIndex + 1;
      const marker = row.player_id === targetPlayerId ? " *" : "";

      return `${rank}. ${displayPlayerName(row)} - ${formatCompactPoints(
        row.total_points
      )} pts${marker}`;
    })
    .join("\n");
}

export function buildEmailTeamSnapshotText({
  rows,
  targetTeamName,
}: {
  rows: TeamEmailRow[];
  targetTeamName: string;
}) {
  const sortedRows = sortTeamLeaderboard(rows);

  if (!sortedRows.length) return "Team leaderboard not available yet.";

  return sortedRows
    .map((row, index) => {
      const marker = isSameTeam(row, targetTeamName) ? " *" : "";

      return `${index + 1}. ${displayTeamName(row)} - ${formatCompactPoints(
        row.total_team_points
      )} pts${marker}`;
    })
    .join("\n");
}

export function buildEmailIndividualSnapshotTable({
  rows,
  targetPlayerId,
}: {
  rows: IndividualEmailRow[];
  targetPlayerId: string;
}) {
  const sortedRows = sortIndividualLeaderboard(rows);
  const targetIndex = sortedRows.findIndex(
    (row) => row.player_id === targetPlayerId
  );

  if (!sortedRows.length) {
    return `<p style="margin:0;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Individual leaderboard not available yet.</p>`;
  }

  const { start, end } = getPlayerRange(targetIndex, sortedRows.length);

  const bodyRows = sortedRows
    .slice(start, end)
    .map((row, localIndex) => {
      const rank = start + localIndex + 1;
      const highlighted = row.player_id === targetPlayerId;

      return `
        <tr style="${highlighted ? "background:#111111;border-left:3px solid #22E55E;" : "background:#000000;"}">
          <td style="${bodyCell}width:46px;color:#E50914 !important;-webkit-text-fill-color:#E50914 !important;">${rank}</td>
          <td style="${bodyCell}">${escapeHtml(displayPlayerName(row))}</td>
          <td style="${bodyCell}width:74px;text-align:right;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;">${escapeHtml(
            formatCompactPoints(row.total_points)
          )}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table role="presentation" style="${tableShell}">
      <thead>
        <tr>
          <th style="${headingCell}width:46px;">Rank</th>
          <th style="${headingCell}">Player</th>
          <th style="${headingCell}width:74px;text-align:right;">Score</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

export function buildEmailTeamSnapshotTable({
  rows,
  targetTeamName,
}: {
  rows: TeamEmailRow[];
  targetTeamName: string;
}) {
  const sortedRows = sortTeamLeaderboard(rows);

  if (!sortedRows.length) {
    return `<p style="margin:0;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Team leaderboard not available yet.</p>`;
  }

  const bodyRows = sortedRows
    .map((row, index) => {
      const highlighted = isSameTeam(row, targetTeamName);

      return `
        <tr style="${highlighted ? "background:#111111;border-left:3px solid #22E55E;" : "background:#000000;"}">
          <td style="${bodyCell}width:46px;color:#E50914 !important;-webkit-text-fill-color:#E50914 !important;">${index + 1}</td>
          <td style="${bodyCell}">${escapeHtml(displayTeamName(row))}</td>
          <td style="${bodyCell}width:74px;text-align:right;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;">${escapeHtml(
            formatCompactPoints(row.total_team_points)
          )}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table role="presentation" style="${tableShell}">
      <thead>
        <tr>
          <th style="${headingCell}width:46px;">Rank</th>
          <th style="${headingCell}">Team</th>
          <th style="${headingCell}width:74px;text-align:right;">Score</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

export function buildEmailSnapshotLeaderboardsBlock({
  individualRows,
  teamRows,
  targetPlayerId,
  targetTeamName,
}: {
  individualRows: IndividualEmailRow[];
  teamRows: TeamEmailRow[];
  targetPlayerId: string;
  targetTeamName: string;
}) {
  return `
    ${wrapTable(
      "Player Leaderboard Snapshot",
      buildEmailIndividualSnapshotTable({ rows: individualRows, targetPlayerId })
    )}
    ${wrapTable(
      "Team Leaderboard Snapshot",
      buildEmailTeamSnapshotTable({ rows: teamRows, targetTeamName })
    )}
  `;
}
