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

const emailTableHeading =
  "padding: 9px 8px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; background: #111111; color: #ffffff;";

const emailTableCell =
  "padding: 10px 8px; border-bottom: 1px solid #e5e0d8; vertical-align: top;";

const pillBase =
  "display: inline-block; min-width: 46px; text-align: center; border-radius: 10px; padding: 6px 8px; font-weight: 900;";

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

export function buildEmailIndividualLeaderboardTable(
  rows: IndividualLeaderboardLike[],
  limit = 5
) {
  const sortedRows = sortIndividualLeaderboard(rows).slice(0, limit);

  if (!sortedRows.length) {
    return `
      <p style="margin: 0; font-size: 14px; color: #666666;">
        Individual leaderboard not available yet.
      </p>
    `;
  }

  const bodyRows = sortedRows
    .map((row, index) => {
      return `
        <tr>
          <td style="${emailTableCell} font-weight: 900; color: #C8102E;">${index + 1}</td>
          <td style="${emailTableCell}">
            <div style="font-weight: 900; font-size: 15px;">${escapeHtml(
              displayPlayerName(row)
            )}</div>
            <div style="font-size: 12px; color: #666666;">${escapeHtml(
              displayIndividualTeamName(row)
            )}</div>
          </td>
          <td style="${emailTableCell} text-align: center;">
            <span style="${pillBase} background: #111111; color: #ffffff;">${escapeHtml(
              formatCompactPoints(row.total_points)
            )}</span>
          </td>
          <td style="${emailTableCell} text-align: center;">
            <span style="${pillBase} background: #F7F6F2; color: #111111; border: 1px solid #D9D6D1;">${escapeHtml(
              formatPercent(getAccuracyWhole(row))
            )}</span>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr>
          <th style="${emailTableHeading}">Rank</th>
          <th style="${emailTableHeading}">Player</th>
          <th style="${emailTableHeading}; text-align: center;">Score</th>
          <th style="${emailTableHeading}; text-align: center;">Accuracy</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  `;
}

export function buildEmailTeamLeaderboardTable(
  rows: TeamLeaderboardLike[],
  limit = 5
) {
  const sortedRows = sortTeamLeaderboard(rows).slice(0, limit);

  if (!sortedRows.length) {
    return `
      <p style="margin: 0; font-size: 14px; color: #666666;">
        Team leaderboard not available yet.
      </p>
    `;
  }

  const bodyRows = sortedRows
    .map((row, index) => {
      return `
        <tr>
          <td style="${emailTableCell} font-weight: 900; color: #C8102E;">${index + 1}</td>
          <td style="${emailTableCell}">
            <div style="font-weight: 900; font-size: 15px;">${escapeHtml(
              displayTeamName(row)
            )}</div>
            <div style="font-size: 12px; color: #666666;">MVP ${escapeHtml(
              displayMvpName(row)
            )} / ${escapeHtml(formatPercent(getMvpAccuracy(row)))}</div>
          </td>
          <td style="${emailTableCell} text-align: center;">
            <span style="${pillBase} background: #111111; color: #ffffff;">${escapeHtml(
              formatCompactPoints(row.total_team_points)
            )}</span>
          </td>
          <td style="${emailTableCell} text-align: center;">
            <span style="${pillBase} background: #F7F6F2; color: #111111; border: 1px solid #D9D6D1;">${escapeHtml(
              row.clean_sweeps
            )}</span>
          </td>
          <td style="${emailTableCell} text-align: center;">
            <span style="${pillBase} background: #FFF1F2; color: #C8102E; border: 1px solid #F5C2CB;">${escapeHtml(
              row.blanks
            )}</span>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr>
          <th style="${emailTableHeading}">Pos</th>
          <th style="${emailTableHeading}">Team</th>
          <th style="${emailTableHeading}; text-align: center;">Score</th>
          <th style="${emailTableHeading}; text-align: center;">Sweeps</th>
          <th style="${emailTableHeading}; text-align: center;">Blanks</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  `;
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
      <div style="background: #F7F6F2; border: 1px solid #D9D6D1; border-radius: 16px; padding: 16px; margin-bottom: 14px;">
        <h3 style="margin: 0 0 12px; font-size: 18px; line-height: 1.2; color: #111111;">
          Individual top ${resolvedIndividualLimit}
        </h3>
        ${buildEmailIndividualLeaderboardTable(individualRows, resolvedIndividualLimit)}
      </div>

      <div style="background: #F7F6F2; border: 1px solid #D9D6D1; border-radius: 16px; padding: 16px;">
        <h3 style="margin: 0 0 12px; font-size: 18px; line-height: 1.2; color: #111111;">
          Full team leaderboard
        </h3>
        ${buildEmailTeamLeaderboardTable(teamRows, resolvedTeamLimit)}
      </div>
    </div>
  `;
}
