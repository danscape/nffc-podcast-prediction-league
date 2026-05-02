"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type AppSettingRow = {
  key: string;
  value: string;
};

type SyncResultRow = {
  apiId: string;
  gameweek: number | null;
  fixture: string;
  action: "created" | "updated" | "skipped";
  message: string;
};

type ApiResult = {
  success: boolean;
  dryRun?: boolean;
  currentSeason?: string;
  footballDataSeason?: string;
  matchCount?: number;
  localFixtureCount?: number;
  existingFixtureCount?: number;
  createdCount?: number;
  updatedCount?: number;
  skippedCount?: number;
  results?: SyncResultRow[];
  message?: string;
};

export default function AdminSeasonPage() {
  const [currentSeason, setCurrentSeason] = useState("");
  const [footballDataSeason, setFootballDataSeason] = useState("");
  const [seasonLabel, setSeasonLabel] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoadingSettings(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["current_season", "football_data_season", "season_label"]);

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      setLoadingSettings(false);
      return;
    }

    const rows = (data ?? []) as AppSettingRow[];
    const settings = new Map(rows.map((row) => [row.key, row.value]));

    setCurrentSeason(settings.get("current_season") ?? "");
    setFootballDataSeason(settings.get("football_data_season") ?? "");
    setSeasonLabel(settings.get("season_label") ?? settings.get("current_season") ?? "");

    setLoadingSettings(false);
  }

  async function saveSettings() {
    setSavingSettings(true);
    setMessage(null);

    const updates = [
      {
        key: "current_season",
        value: currentSeason.trim(),
      },
      {
        key: "football_data_season",
        value: footballDataSeason.trim(),
      },
      {
        key: "season_label",
        value: seasonLabel.trim() || currentSeason.trim(),
      },
    ];

    for (const update of updates) {
      if (!update.value) {
        setSavingSettings(false);
        setMessage({
          type: "error",
          text: `${update.key} cannot be blank.`,
        });
        return;
      }
    }

    const { error } = await supabase.from("app_settings").upsert(updates, {
      onConflict: "key",
    });

    setSavingSettings(false);

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Season settings saved.",
    });

    await loadSettings();
  }

  async function getAdminAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function runApiAction(
    actionKey: string,
    endpoint: "/api/fixtures/sync" | "/api/fixtures/create-season",
    dryRun: boolean
  ) {
    setRunningAction(actionKey);
    setApiResult(null);
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
            text: "You need to be signed in as an admin to run a live API action.",
          });
          setRunningAction(null);
          return;
        }

        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          dryRun,
        }),
      });

      const data = (await response.json()) as ApiResult;
      setApiResult(data);

      if (!response.ok || !data.success) {
        setMessage({
          type: "error",
          text: data.message ?? "API action failed.",
        });
        return;
      }

      setMessage({
        type: dryRun ? "info" : "success",
        text: dryRun
          ? `Dry run complete. ${data.updatedCount ?? 0} updates, ${
              data.createdCount ?? 0
            } creates, ${data.skippedCount ?? 0} skipped.`
          : `Live run complete. ${data.updatedCount ?? 0} updates, ${
              data.createdCount ?? 0
            } creates, ${data.skippedCount ?? 0} skipped.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "API action failed.",
      });
    } finally {
      setRunningAction(null);
    }
  }

  const results = apiResult?.results ?? [];

  return (
    <main className="min-h-screen bg-[#F7F6F2] px-4 py-6 text-[#111111] sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                🔮 Admin
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-[#C8102E] md:text-5xl">
                Season / API Sync
              </h1>
              <p className="mt-3 text-sm font-semibold text-neutral-600">
                Manage the active game season and run fixture/results API syncs.
              </p>
            </div>

            <Link
              href="/admin"
              className="w-full rounded-full border border-[#111111] px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E] sm:w-fit"
            >
              Back to admin
            </Link>
          </div>
        </header>

        {message && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm font-semibold ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-[#D9D6D1] bg-white text-neutral-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <AdminStat label="Current season" value={currentSeason || "—"} />
          <AdminStat label="API season" value={footballDataSeason || "—"} />
          <AdminStat label="Display label" value={seasonLabel || "—"} />
        </section>

        <section className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-black uppercase">Season settings</h2>
            <p className="mt-1 text-sm text-neutral-600">
              These database settings control which local fixtures and football-data.org season are used.
            </p>
          </div>

          {loadingSettings ? (
            <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-600">
              Loading season settings…
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <TextField
                label="Current app season"
                value={currentSeason}
                onChange={setCurrentSeason}
                placeholder="2025/26"
              />
              <TextField
                label="Football-data season"
                value={footballDataSeason}
                onChange={setFootballDataSeason}
                placeholder="2025"
              />
              <TextField
                label="Season label"
                value={seasonLabel}
                onChange={setSeasonLabel}
                placeholder="2025/26"
              />

              <div className="md:col-span-3">
                <button
                  type="button"
                  disabled={savingSettings}
                  onClick={saveSettings}
                  className="w-full rounded-full bg-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50 md:w-fit"
                >
                  {savingSettings ? "Saving…" : "Save season settings"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-700">
            For a new season, set <strong>Current app season</strong> to something like{" "}
            <strong>2026/27</strong> and <strong>Football-data season</strong> to{" "}
            <strong>2026</strong>, then dry-run Create season fixtures before running it live.
          </div>
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-2">
          <ApiActionCard
            title="Create season fixtures"
            description="Creates missing GW1–GW38 fixture rows from football-data.org and updates any existing rows for the active season."
            dryRunLabel="Dry run create"
            liveLabel="Run create"
            dryRunLoading={runningAction === "create-dry"}
            liveLoading={runningAction === "create-live"}
            disabled={runningAction !== null}
            onDryRun={() =>
              runApiAction("create-dry", "/api/fixtures/create-season", true)
            }
            onLive={() =>
              runApiAction("create-live", "/api/fixtures/create-season", false)
            }
          />

          <ApiActionCard
            title="Sync fixtures/results"
            description="Updates existing active-season fixture rows with kick-off changes, API result fields and status."
            dryRunLabel="Dry run sync"
            liveLabel="Run sync"
            dryRunLoading={runningAction === "sync-dry"}
            liveLoading={runningAction === "sync-live"}
            disabled={runningAction !== null}
            onDryRun={() => runApiAction("sync-dry", "/api/fixtures/sync", true)}
            onLive={() => runApiAction("sync-live", "/api/fixtures/sync", false)}
          />
        </section>

        {apiResult && (
          <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase">API result</h2>
                <p className="text-sm text-neutral-600">
                  Season {apiResult.currentSeason ?? "—"} · API season{" "}
                  {apiResult.footballDataSeason ?? "—"} ·{" "}
                  {apiResult.dryRun ? "Dry run" : "Live run"}
                </p>
              </div>
              <div className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
                {apiResult.matchCount ?? 0} API matches
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
              <MiniStat label="Matches" value={apiResult.matchCount ?? 0} />
              <MiniStat
                label="Local fixtures"
                value={
                  apiResult.localFixtureCount ??
                  apiResult.existingFixtureCount ??
                  0
                }
              />
              <MiniStat label="Created" value={apiResult.createdCount ?? 0} />
              <MiniStat label="Updated" value={apiResult.updatedCount ?? 0} />
              <MiniStat label="Skipped" value={apiResult.skippedCount ?? 0} />
            </div>

            {results.length === 0 ? (
              <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-600">
                No detailed results returned.
              </div>
            ) : (
              <ResultTable rows={results} />
            )}
          </section>
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
    <div className="rounded-2xl border border-[#D9D6D1] bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black text-[#C8102E]">{value}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-[#C8102E]">{value}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
      />
    </label>
  );
}

function ApiActionCard({
  title,
  description,
  dryRunLabel,
  liveLabel,
  dryRunLoading,
  liveLoading,
  disabled,
  onDryRun,
  onLive,
}: {
  title: string;
  description: string;
  dryRunLabel: string;
  liveLabel: string;
  dryRunLoading: boolean;
  liveLoading: boolean;
  disabled: boolean;
  onDryRun: () => void;
  onLive: () => void;
}) {
  return (
    <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
      <h2 className="text-2xl font-black uppercase">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onDryRun}
          className="rounded-full border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {dryRunLoading ? "Running…" : dryRunLabel}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onLive}
          className="rounded-full bg-[#C8102E] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {liveLoading ? "Running…" : liveLabel}
        </button>
      </div>
    </section>
  );
}

function ResultTable({ rows }: { rows: SyncResultRow[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-[#D9D6D1] lg:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#111111] text-white">
            <tr>
              <th className="px-4 py-3">GW</th>
              <th className="px-4 py-3">Fixture</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">API ID</th>
              <th className="px-4 py-3">Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.apiId}-${row.gameweek}-${index}`}
                className="border-b border-[#E7E2DA] last:border-b-0"
              >
                <td className="px-4 py-3 font-black">
                  {row.gameweek ? `GW${row.gameweek}` : "—"}
                </td>
                <td className="px-4 py-3 font-bold">{row.fixture}</td>
                <td className="px-4 py-3">
                  <ActionBadge action={row.action} />
                </td>
                <td className="px-4 py-3 text-neutral-600">{row.apiId}</td>
                <td className="px-4 py-3 text-neutral-600">{row.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {rows.map((row, index) => (
          <div
            key={`${row.apiId}-${row.gameweek}-${index}`}
            className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4"
          >
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
              {row.gameweek ? `GW${row.gameweek}` : "No GW"} · {row.apiId}
            </div>
            <div className="mt-1 text-lg font-black">{row.fixture}</div>
            <div className="mt-3">
              <ActionBadge action={row.action} />
            </div>
            <div className="mt-3 border-t border-[#D9D6D1] pt-3 text-sm text-neutral-600">
              {row.message}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ActionBadge({ action }: { action: "created" | "updated" | "skipped" }) {
  if (action === "created") {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black uppercase text-green-800">
        Created
      </span>
    );
  }

  if (action === "updated") {
    return (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-800">
        Updated
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase text-red-800">
      Skipped
    </span>
  );
}