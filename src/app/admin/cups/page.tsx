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
  match_date: string | null;
  match_time: string | null;
  active: boolean;
};

type FixtureOption = {
  id: string;
  gameweek: number;
  gameweek_label: string;
  opponent_short: string;
  venue: "H" | "A";
  result_confirmed: boolean;
};

type CupSummary = {
  cup_competition_id: string;
  competition: string;
  display_name: string;
  prediction_count: number;
  with_actual_result: number;
  bonus_winners: number;
  actual_round_reached: string | null;
  awarded_gameweek: number | null;
  awarded_gameweek_label: string | null;
};

type JoinedTeam = {
  team_name: string;
  display_name: string | null;
};

type JoinedPlayer = {
  player_name: string;
  short_name: string | null;
  teams: JoinedTeam[] | JoinedTeam | null;
};

type CupPrediction = {
  id: string;
  player_id: string;
  competition: string;
  predicted_round_reached: string | null;
  actual_round_reached: string | null;
  bonus_awarded: number;
  cup_competition_id: string;
  awarded_gameweek: number | null;
  awarded_gameweek_label: string | null;
  players: JoinedPlayer[] | JoinedPlayer | null;
};

type SaveResult = {
  success?: boolean;
  message?: string;
  competition?: string;
  actual_round_reached?: string;
  updated_count?: number;
  bonus_count?: number;
};

type CupSetupResult = {
  success?: boolean;
  message?: string;
  display_name?: string;
  match_date?: string;
  match_time?: string;
  first_forest_match_at?: string;
  prediction_lock_at?: string;
};

type SetupSaveOutcome = {
  success: boolean;
  message?: string;
  selectedFixture: FixtureOption | null;
};

const domesticCupStageOptions = [
  "3rd Round",
  "4th Round",
  "5th Round",
  "Quarter Finals",
  "Semi Finals",
  "Final",
  "Winners",
];

const eflCupStageOptions = [
  "2nd Round",
  "3rd Round",
  "4th Round",
  "5th Round",
  "Quarter Finals",
  "Semi Finals",
  "Final",
  "Winners",
];

const europaLeagueStageOptions = [
  "League Phase",
  "Knockout/Playoff Round",
  "Round of 16",
  "Quarter Finals",
  "Semi Finals",
  "Final",
  "Winners",
];

const fallbackCupStageOptions = [
  "2nd Round",
  "3rd Round",
  "4th Round",
  "5th Round",
  "League Phase",
  "Knockout/Playoff Round",
  "Round of 16",
  "Quarter Finals",
  "Semi Finals",
  "Final",
  "Winners",
];

function getCupStageOptions(competition: CupCompetition, currentValue: string) {
  const name = `${competition.competition} ${competition.display_name}`.toLowerCase();

  let options: string[];

  if (name.includes("europa")) {
    options = europaLeagueStageOptions;
  } else if (name.includes("efl") || name.includes("carabao") || name.includes("league cup")) {
    options = eflCupStageOptions;
  } else if (name.includes("fa cup")) {
    options = domesticCupStageOptions;
  } else {
    options = fallbackCupStageOptions;
  }

  if (currentValue && !options.includes(currentValue)) {
    return [currentValue, ...options];
  }

  return options;
}

function formatDateTime(value: string | null) {
  if (!value) return "TBC";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function getLondonPartsFromIso(value: string | null) {
  if (!value) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  if (
    !byType.year ||
    !byType.month ||
    !byType.day ||
    !byType.hour ||
    !byType.minute
  ) {
    return null;
  }

  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    time: `${byType.hour}:${byType.minute}`,
  };
}

function normaliseTimeInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

function formatDraftLockTime(matchDate: string, matchTime: string) {
  if (!matchDate || !matchTime) return "TBC";

  const [year, month, day] = matchDate.split("-").map(Number);
  const [hour, minute] = matchTime.split(":").map(Number);

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return "TBC";
  }

  const previewDate = new Date(Date.UTC(year, month - 1, day, hour, minute - 5));

  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(previewDate)} UK time`;
}

function firstItem<T>(value: T[] | T | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function getJoinedPlayer(prediction: CupPrediction) {
  return firstItem(prediction.players);
}

function getJoinedTeam(prediction: CupPrediction) {
  const player = getJoinedPlayer(prediction);
  return firstItem(player?.teams);
}

function playerDisplayName(prediction: CupPrediction) {
  const player = getJoinedPlayer(prediction);
  return player?.short_name ?? player?.player_name ?? "Unknown player";
}

function teamDisplayName(prediction: CupPrediction) {
  const team = getJoinedTeam(prediction);
  return team?.display_name ?? team?.team_name ?? "No team";
}

function fixtureOptionLabel(fixture: FixtureOption) {
  return `${fixture.gameweek_label} — ${fixture.opponent_short} ${fixture.venue}`;
}

export default function AdminCupsPage() {
  const [competitions, setCompetitions] = useState<CupCompetition[]>([]);
  const [fixtures, setFixtures] = useState<FixtureOption[]>([]);
  const [predictions, setPredictions] = useState<CupPrediction[]>([]);
  const [draftResults, setDraftResults] = useState<Record<string, string>>({});
  const [draftAwardedGameweeks, setDraftAwardedGameweeks] = useState<
    Record<string, string>
  >({});
  const [draftMatchDates, setDraftMatchDates] = useState<Record<string, string>>({});
  const [draftMatchTimes, setDraftMatchTimes] = useState<Record<string, string>>({});
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

    const [
      { data: competitionData, error: competitionError },
      { data: fixtureData, error: fixtureError },
      { data: predictionData, error: predictionError },
    ] = await Promise.all([
      supabase
        .from("cup_competitions")
        .select("*")
        .eq("active", true)
        .order("competition", { ascending: true }),
      supabase
        .from("fixtures")
        .select("id, gameweek, gameweek_label, opponent_short, venue, result_confirmed")
        .order("gameweek", { ascending: true }),
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
          awarded_gameweek,
          awarded_gameweek_label,
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

    if (competitionError || fixtureError || predictionError) {
      setMessage({
        type: "error",
        text:
          competitionError?.message ??
          fixtureError?.message ??
          predictionError?.message ??
          "Could not load cup data.",
      });
      setLoading(false);
      return;
    }

    const loadedCompetitions = (competitionData ?? []) as CupCompetition[];
    const loadedFixtures = (fixtureData ?? []) as FixtureOption[];
    const loadedPredictions = (predictionData ?? []) as unknown as CupPrediction[];

    setCompetitions(loadedCompetitions);
    setFixtures(loadedFixtures);
    setPredictions(loadedPredictions);

    const nextResultDrafts: Record<string, string> = {};
    const nextAwardedGameweekDrafts: Record<string, string> = {};
    const nextMatchDateDrafts: Record<string, string> = {};
    const nextMatchTimeDrafts: Record<string, string> = {};

    for (const competition of loadedCompetitions) {
      const firstExistingPrediction = loadedPredictions.find(
        (prediction) => prediction.cup_competition_id === competition.id
      );

      const londonParts = getLondonPartsFromIso(competition.first_forest_match_at);

      nextResultDrafts[competition.id] =
        firstExistingPrediction?.actual_round_reached ?? "";

      nextAwardedGameweekDrafts[competition.id] =
        firstExistingPrediction?.awarded_gameweek === null ||
        firstExistingPrediction?.awarded_gameweek === undefined
          ? ""
          : String(firstExistingPrediction.awarded_gameweek);

      nextMatchDateDrafts[competition.id] =
        competition.match_date || londonParts?.date || "";

      nextMatchTimeDrafts[competition.id] =
        normaliseTimeInput(competition.match_time) || londonParts?.time || "";
    }

    setDraftResults(nextResultDrafts);
    setDraftAwardedGameweeks(nextAwardedGameweekDrafts);
    setDraftMatchDates(nextMatchDateDrafts);
    setDraftMatchTimes(nextMatchTimeDrafts);
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

      const awardedPrediction = competitionPredictions.find(
        (prediction) =>
          prediction.awarded_gameweek !== null &&
          prediction.awarded_gameweek !== undefined
      );

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
        awarded_gameweek: awardedPrediction?.awarded_gameweek ?? null,
        awarded_gameweek_label: awardedPrediction?.awarded_gameweek_label ?? null,
      };
    });
  }, [competitions, predictions]);

  function getSelectedFixtureForCompetition(competitionId: string) {
    const selectedGameweekValue = draftAwardedGameweeks[competitionId] ?? "";

    if (selectedGameweekValue === "") {
      return {
        selectedFixture: null,
        errorText: null,
      };
    }

    const selectedFixture =
      fixtures.find((fixture) => String(fixture.gameweek) === selectedGameweekValue) ??
      null;

    if (!selectedFixture) {
      return {
        selectedFixture: null,
        errorText: "Choose a valid gameweek for the cup bonus.",
      };
    }

    return {
      selectedFixture,
      errorText: null,
    };
  }

  async function saveCupSetupValues(
    competition: CupCompetition
  ): Promise<SetupSaveOutcome> {
    const matchDate = draftMatchDates[competition.id] ?? "";
    const matchTime = draftMatchTimes[competition.id] ?? "";

    if (!matchDate || !matchTime) {
      return {
        success: false,
        message: "Set the match date and match time before saving.",
        selectedFixture: null,
      };
    }

    const { selectedFixture, errorText } = getSelectedFixtureForCompetition(
      competition.id
    );

    if (errorText) {
      return {
        success: false,
        message: errorText,
        selectedFixture: null,
      };
    }

    const { data, error } = await supabase.rpc(
      "admin_update_cup_competition_settings",
      {
        target_cup_competition_id: competition.id,
        new_match_date: matchDate,
        new_match_time: matchTime,
        admin_email: "nffcstats@gmail.com",
      }
    );

    const setupResult = data as CupSetupResult | null;

    if (error || !setupResult?.success) {
      return {
        success: false,
        message:
          setupResult?.message ??
          error?.message ??
          "Could not save cup match date and time.",
        selectedFixture: null,
      };
    }

    const { error: awardedGameweekError } = await supabase
      .from("cup_predictions")
      .update({
        awarded_gameweek: selectedFixture?.gameweek ?? null,
        awarded_gameweek_label: selectedFixture?.gameweek_label ?? null,
      })
      .eq("cup_competition_id", competition.id);

    if (awardedGameweekError) {
      return {
        success: false,
        message: `Cup date/time saved, but bonus gameweek was not saved: ${awardedGameweekError.message}`,
        selectedFixture,
      };
    }

    return {
      success: true,
      selectedFixture,
    };
  }

  async function saveCupSetup(competition: CupCompetition) {
    setSavingKey(`setup:${competition.id}`);
    setMessage(null);

    const setupOutcome = await saveCupSetupValues(competition);

    setSavingKey(null);

    if (!setupOutcome.success) {
      setMessage({
        type: "error",
        text: setupOutcome.message ?? "Could not save cup setup.",
      });
      await loadCupData();
      return;
    }

    setMessage({
      type: "success",
      text: `${competition.display_name} setup saved. Prediction lock is 5 minutes before kick-off. Bonus added to ${
        setupOutcome.selectedFixture?.gameweek_label ?? "no GW total yet"
      }.`,
    });

    await loadCupData();
  }

  async function saveCupResult(competition: CupCompetition) {
    const selectedRound = draftResults[competition.id] ?? "";

    if (!selectedRound) {
      setMessage({
        type: "error",
        text: "Choose the actual round reached before saving the result.",
      });
      return;
    }

    setSavingKey(`result:${competition.id}`);
    setMessage(null);

    const setupOutcome = await saveCupSetupValues(competition);

    if (!setupOutcome.success) {
      setSavingKey(null);
      setMessage({
        type: "error",
        text: setupOutcome.message ?? "Could not save cup setup.",
      });
      await loadCupData();
      return;
    }

    const { data, error } = await supabase.rpc("admin_set_cup_result", {
      target_cup_competition_id: competition.id,
      new_actual_round_reached: selectedRound,
      admin_email: "nffcstats@gmail.com",
    });

    const result = data as SaveResult | null;

    setSavingKey(null);

    if (error || !result?.success) {
      setMessage({
        type: "error",
        text:
          result?.message ??
          error?.message ??
          "Cup setup saved, but the result could not be saved.",
      });
      await loadCupData();
      return;
    }

    setMessage({
      type: "success",
      text: `${competition.display_name} saved as ${selectedRound}. ${
        result.bonus_count ?? 0
      } bonus winners. Bonus added to ${
        setupOutcome.selectedFixture?.gameweek_label ?? "no GW total yet"
      }.`,
    });

    await loadCupData();
  }

  return (
    <main className="min-h-screen bg-[var(--nffc-black,#000000)] px-4 py-6 font-mono text-[var(--nffc-white,#f5f5f5)] sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-5 shadow-none md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex w-fit border-b-2 border-[var(--nffc-red,#e50914)] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[var(--nffc-red,#e50914)]">
                🔮 Admin
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-[var(--nffc-red,#e50914)] md:text-5xl">
                Cups
              </h1>
              <p className="mt-3 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
                Set cup match dates, automatic lock times, actual rounds reached and
                the GW total where Cup Specialist bonuses are added.
              </p>
            </div>

            <Link
              href="/admin"
              className="w-full rounded-none border border-[#111111] px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-[var(--nffc-white,#f5f5f5)] transition hover:border-[var(--nffc-red,#e50914)] hover:text-[var(--nffc-red,#e50914)] sm:w-fit"
            >
              Back to admin
            </Link>
          </div>
        </header>

        {message && (
          <div
            className={`mb-6 rounded-none border p-4 text-sm font-semibold ${
              message.type === "success"
                ? "border-[var(--stat-green,#22e55e)] bg-[var(--nffc-black,#000000)] text-[var(--stat-green,#22e55e)]"
                : "border-[var(--stat-wrong,#ff3030)] bg-[var(--nffc-black,#000000)] text-[var(--stat-wrong,#ff3030)]"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-6 text-xl font-black uppercase text-[var(--nffc-red,#e50914)] shadow-none">
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
              const matchDate = draftMatchDates[competition.id] ?? "";
              const matchTime = draftMatchTimes[competition.id] ?? "";
              const setupSaving = savingKey === `setup:${competition.id}`;
              const resultSaving = savingKey === `result:${competition.id}`;
              const currentRoundValue = draftResults[competition.id] ?? "";
              const cupRoundOptions = getCupStageOptions(
                competition,
                currentRoundValue
              );

              return (
                <div
                  key={competition.id}
                  className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none md:p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[0.8fr_1.4fr] xl:items-start">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-[var(--nffc-red,#e50914)]">
                        {competition.season}
                      </div>
                      <h2 className="mt-1 text-2xl font-black uppercase">
                        {competition.display_name}
                      </h2>
                      <div className="mt-2 grid gap-1 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
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

                    <div className="grid gap-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
                            Match date
                          </span>
                          <input
                            type="date"
                            value={matchDate}
                            onChange={(event) =>
                              setDraftMatchDates((current) => ({
                                ...current,
                                [competition.id]: event.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] px-4 py-3 text-base font-bold text-white outline-none focus:border-[var(--nffc-red,#e50914)]"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
                            Match time
                          </span>
                          <input
                            type="time"
                            value={matchTime}
                            onChange={(event) =>
                              setDraftMatchTimes((current) => ({
                                ...current,
                                [competition.id]: event.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] px-4 py-3 text-base font-bold text-white outline-none focus:border-[var(--nffc-red,#e50914)]"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
                            Add bonus to GW total
                          </span>
                          <select
                            value={draftAwardedGameweeks[competition.id] ?? ""}
                            onChange={(event) =>
                              setDraftAwardedGameweeks((current) => ({
                                ...current,
                                [competition.id]: event.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] px-4 py-3 text-base font-bold text-white outline-none focus:border-[var(--nffc-red,#e50914)]"
                          >
                            <option value="">Not applied yet</option>
                            {fixtures.map((fixture) => (
                              <option
                                key={fixture.id}
                                value={String(fixture.gameweek)}
                              >
                                {fixtureOptionLabel(fixture)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
                            Actual round reached
                          </span>
                          <select
                            value={currentRoundValue}
                            onChange={(event) =>
                              setDraftResults((current) => ({
                                ...current,
                                [competition.id]: event.target.value,
                              }))
                            }
                            className="mt-2 w-full rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] px-4 py-3 text-base font-bold text-white outline-none focus:border-[var(--nffc-red,#e50914)]"
                          >
                            <option value="">Choose round</option>
                            {cupRoundOptions.map((stage) => (
                              <option key={stage} value={stage}>
                                {stage}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] p-4 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
                        Prediction lock preview:{" "}
                        <span className="font-black text-[var(--nffc-red,#e50914)]">
                          {formatDraftLockTime(matchDate, matchTime)}
                        </span>
                        . The saved database lock is automatically calculated as 5
                        minutes before the match time.
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => saveCupSetup(competition)}
                          disabled={Boolean(savingKey)}
                          className="rounded-none border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[var(--nffc-white,#f5f5f5)] transition hover:border-[var(--nffc-red,#e50914)] hover:text-[var(--nffc-red,#e50914)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {setupSaving ? "Saving…" : "Save setup"}
                        </button>

                        <button
                          type="button"
                          onClick={() => saveCupResult(competition)}
                          disabled={Boolean(savingKey)}
                          className="rounded-none bg-[var(--nffc-red,#e50914)] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[var(--nffc-black,#000000)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {resultSaving ? "Saving…" : "Save result + bonuses"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCompetitionId(
                              expanded ? null : competition.id
                            )
                          }
                          disabled={Boolean(savingKey)}
                          className="rounded-none border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[var(--nffc-white,#f5f5f5)] transition hover:border-[var(--nffc-red,#e50914)] hover:text-[var(--nffc-red,#e50914)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {expanded ? "Hide players" : "Show players"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
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
                    <CupStat
                      label="Bonus GW total"
                      value={summary?.awarded_gameweek_label ?? "Not yet"}
                    />
                  </div>

                  <div className="mt-4 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] p-4 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
                    Save setup can be used before the cup result is known. Save
                    result + bonuses should be used when the actual round reached is
                    confirmed.
                  </div>

                  {expanded && (
                    <div className="mt-5 overflow-hidden rounded-none border border-[var(--nffc-white,#f5f5f5)]">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-[var(--nffc-black,#000000)] text-white">
                          <tr>
                            <th className="px-4 py-3">Player</th>
                            <th className="hidden px-4 py-3 md:table-cell">Team</th>
                            <th className="px-4 py-3">Prediction</th>
                            <th className="px-4 py-3">Actual</th>
                            <th className="px-4 py-3">Bonus</th>
                            <th className="hidden px-4 py-3 md:table-cell">
                              GW total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {competitionPredictions.length ? (
                            competitionPredictions.map((prediction) => (
                              <tr
                                key={prediction.id}
                                className="border-b border-[#242424] last:border-b-0"
                              >
                                <td className="px-4 py-3 font-black">
                                  {playerDisplayName(prediction)}
                                  <div className="text-xs font-semibold text-[var(--nffc-muted,#a7a7a7)] md:hidden">
                                    {teamDisplayName(prediction)}
                                  </div>
                                </td>
                                <td className="hidden px-4 py-3 font-semibold text-[var(--nffc-muted,#a7a7a7)] md:table-cell">
                                  {teamDisplayName(prediction)}
                                </td>
                                <td className="px-4 py-3 font-bold">
                                  {prediction.predicted_round_reached ?? "—"}
                                </td>
                                <td className="px-4 py-3 font-bold">
                                  {prediction.actual_round_reached ?? "—"}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-none px-3 py-1 text-xs font-black uppercase ${
                                      prediction.bonus_awarded > 0
                                        ? "bg-green-100 text-green-800"
                                        : "bg-neutral-100 text-[var(--nffc-muted,#a7a7a7)]"
                                    }`}
                                  >
                                    {prediction.bonus_awarded}
                                  </span>
                                </td>
                                <td className="hidden px-4 py-3 font-bold text-[var(--nffc-muted,#a7a7a7)] md:table-cell">
                                  {prediction.awarded_gameweek_label ?? "Not yet"}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="px-4 py-6 text-[var(--nffc-muted,#a7a7a7)]" colSpan={6}>
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
    <div className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-[var(--nffc-red,#e50914)]">{value}</div>
    </div>
  );
}