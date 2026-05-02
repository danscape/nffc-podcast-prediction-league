"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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
  forest_result: "W" | "D" | "L" | null;
  actual_forest_points: number | null;
  result_confirmed: boolean;
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

  function startEdit(fixture: FixtureRow) {
    setMessage(null);
    setEditingFixtureId(fixture.id);
    setFixtureDraft({ ...fixture });
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
    <main className="min-h-screen bg-[#F7F6F2] px-4 py-6 text-[#111111] sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                🔮 Admin
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-[#C8102E] md:text-5xl">
                Fixtures
              </h1>
              <p className="mt-3 text-sm font-semibold text-neutral-600">
                Edit fixture dates, lock times, status and confirmed results.
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
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <AdminStat label="Fixtures" value={fixtures.length} />
          <AdminStat label="Confirmed" value={confirmedCount} />
          <AdminStat label="Locked" value={lockedCount} />
          <AdminStat
            label="TBC kick-offs"
            value={fixtures.filter((fixture) => !fixture.kickoff_at).length}
          />
        </section>

        <section className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
              Search fixtures
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by GW, opponent, status or result"
              className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
            />
          </label>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-6 text-xl font-black uppercase text-[#C8102E] shadow-sm">
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

              return (
                <div
                  key={fixture.id}
                  className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5"
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
                        <div className="mt-1 text-sm font-semibold text-neutral-600">
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
                            <span className="rounded-full bg-neutral-200 px-3 py-1 text-neutral-700">
                              Locked
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm font-semibold text-neutral-700 lg:min-w-[360px]">
                        <div>
                          <span className="text-neutral-500">Kick-off: </span>
                          {formatDateTime(fixture.kickoff_at)}
                        </div>
                        <div>
                          <span className="text-neutral-500">Lock: </span>
                          {formatDateTime(fixture.prediction_lock_at)}
                        </div>
                        <div>
                          <span className="text-neutral-500">Score: </span>
                          {fixture.home_score === null || fixture.away_score === null
                            ? "Not entered"
                            : `${fixture.home_score}-${fixture.away_score}`}
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
                            <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-black uppercase text-neutral-700">
                              Locked
                            </span>
                          )}
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
                          <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
                            Venue
                          </span>
                          <select
                            value={draft.venue}
                            onChange={(event) =>
                              updateDraft({ venue: event.target.value as "H" | "A" })
                            }
                            className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
                          >
                            <option value="H">H</option>
                            <option value="A">A</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
                            Status
                          </span>
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              updateDraft({ status: event.target.value })
                            }
                            className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
                          >
                            <option value="scheduled">scheduled</option>
                            <option value="postponed">postponed</option>
                            <option value="in_progress">in_progress</option>
                            <option value="finished">finished</option>
                          </select>
                        </label>

                        <label className="block md:col-span-2 xl:col-span-2">
                          <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
                            Kick-off UK time
                          </span>
                          <input
                            type="datetime-local"
                            value={toDatetimeLocal(draft.kickoff_at)}
                            onChange={(event) => setKickoff(event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
                          />
                        </label>

                        <label className="block md:col-span-2 xl:col-span-2">
                          <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
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
                            className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
                          />
                        </label>

                        <div className="md:col-span-2 xl:col-span-2">
                          <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4">
                            <div className="text-xs font-black uppercase tracking-wide text-neutral-500">
                              Result
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <NumberField
                                label="Home"
                                value={draft.home_score ?? 0}
                                onChange={(value) =>
                                  updateDraft({ home_score: value })
                                }
                              />
                              <NumberField
                                label="Away"
                                value={draft.away_score ?? 0}
                                onChange={(value) =>
                                  updateDraft({ away_score: value })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-6">
                          <div className="grid gap-2 md:grid-cols-4">
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
                              className="rounded-full bg-neutral-200 px-5 py-3 text-sm font-black uppercase tracking-wide text-neutral-700 transition hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {savingKey === `reset-${draft.id}`
                                ? "Resetting…"
                                : "Reset result"}
                            </button>

                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-full border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E]"
                            >
                              Cancel
                            </button>
                          </div>
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
    <div className="rounded-2xl border border-[#D9D6D1] bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
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
      <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
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
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
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
      <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-black uppercase text-neutral-700">
        Postponed
      </span>
    );
  }

  if (status === "in_progress") {
    return (
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black uppercase text-yellow-800">
        In progress
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase text-[#C8102E]">
      Scheduled
    </span>
  );
}