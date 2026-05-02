import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

type DueReminder = {
  fixture_id: string;
  gameweek: number;
  gameweek_label: string;
  opponent: string;
  opponent_short: string;
  venue: "H" | "A";
  kickoff_at: string | null;
  prediction_lock_at: string | null;
  player_id: string;
  legacy_code: string;
  player_name: string;
  short_name: string | null;
  email: string;
  access_token: string;
  team_name: string;
  team_display_name: string | null;
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
    status: string;
    forest_result: "W" | "D" | "L" | null;
  }[];
};

type IndividualLeaderboardRow = {
  player_id: string;
  player_name: string;
  short_name: string | null;
  table_display_name: string | null;
  team_name: string;
  team_display_name: string | null;
  total_points: number;
  accuracy_percentage: number;
};

type TeamLeaderboardRow = {
  team_id: string;
  team_name: string;
  display_name: string | null;
  total_team_points: number;
  clean_sweeps: number;
  blanks: number;
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
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

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1).replace(".0", "");
}

function buildPredictionRows(predictions: PlayerPageData["predictions"]) {
  const remaining = predictions
    .filter((prediction) => !(prediction.status === "finished" && prediction.forest_result))
    .sort((a, b) => a.gameweek - b.gameweek);

  if (!remaining.length) {
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e0d8;" colspan="5">
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
            ${escapeHtml(formatDateTime(prediction.kickoff_at))}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildPredictionText(predictions: PlayerPageData["predictions"]) {
  const remaining = predictions
    .filter((prediction) => !(prediction.status === "finished" && prediction.forest_result))
    .sort((a, b) => a.gameweek - b.gameweek);

  if (!remaining.length) return "No remaining league predictions.";

  return remaining
    .map((prediction) => {
      return `${prediction.gameweek_label} | ${prediction.opponent_short} ${prediction.venue} | ${prediction.prediction} (${predictionLabel(
        prediction.prediction
      )}) | ${formatDateTime(prediction.kickoff_at)}`;
    })
    .join("\n");
}

function buildIndividualTopFive(rows: IndividualLeaderboardRow[]) {
  if (!rows.length) return "Leaderboard not available yet.";

  return rows
    .slice(0, 5)
    .map((row, index) => {
      const name = row.table_display_name ?? row.short_name ?? row.player_name;
      return `${index + 1}. ${name} — ${formatPoints(row.total_points)} pts`;
    })
    .join("\n");
}

function buildTeamTopFive(rows: TeamLeaderboardRow[]) {
  if (!rows.length) return "Team leaderboard not available yet.";

  return rows
    .slice(0, 5)
    .map((row, index) => {
      const name = row.display_name ?? row.team_name;
      return `${index + 1}. ${name} — ${formatPoints(row.total_team_points)} pts`;
    })
    .join("\n");
}

function buildLeaderboardHtml(
  individualRows: IndividualLeaderboardRow[],
  teamRows: TeamLeaderboardRow[]
) {
  const individualItems = individualRows
    .slice(0, 5)
    .map((row, index) => {
      const name = row.table_display_name ?? row.short_name ?? row.player_name;

      return `
        <li style="margin-bottom: 6px;">
          <strong>${index + 1}. ${escapeHtml(name)}</strong> — ${escapeHtml(formatPoints(row.total_points))} pts
        </li>
      `;
    })
    .join("");

  const teamItems = teamRows
    .slice(0, 5)
    .map((row, index) => {
      const name = row.display_name ?? row.team_name;

      return `
        <li style="margin-bottom: 6px;">
          <strong>${index + 1}. ${escapeHtml(name)}</strong> — ${escapeHtml(formatPoints(row.total_team_points))} pts
        </li>
      `;
    })
    .join("");

  return `
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 16px 0;">
      <div style="background: #F7F6F2; border: 1px solid #D9D6D1; border-radius: 14px; padding: 14px;">
        <h3 style="margin: 0 0 10px; font-size: 16px;">Individual top 5</h3>
        <ol style="margin: 0; padding-left: 22px;">
          ${individualItems || "<li>Leaderboard not available yet.</li>"}
        </ol>
      </div>
      <div style="background: #F7F6F2; border: 1px solid #D9D6D1; border-radius: 14px; padding: 14px;">
        <h3 style="margin: 0 0 10px; font-size: 16px;">Team top 5</h3>
        <ol style="margin: 0; padding-left: 22px;">
          ${teamItems || "<li>Team leaderboard not available yet.</li>"}
        </ol>
      </div>
    </div>
  `;
}

async function sendReminderEmail({
  reminder,
  predictionData,
  individualRows,
  teamRows,
}: {
  reminder: DueReminder;
  predictionData: PlayerPageData;
  individualRows: IndividualLeaderboardRow[];
  teamRows: TeamLeaderboardRow[];
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Missing Gmail email settings.");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const predictionUrl = `${siteUrl}/predict/${reminder.access_token}`;
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
            Prediction reminder
          </h1>

          <p style="margin: 0 0 16px; line-height: 1.5;">
            ${escapeHtml(playerName)}, Forest's next Premier League fixture is coming up in around 2 days. Your current predictions are listed below.
          </p>

          <div style="background: #F7F6F2; border: 1px solid #D9D6D1; border-radius: 14px; padding: 14px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Player:</strong> ${escapeHtml(playerName)}</p>
            <p style="margin: 6px 0 0;"><strong>Team:</strong> ${escapeHtml(teamName)}</p>
            <p style="margin: 6px 0 0;"><strong>Next fixture:</strong> ${escapeHtml(reminder.gameweek_label)} — ${escapeHtml(reminder.opponent_short)} ${escapeHtml(reminder.venue)}</p>
            <p style="margin: 6px 0 0;"><strong>Kick-off:</strong> ${escapeHtml(formatDateTime(reminder.kickoff_at))}</p>
            <p style="margin: 6px 0 0;"><strong>Prediction lock:</strong> ${escapeHtml(formatDateTime(reminder.prediction_lock_at))}</p>
          </div>

          <p style="margin: 18px 0;">
            <a href="${escapeHtml(predictionUrl)}" style="display: inline-block; background: #111111; color: #ffffff; text-decoration: none; font-weight: 800; padding: 12px 18px; border-radius: 999px;">
              Review or update your predictions
            </a>
          </p>

          <h2 style="margin-top: 24px; font-size: 20px;">Current remaining predictions</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #111111; color: #ffffff;">
                <th style="text-align: left; padding: 8px;">GW</th>
                <th style="text-align: left; padding: 8px;">Fixture</th>
                <th style="text-align: left; padding: 8px;">Pick</th>
                <th style="text-align: left; padding: 8px;">Meaning</th>
                <th style="text-align: left; padding: 8px;">Kick-off</th>
              </tr>
            </thead>
            <tbody>
              ${buildPredictionRows(predictionData.predictions)}
            </tbody>
          </table>

          <h2 style="margin-top: 24px; font-size: 20px;">Current leaderboards</h2>
          ${buildLeaderboardHtml(individualRows, teamRows)}
        </div>
      </div>
    </div>
  `;

  const text = [
    "NFFC Podcast Prediction League",
    "",
    "Prediction reminder",
    "",
    `${playerName}, Forest's next Premier League fixture is coming up in around 2 days. Your current predictions are listed below.`,
    "",
    `Player: ${playerName}`,
    `Team: ${teamName}`,
    `Next fixture: ${reminder.gameweek_label} — ${reminder.opponent_short} ${reminder.venue}`,
    `Kick-off: ${formatDateTime(reminder.kickoff_at)}`,
    `Prediction lock: ${formatDateTime(reminder.prediction_lock_at)}`,
    "",
    `Review or update your predictions: ${predictionUrl}`,
    "",
    "Current remaining predictions",
    buildPredictionText(predictionData.predictions),
    "",
    "Individual top 5",
    buildIndividualTopFive(individualRows),
    "",
    "Team top 5",
    buildTeamTopFive(teamRows),
  ].join("\n");

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? `NFFC Stats <${process.env.GMAIL_USER}>`,
    to: reminder.email,
    replyTo: process.env.EMAIL_REPLY_TO ?? process.env.GMAIL_USER,
    subject: `${reminder.gameweek_label} prediction reminder: Forest ${
      reminder.venue === "H" ? "v" : "at"
    } ${reminder.opponent_short}`,
    html,
    text,
  });

  return info.messageId;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const limit = typeof body?.limit === "number" ? body.limit : 1000;

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
      { data: remindersData, error: remindersError },
      { data: individualData, error: individualError },
      { data: teamData, error: teamError },
    ] = await Promise.all([
      supabase.rpc("get_due_fixture_reminders"),
      supabase
        .from("individual_leaderboard")
        .select("*")
        .order("total_points", { ascending: false })
        .order("accuracy_percentage", { ascending: false })
        .order("player_name", { ascending: true })
        .range(0, 1000),
      supabase
        .from("team_leaderboard")
        .select("*")
        .order("total_team_points", { ascending: false })
        .order("clean_sweeps", { ascending: false })
        .order("blanks", { ascending: true })
        .order("team_name", { ascending: true })
        .range(0, 1000),
    ]);

    if (remindersError) {
      return Response.json(
        {
          success: false,
          message: remindersError.message,
        },
        { status: 500 }
      );
    }

    if (individualError || teamError) {
      return Response.json(
        {
          success: false,
          message: individualError?.message ?? teamError?.message,
        },
        { status: 500 }
      );
    }

    const reminders = ((remindersData ?? []) as DueReminder[]).slice(0, limit);
    const individualRows = (individualData ?? []) as IndividualLeaderboardRow[];
    const teamRows = (teamData ?? []) as TeamLeaderboardRow[];

    if (dryRun) {
      return Response.json({
        success: true,
        dryRun: true,
        dueCount: reminders.length,
        reminders,
      });
    }

    const sent: {
      player: string;
      email: string;
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

        const messageId = await sendReminderEmail({
          reminder,
          predictionData,
          individualRows,
          teamRows,
        });

        const { error: logError } = await supabase
          .from("email_reminder_log")
          .insert({
            fixture_id: reminder.fixture_id,
            player_id: reminder.player_id,
            email: reminder.email,
            reminder_type: "fixture_prediction_reminder",
          });

        if (logError) {
          throw new Error(`Email sent but reminder log failed: ${logError.message}`);
        }

        sent.push({
          player: reminder.player_name,
          email: reminder.email,
          fixture: `${reminder.gameweek_label} ${reminder.opponent_short} ${reminder.venue}`,
          messageId,
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