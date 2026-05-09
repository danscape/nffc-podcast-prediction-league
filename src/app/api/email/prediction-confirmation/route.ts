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

function getSupabaseAuditClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseKey = supabaseServiceRoleKey ?? supabaseAnonKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase audit environment variables.");
  }

  return createClient(supabaseUrl, supabaseKey);
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
        <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;" colspan="4">
          No specific changed fixtures were supplied.
        </td>
      </tr>
    `;
  }

  return changedFixtures
    .map((change) => {
      return `
        <tr style="background:#000000;">
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#E50914 !important;-webkit-text-fill-color:#E50914 !important;font-weight:900;">
            ${escapeHtml(change.gameweek_label ?? `GW${change.gameweek}`)}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-weight:900;">
            ${escapeHtml(change.opponent_short ?? "")} ${escapeHtml(change.venue ?? "")}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FF3030 !important;-webkit-text-fill-color:#FF3030 !important;font-weight:900;">
            ${escapeHtml(change.old_prediction ?? "—")}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;font-weight:900;">
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
    <table role="presentation" style="width:100%;border-collapse:collapse;background:#000000;color:#FFFFFF;font-size:12px;font-weight:900;text-transform:uppercase;">
      <tr style="border-bottom:1px solid #242424;">
        <td style="padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Total score</td>
        <td style="padding:7px 5px;text-align:right;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;">${escapeHtml(formatPoints(summary?.total_points))}</td>
      </tr>
      <tr style="border-bottom:1px solid #242424;">
        <td style="padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Accuracy</td>
        <td style="padding:7px 5px;text-align:right;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;">${escapeHtml(calculateAccuracy(scoreData))}</td>
      </tr>
      <tr style="border-bottom:1px solid #242424;">
        <td style="padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Base points</td>
        <td style="padding:7px 5px;text-align:right;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;">${escapeHtml(formatPoints(summary?.base_points))}</td>
      </tr>
      <tr style="border-bottom:1px solid #242424;">
        <td style="padding:7px 5px;color:#FFE44D !important;-webkit-text-fill-color:#FFE44D !important;">Bonuses</td>
        <td style="padding:7px 5px;text-align:right;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">
          Streak ${escapeHtml(formatPoints(summary?.streak_bonus))} / Maverick ${escapeHtml(formatPoints(summary?.maverick_bonus))} / Rogue ${escapeHtml(formatPoints(summary?.rogue_bonus))}
        </td>
      </tr>
      <tr style="border-bottom:1px solid #242424;">
        <td style="padding:7px 5px;color:#59EFFF !important;-webkit-text-fill-color:#59EFFF !important;">Cup bonus</td>
        <td style="padding:7px 5px;text-align:right;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">${escapeHtml(formatPoints(summary?.cup_bonus))}</td>
      </tr>
      <tr>
        <td style="padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Completed / streak</td>
        <td style="padding:7px 5px;text-align:right;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">
          ${escapeHtml(summary?.completed_fixtures ?? 0)} fixtures / ${escapeHtml(currentStreak(scoreData))} current streak
        </td>
      </tr>
    </table>
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
        <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;" colspan="6">
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
        <tr style="background:#000000;">
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#E50914 !important;-webkit-text-fill-color:#E50914 !important;font-weight:900;">
            ${escapeHtml(score.gameweek_label)}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-weight:900;">
            ${escapeHtml(score.opponent_short)} ${escapeHtml(score.venue)}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-weight:900;">
            ${escapeHtml(score.prediction)}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:${correct ? "#22E55E" : "#FF3030"} !important;-webkit-text-fill-color:${correct ? "#22E55E" : "#FF3030"} !important;font-weight:900;">
            ${escapeHtml(score.actual_result)} ${correct ? "✓" : "×"}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFE44D !important;-webkit-text-fill-color:#FFE44D !important;font-weight:900;">
            ${escapeHtml(buildScoreParts(score))}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;text-align:right;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;font-weight:900;">
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
        <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;" colspan="5">
          No remaining league predictions.
        </td>
      </tr>
    `;
  }

  return remaining
    .map((prediction) => {
      return `
        <tr style="background:#000000;">
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#E50914 !important;-webkit-text-fill-color:#E50914 !important;font-weight:900;">
            ${escapeHtml(prediction.gameweek_label)}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-weight:900;">
            ${escapeHtml(prediction.opponent_short)} ${escapeHtml(prediction.venue)}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-weight:900;">
            ${escapeHtml(prediction.prediction)}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;font-weight:900;">
            ${predictionPoints(prediction.prediction)}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-weight:900;">
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
      return `${prediction.gameweek_label} | ${prediction.opponent_short} ${prediction.venue} | ${prediction.prediction} | ${predictionPoints(prediction.prediction)} pts | ${formatDateTime(
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
        <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;" colspan="2">
          No cup predictions available.
        </td>
      </tr>
    `;
  }

  return cupPredictions
    .map((cup) => {
      return `
        <tr style="background:#000000;">
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#59EFFF !important;-webkit-text-fill-color:#59EFFF !important;font-weight:900;">
            ${escapeHtml(cup.display_name ?? cup.competition)}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-weight:900;text-align:right;">
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
        <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;" colspan="2">
          No other answers available.
        </td>
      </tr>
    `;
  }

  return customAnswers
    .map((answer) => {
      return `
        <tr style="background:#000000;">
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFE44D !important;-webkit-text-fill-color:#FFE44D !important;font-weight:900;">
            ${escapeHtml(answer.question_text)}
          </td>
          <td style="padding:7px 5px;border-bottom:1px solid #242424;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-weight:900;text-align:right;">
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

    if (changedFixtures.length > 0) {
      const auditSupabase = getSupabaseAuditClient();

      const auditRows = changedFixtures
        .filter((change) => change.old_prediction !== change.new_prediction)
        .map((change) => ({
          actor_type: updatedBy,
          actor_label: updatedBy === "admin" ? "League admin" : playerDisplayName,
          source: "prediction_confirmation",
          target_player_id: player.id,
          target_player_name: player.player_name,
          target_team_name: teamName,
          fixture_gameweek: change.gameweek,
          fixture_label: change.gameweek_label ?? `GW${change.gameweek}`,
          fixture_opponent_short: change.opponent_short ?? null,
          fixture_venue: change.venue ?? null,
          old_prediction: change.old_prediction ?? null,
          new_prediction: change.new_prediction ?? null,
          change_context: {
            updatedBy,
            updatedAt,
          },
        }));

      if (auditRows.length > 0) {
        const { error: auditError } = await auditSupabase
          .from("prediction_change_audit")
          .insert(auditRows);

        if (auditError) {
          console.error("Prediction audit log insert failed", auditError.message);
        }
      }
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const html = `<!doctype html>
      <html>
        <head>
          <meta name="color-scheme" content="light only">
          <meta name="supported-color-schemes" content="light only">
          <style>
            :root {
              color-scheme: light only;
              supported-color-schemes: light only;
            }
            body, table, td, div, p, span, a, h1, h2 {
              color-scheme: light only !important;
            }
          </style>
        </head>
        <body style="margin:0;padding:0;background:#000000 !important;color:#FFFFFF !important;">
          <div style="margin:0;padding:0;background:#000000 !important;color:#FFFFFF !important;">
            <div style="max-width:760px;margin:0 auto;padding:0;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;background:#000000;">
              <div style="border:1px solid #333333;background:#000000;">
                <div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:10px 12px;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.18em;">
                  NFFC Podcast Prediction League
                </div>

                <div style="padding:12px;border-bottom:1px solid #333333;">
                  <div style="font-size:28px;line-height:1;font-weight:900;text-transform:uppercase;letter-spacing:-0.03em;color:#FFE44D !important;-webkit-text-fill-color:#FFE44D !important;">
                    Predictions Updated
                  </div>
                  <div style="margin-top:8px;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">
                    ${escapeHtml(playerDisplayName)}, this confirms your prediction record has been updated.
                  </div>
                </div>

                <div style="padding:12px;border-bottom:1px solid #333333;">
                  <div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:7px 9px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
                    Confirmation Of Changes
                  </div>

                  <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:8px;background:#000000;color:#FFFFFF;font-size:12px;font-weight:900;text-transform:uppercase;">
                    <tr style="border-bottom:1px solid #242424;">
                      <td style="padding:7px 5px;color:#FF4F5E !important;-webkit-text-fill-color:#FF4F5E !important;width:135px;">Updated</td>
                      <td style="padding:7px 5px;text-align:right;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">${escapeHtml(updatedAt)}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #242424;">
                      <td style="padding:7px 5px;color:#FF4F5E !important;-webkit-text-fill-color:#FF4F5E !important;">Updated by</td>
                      <td style="padding:7px 5px;text-align:right;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">${escapeHtml(updatedByText)}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #242424;">
                      <td style="padding:7px 5px;color:#FF4F5E !important;-webkit-text-fill-color:#FF4F5E !important;">Player</td>
                      <td style="padding:7px 5px;text-align:right;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">${escapeHtml(player.player_name)}</td>
                    </tr>
                    <tr>
                      <td style="padding:7px 5px;color:#FF4F5E !important;-webkit-text-fill-color:#FF4F5E !important;">Team</td>
                      <td style="padding:7px 5px;text-align:right;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">${escapeHtml(teamName)}</td>
                    </tr>
                  </table>

                  <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:10px;background:#000000;color:#FFFFFF;font-size:12px;font-weight:900;text-transform:uppercase;">
                    <thead>
                      <tr style="background:#000000;border-bottom:1px solid #E50914;">
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">GW</th>
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Fixture</th>
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Old</th>
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">New</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${buildChangedRows(changedFixtures)}
                    </tbody>
                  </table>
                </div>

                <div style="padding:12px;border-bottom:1px solid #333333;">
                  <div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:7px 9px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
                    Prediction League Score
                  </div>
                  ${buildScoreSummaryHtml(typedScoreData)}
                </div>

                <div style="padding:12px;border-bottom:1px solid #333333;">
                  <div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:7px 9px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
                    Remaining League Predictions
                  </div>
                  <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:8px;background:#000000;color:#FFFFFF;font-size:12px;font-weight:900;text-transform:uppercase;">
                    <thead>
                      <tr style="background:#000000;border-bottom:1px solid #E50914;">
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">GW</th>
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Fixture</th>
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Pick</th>
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Forest pts</th>
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Kick-off</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${buildRemainingPredictionRows(predictionData.predictions)}
                    </tbody>
                  </table>
                </div>

                <div style="padding:12px;border-bottom:1px solid #333333;">
                  <div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:7px 9px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
                    Completed Fixture Points
                  </div>
                  <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:8px;background:#000000;color:#FFFFFF;font-size:12px;font-weight:900;text-transform:uppercase;">
                    <thead>
                      <tr style="background:#000000;border-bottom:1px solid #E50914;">
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">GW</th>
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Fixture</th>
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Pick</th>
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Result</th>
                        <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Breakdown</th>
                        <th style="text-align:right;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${buildCompletedScoreRows(typedScoreData)}
                    </tbody>
                  </table>
                </div>

                <div style="padding:12px;border-bottom:1px solid #333333;">
                  <div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:7px 9px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
                    Cup Predictions
                  </div>
                  <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:8px;background:#000000;color:#FFFFFF;font-size:12px;font-weight:900;text-transform:uppercase;">
                    <tbody>
                      ${buildCupRows(typedExtraData)}
                    </tbody>
                  </table>
                </div>

                <div style="padding:12px;border-bottom:1px solid #333333;">
                  <div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:7px 9px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
                    Other Answers
                  </div>
                  <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:8px;background:#000000;color:#FFFFFF;font-size:12px;font-weight:900;text-transform:uppercase;">
                    <tbody>
                      ${buildCustomRows(typedExtraData)}
                    </tbody>
                  </table>
                </div>

                <div style="padding:12px;">
                  <a href="${escapeHtml(predictionUrl)}" style="display:inline-block;background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;text-decoration:none;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;padding:10px 13px;">
                    Open Prediction Page
                  </a>
                </div>

                <div style="padding:0 12px 12px;">
                  ${buildEmailSignoffHtml()}
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = [
      "NFFC Podcast Prediction League",
      "",
      "Your predictions have been updated",
      "",
      `${playerDisplayName}, this confirms that your prediction record has been updated by ${updatedByText}.`,
      "",
      `Updated: ${updatedAt}`,
      `Player: ${player.player_name}`,
      `Team: ${teamName}`,
      "",
      "Changed fixtures",
      buildChangedText(changedFixtures),
      "",
      "Prediction League score so far",
      buildScoreSummaryText(typedScoreData),
      "",
      "Remaining league predictions",
      buildRemainingPredictionText(predictionData.predictions),
      "",
      "Completed fixture points",
      buildCompletedScoreText(typedScoreData),
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