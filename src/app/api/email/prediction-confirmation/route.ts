import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import {
  buildEmailSignoffHtml,
  buildEmailSignoffText,
} from "@/lib/email/emailSignoff";

type PredictionValue = "W" | "D" | "L";

type PlayerEmailLookup = {
  found: boolean;
  player_id: string | null;
  player_name: string | null;
  email: string | null;
};

type PlayerPageData = {
  found: boolean;
  player: {
    id: string;
    player_name: string;
    short_name: string | null;
    team_name: string;
    team_display_name: string | null;
    team_abbreviation: string | null;
    parent_podcast: string | null;
    parent_podcast_abbreviation: string | null;
  } | null;
  predictions: {
    gameweek: number;
    gameweek_label: string;
    opponent: string;
    opponent_short: string;
    venue: "H" | "A";
    kickoff_at: string | null;
    prediction_lock_at: string | null;
    status: string;
    home_score: number | null;
    away_score: number | null;
    forest_result: PredictionValue | null;
    prediction: PredictionValue;
    predicted_forest_points: number;
    is_locked: boolean;
  }[];
};

type ExtraPredictionsData = {
  found: boolean;
  cup_predictions: {
    competition: string;
    display_name: string;
    predicted_round_reached: string | null;
    actual_round_reached: string | null;
    bonus_awarded: number;
  }[];
  custom_answers: {
    question_key: string;
    question_text: string;
    answer: string | null;
  }[];
};

type ScoreBreakdownData = {
  found: boolean;
  summary: {
    base_points: number;
    streak_bonus: number;
    maverick_bonus: number;
    rogue_bonus: number;
    fixture_points: number;
    cup_bonus: number;
    total_points: number;
    completed_fixtures: number;
  } | null;
  fixture_scores: {
    gameweek: number;
    gameweek_label: string;
    opponent_short: string;
    opponent: string;
    venue: "H" | "A";
    prediction: PredictionValue;
    actual_result: PredictionValue;
    base_points: number;
    streak_bonus: number;
    maverick_bonus: number;
    rogue_bonus: number;
    cup_bonus: number;
    total_points: number;
    correct_streak_after_fixture: number;
  }[];
  cup_scores: {
    competition: string;
    predicted_round_reached: string | null;
    actual_round_reached: string | null;
    bonus_awarded: number;
  }[];
};

type ChangedFixture = {
  gameweek: number;
  gameweek_label?: string;
  opponent_short?: string;
  venue?: string;
  old_prediction?: PredictionValue;
  new_prediction?: PredictionValue;
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value: string | null) {
  if (!value) return "TBC";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1).replace(".0", "");
}

function predictionLabel(value: PredictionValue | null | undefined) {
  if (value === "W") return "Forest win";
  if (value === "D") return "Draw";
  if (value === "L") return "Forest loss";
  return "Not set";
}

function predictionPoints(value: PredictionValue | null | undefined) {
  if (value === "W") return 3;
  if (value === "D") return 1;
  return 0;
}

function buildScoreParts(score: ScoreBreakdownData["fixture_scores"][number]) {
  const parts: string[] = [];

  if (score.base_points > 0) parts.push(`${formatPoints(score.base_points)} base`);
  if (score.streak_bonus > 0) parts.push(`${formatPoints(score.streak_bonus)} streaker`);
  if (score.maverick_bonus > 0) parts.push(`${formatPoints(score.maverick_bonus)} maverick`);
  if (score.rogue_bonus > 0) parts.push(`${formatPoints(score.rogue_bonus)} rogue`);
  if (score.cup_bonus > 0) parts.push(`${formatPoints(score.cup_bonus)} cup`);

  return parts.length ? parts.join(" + ") : "0";
}

function calculateAccuracy(scoreData: ScoreBreakdownData | null) {
  const fixtureScores = scoreData?.fixture_scores ?? [];

  if (!fixtureScores.length) return "N/A";

  const correct = fixtureScores.filter(
    (score) => score.prediction === score.actual_result
  ).length;

  return `${Math.round((correct / fixtureScores.length) * 100)}%`;
}

function currentStreak(scoreData: ScoreBreakdownData | null) {
  const fixtureScores = scoreData?.fixture_scores ?? [];

  if (!fixtureScores.length) return 0;

  const lastScore = fixtureScores[fixtureScores.length - 1];

  return lastScore.correct_streak_after_fixture ?? 0;
}

function buildChangedRows(changedFixtures: ChangedFixture[]) {
  if (!changedFixtures.length) {
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;" colspan="4">
          No specific changed fixtures were supplied.
        </td>
      </tr>
    `;
  }

  return changedFixtures
    .map((change) => {
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8; font-weight: 700;">
            ${escapeHtml(change.gameweek_label ?? `GW${change.gameweek}`)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;">
            ${escapeHtml(change.opponent_short ?? "")} ${escapeHtml(change.venue ?? "")}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;">
            ${escapeHtml(change.old_prediction ?? "—")}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8; font-weight: 700; color: #C8102E;">
            ${escapeHtml(change.new_prediction ?? "—")}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildChangedText(changedFixtures: ChangedFixture[]) {
  if (!changedFixtures.length) return "No specific changed fixtures were supplied.";

  return changedFixtures
    .map((change) => {
      return `${change.gameweek_label ?? `GW${change.gameweek}`} | ${
        change.opponent_short ?? ""
      } ${change.venue ?? ""} | ${change.old_prediction ?? "—"} -> ${
        change.new_prediction ?? "—"
      }`;
    })
    .join("\n");
}

function buildScoreSummaryHtml(scoreData: ScoreBreakdownData | null) {
  const summary = scoreData?.summary;

  return `
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 16px 0;">
      <div style="background: #111111; color: #ffffff; border-radius: 14px; padding: 14px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.75;">Total score</div>
        <div style="font-size: 28px; font-weight: 900;">${escapeHtml(formatPoints(summary?.total_points))}</div>
      </div>
      <div style="background: #F7F6F2; border: 1px solid #D9D6D1; border-radius: 14px; padding: 14px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #666666;">Accuracy</div>
        <div style="font-size: 28px; font-weight: 900;">${escapeHtml(calculateAccuracy(scoreData))}</div>
      </div>
      <div style="background: #F7F6F2; border: 1px solid #D9D6D1; border-radius: 14px; padding: 14px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #666666;">Base points</div>
        <div style="font-size: 24px; font-weight: 900;">${escapeHtml(formatPoints(summary?.base_points))}</div>
      </div>
      <div style="background: #F7F6F2; border: 1px solid #D9D6D1; border-radius: 14px; padding: 14px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #666666;">Cup bonus</div>
        <div style="font-size: 24px; font-weight: 900;">${escapeHtml(formatPoints(summary?.cup_bonus))}</div>
      </div>
      <div style="background: #F7F6F2; border: 1px solid #D9D6D1; border-radius: 14px; padding: 14px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #666666;">Bonuses</div>
        <div style="font-size: 16px; font-weight: 800;">
          Streaker ${escapeHtml(formatPoints(summary?.streak_bonus))} · Maverick ${escapeHtml(formatPoints(summary?.maverick_bonus))} · Rogue ${escapeHtml(formatPoints(summary?.rogue_bonus))}
        </div>
      </div>
      <div style="background: #F7F6F2; border: 1px solid #D9D6D1; border-radius: 14px; padding: 14px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #666666;">Completed / streak</div>
        <div style="font-size: 16px; font-weight: 800;">
          ${escapeHtml(summary?.completed_fixtures ?? 0)} fixtures · ${escapeHtml(currentStreak(scoreData))} current streak
        </div>
      </div>
    </div>
  `;
}

function buildScoreSummaryText(scoreData: ScoreBreakdownData | null) {
  const summary = scoreData?.summary;

  return [
    `Total score: ${formatPoints(summary?.total_points)}`,
    `Base points: ${formatPoints(summary?.base_points)}`,
    `Streaker bonus: ${formatPoints(summary?.streak_bonus)}`,
    `Maverick bonus: ${formatPoints(summary?.maverick_bonus)}`,
    `Rogue bonus: ${formatPoints(summary?.rogue_bonus)}`,
    `Cup bonus: ${formatPoints(summary?.cup_bonus)}`,
    `Completed fixtures: ${summary?.completed_fixtures ?? 0}`,
    `Accuracy: ${calculateAccuracy(scoreData)}`,
    `Current streak: ${currentStreak(scoreData)}`,
  ].join("\n");
}

function buildCompletedScoreRows(scoreData: ScoreBreakdownData | null) {
  const fixtureScores = scoreData?.fixture_scores ?? [];

  if (!fixtureScores.length) {
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;" colspan="6">
          No completed fixture scores yet.
        </td>
      </tr>
    `;
  }

  return fixtureScores
    .sort((a, b) => a.gameweek - b.gameweek)
    .map((score) => {
      const correct = score.prediction === score.actual_result;

      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8; font-weight: 700;">
            ${escapeHtml(score.gameweek_label)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;">
            ${escapeHtml(score.opponent_short)} ${escapeHtml(score.venue)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8; font-weight: 700;">
            ${escapeHtml(score.prediction)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8; font-weight: 700;">
            ${escapeHtml(score.actual_result)} ${correct ? "✓" : "×"}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;">
            ${escapeHtml(buildScoreParts(score))}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8; font-weight: 900; color: #C8102E;">
            ${escapeHtml(formatPoints(score.total_points))}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildCompletedScoreText(scoreData: ScoreBreakdownData | null) {
  const fixtureScores = scoreData?.fixture_scores ?? [];

  if (!fixtureScores.length) return "No completed fixture scores yet.";

  return fixtureScores
    .sort((a, b) => a.gameweek - b.gameweek)
    .map((score) => {
      const correct = score.prediction === score.actual_result ? "correct" : "wrong";

      return `${score.gameweek_label} | ${score.opponent_short} ${score.venue} | Pick ${score.prediction} | Result ${score.actual_result} | ${correct} | ${buildScoreParts(score)} = ${formatPoints(score.total_points)} pts`;
    })
    .join("\n");
}

function buildRemainingPredictionRows(predictions: PlayerPageData["predictions"]) {
  const remaining = predictions
    .filter((prediction) => !(prediction.status === "finished" && prediction.forest_result))
    .sort((a, b) => a.gameweek - b.gameweek);

  if (!remaining.length) {
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;" colspan="6">
          No remaining league predictions.
        </td>
      </tr>
    `;
  }

  return remaining
    .map((prediction) => {
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8; font-weight: 700;">
            ${escapeHtml(prediction.gameweek_label)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;">
            ${escapeHtml(prediction.opponent_short)} ${escapeHtml(prediction.venue)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8; font-weight: 700;">
            ${escapeHtml(prediction.prediction)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;">
            ${escapeHtml(predictionLabel(prediction.prediction))}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;">
            ${predictionPoints(prediction.prediction)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;">
            ${escapeHtml(formatDateTime(prediction.kickoff_at))}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildRemainingPredictionText(predictions: PlayerPageData["predictions"]) {
  const remaining = predictions
    .filter((prediction) => !(prediction.status === "finished" && prediction.forest_result))
    .sort((a, b) => a.gameweek - b.gameweek);

  if (!remaining.length) return "No remaining league predictions.";

  return remaining
    .map((prediction) => {
      return `${prediction.gameweek_label} | ${prediction.opponent_short} ${prediction.venue} | ${prediction.prediction} (${predictionLabel(
        prediction.prediction
      )}) | ${predictionPoints(prediction.prediction)} pts | ${formatDateTime(
        prediction.kickoff_at
      )}`;
    })
    .join("\n");
}

function buildCupRows(extraData: ExtraPredictionsData | null) {
  const cupPredictions = extraData?.cup_predictions ?? [];

  if (!cupPredictions.length) {
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;" colspan="2">
          No cup predictions available.
        </td>
      </tr>
    `;
  }

  return cupPredictions
    .map((cup) => {
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8; font-weight: 700;">
            ${escapeHtml(cup.display_name ?? cup.competition)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;">
            ${escapeHtml(cup.predicted_round_reached ?? "Not set")}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildCupText(extraData: ExtraPredictionsData | null) {
  const cupPredictions = extraData?.cup_predictions ?? [];

  if (!cupPredictions.length) return "No cup predictions available.";

  return cupPredictions
    .map((cup) => {
      return `${cup.display_name ?? cup.competition}: ${
        cup.predicted_round_reached ?? "Not set"
      }`;
    })
    .join("\n");
}

function buildCustomRows(extraData: ExtraPredictionsData | null) {
  const customAnswers = extraData?.custom_answers ?? [];

  if (!customAnswers.length) {
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;" colspan="2">
          No other answers available.
        </td>
      </tr>
    `;
  }

  return customAnswers
    .map((answer) => {
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8; font-weight: 700;">
            ${escapeHtml(answer.question_text)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;">
            ${escapeHtml(answer.answer ?? "Not set")}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildCustomText(extraData: ExtraPredictionsData | null) {
  const customAnswers = extraData?.custom_answers ?? [];

  if (!customAnswers.length) return "No other answers available.";

  return customAnswers
    .map((answer) => {
      return `${answer.question_text}: ${answer.answer ?? "Not set"}`;
    })
    .join("\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token = body?.token;
    const suppliedTo = body?.to;
    const updatedBy = body?.updatedBy === "admin" ? "admin" : "player";
    const changedFixtures = Array.isArray(body?.changedFixtures)
      ? (body.changedFixtures as ChangedFixture[])
      : [];

    if (!token || typeof token !== "string") {
      return Response.json(
        {
          success: false,
          message: "Missing player token.",
        },
        { status: 400 }
      );
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return Response.json(
        {
          success: false,
          message: "Missing Gmail email settings.",
        },
        { status: 500 }
      );
    }

    const supabase = getSupabaseClient();

    const [
      { data: playerData, error: playerError },
      { data: extraData },
      { data: scoreData },
      { data: emailLookupData, error: emailLookupError },
    ] = await Promise.all([
      supabase.rpc("get_player_prediction_page", {
        target_token: token,
      }),
      supabase.rpc("get_player_extra_predictions", {
        target_token: token,
      }),
      supabase.rpc("get_player_score_breakdown", {
        target_token: token,
      }),
      supabase.rpc("get_player_email_by_token", {
        target_token: token,
      }),
    ]);

    if (playerError) {
      return Response.json(
        {
          success: false,
          message: playerError.message,
        },
        { status: 500 }
      );
    }

    if (emailLookupError) {
      return Response.json(
        {
          success: false,
          message: emailLookupError.message,
        },
        { status: 500 }
      );
    }

    const predictionData = playerData as PlayerPageData;
    const typedExtraData = extraData as ExtraPredictionsData | null;
    const typedScoreData = scoreData as ScoreBreakdownData | null;
    const emailLookup = emailLookupData as PlayerEmailLookup | null;

    if (!predictionData?.found || !predictionData.player) {
      return Response.json(
        {
          success: false,
          message: "Player prediction page not found.",
        },
        { status: 404 }
      );
    }

    const to =
      typeof suppliedTo === "string" && suppliedTo.length > 0
        ? suppliedTo
        : emailLookup?.email;

    if (!to) {
      return Response.json(
        {
          success: false,
          message: "Could not find recipient email address for this player.",
        },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const predictionUrl = `${siteUrl}/predict/${token}`;
    const player = predictionData.player;
    const playerDisplayName = player.short_name ?? player.player_name;
    const teamName = player.team_display_name ?? player.team_name;
    const updatedAt = formatDateTime(new Date().toISOString());
    const updatedByText = updatedBy === "admin" ? "the league admin" : "you";

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const html = `
      <div style="margin: 0; padding: 0; background: #F7F6F2;">
        <div style="max-width: 820px; margin: 0 auto; padding: 24px; font-family: Arial, sans-serif; color: #111111;">
          <div style="background: #ffffff; border: 1px solid #D9D6D1; border-radius: 18px; padding: 24px;">
            <div style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 800; color: #C8102E; border-bottom: 2px solid #C8102E; display: inline-block; padding-bottom: 6px;">
              NFFC Podcast Prediction League
            </div>

            <h1 style="margin: 16px 0 8px; color: #C8102E; font-size: 28px; line-height: 1.1;">
              Your predictions have been updated
            </h1>

            <p style="margin: 0 0 16px; line-height: 1.5;">
              ${escapeHtml(playerDisplayName)}, this confirms that your prediction record has been updated by ${escapeHtml(updatedByText)}.
            </p>

            <div style="background: #F7F6F2; border: 1px solid #D9D6D1; border-radius: 14px; padding: 14px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Player:</strong> ${escapeHtml(player.player_name)}</p>
              <p style="margin: 6px 0 0;"><strong>Team:</strong> ${escapeHtml(teamName)}</p>
              <p style="margin: 6px 0 0;"><strong>Updated:</strong> ${escapeHtml(updatedAt)}</p>
            </div>

            <h2 style="margin-top: 24px; font-size: 20px;">Prediction League score so far</h2>
            ${buildScoreSummaryHtml(typedScoreData)}

            <h2 style="margin-top: 24px; font-size: 20px;">Changed fixtures</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #111111; color: #ffffff;">
                  <th style="text-align: left; padding: 8px;">GW</th>
                  <th style="text-align: left; padding: 8px;">Fixture</th>
                  <th style="text-align: left; padding: 8px;">Old</th>
                  <th style="text-align: left; padding: 8px;">New</th>
                </tr>
              </thead>
              <tbody>
                ${buildChangedRows(changedFixtures)}
              </tbody>
            </table>

            <h2 style="margin-top: 24px; font-size: 20px;">Completed fixture points</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #111111; color: #ffffff;">
                  <th style="text-align: left; padding: 8px;">GW</th>
                  <th style="text-align: left; padding: 8px;">Fixture</th>
                  <th style="text-align: left; padding: 8px;">Pick</th>
                  <th style="text-align: left; padding: 8px;">Result</th>
                  <th style="text-align: left; padding: 8px;">Breakdown</th>
                  <th style="text-align: left; padding: 8px;">Pts</th>
                </tr>
              </thead>
              <tbody>
                ${buildCompletedScoreRows(typedScoreData)}
              </tbody>
            </table>

            <h2 style="margin-top: 24px; font-size: 20px;">Remaining league predictions</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #111111; color: #ffffff;">
                  <th style="text-align: left; padding: 8px;">GW</th>
                  <th style="text-align: left; padding: 8px;">Fixture</th>
                  <th style="text-align: left; padding: 8px;">Pick</th>
                  <th style="text-align: left; padding: 8px;">Meaning</th>
                  <th style="text-align: left; padding: 8px;">Forest pts</th>
                  <th style="text-align: left; padding: 8px;">Kick-off</th>
                </tr>
              </thead>
              <tbody>
                ${buildRemainingPredictionRows(predictionData.predictions)}
              </tbody>
            </table>

            <h2 style="margin-top: 24px; font-size: 20px;">Cup predictions</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tbody>
                ${buildCupRows(typedExtraData)}
              </tbody>
            </table>

            <h2 style="margin-top: 24px; font-size: 20px;">Other answers</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tbody>
                ${buildCustomRows(typedExtraData)}
              </tbody>
            </table>

            <p style="margin-top: 24px;">
              <a href="${escapeHtml(predictionUrl)}" style="display: inline-block; background: #111111; color: #ffffff; text-decoration: none; font-weight: 800; padding: 12px 18px; border-radius: 999px;">
                Open your prediction page
              </a>
            </p>

            ${buildEmailSignoffHtml()}
          </div>
        </div>
      </div>
    `;

    const text = [
      "NFFC Podcast Prediction League",
      "",
      "Your predictions have been updated",
      "",
      `${playerDisplayName}, this confirms that your prediction record has been updated by ${updatedByText}.`,
      "",
      `Player: ${player.player_name}`,
      `Team: ${teamName}`,
      `Updated: ${updatedAt}`,
      "",
      "Prediction League score so far",
      buildScoreSummaryText(typedScoreData),
      "",
      "Changed fixtures",
      buildChangedText(changedFixtures),
      "",
      "Completed fixture points",
      buildCompletedScoreText(typedScoreData),
      "",
      "Remaining league predictions",
      buildRemainingPredictionText(predictionData.predictions),
      "",
      "Cup predictions",
      buildCupText(typedExtraData),
      "",
      "Other answers",
      buildCustomText(typedExtraData),
      "",
      `Open your prediction page: ${predictionUrl}`,
      "",
      buildEmailSignoffText(),
    ].join("\n");

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? `NFFC Stats <${process.env.GMAIL_USER}>`,
      to,
      replyTo: process.env.EMAIL_REPLY_TO ?? process.env.GMAIL_USER,
      subject: "Your NFFC Podcast Prediction League predictions have been updated",
      html,
      text,
    });

    return Response.json({
      success: true,
      message: "Prediction confirmation email sent.",
      recipient: to,
      messageId: info.messageId,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error.",
      },
      { status: 500 }
    );
  }
}