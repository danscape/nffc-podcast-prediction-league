import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import {
  buildEmailSignoffHtml,
  buildEmailSignoffText,
} from "@/lib/email/emailSignoff";
import {
  buildEmailIndividualSnapshotText,
  buildEmailSnapshotLeaderboardsBlock,
  buildEmailTeamSnapshotText,
} from "@/lib/leaderboards/emailLeaderboards";

type DueReminder = {
  fixture_id: string;
  gameweek: number;
  gameweek_label: string;
  opponent: string;
  opponent_short: string;
  venue: "H" | "A";
  kickoff_at: string | null;
  prediction_lock_at: string | null;
  reminder_window_start?: string | null;
  reminder_window_end?: string | null;
  player_id: string;
  legacy_code: string;
  player_name: string;
  short_name: string | null;
  email: string;
  access_token: string;
  team_name: string;
  team_display_name: string | null;
};

type FixtureReminderRow = {
  id: string;
  gameweek: number;
  gameweek_label: string;
  opponent: string;
  opponent_short: string;
  venue: "H" | "A";
  kickoff_at: string | null;
  prediction_lock_at: string | null;
  status: string;
  result_confirmed: boolean;
};

type JoinedTeam = {
  team_name: string;
  display_name: string | null;
};

type PlayerReminderRow = {
  id: string;
  legacy_code: string;
  player_name: string;
  short_name: string | null;
  email: string | null;
  access_token: string | null;
  joined_gameweek: number;
  teams: JoinedTeam[] | JoinedTeam | null;
};

type PlayerPageData = {
  found: boolean;
  player: {
    player_name: string;
    short_name: string | null;
    team_name: string;
    team_display_name: string | null;
  } | null;
  predictions: {
    gameweek: number;
    gameweek_label: string;
    opponent: string;
    opponent_short: string;
    venue: "H" | "A";
    kickoff_at: string | null;
    prediction: "W" | "D" | "L";
    predicted_forest_points: number;
    actual_forest_points?: number | null;
    status: string;
    forest_result: "W" | "D" | "L" | null;
  }[];
};

type IndividualLeaderboardRow = {
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
};

type TeamLeaderboardRow = {
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

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase service role environment variables.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "").trim();
}

async function isAuthorisedLiveRequest(
  request: Request,
  supabase: ReturnType<typeof getSupabaseClient>
) {
  const token = getBearerToken(request);
  const cronSecret = process.env.CRON_SECRET;

  if (!token) return false;

  if (cronSecret && token === cronSecret) {
    return true;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user?.email) {
    return false;
  }

  const { data: adminRows, error: adminError } = await supabase
    .from("admin_users")
    .select("email, active")
    .eq("email", userData.user.email)
    .eq("active", true)
    .limit(1);

  if (adminError) {
    return false;
  }

  return Boolean(adminRows?.length);
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
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function predictionLabel(value: "W" | "D" | "L" | null | undefined) {
  if (value === "W") return "Forest win";
  if (value === "D") return "Draw";
  if (value === "L") return "Forest loss";
  return "Not set";
}

function firstItem<T>(value: T[] | T | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function buildPredictionRows(predictions: PlayerPageData["predictions"]) {
  const remaining = predictions
    .filter(
      (prediction) =>
        !(prediction.status === "finished" && prediction.forest_result)
    )
    .sort((a, b) => a.gameweek - b.gameweek);

  if (!remaining.length) {
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #E7E2DA;" colspan="4">
          No remaining league predictions.
        </td>
      </tr>
    `;
  }

  return remaining
    .map((prediction) => {
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #E7E2DA; font-weight: 900; color: #C8102E;">
            ${escapeHtml(prediction.gameweek_label)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #E7E2DA; font-weight: 700; color: #111111;">
            ${escapeHtml(prediction.opponent_short)} ${escapeHtml(prediction.venue)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #E7E2DA; font-weight: 900; color: #111111;">
            ${escapeHtml(prediction.prediction)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #E7E2DA; color: #111111;">
            ${escapeHtml(formatDateTime(prediction.kickoff_at))}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildPredictionText(predictions: PlayerPageData["predictions"]) {
  const remaining = predictions
    .filter(
      (prediction) =>
        !(prediction.status === "finished" && prediction.forest_result)
    )
    .sort((a, b) => a.gameweek - b.gameweek);

  if (!remaining.length) return "No remaining league predictions.";

  return remaining
    .map((prediction) => {
      return `${prediction.gameweek_label} | ${prediction.opponent_short} ${
        prediction.venue
      } | ${prediction.prediction} | ${formatDateTime(prediction.kickoff_at)}`;
    })
    .join("\n");
}

async function getManualGameweekReminders({
  supabase,
  manualGameweek,
}: {
  supabase: ReturnType<typeof getSupabaseClient>;
  manualGameweek: number;
}) {
  const { data: fixtureData, error: fixtureError } = await supabase
    .from("fixtures")
    .select(
      "id, gameweek, gameweek_label, opponent, opponent_short, venue, kickoff_at, prediction_lock_at, status, result_confirmed"
    )
    .eq("gameweek", manualGameweek)
    .limit(1)
    .maybeSingle();

  if (fixtureError) {
    throw new Error(fixtureError.message);
  }

  if (!fixtureData) {
    throw new Error(`No fixture found for GW${manualGameweek}.`);
  }

  const fixture = fixtureData as FixtureReminderRow;

  if (fixture.result_confirmed || fixture.status === "finished") {
    throw new Error(`${fixture.gameweek_label} is already finished/confirmed.`);
  }

  const { data: loggedData, error: loggedError } = await supabase
    .from("email_reminder_log")
    .select("player_id")
    .eq("fixture_id", fixture.id)
    .eq("reminder_type", "fixture_prediction_reminder");

  if (loggedError) {
    throw new Error(loggedError.message);
  }

  const alreadyLoggedPlayerIds = new Set(
    ((loggedData ?? []) as { player_id: string }[]).map((row) => row.player_id)
  );

  const { data: playerData, error: playerError } = await supabase
    .from("players")
    .select(
      `
      id,
      legacy_code,
      player_name,
      short_name,
      email,
      access_token,
      joined_gameweek,
      teams (
        team_name,
        display_name
      )
    `
    )
    .eq("active", true)
    .lte("joined_gameweek", manualGameweek)
    .not("email", "is", null)
    .neq("email", "")
    .not("access_token", "is", null)
    .neq("access_token", "")
    .order("player_name", { ascending: true });

  if (playerError) {
    throw new Error(playerError.message);
  }

  const reminders = ((playerData ?? []) as unknown as PlayerReminderRow[])
    .filter((player) => !alreadyLoggedPlayerIds.has(player.id))
    .map((player) => {
      const team = firstItem(player.teams);

      return {
        fixture_id: fixture.id,
        gameweek: fixture.gameweek,
        gameweek_label: fixture.gameweek_label,
        opponent: fixture.opponent,
        opponent_short: fixture.opponent_short,
        venue: fixture.venue,
        kickoff_at: fixture.kickoff_at,
        prediction_lock_at: fixture.prediction_lock_at,
        player_id: player.id,
        legacy_code: player.legacy_code,
        player_name: player.player_name,
        short_name: player.short_name,
        email: player.email ?? "",
        access_token: player.access_token ?? "",
        team_name: team?.team_name ?? "No team",
        team_display_name: team?.display_name ?? null,
      };
    });

  return {
    fixture,
    reminders,
    alreadyLoggedCount: alreadyLoggedPlayerIds.size,
  };
}


function getRecordNumber(row: Record<string, unknown>, key: string) {
  const value = Number(row[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function recordText(row: Record<string, unknown>, key: string, fallback = "") {
  const value = row[key];
  return value === null || value === undefined || String(value).trim() === ""
    ? fallback
    : String(value);
}

function recordNumber(row: Record<string, unknown>, key: string) {
  const value = Number(row[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getRecordText(row: Record<string, unknown>, keys: string[], fallback = "TBC") {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value);
    }
  }

  return fallback;
}

function buildLatestNewsSnapshotHtml(snapshot: {
  inFormPlayerName: string;
  inFormPlayerPoints: number;
  inFormTeamName: string;
  inFormTeamPoints: number;
  averagePredictedForestPoints: number;
  latestOverallAccuracy: number;
}) {
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:8px;background:#000000;color:#FFFFFF;font-size:12px;font-weight:900;text-transform:uppercase;">
      <tr style="border-bottom:1px solid #242424;">
        <td style="padding:7px 5px;color:#FFE44D;-webkit-text-fill-color:#FFE44D;">In-form player</td>
        <td style="padding:7px 5px;text-align:right;color:#FFFFFF;-webkit-text-fill-color:#FFFFFF;">${escapeHtml(snapshot.inFormPlayerName)} / ${escapeHtml(Math.round(snapshot.inFormPlayerPoints))} pts</td>
      </tr>
      <tr style="border-bottom:1px solid #242424;">
        <td style="padding:7px 5px;color:#59EFFF;-webkit-text-fill-color:#59EFFF;">In-form team</td>
        <td style="padding:7px 5px;text-align:right;color:#FFFFFF;-webkit-text-fill-color:#FFFFFF;">${escapeHtml(snapshot.inFormTeamName)} / ${escapeHtml(Math.round(snapshot.inFormTeamPoints))} pts</td>
      </tr>
      <tr style="border-bottom:1px solid #242424;">
        <td style="padding:7px 5px;color:#22E55E;-webkit-text-fill-color:#22E55E;">Avg season points</td>
        <td style="padding:7px 5px;text-align:right;color:#FFFFFF;-webkit-text-fill-color:#FFFFFF;">${escapeHtml(Math.round(snapshot.averagePredictedForestPoints))} pts</td>
      </tr>
      <tr>
        <td style="padding:7px 5px;color:#FFFFFF;-webkit-text-fill-color:#FFFFFF;">Overall accuracy</td>
        <td style="padding:7px 5px;text-align:right;color:#22E55E;-webkit-text-fill-color:#22E55E;">${escapeHtml(Math.round(snapshot.latestOverallAccuracy))}%</td>
      </tr>
    </table>
  `;
}

function buildLatestNewsSnapshotText(snapshot: {
  inFormPlayerName: string;
  inFormPlayerPoints: number;
  inFormTeamName: string;
  inFormTeamPoints: number;
  averagePredictedForestPoints: number;
  latestOverallAccuracy: number;
}) {
  return [
    `In-form player: ${snapshot.inFormPlayerName} / ${Math.round(snapshot.inFormPlayerPoints)} pts`,
    `In-form team: ${snapshot.inFormTeamName} / ${Math.round(snapshot.inFormTeamPoints)} pts`,
    `Avg predicted Forest points: ${Math.round(snapshot.averagePredictedForestPoints)} pts`,
    `Overall accuracy: ${Math.round(snapshot.latestOverallAccuracy)}%`,
  ].join("\\n");
}


function getSnapshotNumber(value: unknown) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function getSnapshotText(value: unknown, fallback = "TBC") {
  if (value === null || value === undefined) return fallback;
  const textValue = String(value).trim();
  return textValue ? textValue : fallback;
}


function buildPreviousPlayerScoreCalculationHtml(row: Record<string, unknown> | null) {
  if (!row) {
    return `
      <div style="padding:9px 0 0;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">
        No confirmed player score available yet.
      </div>
    `;
  }

  const base = getSnapshotNumber(row.base_points);
  const streak = getSnapshotNumber(row.streak_bonus);
  const maverick = getSnapshotNumber(row.maverick_bonus);
  const rogue = getSnapshotNumber(row.rogue_bonus);
  const cup = getSnapshotNumber(row.cup_bonus_this_week);
  const total = getSnapshotNumber(row.total_points_this_week);
  const runningTotal = getSnapshotNumber(row.running_total);

  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:8px;background:#000000;color:#FFFFFF;font-size:12px;font-weight:900;text-transform:uppercase;">
      <tr style="border-bottom:1px solid #242424;">
        <td style="padding:7px 5px;color:#E50914 !important;-webkit-text-fill-color:#E50914 !important;">Fixture</td>
        <td style="padding:7px 5px;text-align:right;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">
          ${escapeHtml(recordText(row, "gameweek_label"))} ${escapeHtml(recordText(row, "opponent_short"))} ${escapeHtml(recordText(row, "venue"))}
        </td>
      </tr>
      <tr style="border-bottom:1px solid #242424;">
        <td style="padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Pick / Result</td>
        <td style="padding:7px 5px;text-align:right;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">
          ${escapeHtml(recordText(row, "prediction", "-"))} / ${escapeHtml(recordText(row, "actual_result", recordText(row, "forest_result", "TBC")))}
        </td>
      </tr>
      <tr style="border-bottom:1px solid #242424;">
        <td style="padding:7px 5px;color:#FFE44D !important;-webkit-text-fill-color:#FFE44D !important;">Calculation</td>
        <td style="padding:7px 5px;text-align:right;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">
          Base ${escapeHtml(base)} + Streak ${escapeHtml(streak)} + Maverick ${escapeHtml(maverick)} + Rogue ${escapeHtml(rogue)} + Cup ${escapeHtml(cup)}
        </td>
      </tr>
      <tr style="border-bottom:1px solid #242424;">
        <td style="padding:7px 5px;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;">GW Total</td>
        <td style="padding:7px 5px;text-align:right;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;">
          ${escapeHtml(total)} pts
        </td>
      </tr>
      <tr>
        <td style="padding:7px 5px;color:#59EFFF !important;-webkit-text-fill-color:#59EFFF !important;">Running Total</td>
        <td style="padding:7px 5px;text-align:right;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">
          ${escapeHtml(runningTotal)} pts
        </td>
      </tr>
    </table>
  `;
}

function buildPreviousPlayerScoreCalculationText(row: Record<string, unknown> | null) {
  if (!row) return "No confirmed player score available yet.";

  const base = getSnapshotNumber(row.base_points);
  const streak = getSnapshotNumber(row.streak_bonus);
  const maverick = getSnapshotNumber(row.maverick_bonus);
  const rogue = getSnapshotNumber(row.rogue_bonus);
  const cup = getSnapshotNumber(row.cup_bonus_this_week);
  const total = getSnapshotNumber(row.total_points_this_week);
  const runningTotal = getSnapshotNumber(row.running_total);

  return [
    `${recordText(row, "gameweek_label")} ${recordText(row, "opponent_short")} ${recordText(row, "venue")}`,
    `Pick / Result: ${recordText(row, "prediction", "-")} / ${recordText(row, "actual_result", recordText(row, "forest_result", "TBC"))}`,
    `Calculation: Base ${base} + Streak ${streak} + Maverick ${maverick} + Rogue ${rogue} + Cup ${cup} = ${total} pts`,
    `Running total: ${runningTotal} pts`,
  ].join("\\n");
}

async function sendReminderEmail({
  reminder,
  predictionData,
  individualRows,
  teamRows,
  newsSnapshot,
  actualForestPointsTotal,
  previousPlayerScoreRow,
  testMode = false,
}: {
  reminder: DueReminder;
  predictionData: PlayerPageData;
  individualRows: IndividualLeaderboardRow[];
  teamRows: TeamLeaderboardRow[];
  newsSnapshot: {
    inFormPlayerName: string;
    inFormPlayerPoints: number;
    inFormTeamName: string;
    inFormTeamPoints: number;
    averagePredictedForestPoints: number;
    latestOverallAccuracy: number;
  };
  actualForestPointsTotal: number;
  previousPlayerScoreRow: Record<string, unknown> | null;
  testMode?: boolean;
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Missing Gmail email settings.");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const predictionUrl = `${siteUrl}/predict/${reminder.access_token}`;
  const leaderboardsUrl = `${siteUrl}/#leaderboards`;

  const playerName =
    predictionData.player?.short_name ??
    predictionData.player?.player_name ??
    reminder.short_name ??
    reminder.player_name;

  const teamName =
    predictionData.player?.team_display_name ??
    predictionData.player?.team_name ??
    reminder.team_display_name ??
    reminder.team_name;

  const currentPlayerLeaderboardRow = individualRows.find(
    (row) => row.player_id === reminder.player_id
  ) as Record<string, unknown> | undefined;

  const currentGameScore = getSnapshotNumber(
    currentPlayerLeaderboardRow?.total_points
  );

  const remainingPredictedForestPoints = predictionData.predictions.reduce(
    (total, prediction) => {
      const isFinished =
        prediction.status === "finished" ||
        prediction.status === "confirmed" ||
        Boolean(prediction.forest_result);

      if (isFinished) return total;

      return total + getSnapshotNumber(prediction.predicted_forest_points);
    },
    0
  );

  const predictedPointsTotal =
    actualForestPointsTotal + remainingPredictedForestPoints;





  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const deadlineText = formatDateTime(reminder.prediction_lock_at);
  const fixtureText = `${reminder.gameweek_label} — Forest ${
    reminder.venue === "H" ? "v" : "at"
  } ${reminder.opponent_short}`;



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
          .ceefax-white {
            color: #FFFFFF !important;
            -webkit-text-fill-color: #FFFFFF !important;
          }
          .ceefax-yellow {
            color: #FFE44D !important;
            -webkit-text-fill-color: #FFE44D !important;
          }
          .ceefax-green {
            color: #22E55E !important;
            -webkit-text-fill-color: #22E55E !important;
          }
          .ceefax-red {
            color: #FF4F5E !important;
            -webkit-text-fill-color: #FF4F5E !important;
          }
        </style>
      </head>
      <body style="margin:0;padding:0;background:#000000 !important;color:#FFFFFF !important;">
    <div style="margin:0;padding:0;background:#000000 !important;color:#FFFFFF !important;">
      <div style="max-width:720px;margin:0 auto;padding:10px;background:#000000;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">
        <div style="border:1px solid #333333;background:#000000;">
          ${
            testMode
              ? `<div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:8px 10px;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;">
                  TEST SEND ONLY — NOT LOGGED AS LIVE REMINDER
                </div>`
              : ""
          }

          <div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:10px 12px;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.14em;">
            NFFC Podcast Prediction League
          </div>

          <div style="padding:12px;border-bottom:1px solid #333333;">
            <div style="font-size:34px;line-height:0.95;font-weight:900;text-transform:uppercase;letter-spacing:-0.04em;color:#FFE44D !important;-webkit-text-fill-color:#FFE44D !important;">
              ${escapeHtml(reminder.gameweek_label)} Deadline Reminder
            </div>
            <div style="margin-top:8px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:#FFE44D !important;-webkit-text-fill-color:#FFE44D !important;">
              Deadline: ${escapeHtml(deadlineText)}
            </div>
          </div>

          <div style="padding:12px;border-bottom:1px solid #333333;">
            <table role="presentation" style="width:100%;border-collapse:collapse;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-size:13px;text-transform:uppercase;font-weight:900;">
              <tr>
                <td style="padding:5px 0;color:#FF4F5E !important;-webkit-text-fill-color:#FF4F5E !important;width:135px;">Player</td>
                <td style="padding:5px 0;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-weight:900;">${escapeHtml(playerName)}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#FF4F5E !important;-webkit-text-fill-color:#FF4F5E !important;">Team</td>
                <td style="padding:5px 0;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-weight:900;">${escapeHtml(teamName)}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#FF4F5E !important;-webkit-text-fill-color:#FF4F5E !important;">Total Score</td>
                <td style="padding:5px 0;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;font-weight:900;">${escapeHtml(Math.round(currentGameScore))} pts</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#FF4F5E !important;-webkit-text-fill-color:#FF4F5E !important;">Predicted Points Total</td>
                <td style="padding:5px 0;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;font-weight:900;">${escapeHtml(Math.round(predictedPointsTotal))} pts</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#FF4F5E !important;-webkit-text-fill-color:#FF4F5E !important;">Fixture</td>
                <td style="padding:5px 0;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-weight:900;">${escapeHtml(fixtureText)}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#FF4F5E !important;-webkit-text-fill-color:#FF4F5E !important;">Kick-off</td>
                <td style="padding:5px 0;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;font-weight:900;">${escapeHtml(formatDateTime(reminder.kickoff_at))}</td>
              </tr>
            </table>
          </div>

          <div style="padding:12px;border-bottom:1px solid #333333;">
            <div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:7px 9px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
              Previous GW Score Calculation
            </div>
            ${buildPreviousPlayerScoreCalculationHtml(previousPlayerScoreRow ?? null)}
          </div>

          <div style="padding:12px;border-bottom:1px solid #333333;">
            <div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:7px 9px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
              Update Your Predictions
            </div>
            <div style="padding:12px 0 0;">
              <a href="${escapeHtml(predictionUrl)}" style="display:inline-block;background:#000000;border:2px solid #22E55E;color:#22E55E !important;-webkit-text-fill-color:#22E55E !important;text-decoration:none;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;padding:11px 14px;">
                Open Prediction Terminal
              </a>
            </div>
          </div>

          <div style="padding:12px;border-bottom:1px solid #333333;">
            <div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:7px 9px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
              Your Current Remaining Predictions
            </div>

            <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;text-transform:uppercase;font-weight:900;">
              <thead>
                <tr style="border-bottom:1px solid #E50914;">
                  <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">GW</th>
                  <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Fixture</th>
                  <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Pick</th>
                  <th style="text-align:left;padding:7px 5px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;">Kick-off</th>
                </tr>
              </thead>
              <tbody>
                ${buildPredictionRows(predictionData.predictions)}
              </tbody>
            </table>
          </div>

          <div style="padding:12px;border-bottom:1px solid #333333;">
            <div style="margin-top:8px;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;background:#000000;">
              ${buildEmailSnapshotLeaderboardsBlock({
                individualRows,
                teamRows,
                targetPlayerId: reminder.player_id,
                targetTeamName: teamName,
              })}
            </div>
          </div>

          <div style="padding:12px;border-bottom:1px solid #333333;">
            <div style="background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;padding:7px 9px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;">
              Latest News Snapshot
            </div>
            ${buildLatestNewsSnapshotHtml(newsSnapshot)}
          </div>

          <div style="padding:12px;">
            <a href="${escapeHtml(leaderboardsUrl)}" style="display:inline-block;background:#E50914;color:#FFFFFF !important;-webkit-text-fill-color:#FFFFFF !important;text-decoration:none;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;padding:10px 13px;">
              View Full Leaderboards
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
    `${reminder.gameweek_label} Deadline Reminder`,
    `Deadline: ${deadlineText}`,
    "",
    `Player: ${playerName}`,
    `Team: ${teamName}`,
    `Total score: ${Math.round(currentGameScore)} pts`,
    `Predicted points total: ${Math.round(predictedPointsTotal)} pts`,
    `Fixture: ${fixtureText}`,
    `Kick-off: ${formatDateTime(reminder.kickoff_at)}`,
    "",
    "Previous GW score calculation",
    buildPreviousPlayerScoreCalculationText(previousPlayerScoreRow ?? null),
    "",
    `Update your predictions: ${predictionUrl}`,
    "",
    "Current remaining predictions",
    buildPredictionText(predictionData.predictions),
    "",
    "Player leaderboard snapshot",
    buildEmailIndividualSnapshotText({
      rows: individualRows,
      targetPlayerId: reminder.player_id,
    }),
    "",
    "Team leaderboard snapshot",
    buildEmailTeamSnapshotText({
      rows: teamRows,
      targetTeamName: teamName,
    }),
    "",
    "Latest news snapshot",
    buildLatestNewsSnapshotText(newsSnapshot),
    "",
    `View full leaderboards: ${leaderboardsUrl}`,
    "",
    buildEmailSignoffText(),
  ].join("\n");

  const testEmailOverride = process.env.TEST_REMINDER_EMAIL?.trim();
  const recipientEmail = testMode && testEmailOverride ? testEmailOverride : reminder.email;

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? `NFFC Stats <${process.env.GMAIL_USER}>`,
    to: recipientEmail,
    replyTo: process.env.EMAIL_REPLY_TO ?? process.env.GMAIL_USER,
    subject: `${testMode ? "[TEST] " : ""}${reminder.gameweek_label} Deadline Reminder: ${deadlineText}`,
    html,
    text,
  });

  return { messageId: info.messageId, recipientEmail };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const limit = typeof body?.limit === "number" ? body.limit : 1000;

    const manualGameweek =
      typeof body?.manualGameweek === "number" &&
      Number.isInteger(body.manualGameweek) &&
      body.manualGameweek > 0
        ? body.manualGameweek
        : null;

    const testMode = body?.testMode === true;

    const targetLegacyCode =
      typeof body?.targetLegacyCode === "string" &&
      body.targetLegacyCode.trim().length > 0
        ? body.targetLegacyCode.trim().toLowerCase()
        : null;

    const supabase = getSupabaseClient();

    if (!dryRun) {
      const authorised = await isAuthorisedLiveRequest(request, supabase);

      if (!authorised) {
        return Response.json(
          {
            success: false,
            message: "Unauthorised live reminder request.",
          },
          { status: 401 }
        );
      }
    }

    const [
      reminderResult,
      { data: individualData, error: individualError },
      { data: teamData, error: teamError },
      { data: inFormPlayerData },
      { data: inFormTeamData },
      { data: teamProfileData },
      { data: latestSummaryData },
      { data: actualForestPointsData },
    ] = await Promise.all([
      manualGameweek
        ? getManualGameweekReminders({ supabase, manualGameweek })
        : supabase.rpc("get_due_fixture_reminders"),
      supabase
        .from("individual_leaderboard")
        .select("*")
        .order("total_points", { ascending: false })
        .order("accuracy_whole_percentage", { ascending: false })
        .order("player_name", { ascending: true })
        .range(0, 1000),
      supabase
        .from("team_leaderboard")
        .select("*")
        .order("total_team_points", { ascending: false })
        .order("clean_sweeps", { ascending: false })
        .order("blanks", { ascending: true })
        .order("best_player_accuracy_percentage", { ascending: false })
        .order("team_name", { ascending: true })
        .range(0, 1000),
      supabase.from("in_form_player_last_5").select("*").limit(1),
      supabase.from("in_form_team_last_5").select("*").limit(1),
      supabase.from("team_prediction_profiles").select("average_projected_forest_points").range(0, 1000),
      supabase.from("latest_confirmed_gw_result_summary").select("*").maybeSingle(),
      supabase
        .from("fixtures")
        .select("actual_forest_points")
        .eq("result_confirmed", true)
        .range(0, 100),
    ]);

    if (individualError || teamError) {
      return Response.json(
        {
          success: false,
          message: individualError?.message ?? teamError?.message,
        },
        { status: 500 }
      );
    }

    if (
      !manualGameweek &&
      (reminderResult as { error?: { message: string } }).error
    ) {
      return Response.json(
        {
          success: false,
          message: (reminderResult as { error: { message: string } }).error
            .message,
        },
        { status: 500 }
      );
    }

    const allReminders = manualGameweek
      ? (reminderResult as {
          reminders: DueReminder[];
          alreadyLoggedCount: number;
        }).reminders
      : ((reminderResult as { data?: DueReminder[]; error?: { message: string } })
          .data ?? []);

    const filteredReminders = targetLegacyCode
      ? allReminders.filter(
          (reminder) => reminder.legacy_code.toLowerCase() === targetLegacyCode
        )
      : allReminders;

    const reminders = filteredReminders.slice(0, limit);
    const individualRows = (individualData ?? []) as IndividualLeaderboardRow[];
    const teamRows = (teamData ?? []) as TeamLeaderboardRow[];

    const actualForestPointsTotal = ((actualForestPointsData ?? []) as Record<string, unknown>[]).reduce(
      (total, fixture) => total + getSnapshotNumber(fixture.actual_forest_points),
      0
    );


    const inFormPlayerRow = ((inFormPlayerData ?? []) as Record<string, unknown>[])[0] ?? {};
    const inFormTeamRow = ((inFormTeamData ?? []) as Record<string, unknown>[])[0] ?? {};
    const teamProfileRows = (teamProfileData ?? []) as Record<string, unknown>[];
    const latestSummaryRow = (latestSummaryData ?? {}) as Record<string, unknown>;

    const averagePredictedForestPoints =
      teamProfileRows.length > 0
        ? teamProfileRows.reduce(
            (total, row) =>
              total + getSnapshotNumber(row.average_projected_forest_points),
            0
          ) / teamProfileRows.length
        : 0;

    const overallCorrectPredictions = individualRows.reduce(
      (total, row) => total + getSnapshotNumber(row.correct_predictions),
      0
    );
    const overallFixturesScored = individualRows.reduce(
      (total, row) => total + getSnapshotNumber(row.fixtures_scored),
      0
    );

    const serverNewsSnapshot = {
      inFormPlayerName: getSnapshotText(
        inFormPlayerRow.player_name ??
          inFormPlayerRow.short_name ??
          inFormPlayerRow.table_display_name,
        "TBC"
      ),
      inFormPlayerPoints: getSnapshotNumber(
        inFormPlayerRow.points ??
          inFormPlayerRow.total_points ??
          inFormPlayerRow.form_points ??
          inFormPlayerRow.points_last_5
      ),
      inFormTeamName: getSnapshotText(
        inFormTeamRow.display_name ?? inFormTeamRow.team_name,
        "TBC"
      ),
      inFormTeamPoints: getSnapshotNumber(
        inFormTeamRow.points ??
          inFormTeamRow.total_team_points ??
          inFormTeamRow.form_points ??
          inFormTeamRow.points_last_5
      ),
      averagePredictedForestPoints,
      latestOverallAccuracy:
        overallFixturesScored > 0
          ? (overallCorrectPredictions / overallFixturesScored) * 100
          : 0,
    };


    if (dryRun) {
      return Response.json({
        success: true,
        dryRun: true,
        manualGameweek,
        testMode,
        targetLegacyCode,
        dueCount: reminders.length,
        alreadyLoggedCount: manualGameweek
          ? (reminderResult as { alreadyLoggedCount: number }).alreadyLoggedCount
          : undefined,
        reminders,
      });
    }

    const sent: {
      player: string;
      email: string;
      recipientEmail?: string;
      fixture: string;
      messageId?: string;
    }[] = [];

    const failed: {
      player: string;
      email: string;
      fixture: string;
      error: string;
    }[] = [];

    for (const reminder of reminders) {
      try {
        const { data: playerData, error: playerError } = await supabase.rpc(
          "get_player_prediction_page",
          {
            target_token: reminder.access_token,
          }
        );

        if (playerError) {
          throw new Error(playerError.message);
        }

        const predictionData = playerData as PlayerPageData;

        if (!predictionData?.found) {
          throw new Error("Player prediction data not found.");
        }

        const { data: previousPlayerScoreData, error: previousPlayerScoreError } =
          await supabase
            .from("public_player_weekly_scores")
            .select("*")
            .eq("player_id", reminder.player_id)
            .eq("result_confirmed", true)
            .order("gameweek", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (previousPlayerScoreError) {
          throw new Error(previousPlayerScoreError.message);
        }

        const previousPlayerScoreRow =
          (previousPlayerScoreData as Record<string, unknown> | null) ?? null;

        const sendResult = await sendReminderEmail({
          reminder,
          predictionData,
          individualRows,
          teamRows,
          newsSnapshot: serverNewsSnapshot,
          actualForestPointsTotal,
          previousPlayerScoreRow,
          testMode,
        });

        if (!testMode) {
          const { error: logError } = await supabase
            .from("email_reminder_log")
            .insert({
              fixture_id: reminder.fixture_id,
              player_id: reminder.player_id,
              email: reminder.email,
              reminder_type: "fixture_prediction_reminder",
              reminder_window_start: reminder.reminder_window_start ?? null,
              reminder_window_end: reminder.reminder_window_end ?? null,
              gmail_message_id: sendResult.messageId ?? null,
            });

          if (logError) {
            throw new Error(
              `Email sent but reminder log failed: ${logError.message}`
            );
          }
        }

        sent.push({
          player: reminder.player_name,
          email: reminder.email,
          recipientEmail: sendResult.recipientEmail,
          fixture: `${reminder.gameweek_label} ${reminder.opponent_short} ${reminder.venue}`,
          messageId: sendResult.messageId,
        });
      } catch (error) {
        failed.push({
          player: reminder.player_name,
          email: reminder.email,
          fixture: `${reminder.gameweek_label} ${reminder.opponent_short} ${reminder.venue}`,
          error: error instanceof Error ? error.message : "Unknown error.",
        });
      }
    }

    return Response.json({
      success: failed.length === 0,
      manualGameweek,
      testMode,
      targetLegacyCode,
      dueCount: reminders.length,
      sentCount: sent.length,
      failedCount: failed.length,
      sent,
      failed,
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