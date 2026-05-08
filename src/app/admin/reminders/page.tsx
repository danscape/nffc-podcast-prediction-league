"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ReminderRow = {
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

type ReminderSendResult = {
  success: boolean;
  dueCount?: number;
  sentCount?: number;
  failedCount?: number;
  dryRun?: boolean;
  manualGameweek?: number | null;
  reminders?: ReminderRow[];
  sent?: {
    player: string;
    email: string;
    fixture: string;
    messageId?: string;
  }[];
  failed?: {
    player: string;
    email: string;
    fixture: string;
    error: string;
  }[];
  message?: string;
};

function formatDateTime(value: string | null) {
  if (!value) return "TBC";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

export default function AdminRemindersPage() {
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<"dry-run" | "send" | null>(null);
  const [manualGameweek, setManualGameweek] = useState("36");
  const [result, setResult] = useState<ReminderSendResult | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  async function getAdminAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function runReminderCheck(dryRun: boolean, selectedGameweek?: number | null) {
    setLoading(true);
    setLastAction(dryRun ? "dry-run" : "send");
    setResult(null);
    setMessage(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (!dryRun) {
        const accessToken = await getAdminAccessToken();

        if (!accessToken) {
          setMessage({
            type: "error",
            text: "You need to be signed in as an admin to send reminder emails.",
          });
          setLoading(false);
          return;
        }

        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/email/fixture-reminders", {
        method: "POST",
        headers,
        body: JSON.stringify({
          dryRun,
          ...(selectedGameweek ? { manualGameweek: selectedGameweek } : {}),
        }),
      });

      const data = (await response.json()) as ReminderSendResult;

      setResult(data);

      if (!response.ok || !data.success) {
        setMessage({
          type: "error",
          text: data.message ?? "Reminder check failed.",
        });
        return;
      }

      if (dryRun) {
        setMessage({
          type: "info",
          text: `${data.dueCount ?? 0} reminder email${
            (data.dueCount ?? 0) === 1 ? "" : "s"
          } currently due.`,
        });
      } else {
        setMessage({
          type: data.failedCount && data.failedCount > 0 ? "error" : "success",
          text: `${data.sentCount ?? 0} reminder email${
            (data.sentCount ?? 0) === 1 ? "" : "s"
          } sent. ${data.failedCount ?? 0} failed.`,
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not run reminder check.",
      });
    } finally {
      setLoading(false);
    }
  }

  function getManualGameweekNumber() {
    const parsed = Number.parseInt(manualGameweek, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  async function runManualGameweekCheck(dryRun: boolean) {
    const selectedGameweek = getManualGameweekNumber();

    if (!selectedGameweek) {
      setMessage({
        type: "error",
        text: "Enter a valid GW number before running a manual reminder send.",
      });
      return;
    }

    if (!dryRun) {
      const confirmed = window.confirm(
        `Send live reminder emails for GW${selectedGameweek}? This will email players who have not already been logged for this fixture.`
      );

      if (!confirmed) return;
    }

    await runReminderCheck(dryRun, selectedGameweek);
  }

  const dueReminders = result?.reminders ?? [];
  const sent = result?.sent ?? [];
  const failed = result?.failed ?? [];

  return (
    <main className="min-h-screen bg-[var(--nffc-black,#000000)] px-4 py-6 text-[var(--nffc-white,#f5f5f5)] sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-5 shadow-none md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                🔮 Admin
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-[#C8102E] md:text-5xl">
                Reminder emails
              </h1>
              <p className="mt-3 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
                Check and send Premier League fixture reminders scheduled around 2 days before kick-off.
              </p>
            </div>

            <Link
              href="/admin"
              className="w-full rounded-full border border-[#111111] px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-[var(--nffc-white,#f5f5f5)] transition hover:border-[#C8102E] hover:text-[#C8102E] sm:w-fit"
            >
              Back to admin
            </Link>
          </div>
        </header>

        {message && (
          <div
            className={`mb-6 rounded-none border p-4 text-sm font-semibold ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] text-[var(--nffc-muted,#a7a7a7)]"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <AdminStat label="Due reminders" value={result?.dueCount ?? 0} />
          <AdminStat label="Sent" value={result?.sentCount ?? sent.length} />
          <AdminStat label="Failed" value={result?.failedCount ?? failed.length} />
          <AdminStat
            label="Mode"
            value={lastAction === "send" ? "Send" : lastAction === "dry-run" ? "Dry" : "—"}
          />
        </section>

        <section className="mb-6 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="text-2xl font-black uppercase">
                Run reminder check
              </h2>
              <p className="mt-1 text-sm text-[var(--nffc-muted,#a7a7a7)]">
                Dry run only lists reminders that are currently due. Send reminders emails those players and writes to the reminder log to prevent duplicates.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => runReminderCheck(true)}
                className="rounded-full border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[var(--nffc-white,#f5f5f5)] transition hover:border-[#C8102E] hover:text-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && lastAction === "dry-run" ? "Checking…" : "Dry run"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => runReminderCheck(false)}
                className="rounded-full bg-[#C8102E] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && lastAction === "send" ? "Sending…" : "Send due reminders"}
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] p-4 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
            Reminder window: scheduled Premier League fixtures with kick-off roughly 47–48 hours away. Each player should receive only one reminder per fixture.
          </div>
        </section>

        <section className="mb-6 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="text-2xl font-black uppercase">
                Manual GW reminder send
              </h2>
              <p className="mt-1 text-sm text-[var(--nffc-muted,#a7a7a7)]">
                Use this when the scheduled window says no emails are due, but you need to send reminders for a specific gameweek. The live send still checks the reminder log to prevent duplicate emails.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[120px_1fr_1fr]">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase tracking-[0.16em] text-[#C8102E]">
                  GW
                </span>
                <input
                  type="number"
                  min="1"
                  value={manualGameweek}
                  onChange={(event) => setManualGameweek(event.target.value)}
                  className="w-full rounded-none border border-[#444444] bg-[var(--nffc-black,#000000)] px-3 py-3 text-sm font-black uppercase text-white outline-none focus:border-[#C8102E]"
                />
              </label>

              <button
                type="button"
                disabled={loading}
                onClick={() => runManualGameweekCheck(true)}
                className="self-end rounded-full border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[var(--nffc-white,#f5f5f5)] transition hover:border-[#C8102E] hover:text-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && lastAction === "dry-run" ? "Checking…" : "Dry run GW"}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => runManualGameweekCheck(false)}
                className="self-end rounded-full bg-[#C8102E] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && lastAction === "send" ? "Sending…" : "Send GW reminders"}
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-none border border-[#C8102E] bg-[var(--nffc-black,#000000)] p-4 text-sm font-semibold text-white">
            Manual send bypasses the Wednesday scheduled check, but it does not bypass duplicate protection. Players already recorded in email_reminder_log for that fixture will be skipped.
          </div>
        </section>

        {lastAction === "dry-run" && (
          <section className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none md:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase">
                  Due reminders
                </h2>
                <p className="text-sm text-[var(--nffc-muted,#a7a7a7)]">
                  These emails would be sent if you run Send due reminders.
                </p>
              </div>
              <div className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
                {dueReminders.length} due
              </div>
            </div>

            {dueReminders.length === 0 ? (
              <EmptyState text="No reminder emails are currently due." />
            ) : (
              <ReminderTable reminders={dueReminders} />
            )}
          </section>
        )}

        {lastAction === "send" && (
          <div className="grid gap-6">
            <section className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none md:p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase">
                    Sent reminders
                  </h2>
                  <p className="text-sm text-[var(--nffc-muted,#a7a7a7)]">
                    Successfully sent reminder emails.
                  </p>
                </div>
                <div className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
                  {sent.length} sent
                </div>
              </div>

              {sent.length === 0 ? (
                <EmptyState text="No reminder emails were sent." />
              ) : (
                <ResultTable rows={sent} type="sent" />
              )}
            </section>

            <section className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none md:p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase">
                    Failed reminders
                  </h2>
                  <p className="text-sm text-[var(--nffc-muted,#a7a7a7)]">
                    Any reminder emails that could not be sent or logged.
                  </p>
                </div>
                <div className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
                  {failed.length} failed
                </div>
              </div>

              {failed.length === 0 ? (
                <EmptyState text="No failures." />
              ) : (
                <ResultTable rows={failed} type="failed" />
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function AdminStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none">
      <div className="text-xs font-bold uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black text-[#C8102E]">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] p-5 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
      {text}
    </div>
  );
}

function ReminderTable({ reminders }: { reminders: ReminderRow[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-none border border-[var(--nffc-white,#f5f5f5)] lg:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#111111] text-white">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Fixture</th>
              <th className="px-4 py-3">Kick-off</th>
              <th className="px-4 py-3">Email</th>
            </tr>
          </thead>
          <tbody>
            {reminders.map((reminder) => (
              <tr
                key={`${reminder.fixture_id}-${reminder.player_id}`}
                className="border-b border-[rgba(245,245,245,0.35)] last:border-b-0"
              >
                <td className="px-4 py-3">
                  <div className="font-black">
                    {reminder.short_name ?? reminder.player_name}
                  </div>
                  <div className="text-xs text-[var(--nffc-muted,#a7a7a7)]">
                    {reminder.legacy_code}
                  </div>
                </td>
                <td className="px-4 py-3 font-bold">
                  {reminder.team_display_name ?? reminder.team_name}
                </td>
                <td className="px-4 py-3 font-bold">
                  {reminder.gameweek_label} · {reminder.opponent_short}{" "}
                  {reminder.venue}
                </td>
                <td className="px-4 py-3">
                  {formatDateTime(reminder.kickoff_at)}
                </td>
                <td className="px-4 py-3">{reminder.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {reminders.map((reminder) => (
          <div
            key={`${reminder.fixture_id}-${reminder.player_id}`}
            className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] p-4"
          >
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
              {reminder.gameweek_label} · {reminder.opponent_short}{" "}
              {reminder.venue}
            </div>
            <div className="mt-1 text-lg font-black">
              {reminder.short_name ?? reminder.player_name}
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
              {reminder.team_display_name ?? reminder.team_name}
            </div>
            <div className="mt-3 border-t border-[var(--nffc-white,#f5f5f5)] pt-3 text-sm text-[var(--nffc-muted,#a7a7a7)]">
              {formatDateTime(reminder.kickoff_at)} · {reminder.email}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ResultTable({
  rows,
  type,
}: {
  rows: {
    player: string;
    email: string;
    fixture: string;
    messageId?: string;
    error?: string;
  }[];
  type: "sent" | "failed";
}) {
  return (
    <div className="overflow-hidden rounded-none border border-[var(--nffc-white,#f5f5f5)]">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-[#111111] text-white">
          <tr>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3">Fixture</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">{type === "sent" ? "Message ID" : "Error"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.email}-${row.fixture}-${index}`}
              className="border-b border-[rgba(245,245,245,0.35)] last:border-b-0"
            >
              <td className="px-4 py-3 font-black">{row.player}</td>
              <td className="px-4 py-3 font-bold">{row.fixture}</td>
              <td className="px-4 py-3">{row.email}</td>
              <td className="px-4 py-3 text-xs text-[var(--nffc-muted,#a7a7a7)]">
                {type === "sent" ? row.messageId ?? "—" : row.error ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}