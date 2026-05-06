"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type PredictionValue = "W" | "D" | "L";

type FixtureRow = {
  id: string;
  season: string;
  gameweek: number;
  gameweek_label: string;
  opponent: string;
  opponent_short: string;
  venue: "H" | "A";
  home_team: string;
  away_team: string;
  is_forest_home: boolean;
  kickoff_at: string | null;
  prediction_lock_at: string | null;
  kickoff_uk_time: string | null;
  prediction_lock_uk_time: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  forest_result: PredictionValue | null;
  actual_forest_points: number | null;
  result_confirmed: boolean;
  api_status: string | null;
  api_home_score: number | null;
  api_away_score: number | null;
  api_forest_result: PredictionValue | null;
  api_last_synced_at: string | null;
};

type SaveResult = {
  success?: boolean;
  message?: string;
};

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function formatDateTime(value: string | null) {
  if (!value) return "TBC";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function fixtureTitle(fixture: FixtureRow) {
  return `${fixture.gameweek_label} — ${fixture.opponent_short} ${fixture.venue}`;
}

function officialOrApiHomeScore(fixture: FixtureRow) {
  return fixture.home_score ?? fixture.api_home_score;
}

function officialOrApiAwayScore(fixture: FixtureRow) {
  return fixture.away_score ?? fixture.api_away_score;
}

function displayScore(home: number | null, away: number | null) {
  if (home === null || away === null) return "Not entered";
  return `${home}-${away}`;
}

function hasApiScore(fixture: FixtureRow) {
  return fixture.api_home_score !== null && fixture.api_away_score !== null;
}

function apiResultLabel(fixture: FixtureRow) {
  if (!hasApiScore(fixture)) return "No API score imported";

  const result = fixture.api_forest_result
    ? `Forest ${fixture.api_forest_result}`
    : "No Forest result";

  return `${fixture.api_home_score}-${fixture.api_away_score} · ${result}`;
}

export default function AdminFixturesPage() {
  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [fixtureDraft, setFixtureDraft] = useState<FixtureRow | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadFixtures();
  }, []);

  async function loadFixtures() {
    setLoading(true);

    const { data, error } = await supabase
      .from("fixtures_with_uk_time")
      .select("*")
      .order("gameweek", { ascending: true });

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    }

    if (!error && data) {
      setFixtures(data as FixtureRow[]);
    }

    setLoading(false);
  }

  const filteredFixtures = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return fixtures;

    return fixtures.filter((fixture) => {
      return [
        fixture.gameweek_label,
        fixture.opponent,
        fixture.opponent_short,
        fixture.venue,
        fixture.status,
        fixture.forest_result,
        fixture.api_status,
        fixture.api_forest_result,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [fixtures, query]);

  const confirmedCount = fixtures.filter((fixture) => fixture.result_confirmed).length;
  const lockedCount = fixtures.filter(
    (fixture) =>
      fixture.prediction_lock_at &&
      new Date(fixture.prediction_lock_at).getTime() <= Date.now()
  ).length;
  const apiSyncedCount = fixtures.filter((fixture) => fixture.api_last_synced_at).length;

  function startEdit(fixture: FixtureRow) {
    setMessage(null);
    setEditingFixtureId(fixture.id);

    setFixtureDraft({
      ...fixture,
      home_score: officialOrApiHomeScore(fixture),
      away_score: officialOrApiAwayScore(fixture),
    });
  }

  function cancelEdit() {
    setEditingFixtureId(null);
    setFixtureDraft(null);
  }

  function updateDraft(changes: Partial<FixtureRow>) {
    setFixtureDraft((current) => (current ? { ...current, ...changes } : current));
  }

  function setKickoff(value: string) {
    const kickoffIso = fromDatetimeLocal(value);
    const lockIso = kickoffIso
      ? new Date(new Date(kickoffIso).getTime() - 5 * 60 * 1000).toISOString()
      : null;

    updateDraft({
      kickoff_at: kickoffIso,
      prediction_lock_at: lockIso,
    });
  }

  function useApiScore() {
    if (!fixtureDraft) return;

    updateDraft({
      home_score: fixtureDraft.api_home_score,
      away_score: fixtureDraft.api_away_score,
      status:
        fixtureDraft.api_status?.toUpperCase() === "FINISHED"
          ? "finished"
          : fixtureDraft.status,
    });
  }

  async function saveFixture(fixture: FixtureRow) {
    setSavingKey(`fixture-${fixture.id}`);
    setMessage(null);

    const { data, error } = await supabase.rpc("admin_update_fixture", {
      target_fixture_id: fixture.id,
      new_gameweek_label: fixture.gameweek_label,
      new_opponent: fixture.opponent,
      new_opponent_short: fixture.opponent_short,
      new_venue: fixture.venue,
      new_kickoff_at: fixture.kickoff_at,
      new_prediction_lock_at: fixture.prediction_lock_at,
      new_status: fixture.status,
    });

    setSavingKey(null);

    const result = data as SaveResult | null;

    if (error || !result?.success) {
      setMessage({
        type: "error",
        text: result?.message ?? error?.message ?? "Could not save fixture.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Fixture saved.",
    });

    setEditingFixtureId(null);
    setFixtureDraft(null);
    await loadFixtures();
  }

  async function createSnapshot(fixture: FixtureRow) {
    setSavingKey(`snapshot-${fixture.id}`);
    setMessage(null);

    const snapshotLabel = fixture.gameweek_label || `GW${fixture.gameweek}`;

    const { error } = await supabase.rpc("create_prediction_snapshot_for_gameweek", {
      target_gameweek: fixture.gameweek,
      target_snapshot_label: snapshotLabel,
    });

    setSavingKey(null);

    if (error) {
      setMessage({
        type: "error",
        text: error.message ?? "Could not create prediction snapshot.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: `${snapshotLabel} prediction snapshot created.`,
    });

    await loadFixtures();
  }

  async function confirmResult(fixture: FixtureRow) {
    if (fixture.home_score === null || fixture.away_score === null) {
      setMessage({
        type: "error",
        text: "Enter both home and away scores before confirming.",
      });
      return;
    }

    setSavingKey(`confirm-${fixture.id}`);
    setMessage(null);

    const { data, error } = await supabase.rpc("admin_confirm_fixture_result", {
      target_fixture_id: fixture.id,
      target_home_score: fixture.home_score,
      target_away_score: fixture.away_score,
    });

    setSavingKey(null);

    const result = data as SaveResult | null;

    if (error || !result?.success) {
      setMessage({
        type: "error",
        text: result?.message ?? error?.message ?? "Could not confirm result.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Result confirmed and scoring recalculated.",
    });

    setEditingFixtureId(null);
    setFixtureDraft(null);
    await loadFixtures();
  }

  async function resetResult(fixture: FixtureRow) {
    setSavingKey(`reset-${fixture.id}`);
    setMessage(null);

    const { data, error } = await supabase.rpc("admin_reset_fixture_result", {
      target_fixture_id: fixture.id,
    });

    setSavingKey(null);

    const result = data as SaveResult | null;

    if (error || !result?.success) {
      setMessage({
        type: "error",
        text: result?.message ?? error?.message ?? "Could not reset result.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Result reset.",
    });

    setEditingFixtureId(null);
    setFixtureDraft(null);
    await loadFixtures();
  }

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
                Fixtures
              </h1>
              <p className="mt-3 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
                Edit fixture dates, lock times, status, snapshots and confirmed scoring results.
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
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <AdminStat label="Fixtures" value={fixtures.length} />
          <AdminStat label="Confirmed" value={confirmedCount} />
          <AdminStat label="Locked" value={lockedCount} />
          <AdminStat label="API synced" value={apiSyncedCount} />
          <AdminStat
            label="TBC kick-offs"
            value={fixtures.filter((fixture) => !fixture.kickoff_at).length}
          />
        </section>

        <section className="mb-6 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none md:p-5">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
              Search fixtures
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by GW, opponent, status or result"
              className="mt-2 w-full rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
            />
          </label>
        </section>

        {loading ? (
          <div className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-6 text-xl font-black uppercase text-[#C8102E] shadow-none">
            Loading fixtures…
          </div>
        ) : (
          <section className="grid gap-4">
            {filteredFixtures.map((fixture) => {
              const isEditing = editingFixtureId === fixture.id;
              const draft = isEditing && fixtureDraft ? fixtureDraft : fixture;
              const isLocked =
                draft.prediction_lock_at &&
                new Date(draft.prediction_lock_at).getTime() <= Date.now();

              const displayedHomeScore = officialOrApiHomeScore(fixture);
              const displayedAwayScore = officialOrApiAwayScore(fixture);
              const scoreSource =
                fixture.home_score !== null && fixture.away_score !== null
                  ? "Official"
                  : hasApiScore(fixture)
                    ? "API"
                    : "None";

              return (
                <div
                  key={fixture.id}
                  className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none md:p-5"
                >
                  {!isEditing ? (
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                          {fixture.gameweek_label}
                        </div>
                        <div className="mt-1 text-2xl font-black">
                          {fixture.opponent_short} {fixture.venue}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
                          {fixture.home_team} v {fixture.away_team}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-black uppercase">
                          <StatusBadge status={fixture.status} />
                          {fixture.result_confirmed && (
                            <span className="rounded-full bg-[#111111] px-3 py-1 text-white">
                              Result {fixture.forest_result}
                            </span>
                          )}
                          {isLocked && !fixture.result_confirmed && (
                            <span className="rounded-full bg-neutral-200 px-3 py-1 text-[var(--nffc-muted,#a7a7a7)]">
                              Locked
                            </span>
                          )}
                          {fixture.api_last_synced_at && (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">
                              API synced
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)] lg:min-w-[420px]">
                        <div>
                          <span className="text-[var(--nffc-muted,#a7a7a7)]">Kick-off: </span>
                          {formatDateTime(fixture.kickoff_at)}
                        </div>
                        <div>
                          <span className="text-[var(--nffc-muted,#a7a7a7)]">Lock: </span>
                          {formatDateTime(fixture.prediction_lock_at)}
                        </div>
                        <div>
                          <span className="text-[var(--nffc-muted,#a7a7a7)]">
                            Score ({scoreSource}):{" "}
                          </span>
                          {displayScore(displayedHomeScore, displayedAwayScore)}
                        </div>
                        <div>
                          <span className="text-[var(--nffc-muted,#a7a7a7)]">API says: </span>
                          {apiResultLabel(fixture)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => startEdit(fixture)}
                        className="rounded-full bg-[#111111] px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                            Editing fixture
                          </div>
                          <div className="mt-1 text-2xl font-black">
                            {fixtureTitle(draft)}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={draft.status} />
                          {isLocked && (
                            <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-black uppercase text-[var(--nffc-muted,#a7a7a7)]">
                              Locked
                            </span>
                          )}
                          {draft.api_last_synced_at && (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-800">
                              API synced
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mb-4 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] p-4">
                        <div className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
                          API imported result
                        </div>
                        <div className="mt-2 flex flex-col gap-2 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)] md:flex-row md:items-center md:justify-between">
                          <div>
                            {apiResultLabel(draft)}
                            <span className="ml-2 text-[var(--nffc-muted,#a7a7a7)]">
                              · Last synced {formatDateTime(draft.api_last_synced_at)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={useApiScore}
                            disabled={!hasApiScore(draft)}
                            className="rounded-full border border-[#111111] px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--nffc-white,#f5f5f5)] transition hover:border-[#C8102E] hover:text-[#C8102E] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Use API score
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                        <TextField
                          label="GW label"
                          value={draft.gameweek_label}
                          onChange={(value) => updateDraft({ gameweek_label: value })}
                        />

                        <TextField
                          label="Opponent"
                          value={draft.opponent}
                          onChange={(value) => updateDraft({ opponent: value })}
                          className="xl:col-span-2"
                        />

                        <TextField
                          label="Short"
                          value={draft.opponent_short}
                          onChange={(value) =>
                            updateDraft({ opponent_short: value })
                          }
                        />

                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
                            Venue
                          </span>
                          <select
                            value={draft.venue}
                            onChange={(event) =>
                              updateDraft({ venue: event.target.value as "H" | "A" })
                            }
                            className="mt-2 w-full rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
                          >
                            <option value="H">H</option>
                            <option value="A">A</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
                            Status
                          </span>
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              updateDraft({ status: event.target.value })
                            }
                            className="mt-2 w-full rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
                          >
                            <option value="scheduled">scheduled</option>
                            <option value="postponed">postponed</option>
                            <option value="in_progress">in_progress</option>
                            <option value="live">live</option>
                            <option value="finished">finished</option>
                          </select>
                        </label>

                        <label className="block md:col-span-2 xl:col-span-2">
                          <span className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
                            Kick-off UK time
                          </span>
                          <input
                            type="datetime-local"
                            value={toDatetimeLocal(draft.kickoff_at)}
                            onChange={(event) => setKickoff(event.target.value)}
                            className="mt-2 w-full rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
                          />
                        </label>

                        <label className="block md:col-span-2 xl:col-span-2">
                          <span className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
                            Prediction lock UK time
                          </span>
                          <input
                            type="datetime-local"
                            value={toDatetimeLocal(draft.prediction_lock_at)}
                            onChange={(event) =>
                              updateDraft({
                                prediction_lock_at: fromDatetimeLocal(
                                  event.target.value
                                ),
                              })
                            }
                            className="mt-2 w-full rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
                          />
                        </label>

                        <div className="md:col-span-2 xl:col-span-2">
                          <div className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] p-4">
                            <div className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
                              Official scoring result
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <NumberField
                                label="Home"
                                value={draft.home_score}
                                onChange={(value) =>
                                  updateDraft({ home_score: value })
                                }
                              />
                              <NumberField
                                label="Away"
                                value={draft.away_score}
                                onChange={(value) =>
                                  updateDraft({ away_score: value })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-6">
                          <div className="grid gap-2 md:grid-cols-5">
                            <button
                              type="button"
                              onClick={() => saveFixture(draft)}
                              disabled={savingKey === `fixture-${draft.id}`}
                              className="rounded-full bg-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingKey === `fixture-${draft.id}`
                                ? "Saving…"
                                : "Save fixture"}
                            </button>

                            <button
                              type="button"
                              onClick={() => createSnapshot(draft)}
                              disabled={savingKey === `snapshot-${draft.id}`}
                              className="rounded-full border border-[#C8102E] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingKey === `snapshot-${draft.id}`
                                ? "Snapshotting…"
                                : "Create snapshot"}
                            </button>

                            <button
                              type="button"
                              onClick={() => confirmResult(draft)}
                              disabled={savingKey === `confirm-${draft.id}`}
                              className="rounded-full bg-[#C8102E] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingKey === `confirm-${draft.id}`
                                ? "Confirming…"
                                : "Confirm result"}
                            </button>

                            <button
                              type="button"
                              onClick={() => resetResult(draft)}
                              disabled={savingKey === `reset-${draft.id}`}
                              className="rounded-full bg-neutral-200 px-5 py-3 text-sm font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)] transition hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingKey === `reset-${draft.id}`
                                ? "Resetting…"
                                : "Reset result"}
                            </button>

                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-full border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[var(--nffc-white,#f5f5f5)] transition hover:border-[#C8102E] hover:text-[#C8102E]"
                            >
                              Cancel
                            </button>
                          </div>

                          <p className="px-1 text-xs font-semibold text-[var(--nffc-muted,#a7a7a7)]">
                            Create snapshot should be used at/after the prediction lock
                            and before confirming the result for future gameweeks.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
}

function AdminStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none">
      <div className="text-xs font-bold uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black text-[#C8102E]">{value}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </span>
      <input
        type="number"
        value={value ?? ""}
        placeholder="—"
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
        className="mt-2 w-full rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
      />
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "finished") {
    return (
      <span className="rounded-full bg-[#111111] px-3 py-1 text-xs font-black uppercase text-white">
        Finished
      </span>
    );
  }

  if (status === "postponed") {
    return (
      <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-black uppercase text-[var(--nffc-muted,#a7a7a7)]">
        Postponed
      </span>
    );
  }

  if (status === "in_progress" || status === "live") {
    return (
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black uppercase text-yellow-800">
        Live
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase text-[#C8102E]">
      Scheduled
    </span>
  );
}