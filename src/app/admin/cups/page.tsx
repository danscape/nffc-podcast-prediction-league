"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type CupCompetition = {
  id: string;
  season: string;
  competition: string;
  display_name: string;
  first_forest_match_at: string | null;
  prediction_lock_at: string | null;
  active: boolean;
};

type CupSummary = {
  cup_competition_id: string;
  competition: string;
  display_name: string;
  prediction_count: number;
  with_actual_result: number;
  bonus_winners: number;
  actual_round_reached: string | null;
};

type CupPrediction = {
  id: string;
  player_id: string;
  competition: string;
  predicted_round_reached: string | null;
  actual_round_reached: string | null;
  bonus_awarded: number;
  cup_competition_id: string;
  players: {
    player_name: string;
    short_name: string | null;
    teams: {
      team_name: string;
      display_name: string | null;
    } | null;
  } | null;
};

type SaveResult = {
  success?: boolean;
  message?: string;
  competition?: string;
  actual_round_reached?: string;
  updated_count?: number;
  bonus_count?: number;
};

const cupStageOptions = [
  "1st Round",
  "2nd Round",
  "3rd Round",
  "4th Round",
  "5th Round",
  "Quarter Finals",
  "Semi Finals",
  "Final",
  "Winners",
  "League Phase",
  "Knockout/Playoff Round",
  "Last 16",
];

function formatDateTime(value: string | null) {
  if (!value) return "TBC";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function playerDisplayName(prediction: CupPrediction) {
  return (
    prediction.players?.short_name ??
    prediction.players?.player_name ??
    "Unknown player"
  );
}

function teamDisplayName(prediction: CupPrediction) {
  return (
    prediction.players?.teams?.display_name ??
    prediction.players?.teams?.team_name ??
    "No team"
  );
}

export default function AdminCupsPage() {
  const [competitions, setCompetitions] = useState<CupCompetition[]>([]);
  const [predictions, setPredictions] = useState<CupPrediction[]>([]);
  const [draftResults, setDraftResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [expandedCompetitionId, setExpandedCompetitionId] = useState<string | null>(
    null
  );
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadCupData();
  }, []);

  async function loadCupData() {
    setLoading(true);
    setMessage(null);

    const [{ data: competitionData, error: competitionError }, { data: predictionData, error: predictionError }] =
      await Promise.all([
        supabase
          .from("cup_competitions")
          .select("*")
          .eq("active", true)
          .order("competition", { ascending: true }),
        supabase
          .from("cup_predictions")
          .select(
            `
            id,
            player_id,
            competition,
            predicted_round_reached,
            actual_round_reached,
            bonus_awarded,
            cup_competition_id,
            players (
              player_name,
              short_name,
              teams (
                team_name,
                display_name
              )
            )
          `
          )
          .order("competition", { ascending: true }),
      ]);

    if (competitionError || predictionError) {
      setMessage({
        type: "error",
        text:
          competitionError?.message ??
          predictionError?.message ??
          "Could not load cup data.",
      });
      setLoading(false);
      return;
    }

    const loadedCompetitions = (competitionData ?? []) as CupCompetition[];
    const loadedPredictions = (predictionData ?? []) as CupPrediction[];

    setCompetitions(loadedCompetitions);
    setPredictions(loadedPredictions);

    const nextDrafts: Record<string, string> = {};

    for (const competition of loadedCompetitions) {
      const firstExistingResult =
        loadedPredictions.find(
          (prediction) =>
            prediction.cup_competition_id === competition.id &&
            prediction.actual_round_reached
        )?.actual_round_reached ?? "";

      nextDrafts[competition.id] = firstExistingResult;
    }

    setDraftResults(nextDrafts);
    setLoading(false);
  }

  const summaries = useMemo<CupSummary[]>(() => {
    return competitions.map((competition) => {
      const competitionPredictions = predictions.filter(
        (prediction) => prediction.cup_competition_id === competition.id
      );

      const actualRound =
        competitionPredictions.find((prediction) => prediction.actual_round_reached)
          ?.actual_round_reached ?? null;

      return {
        cup_competition_id: competition.id,
        competition: competition.competition,
        display_name: competition.display_name,
        prediction_count: competitionPredictions.length,
        with_actual_result: competitionPredictions.filter(
          (prediction) => prediction.actual_round_reached
        ).length,
        bonus_winners: competitionPredictions.filter(
          (prediction) => prediction.bonus_awarded > 0
        ).length,
        actual_round_reached: actualRound,
      };
    });
  }, [competitions, predictions]);

  async function saveCupResult(competition: CupCompetition) {
    const selectedRound = draftResults[competition.id] ?? "";

    if (!selectedRound) {
      setMessage({
        type: "error",
        text: "Choose the actual round reached before saving.",
      });
      return;
    }

    setSavingKey(competition.id);
    setMessage(null);

    const { data, error } = await supabase.rpc("admin_set_cup_result", {
      target_cup_competition_id: competition.id,
      new_actual_round_reached: selectedRound,
      admin_email: "nffcstats@gmail.com",
    });

    setSavingKey(null);

    const result = data as SaveResult | null;

    if (error || !result?.success) {
      setMessage({
        type: "error",
        text: result?.message ?? error?.message ?? "Could not save cup result.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: `${competition.display_name} saved as ${selectedRound}. ${result.bonus_count ?? 0} bonus winners.`,
    });

    await loadCupData();
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
                Cups
              </h1>
              <p className="mt-3 text-sm font-semibold text-neutral-600">
                Set actual cup rounds reached and award Cup Specialist bonuses.
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

        {loading ? (
          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-6 text-xl font-black uppercase text-[#C8102E] shadow-sm">
            Loading cup data…
          </div>
        ) : (
          <section className="grid gap-4">
            {competitions.map((competition) => {
              const summary = summaries.find(
                (item) => item.cup_competition_id === competition.id
              );

              const competitionPredictions = predictions.filter(
                (prediction) => prediction.cup_competition_id === competition.id
              );

              const expanded = expandedCompetitionId === competition.id;

              return (
                <div
                  key={competition.id}
                  className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-end">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                        {competition.season}
                      </div>
                      <h2 className="mt-1 text-2xl font-black uppercase">
                        {competition.display_name}
                      </h2>
                      <div className="mt-2 grid gap-1 text-sm font-semibold text-neutral-600">
                        <div>
                          First Forest match:{" "}
                          {formatDateTime(competition.first_forest_match_at)}
                        </div>
                        <div>
                          Prediction lock:{" "}
                          {formatDateTime(competition.prediction_lock_at)}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                      <label className="block">
                        <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
                          Actual round reached
                        </span>
                        <select
                          value={draftResults[competition.id] ?? ""}
                          onChange={(event) =>
                            setDraftResults((current) => ({
                              ...current,
                              [competition.id]: event.target.value,
                            }))
                          }
                          className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
                        >
                          <option value="">Choose round</option>
                          {cupStageOptions.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage}
                            </option>
                          ))}
                        </select>
                      </label>

                      <button
                        type="button"
                        onClick={() => saveCupResult(competition)}
                        disabled={savingKey === competition.id}
                        className="rounded-full bg-[#C8102E] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingKey === competition.id ? "Saving…" : "Save result"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCompetitionId(expanded ? null : competition.id)
                        }
                        className="rounded-full border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E]"
                      >
                        {expanded ? "Hide players" : "Show players"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <CupStat
                      label="Predictions"
                      value={summary?.prediction_count ?? 0}
                    />
                    <CupStat
                      label="Actual set"
                      value={summary?.with_actual_result ?? 0}
                    />
                    <CupStat
                      label="Bonus winners"
                      value={summary?.bonus_winners ?? 0}
                    />
                    <CupStat
                      label="Current result"
                      value={summary?.actual_round_reached ?? "Not set"}
                    />
                  </div>

                  {expanded && (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-[#D9D6D1]">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-[#111111] text-white">
                          <tr>
                            <th className="px-4 py-3">Player</th>
                            <th className="hidden px-4 py-3 md:table-cell">Team</th>
                            <th className="px-4 py-3">Prediction</th>
                            <th className="px-4 py-3">Bonus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competitionPredictions.length ? (
                            competitionPredictions.map((prediction) => (
                              <tr
                                key={prediction.id}
                                className="border-b border-[#E7E2DA] last:border-b-0"
                              >
                                <td className="px-4 py-3 font-black">
                                  {playerDisplayName(prediction)}
                                  <div className="text-xs font-semibold text-neutral-500 md:hidden">
                                    {teamDisplayName(prediction)}
                                  </div>
                                </td>
                                <td className="hidden px-4 py-3 font-semibold text-neutral-600 md:table-cell">
                                  {teamDisplayName(prediction)}
                                </td>
                                <td className="px-4 py-3 font-bold">
                                  {prediction.predicted_round_reached ?? "—"}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                                      prediction.bonus_awarded > 0
                                        ? "bg-green-100 text-green-800"
                                        : "bg-neutral-100 text-neutral-600"
                                    }`}
                                  >
                                    {prediction.bonus_awarded}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="px-4 py-6 text-neutral-600" colSpan={4}>
                                No cup predictions found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
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

function CupStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
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