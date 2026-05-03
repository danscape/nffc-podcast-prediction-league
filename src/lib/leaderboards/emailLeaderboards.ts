import {
  displayIndividualTeamName,
  displayMvpName,
  displayPlayerName,
  displayTeamName,
  escapeHtml,
  formatCompactPoints,
  formatPercent,
  getAccuracyWhole,
  getMvpAccuracy,
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

const emailTableHeading =
  "padding: 8px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; background: #111111; color: #ffffff;";

const emailTableCell =
  "padding: 8px 8px; border-bottom: 1px solid #E7E2DA; vertical-align: middle;";

const snapshotWrap =
  "background: #ffffff; border: 1px solid #D9D6D1; border-radius: 16px; padding: 14px; margin-bottom: 14px;";

function getSnapshotRange(targetIndex: number, totalRows: number) {
  if (targetIndex < 0) {
    return {
      start: 0,
      end: Math.min(totalRows, 9),
    };
  }

  return {
    start: Math.max(0, targetIndex - 4),
    end: Math.min(totalRows, targetIndex + 5),
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

  const { start, end } = getSnapshotRange(targetIndex, sortedRows.length);

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
  const targetIndex = sortedRows.findIndex((row) =>
    isSameTeam(row, targetTeamName)
  );

  if (!sortedRows.length) return "Team leaderboard not available yet.";

  const { start, end } = getSnapshotRange(targetIndex, sortedRows.length);

  return sortedRows
    .slice(start, end)
    .map((row, localIndex) => {
      const rank = start + localIndex + 1;
      const marker = isSameTeam(row, targetTeamName) ? " *" : "";

      return `${rank}. ${displayTeamName(row)} - ${formatCompactPoints(
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
    return `
      <p style="margin: 0; font-size: 14px; color: #666666;">
        Individual leaderboard not available yet.
      </p>
    `;
  }

  const { start, end } = getSnapshotRange(targetIndex, sortedRows.length);

  const bodyRows = sortedRows
    .slice(start, end)
    .map((row, localIndex) => {
      const rank = start + localIndex + 1;
      const highlighted = row.player_id === targetPlayerId;

      return `
        <tr style="${highlighted ? "background: #FFF1F2;" : "background: #ffffff;"}">
          <td style="${emailTableCell} width: 48px; font-weight: 900; color: ${
            highlighted ? "#C8102E" : "#111111"
          };">
            ${rank}
          </td>
          <td style="${emailTableCell}">
            <div style="font-weight: 900; font-size: 14px; line-height: 1.25; color: #111111;">
              ${escapeHtml(displayPlayerName(row))}
            </div>
          </td>
          <td style="${emailTableCell} width: 82px; text-align: right; font-weight: 900; color: ${
            highlighted ? "#C8102E" : "#111111"
          };">
            ${escapeHtml(formatCompactPoints(row.total_points))}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #111111;">
      <thead>
        <tr>
          <th style="${emailTableHeading}; width: 48px;">Rank</th>
          <th style="${emailTableHeading}">Player</th>
          <th style="${emailTableHeading}; width: 82px; text-align: right;">Score</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
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
  const targetIndex = sortedRows.findIndex((row) =>
    isSameTeam(row, targetTeamName)
  );

  if (!sortedRows.length) {
    return `
      <p style="margin: 0; font-size: 14px; color: #666666;">
        Team leaderboard not available yet.
      </p>
    `;
  }

  const { start, end } = getSnapshotRange(targetIndex, sortedRows.length);

  const bodyRows = sortedRows
    .slice(start, end)
    .map((row, localIndex) => {
      const rank = start + localIndex + 1;
      const highlighted = isSameTeam(row, targetTeamName);

      return `
        <tr style="${highlighted ? "background: #FFF1F2;" : "background: #ffffff;"}">
          <td style="${emailTableCell} width: 48px; font-weight: 900; color: ${
            highlighted ? "#C8102E" : "#111111"
          };">
            ${rank}
          </td>
          <td style="${emailTableCell}">
            <div style="font-weight: 900; font-size: 14px; line-height: 1.25; color: #111111;">
              ${escapeHtml(displayTeamName(row))}
            </div>
          </td>
          <td style="${emailTableCell} width: 82px; text-align: right; font-weight: 900; color: ${
            highlighted ? "#C8102E" : "#111111"
          };">
            ${escapeHtml(formatCompactPoints(row.total_team_points))}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #111111;">
      <thead>
        <tr>
          <th style="${emailTableHeading}; width: 48px;">Rank</th>
          <th style="${emailTableHeading}">Team</th>
          <th style="${emailTableHeading}; width: 82px; text-align: right;">Score</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
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
    <div style="margin: 20px 0 0;">
      <div style="${snapshotWrap}">
        <h3 style="margin: 0 0 10px; font-size: 18px; line-height: 1.2; color: #111111;">
          Your league snapshot
        </h3>
        ${buildEmailIndividualSnapshotTable({
          rows: individualRows,
          targetPlayerId,
        })}
      </div>

      <div style="${snapshotWrap}">
        <h3 style="margin: 0 0 10px; font-size: 18px; line-height: 1.2; color: #111111;">
          Your team snapshot
        </h3>
        ${buildEmailTeamSnapshotTable({
          rows: teamRows,
          targetTeamName,
        })}
      </div>
    </div>
  `;
}

/**
 * Legacy helpers retained so older imports do not break.
 */
export function buildEmailIndividualTopFiveText(
  rows: IndividualLeaderboardLike[],
  limit = 5
) {
  const sortedRows = sortIndividualLeaderboard(rows).slice(0, limit);

  if (!sortedRows.length) return "Leaderboard not available yet.";

  return sortedRows
    .map((row, index) => {
      return `${index + 1}. ${displayPlayerName(row)} - ${formatCompactPoints(
        row.total_points
      )} pts - ${formatPercent(getAccuracyWhole(row))}`;
    })
    .join("\n");
}

export function buildEmailTeamTopFiveText(
  rows: TeamLeaderboardLike[],
  limit = 5
) {
  const sortedRows = sortTeamLeaderboard(rows).slice(0, limit);

  if (!sortedRows.length) return "Team leaderboard not available yet.";

  return sortedRows
    .map((row, index) => {
      return `${index + 1}. ${displayTeamName(row)} - ${formatCompactPoints(
        row.total_team_points
      )} pts - MVP ${displayMvpName(row)} / ${formatPercent(
        getMvpAccuracy(row)
      )}`;
    })
    .join("\n");
}

export function buildEmailLeaderboardsBlock({
  individualRows,
  teamRows,
  limit = 5,
  individualLimit,
  teamLimit,
}: {
  individualRows: IndividualLeaderboardLike[];
  teamRows: TeamLeaderboardLike[];
  limit?: number;
  individualLimit?: number;
  teamLimit?: number;
}) {
  const resolvedIndividualLimit = individualLimit ?? limit;
  const resolvedTeamLimit = teamLimit ?? limit;

  return `
    <div style="margin: 20px 0 0;">
      <div style="${snapshotWrap}">
        <h3 style="margin: 0 0 10px; font-size: 18px; line-height: 1.2; color: #111111;">
          Individual top ${resolvedIndividualLimit}
        </h3>
        ${buildEmailIndividualSnapshotTable({
          rows: sortIndividualLeaderboard(individualRows).slice(
            0,
            resolvedIndividualLimit
          ),
          targetPlayerId: "",
        })}
      </div>

      <div style="${snapshotWrap}">
        <h3 style="margin: 0 0 10px; font-size: 18px; line-height: 1.2; color: #111111;">
          Team top ${resolvedTeamLimit}
        </h3>
        ${buildEmailTeamSnapshotTable({
          rows: sortTeamLeaderboard(teamRows).slice(0, resolvedTeamLimit),
          targetTeamName: "",
        })}
      </div>
    </div>
  `;
}
