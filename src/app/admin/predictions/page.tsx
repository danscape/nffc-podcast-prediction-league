"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type PredictionValue = "W" | "D" | "L";

type PlayerRow = {
  player_id: string;
  legacy_code: string;
  player_name: string;
  short_name: string | null;
  email: string;
  active: boolean;
  access_token: string;
  team_name: string;
  team_display_name: string | null;
  parent_podcast: string | null;
  table_display_name: string | null;
};

type FixturePredictionRow = {
  gameweek: number;
  gameweek_label: string;
  opponent_short: string;
  venue: "H" | "A";
  kickoff_at: string | null;
  prediction_lock_at: string | null;
  legacy_code: string;
  player_name: string;
  team_name: string;
  prediction: PredictionValue;
  updated_at: string | null;
  updated_by_admin: boolean;
  updated_by_email: string | null;
};

type SaveResult = {
  success?: boolean;
  message?: string;
  changed_count?: number;
};

function predictionToPoints(prediction: PredictionValue) {
  if (prediction === "W") return 3;
  if (prediction === "D") return 1;
  return 0;
}

function formatDateTime(value: string | null) {
  if (!value) return "TBC";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function isLocked(value: string | null) {
  if (!value) return false;
  return new Date(value).getTime() <= Date.now();
}

export default function AdminPredictionsPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [predictions, setPredictions] = useState<FixturePredictionRow[]>([]);
  const [draftPredictions, setDraftPredictions] = useState<FixturePredictionRow[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [selectedLegacyCode, setSelectedLegacyCode] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [sourceNote, setSourceNote] = useState("Manual admin update");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    if (selectedLegacyCode) {
      loadPredictionsForPlayer(selectedLegacyCode);
    }
  }, [selectedLegacyCode]);

  async function loadPlayers() {
    setLoadingPlayers(true);

    const { data, error } = await supabase
      .from("admin_players_overview")
      .select(
        "player_id, legacy_code, player_name, short_name, email, active, access_token, team_name, team_display_name, parent_podcast, table_display_name"
      )
      .order("team_name", { ascending: true })
      .order("player_name", { ascending: true })
      .range(0, 1000);

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      setLoadingPlayers(false);
      return;
    }

    const loadedPlayers = (data ?? []) as PlayerRow[];

    setPlayers(loadedPlayers);

    if (!selectedLegacyCode && loadedPlayers.length > 0) {
      setSelectedLegacyCode(loadedPlayers[0].legacy_code);
    }

    setLoadingPlayers(false);
  }

  async function loadPredictionsForPlayer(legacyCode: string) {
    setLoadingPredictions(true);
    setEditing(false);
    setDraftPredictions([]);

    const { data, error } = await supabase
      .from("admin_fixture_prediction_grid")
      .select("*")
      .eq("legacy_code", legacyCode)
      .order("gameweek", { ascending: true })
      .range(0, 100);

    if (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
      setPredictions([]);
      setDraftPredictions([]);
      setLoadingPredictions(false);
      return;
    }

    const loadedPredictions = (data ?? []) as FixturePredictionRow[];
    setPredictions(loadedPredictions);
    setDraftPredictions(loadedPredictions);
    setLoadingPredictions(false);
  }

  const filteredPlayers = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return players;

    return players.filter((player) => {
      return [
        player.legacy_code,
        player.player_name,
        player.short_name,
        player.email,
        player.team_name,
        player.parent_podcast,
        player.table_display_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [players, query]);

  const selectedPlayer = useMemo(
    () =>
      players.find((player) => player.legacy_code === selectedLegacyCode) ?? null,
    [players, selectedLegacyCode]
  );

  const visiblePredictions = editing ? draftPredictions : predictions;

  const projectedPoints = visiblePredictions.reduce(
    (total, prediction) => total + predictionToPoints(prediction.prediction),
    0
  );

  const adminUpdateCount = predictions.filter(
    (prediction) => prediction.updated_by_admin
  ).length;

  const changedPredictions = useMemo(() => {
    return draftPredictions.filter((draftPrediction) => {
      const original = predictions.find(
        (prediction) => prediction.gameweek === draftPrediction.gameweek
      );

      return original && original.prediction !== draftPrediction.prediction;
    });
  }, [draftPredictions, predictions]);

  function startEditing() {
    setMessage(null);
    setDraftPredictions(predictions.map((prediction) => ({ ...prediction })));
    setEditing(true);
  }

  function cancelEditing() {
    setDraftPredictions(predictions.map((prediction) => ({ ...prediction })));
    setEditing(false);
    setMessage(null);
  }

  function updateDraftPrediction(gameweek: number, newPrediction: PredictionValue) {
    setDraftPredictions((current) =>
      current.map((prediction) =>
        prediction.gameweek === gameweek
          ? { ...prediction, prediction: newPrediction }
          : prediction
      )
    );
  }

  async function sendConfirmationEmail() {
    if (!selectedPlayer?.access_token || !selectedPlayer.email) {
      return {
        success: false,
        message: "Missing player token or email address.",
      };
    }

    const changedFixtures = changedPredictions.map((prediction) => {
      const original = predictions.find(
        (item) => item.gameweek === prediction.gameweek
      );

      return {
        gameweek: prediction.gameweek,
        gameweek_label: prediction.gameweek_label,
        opponent_short: prediction.opponent_short,
        venue: prediction.venue,
        old_prediction: original?.prediction,
        new_prediction: prediction.prediction,
      };
    });

    const response = await fetch("/api/email/prediction-confirmation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: selectedPlayer.access_token,
        to: selectedPlayer.email,
        updatedBy: "admin",
        changedFixtures,
      }),
    });

    return response.json() as Promise<{
      success: boolean;
      message?: string;
    }>;
  }

  async function saveChanges() {
    if (!selectedLegacyCode || changedPredictions.length === 0) {
      setMessage({
        type: "error",
        text: "No prediction changes to save.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    const changes = changedPredictions.map((prediction) => ({
      gameweek: prediction.gameweek,
      prediction: prediction.prediction,
    }));

    const { data, error } = await supabase.rpc("admin_update_prediction_batch_v2", {
      target_legacy_code: selectedLegacyCode,
      changes_text: JSON.stringify(changes),
      admin_email: "nffcstats@gmail.com",
      source_note: sourceNote,
    });

    const result = data as SaveResult | null;

    if (error || !result?.success) {
      setSaving(false);
      setMessage({
        type: "error",
        text: result?.message ?? error?.message ?? "Could not save changes.",
      });
      return;
    }

    const emailResult = await sendConfirmationEmail();

    setSaving(false);

    if (!emailResult.success) {
      setMessage({
        type: "error",
        text: `${
          result.changed_count ?? changedPredictions.length
        } prediction change saved, but confirmation email failed: ${
          emailResult.message ?? "Unknown email error."
        }`,
      });

      setEditing(false);
      await loadPredictionsForPlayer(selectedLegacyCode);
      return;
    }

    setMessage({
      type: "success",
      text: `${result.changed_count ?? changedPredictions.length} prediction change${
        (result.changed_count ?? changedPredictions.length) === 1 ? "" : "s"
      } saved and confirmation email sent to ${selectedPlayer?.email}.`,
    });

    setEditing(false);
    await loadPredictionsForPlayer(selectedLegacyCode);
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
                Manual predictions
              </h1>
              <p className="mt-3 text-sm font-semibold text-neutral-600">
                Select a player, click edit, make multiple W/D/L changes, then save the session and send a confirmation email.
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
          <AdminStat label="Players" value={players.length} />
          <AdminStat label="Selected rows" value={visiblePredictions.length} />
          <AdminStat label="Projected pts" value={projectedPoints} />
          <AdminStat
            label={editing ? "Unsaved changes" : "Admin updates"}
            value={editing ? changedPredictions.length : adminUpdateCount}
          />
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
                Search players
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, team, email or PPL code"
                disabled={editing}
                className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
              <div className="grid gap-2">
                {loadingPlayers ? (
                  <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-bold text-neutral-600">
                    Loading players…
                  </div>
                ) : (
                  filteredPlayers.map((player) => (
                    <button
                      key={player.player_id}
                      type="button"
                      disabled={editing}
                      onClick={() => setSelectedLegacyCode(player.legacy_code)}
                      className={`rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        selectedLegacyCode === player.legacy_code
                          ? "border-[#C8102E] bg-red-50"
                          : "border-[#D9D6D1] bg-[#F7F6F2] hover:border-[#C8102E]"
                      }`}
                    >
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-[#C8102E]">
                        {player.legacy_code}
                      </div>
                      <div className="mt-1 font-black">
                        {player.table_display_name ?? player.player_name}
                      </div>
                      <div className="text-xs font-semibold text-neutral-600">
                        {player.team_display_name ?? player.team_name}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-neutral-500">
                        {player.email}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                Selected player
              </div>
              <h2 className="mt-1 text-3xl font-black uppercase">
                {selectedPlayer?.table_display_name ??
                  selectedPlayer?.player_name ??
                  "No player selected"}
              </h2>
              <p className="mt-1 text-sm font-semibold text-neutral-600">
                {selectedPlayer?.team_display_name ?? selectedPlayer?.team_name}
              </p>
              <p className="mt-1 text-xs font-bold text-neutral-500">
                Confirmation email: {selectedPlayer?.email ?? "No email"}
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
                Source note for audit log
              </span>
              <input
                type="text"
                value={sourceNote}
                onChange={(event) => setSourceNote(event.target.value)}
                disabled={!editing}
                className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {!editing ? (
                <button
                  type="button"
                  onClick={startEditing}
                  disabled={!selectedPlayer || loadingPredictions}
                  className="rounded-full bg-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-3"
                >
                  Edit predictions
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={saveChanges}
                    disabled={saving || changedPredictions.length === 0}
                    className="rounded-full bg-[#C8102E] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
                  >
                    {saving
                      ? "Saving…"
                      : `Save & send email${
                          changedPredictions.length
                            ? ` (${changedPredictions.length})`
                            : ""
                        }`}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="rounded-full border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>

            {editing && (
              <div className="mt-4 rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-700">
                Changes are held locally until you click save. One confirmation email will then be sent to the selected player.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase">
                Current predictions
              </h2>
              <p className="text-sm text-neutral-600">
                {editing
                  ? "Edit mode: make changes, then save the session."
                  : "Read-only mode: click Edit predictions to make changes."}
              </p>
            </div>
            <div className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
              {visiblePredictions.length} fixtures
            </div>
          </div>

          {loadingPredictions ? (
            <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-6 text-xl font-black uppercase text-[#C8102E]">
              Loading predictions…
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-[#D9D6D1] xl:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[#111111] text-white">
                    <tr>
                      <th className="px-4 py-3">GW</th>
                      <th className="px-4 py-3">Fixture</th>
                      <th className="px-4 py-3">Prediction</th>
                      <th className="px-4 py-3">Kick-off</th>
                      <th className="px-4 py-3">Lock</th>
                      <th className="px-4 py-3">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePredictions.map((prediction) => {
                      const locked = isLocked(prediction.prediction_lock_at);
                      const original = predictions.find(
                        (item) => item.gameweek === prediction.gameweek
                      );
                      const changed =
                        editing && original?.prediction !== prediction.prediction;

                      return (
                        <tr
                          key={`${prediction.legacy_code}-${prediction.gameweek}`}
                          className={`border-b border-[#E7E2DA] last:border-b-0 ${
                            locked ? "bg-neutral-50" : changed ? "bg-red-50" : ""
                          }`}
                        >
                          <td className="px-4 py-3 font-black">
                            {prediction.gameweek_label}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-black">
                              {prediction.opponent_short} {prediction.venue}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <PredictionButtons
                              gameweek={prediction.gameweek}
                              selected={prediction.prediction}
                              locked={!editing || locked}
                              onChange={updateDraftPrediction}
                            />
                          </td>
                          <td className="px-4 py-3 text-neutral-700">
                            {formatDateTime(prediction.kickoff_at)}
                          </td>
                          <td className="px-4 py-3">
                            {locked ? (
                              <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-black uppercase text-neutral-700">
                                Locked
                              </span>
                            ) : (
                              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase text-[#C8102E]">
                                Open
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs font-black uppercase">
                            {changed ? (
                              <span className="text-[#C8102E]">
                                {original?.prediction} → {prediction.prediction}
                              </span>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 xl:hidden">
                {visiblePredictions.map((prediction) => {
                  const locked = isLocked(prediction.prediction_lock_at);
                  const original = predictions.find(
                    (item) => item.gameweek === prediction.gameweek
                  );
                  const changed =
                    editing && original?.prediction !== prediction.prediction;

                  return (
                    <div
                      key={`${prediction.legacy_code}-${prediction.gameweek}`}
                      className={`rounded-2xl border p-4 ${
                        locked
                          ? "border-neutral-300 bg-neutral-100"
                          : changed
                            ? "border-[#C8102E] bg-red-50"
                            : "border-[#D9D6D1] bg-[#F7F6F2]"
                      }`}
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                            {prediction.gameweek_label}
                          </div>
                          <div className="mt-1 text-xl font-black">
                            {prediction.opponent_short} {prediction.venue}
                          </div>
                          <div className="text-sm text-neutral-600">
                            Kick-off: {formatDateTime(prediction.kickoff_at)}
                          </div>
                        </div>

                        {locked ? (
                          <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-black uppercase text-neutral-700">
                            Locked
                          </span>
                        ) : changed ? (
                          <span className="rounded-full bg-[#C8102E] px-3 py-1 text-xs font-black uppercase text-white">
                            Changed
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase text-[#C8102E]">
                            Open
                          </span>
                        )}
                      </div>

                      <PredictionButtons
                        gameweek={prediction.gameweek}
                        selected={prediction.prediction}
                        locked={!editing || locked}
                        onChange={updateDraftPrediction}
                        fullWidth
                      />

                      {changed && (
                        <div className="mt-3 border-t border-[#D9D6D1] pt-3 text-xs font-black uppercase text-[#C8102E]">
                          Changed from {original?.prediction} to{" "}
                          {prediction.prediction}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
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

function PredictionButtons({
  gameweek,
  selected,
  locked,
  onChange,
  fullWidth = false,
}: {
  gameweek: number;
  selected: PredictionValue;
  locked: boolean;
  onChange: (gameweek: number, newPrediction: PredictionValue) => void;
  fullWidth?: boolean;
}) {
  const options: PredictionValue[] = ["W", "D", "L"];

  return (
    <div className={`flex gap-2 ${fullWidth ? "w-full" : ""}`}>
      {options.map((option) => {
        const isSelected = selected === option;

        return (
          <button
            key={option}
            type="button"
            disabled={locked}
            onClick={() => onChange(gameweek, option)}
            className={`h-11 rounded-full border text-sm font-black transition ${
              fullWidth ? "flex-1" : "w-11"
            } ${predictionButtonClass(option, isSelected)} ${
              locked ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function predictionButtonClass(option: PredictionValue, isSelected: boolean) {
  if (!isSelected) {
    return "border-[#D9D6D1] bg-white text-[#111111] hover:border-[#C8102E]";
  }

  if (option === "W") {
    return "border-green-600 bg-green-600 text-white";
  }

  if (option === "L") {
    return "border-[#C8102E] bg-[#C8102E] text-white";
  }

  return "border-[#111111] bg-[#111111] text-white";
}