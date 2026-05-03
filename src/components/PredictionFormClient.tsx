"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type PredictionValue = "W" | "D" | "L";

type PlayerPageData = {
  found: boolean;
  player: {
    id: string;
    legacy_code: string;
    player_name: string;
    short_name: string | null;
    team_name: string;
    team_display_name: string | null;
    team_abbreviation: string | null;
    parent_podcast: string | null;
    parent_podcast_abbreviation: string | null;
    joined_gameweek: number;
  };
  projection: {
    actual_points_so_far: number;
    remaining_predicted_points: number;
    total_now_predicted: number;
    full_prediction_set_points: number;
  } | null;
  rankings: {
    individual_rank: number;
    individual_points: number;
    individual_accuracy_percentage: number;
    team_rank: number;
    team_points: number;
    team_clean_sweeps: number;
    team_blanks: number;
    individual_rank_out_of?: number | null;
    team_rank_out_of?: number | null;
  } | null;
  predictions: {
    fixture_id: string;
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
    id: string | null;
    competition: string;
    display_name: string;
    predicted_round_reached: string | null;
    actual_round_reached: string | null;
    bonus_awarded: number;
    prediction_lock_at: string | null;
    is_locked: boolean;
  }[];
  custom_answers: {
    id: string | null;
    question_key: string;
    question_text: string;
    answer: string | null;
    locked_at: string | null;
    is_locked: boolean;
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

type RankingTotals = {
  individualTotal: number | null;
  teamTotal: number | null;
};

type ChangedFixture = {
  gameweek: number;
  gameweek_label: string;
  opponent_short: string;
  venue: "H" | "A";
  old_prediction?: PredictionValue;
  new_prediction?: PredictionValue;
};

type ScoreRowWithRunning = ScoreBreakdownData["fixture_scores"][number] & {
  runningTotal: number;
};

type SeasonPredictionRow = PlayerPageData["predictions"][number] & {
  runningPredictedPoints: number;
  actualPoints: number | null;
  runningActualPoints: number | null;
  runningPointDelta: number | null;
};

const domesticCupStageOptions = [
  "1st Round",
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

const genericCupStageOptions = [
  "1st Round",
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

const confirmationEmailDelayMs = 3 * 60 * 1000;

function predictionToPoints(prediction: PredictionValue) {
  if (prediction === "W") return 3;
  if (prediction === "D") return 1;
  return 0;
}

function formatSignedNumber(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatMaybeSignedNumber(value: number | null) {
  if (value === null) return "—";
  if (value > 0) return `+${value}`;
  return String(value);
}

function isConfirmedPrediction(prediction: PlayerPageData["predictions"][number]) {
  return prediction.status === "finished" && prediction.forest_result !== null;
}

function formatRank(value: number | null | undefined, total?: number | null) {
  if (!value || value <= 0) return "—";
  if (total && total > 0) return `${value}/${total}`;
  return `${value}`;
}

function getCupStageOptions(competition: string, displayName?: string | null) {
  const label = `${competition} ${displayName ?? ""}`.toLowerCase();

  if (label.includes("europa league") || label.includes("uefa europa league")) {
    return europaLeagueStageOptions;
  }

  if (
    label.includes("fa cup") ||
    label.includes("efl cup") ||
    label.includes("carabao")
  ) {
    return domesticCupStageOptions;
  }

  return genericCupStageOptions;
}

export default function PredictionFormClient({
  token,
  initialData,
}: {
  token: string;
  initialData: PlayerPageData;
}) {
  const [predictions, setPredictions] = useState(initialData.predictions);
  const [extraData, setExtraData] = useState<ExtraPredictionsData | null>(null);
  const [scoreData, setScoreData] = useState<ScoreBreakdownData | null>(null);
  const [rankingTotals, setRankingTotals] = useState<RankingTotals>({
    individualTotal: initialData.rankings?.individual_rank_out_of ?? null,
    teamTotal: initialData.rankings?.team_rank_out_of ?? null,
  });
  const [savingFixtureId, setSavingFixtureId] = useState<string | null>(null);
  const [savingExtraKey, setSavingExtraKey] = useState<string | null>(null);
  const [showCompletedFixtures, setShowCompletedFixtures] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [emailMessage, setEmailMessage] = useState<{
    type: "success" | "error" | "pending";
    text: string;
  } | null>(null);

  const emailTimerRef = useRef<number | null>(null);
  const pendingChangedFixturesRef = useRef<Map<number, ChangedFixture>>(new Map());

  useEffect(() => {
    async function loadExtraPredictionsAndCounts() {
      const [
        { data: extras, error: extrasError },
        { data: scores, error: scoresError },
        { count: individualCount },
        { count: teamCount },
      ] = await Promise.all([
        supabase.rpc("get_player_extra_predictions", {
          target_token: token,
        }),
        supabase.rpc("get_player_score_breakdown", {
          target_token: token,
        }),
        supabase
          .from("individual_leaderboard")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("team_leaderboard")
          .select("*", { count: "exact", head: true }),
      ]);

      if (!extrasError && extras) {
        setExtraData(extras as ExtraPredictionsData);
      }

      if (!scoresError && scores) {
        setScoreData(scores as ScoreBreakdownData);
      }

      setRankingTotals({
        individualTotal:
          initialData.rankings?.individual_rank_out_of ??
          individualCount ??
          null,
        teamTotal:
          initialData.rankings?.team_rank_out_of ?? teamCount ?? null,
      });
    }

    loadExtraPredictionsAndCounts();
  }, [
    token,
    initialData.rankings?.individual_rank_out_of,
    initialData.rankings?.team_rank_out_of,
  ]);

  useEffect(() => {
    return () => {
      if (emailTimerRef.current) {
        window.clearTimeout(emailTimerRef.current);
      }
    };
  }, []);

  const seasonRows = useMemo<SeasonPredictionRow[]>(() => {
    const sortedPredictions = [...predictions].sort(
      (a, b) => a.gameweek - b.gameweek
    );

    return sortedPredictions.reduce<{
      rows: SeasonPredictionRow[];
      runningPredictedPoints: number;
      runningActualPoints: number;
    }>(
      (state, prediction) => {
        const nextRunningPredictedPoints =
          state.runningPredictedPoints + prediction.predicted_forest_points;

        const confirmed = isConfirmedPrediction(prediction);
        const actualPoints =
          confirmed && prediction.forest_result
            ? predictionToPoints(prediction.forest_result)
            : null;

        const nextRunningActualPoints =
          actualPoints !== null
            ? state.runningActualPoints + actualPoints
            : state.runningActualPoints;

        const nextRow: SeasonPredictionRow = {
          ...prediction,
          runningPredictedPoints: nextRunningPredictedPoints,
          actualPoints,
          runningActualPoints:
            actualPoints !== null ? nextRunningActualPoints : null,
          runningPointDelta:
            actualPoints !== null
              ? nextRunningActualPoints - nextRunningPredictedPoints
              : null,
        };

        return {
          rows: [...state.rows, nextRow],
          runningPredictedPoints: nextRunningPredictedPoints,
          runningActualPoints: nextRunningActualPoints,
        };
      },
      {
        rows: [],
        runningPredictedPoints: 0,
        runningActualPoints: 0,
      }
    ).rows;
  }, [predictions]);

  const completedSeasonRows = useMemo(
    () => seasonRows.filter((prediction) => isConfirmedPrediction(prediction)),
    [seasonRows]
  );

  const completedCount = completedSeasonRows.length;

  const visibleSeasonRows = useMemo(() => {
    if (showCompletedFixtures) return seasonRows;
    return seasonRows.filter((prediction) => !isConfirmedPrediction(prediction));
  }, [seasonRows, showCompletedFixtures]);

  const performanceStats = useMemo(() => {
    const correctCount = completedSeasonRows.filter(
      (prediction) => prediction.prediction === prediction.forest_result
    ).length;

    const actualPointsSoFar = completedSeasonRows.reduce((total, prediction) => {
      if (!prediction.forest_result) return total;
      return total + predictionToPoints(prediction.forest_result);
    }, 0);

    const predictedCompletedPoints = completedSeasonRows.reduce(
      (total, prediction) => total + predictionToPoints(prediction.prediction),
      0
    );

    const actualVsPredicted = actualPointsSoFar - predictedCompletedPoints;

    const accuracyPercentage =
      completedCount > 0 ? Math.round((correctCount / completedCount) * 100) : 0;

    return {
      correctCount,
      completedCount,
      actualPointsSoFar,
      predictedCompletedPoints,
      actualVsPredicted,
      accuracyPercentage,
    };
  }, [completedCount, completedSeasonRows]);

  const projection = useMemo(() => {
    const actualPoints = performanceStats.actualPointsSoFar;

    const remainingPredictedPoints = predictions.reduce((total, prediction) => {
      if (isConfirmedPrediction(prediction)) return total;
      return total + predictionToPoints(prediction.prediction);
    }, 0);

    const fullPredictionSetPoints = predictions.reduce(
      (total, prediction) => total + predictionToPoints(prediction.prediction),
      0
    );

    return {
      actual_points_so_far: actualPoints,
      remaining_predicted_points: remainingPredictedPoints,
      total_now_predicted: actualPoints + remainingPredictedPoints,
      full_prediction_set_points: fullPredictionSetPoints,
      actual_vs_predicted: performanceStats.actualVsPredicted,
    };
  }, [
    performanceStats.actualPointsSoFar,
    performanceStats.actualVsPredicted,
    predictions,
  ]);

  const scoreRows = useMemo<ScoreRowWithRunning[]>(() => {
    const sortedScores = [...(scoreData?.fixture_scores ?? [])].sort(
      (a, b) => a.gameweek - b.gameweek
    );

    return sortedScores.reduce<{
      rows: ScoreRowWithRunning[];
      runningTotal: number;
    }>(
      (state, score) => {
        const nextRunningTotal = state.runningTotal + score.total_points;

        return {
          rows: [
            ...state.rows,
            {
              ...score,
              runningTotal: nextRunningTotal,
            },
          ],
          runningTotal: nextRunningTotal,
        };
      },
      {
        rows: [],
        runningTotal: 0,
      }
    ).rows;
  }, [scoreData]);

  function scheduleConfirmationEmail(changedFixture?: ChangedFixture) {
    if (changedFixture) {
      const existing = pendingChangedFixturesRef.current.get(
        changedFixture.gameweek
      );

      pendingChangedFixturesRef.current.set(changedFixture.gameweek, {
        ...changedFixture,
        old_prediction: existing?.old_prediction ?? changedFixture.old_prediction,
        new_prediction: changedFixture.new_prediction,
      });
    }

    if (emailTimerRef.current) {
      window.clearTimeout(emailTimerRef.current);
    }

    setEmailMessage({
      type: "pending",
      text: "Confirmation email scheduled. It will send after 3 minutes with no further changes.",
    });

    emailTimerRef.current = window.setTimeout(() => {
      sendDelayedConfirmationEmail();
    }, confirmationEmailDelayMs);
  }

  async function sendDelayedConfirmationEmail() {
    const changedFixtures = Array.from(pendingChangedFixturesRef.current.values());

    try {
      setEmailMessage({
        type: "pending",
        text: "Sending confirmation email…",
      });

      const response = await fetch("/api/email/prediction-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          updatedBy: "player",
          changedFixtures,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        setEmailMessage({
          type: "error",
          text: result.message ?? "Could not send confirmation email.",
        });
        return;
      }

      pendingChangedFixturesRef.current.clear();

      setEmailMessage({
        type: "success",
        text: "Confirmation email sent.",
      });
    } catch (error) {
      setEmailMessage({
        type: "error",
        text:
          error instanceof Error
            ? `Could not send confirmation email: ${error.message}`
            : "Could not send confirmation email.",
      });
    }
  }

  async function updatePrediction(
    fixtureId: string,
    newPrediction: PredictionValue
  ) {
    const fixture = predictions.find(
      (prediction) => prediction.fixture_id === fixtureId
    );

    if (!fixture || fixture.is_locked || isConfirmedPrediction(fixture)) return;
    if (fixture.prediction === newPrediction) return;

    const oldPrediction = fixture.prediction;
    const oldPredictions = predictions;

    setPredictions((current) =>
      current.map((prediction) =>
        prediction.fixture_id === fixtureId
          ? {
              ...prediction,
              prediction: newPrediction,
              predicted_forest_points: predictionToPoints(newPrediction),
            }
          : prediction
      )
    );

    setSavingFixtureId(fixtureId);
    setMessage(null);

    const { data, error } = await supabase.rpc("player_update_prediction", {
      target_token: token,
      target_fixture_id: fixtureId,
      new_prediction: newPrediction,
    });

    setSavingFixtureId(null);

    if (error) {
      setPredictions(oldPredictions);
      setMessage({
        type: "error",
        text: "Could not save prediction. Please try again.",
      });
      return;
    }

    const result = data as { success?: boolean; message?: string } | null;

    if (!result?.success) {
      setPredictions(oldPredictions);
      setMessage({
        type: "error",
        text: result?.message ?? "Could not save prediction.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Prediction saved.",
    });

    scheduleConfirmationEmail({
      gameweek: fixture.gameweek,
      gameweek_label: fixture.gameweek_label,
      opponent_short: fixture.opponent_short,
      venue: fixture.venue,
      old_prediction: oldPrediction,
      new_prediction: newPrediction,
    });
  }

  async function updateCupPrediction(competition: string, newValue: string) {
    if (!extraData) return;

    const cup = extraData.cup_predictions.find(
      (item) => item.competition === competition
    );

    if (!cup || cup.is_locked) return;
    if ((cup.predicted_round_reached ?? "") === newValue) return;

    const oldData = extraData;

    setExtraData({
      ...extraData,
      cup_predictions: extraData.cup_predictions.map((item) =>
        item.competition === competition
          ? { ...item, predicted_round_reached: newValue }
          : item
      ),
    });

    setSavingExtraKey(`cup-${competition}`);
    setMessage(null);

    const { data, error } = await supabase.rpc("player_update_cup_prediction", {
      target_token: token,
      target_competition: competition,
      new_predicted_round_reached: newValue,
    });

    setSavingExtraKey(null);

    const result = data as { success?: boolean; message?: string } | null;

    if (error || !result?.success) {
      setExtraData(oldData);
      setMessage({
        type: "error",
        text: result?.message ?? "Could not save cup prediction.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Cup prediction saved.",
    });

    scheduleConfirmationEmail();
  }

  async function updateCustomAnswer(questionKey: string, newValue: string) {
    if (!extraData) return;

    const answer = extraData.custom_answers.find(
      (item) => item.question_key === questionKey
    );

    if (!answer || answer.is_locked) return;
    if ((answer.answer ?? "") === newValue) return;

    const oldData = extraData;

    setExtraData({
      ...extraData,
      custom_answers: extraData.custom_answers.map((item) =>
        item.question_key === questionKey
          ? { ...item, answer: newValue }
          : item
      ),
    });

    setSavingExtraKey(`custom-${questionKey}`);
    setMessage(null);

    const { data, error } = await supabase.rpc("player_update_custom_answer", {
      target_token: token,
      target_question_key: questionKey,
      new_answer: newValue,
    });

    setSavingExtraKey(null);

    const result = data as { success?: boolean; message?: string } | null;

    if (error || !result?.success) {
      setExtraData(oldData);
      setMessage({
        type: "error",
        text: result?.message ?? "Could not save answer.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Answer saved.",
    });

    scheduleConfirmationEmail();
  }

  const player = initialData.player;
  const rankings = initialData.rankings;
  const scoreSummary = scoreData?.summary;

  const individualRankLabel = formatRank(
    rankings?.individual_rank,
    rankingTotals.individualTotal
  );

  const teamRankLabel = formatRank(rankings?.team_rank, rankingTotals.teamTotal);

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#111111]">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                🔮 NFFC Podcast Prediction League
              </div>

              <h1 className="text-3xl font-black uppercase tracking-tight text-[#C8102E] sm:text-5xl">
                {player.short_name ?? player.player_name}
                <span className="block text-[#111111]">
                  {player.parent_podcast_abbreviation
                    ? `(${player.parent_podcast_abbreviation})`
                    : ""}
                </span>
              </h1>

              <p className="mt-4 text-base font-black leading-6 text-[#111111] sm:text-lg">
                {player.team_display_name ?? player.team_name}
                <span className="ml-2 text-sm font-black uppercase tracking-wide text-[#C8102E]">
                  Team rank {teamRankLabel}
                </span>
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/#leaderboards"
                  className="rounded-full bg-[#111111] px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
                >
                  View leaderboards
                </Link>

                <Link
                  href="/"
                  className="rounded-full border border-[#111111] px-5 py-3 text-xs font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E]"
                >
                  League homepage
                </Link>
              </div>
            </div>

            <div className="xl:min-w-[780px]">
              <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2 text-sm font-black uppercase tracking-wide text-[#111111]">
                <span>
                  Individual rank{" "}
                  <span className="text-[#C8102E]">{individualRankLabel}</span>
                </span>
                <span>
                  Individual points{" "}
                  <span className="text-[#C8102E]">
                    {rankings?.individual_points ?? 0}
                  </span>
                </span>
                <span>
                  Team rank <span className="text-[#C8102E]">{teamRankLabel}</span>
                </span>
                <span>
                  Team points{" "}
                  <span className="text-[#C8102E]">
                    {rankings?.team_points ?? 0}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <ProjectionStat
                  label="Forest actual"
                  value={projection.actual_points_so_far}
                />
                <ProjectionStat
                  label="Your remaining"
                  value={projection.remaining_predicted_points}
                />
                <ProjectionStat
                  label="Total now predicted"
                  value={projection.total_now_predicted}
                  highlight
                />
                <ProjectionStat
                  label="All picks total"
                  value={projection.full_prediction_set_points}
                />
                <ProjectionStat
                  label="League accuracy"
                  value={
                    performanceStats.completedCount > 0
                      ? `${performanceStats.accuracyPercentage}%`
                      : "N/A"
                  }
                />
                <ProjectionStat
                  label="Actual v predicted"
                  value={`${formatSignedNumber(projection.actual_vs_predicted)} pts`}
                />
              </div>
            </div>
          </div>
        </header>

        {message && (
          <div
            className={`mb-4 rounded-2xl border p-4 text-sm font-semibold ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {emailMessage && (
          <div
            className={`mb-4 rounded-2xl border p-4 text-sm font-semibold ${
              emailMessage.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : emailMessage.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-[#D9D6D1] bg-white text-neutral-700"
            }`}
          >
            {emailMessage.text}
          </div>
        )}

        <section className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase">
                Prediction League score
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Your awarded points from completed fixtures and cup bonuses.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-[#D9D6D1] bg-[#F7F6F2] px-4 py-2 text-xs font-black uppercase tracking-wide text-neutral-600">
                {scoreRows.length} scored GWs
              </div>

              <button
                type="button"
                onClick={() => setShowScoreBreakdown((current) => !current)}
                className="w-full rounded-full bg-[#111111] px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E] sm:w-fit"
              >
                {showScoreBreakdown ? "Hide score breakdown" : "Show score breakdown"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <ScoreStat
              label="Total score"
              value={scoreSummary?.total_points ?? 0}
              highlight
            />
            <ScoreStat label="Base" value={scoreSummary?.base_points ?? 0} />
            <ScoreStat label="Streaker" value={scoreSummary?.streak_bonus ?? 0} />
            <ScoreStat label="Maverick" value={scoreSummary?.maverick_bonus ?? 0} />
            <ScoreStat label="Rogue" value={scoreSummary?.rogue_bonus ?? 0} />
            <ScoreStat label="Cup" value={scoreSummary?.cup_bonus ?? 0} />
          </div>

          {showScoreBreakdown && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#D9D6D1]">
              <div className="hidden xl:block">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[#111111] text-white">
                    <tr>
                      <th className="px-4 py-3">GW</th>
                      <th className="px-4 py-3">Fixture</th>
                      <th className="px-4 py-3 text-center">Pick</th>
                      <th className="px-4 py-3 text-center">Result</th>
                      <th className="px-4 py-3">Breakdown</th>
                      <th className="px-4 py-3 text-center">GW total</th>
                      <th className="px-4 py-3 text-center">Running</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreRows.length ? (
                      scoreRows.map((score) => (
                        <tr
                          key={`${score.gameweek}-${score.opponent_short}`}
                          className="border-b border-[#E7E2DA] last:border-b-0"
                        >
                          <td className="px-4 py-4 text-xl font-black text-[#C8102E]">
                            {score.gameweek_label}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-lg font-black tracking-tight text-[#111111]">
                              {score.opponent_short} {score.venue}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <MiniPrediction value={score.prediction} />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <MiniPrediction value={score.actual_result} />
                          </td>
                          <td className="px-4 py-4">
                            <BreakdownPills score={score} />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <ScoreValuePill value={score.total_points} variant="gw" />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <ScoreValuePill
                              value={score.runningTotal}
                              variant="running"
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-6 text-neutral-600" colSpan={7}>
                          No scored fixtures yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 bg-[#F7F6F2] p-3 xl:hidden">
                {scoreRows.length ? (
                  scoreRows.map((score) => (
                    <div
                      key={`${score.gameweek}-${score.opponent_short}`}
                      className="rounded-2xl border border-[#D9D6D1] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                            {score.gameweek_label}
                          </div>
                          <div className="mt-1 text-xl font-black tracking-tight">
                            {score.opponent_short} {score.venue}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-black uppercase tracking-wide text-neutral-500">
                            Running
                          </div>
                          <div className="mt-1">
                            <ScoreValuePill
                              value={score.runningTotal}
                              variant="running"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <MiniPrediction value={score.prediction} />
                        <span className="text-sm font-bold text-neutral-500">Pick</span>
                        <MiniPrediction value={score.actual_result} />
                        <span className="text-sm font-bold text-neutral-500">
                          Result
                        </span>
                      </div>

                      <div className="mt-4">
                        <BreakdownPills score={score} />
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#E7E2DA] bg-[#F7F6F2] px-4 py-3">
                        <div className="text-xs font-black uppercase tracking-wide text-neutral-500">
                          GW total
                        </div>
                        <ScoreValuePill value={score.total_points} variant="gw" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[#D9D6D1] bg-white p-4 text-sm text-neutral-600">
                    No scored fixtures yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase">Season predictions</h2>
              <p className="text-sm text-neutral-600">
                Tap W, D or L to update. W = Forest win · D = draw · L = Forest loss.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <div className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
                {visibleSeasonRows.length} shown / {seasonRows.length} fixtures
              </div>

              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCompletedFixtures((current) => !current)}
                  className="rounded-full bg-[#111111] px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
                >
                  {showCompletedFixtures
                    ? "Hide confirmed results"
                    : `Show ${completedCount} confirmed results`}
                </button>
              )}
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[#D9D6D1] lg:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#111111] text-white">
                <tr>
                  <th className="px-4 py-3">GW</th>
                  <th className="px-4 py-3">Fixture</th>
                  <th className="bg-[#2A1D1D] px-4 py-3 text-center">
                    Make your prediction
                  </th>
                  <th className="px-4 py-3 text-center">Predicted points</th>
                  <th className="px-4 py-3 text-center">Predicted total</th>
                  <th className="px-4 py-3 text-center">Actual points</th>
                  <th className="px-4 py-3 text-center">Actual total</th>
                  <th className="px-4 py-3 text-center">+/-</th>
                  <th className="px-4 py-3 text-center">Correct</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleSeasonRows.map((prediction) => {
                  const confirmed = isConfirmedPrediction(prediction);
                  const correct =
                    confirmed && prediction.prediction === prediction.forest_result;

                  return (
                    <tr
                      key={prediction.fixture_id}
                      className={`border-b border-[#E7E2DA] last:border-b-0 ${
                        prediction.is_locked || confirmed ? "bg-neutral-50" : ""
                      }`}
                    >
                      <td className="px-4 py-4 text-lg font-black">
                        {prediction.gameweek_label}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-lg font-black tracking-tight text-[#111111]">
                          {prediction.opponent_short} {prediction.venue}
                        </div>
                      </td>
                      <td className="bg-[#FFF4F4] px-4 py-4 text-center ring-1 ring-inset ring-red-100">
                        <PredictionButtons
                          fixtureId={prediction.fixture_id}
                          selected={prediction.prediction}
                          locked={prediction.is_locked || confirmed}
                          saving={savingFixtureId === prediction.fixture_id}
                          onChange={updatePrediction}
                        />
                      </td>
                      <td className="px-4 py-4 text-center text-base font-black">
                        {prediction.predicted_forest_points}
                      </td>
                      <td className="px-4 py-4 text-center text-base font-black text-neutral-700">
                        {prediction.runningPredictedPoints}
                      </td>
                      <td className="px-4 py-4 text-center text-base font-black">
                        {prediction.actualPoints ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-center text-base font-black text-neutral-700">
                        {prediction.runningActualPoints ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <DeltaPill value={prediction.runningPointDelta} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        {confirmed ? (
                          <CorrectCircle correct={correct} />
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge
                          locked={prediction.is_locked}
                          confirmed={confirmed}
                          status={prediction.status}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {visibleSeasonRows.map((prediction) => {
              const confirmed = isConfirmedPrediction(prediction);
              const correct =
                confirmed && prediction.prediction === prediction.forest_result;

              return (
                <div
                  key={prediction.fixture_id}
                  className={`rounded-2xl border p-4 ${
                    prediction.is_locked || confirmed
                      ? "border-neutral-300 bg-neutral-100"
                      : "border-[#D9D6D1] bg-[#F7F6F2]"
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                        {prediction.gameweek_label}
                      </div>
                      <div className="mt-1 text-xl font-black tracking-tight">
                        {prediction.opponent_short} {prediction.venue}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge
                        locked={prediction.is_locked}
                        confirmed={confirmed}
                        status={prediction.status}
                      />

                      {confirmed && <CorrectCircle correct={correct} />}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-red-100 bg-[#FFF4F4] p-3">
                    <div className="mb-2 text-xs font-black uppercase tracking-wide text-[#C8102E]">
                      Make your prediction
                    </div>
                    <PredictionButtons
                      fixtureId={prediction.fixture_id}
                      selected={prediction.prediction}
                      locked={prediction.is_locked || confirmed}
                      saving={savingFixtureId === prediction.fixture_id}
                      onChange={updatePrediction}
                      fullWidth
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold">
                    <MiniStat
                      label="Predicted"
                      value={prediction.predicted_forest_points}
                    />
                    <MiniStat
                      label="Predicted total"
                      value={prediction.runningPredictedPoints}
                    />
                    <MiniStat label="Actual" value={prediction.actualPoints ?? "—"} />
                    <MiniStat
                      label="Actual total"
                      value={prediction.runningActualPoints ?? "—"}
                    />
                    <MiniStat
                      label="+/-"
                      value={formatMaybeSignedNumber(prediction.runningPointDelta)}
                      tone={deltaTone(prediction.runningPointDelta)}
                    />
                    <MiniStat
                      label="Correct"
                      value={confirmed ? (correct ? "✓" : "×") : "—"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
            <h2 className="text-2xl font-black uppercase">Cup predictions</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Locks 5 minutes before Forest&apos;s first match in each cup.
            </p>

            <div className="mt-5 grid gap-3">
              {extraData?.cup_predictions?.length ? (
                extraData.cup_predictions.map((cup) => {
                  const stageOptions = getCupStageOptions(
                    cup.competition,
                    cup.display_name
                  );

                  return (
                    <div
                      key={cup.competition}
                      className={`rounded-2xl border p-4 ${
                        cup.is_locked
                          ? "border-neutral-300 bg-neutral-100"
                          : "border-[#D9D6D1] bg-[#F7F6F2]"
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-4">
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                          {cup.display_name ?? cup.competition}
                        </div>
                        {cup.is_locked && (
                          <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold uppercase text-neutral-700">
                            Locked
                          </span>
                        )}
                      </div>

                      <select
                        value={cup.predicted_round_reached ?? ""}
                        disabled={
                          cup.is_locked || savingExtraKey === `cup-${cup.competition}`
                        }
                        onChange={(event) =>
                          updateCupPrediction(cup.competition, event.target.value)
                        }
                        className="w-full rounded-xl border border-[#D9D6D1] bg-white px-3 py-3 text-base font-bold text-[#111111] disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
                      >
                        <option value="">No prediction</option>
                        {stageOptions.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <InlineInfoPill
                          label="Bonus"
                          value={String(cup.bonus_awarded)}
                          tone={
                            cup.bonus_awarded > 0
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-[#D9D6D1] bg-white text-neutral-600"
                          }
                        />
                        <InlineInfoPill
                          label="Actual"
                          value={cup.actual_round_reached ?? "Not decided"}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm text-neutral-600">
                  Cup predictions loading or not available.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
            <h2 className="text-2xl font-black uppercase">Other predictions</h2>
            <p className="mt-1 text-sm text-neutral-600">
              These questions can be manually locked by the admin.
            </p>

            <div className="mt-5 grid gap-3">
              {extraData?.custom_answers?.length ? (
                extraData.custom_answers.map((answer) => (
                  <div
                    key={answer.question_key}
                    className={`rounded-2xl border p-4 ${
                      answer.is_locked
                        ? "border-neutral-300 bg-neutral-100"
                        : "border-[#D9D6D1] bg-[#F7F6F2]"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-[#C8102E]">
                        {answer.question_text}
                      </div>
                      {answer.is_locked && (
                        <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold uppercase text-neutral-700">
                          Locked
                        </span>
                      )}
                    </div>

                    <textarea
                      value={answer.answer ?? ""}
                      disabled={
                        answer.is_locked ||
                        savingExtraKey === `custom-${answer.question_key}`
                      }
                      onChange={(event) =>
                        updateCustomAnswer(answer.question_key, event.target.value)
                      }
                      rows={3}
                      className="w-full rounded-xl border border-[#D9D6D1] bg-white px-3 py-3 text-base font-semibold leading-7 text-[#111111] disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500"
                      placeholder="No answer"
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm text-neutral-600">
                  Other predictions loading or not available.
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function ProjectionStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-[#C8102E] bg-[#C8102E] text-white"
          : "border-[#D9D6D1] bg-[#F7F6F2] text-[#111111]"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black">{value}</div>
    </div>
  );
}

function ScoreStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-[#111111] bg-[#111111] text-white"
          : "border-[#D9D6D1] bg-[#F7F6F2] text-[#111111]"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black">{value}</div>
    </div>
  );
}

function BreakdownPills({
  score,
}: {
  score: ScoreBreakdownData["fixture_scores"][number];
}) {
  const parts = [
    score.base_points > 0
      ? {
          label: "base",
          value: score.base_points,
          tone: "border-[#D9D6D1] bg-white text-[#111111]",
        }
      : null,
    score.streak_bonus > 0
      ? {
          label: "streak",
          value: score.streak_bonus,
          tone: "border-amber-200 bg-amber-50 text-amber-700",
        }
      : null,
    score.maverick_bonus > 0
      ? {
          label: "maverick",
          value: score.maverick_bonus,
          tone: "border-green-200 bg-green-50 text-green-700",
        }
      : null,
    score.rogue_bonus > 0
      ? {
          label: "rogue",
          value: score.rogue_bonus,
          tone: "border-purple-200 bg-purple-50 text-purple-700",
        }
      : null,
    score.cup_bonus > 0
      ? {
          label: "cup",
          value: score.cup_bonus,
          tone: "border-red-200 bg-red-50 text-[#C8102E]",
        }
      : null,
  ].filter(Boolean) as {
    label: string;
    value: number;
    tone: string;
  }[];

  if (!parts.length) {
    return (
      <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-neutral-500">
        0
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {parts.map((part) => (
        <span
          key={part.label}
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${part.tone}`}
        >
          {part.value} {part.label}
        </span>
      ))}
    </div>
  );
}

function ScoreValuePill({
  value,
  variant,
}: {
  value: number;
  variant: "gw" | "running";
}) {
  if (variant === "gw") {
    const gwTone =
      value > 0
        ? "border-green-200 bg-green-50 text-green-700"
        : "border-red-200 bg-red-50 text-red-700";

    return (
      <span
        className={`inline-flex min-w-[64px] items-center justify-center rounded-xl border px-3 py-2 text-xl font-black ${gwTone}`}
      >
        {value}
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-[64px] items-center justify-center rounded-xl border border-[#111111] bg-[#111111] px-3 py-2 text-xl font-black text-white">
      {value}
    </span>
  );
}

function InlineInfoPill({
  label,
  value,
  tone = "border-[#D9D6D1] bg-white text-[#111111]",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${tone}`}
    >
      <span className="opacity-60">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function DeltaPill({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="inline-flex min-w-[58px] items-center justify-center rounded-full border border-[#D9D6D1] bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-neutral-500">
        —
      </span>
    );
  }

  const tone =
    value > 0
      ? "border-green-200 bg-green-50 text-green-700"
      : value < 0
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-[#D9D6D1] bg-white text-neutral-700";

  return (
    <span
      className={`inline-flex min-w-[58px] items-center justify-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${tone}`}
    >
      {formatMaybeSignedNumber(value)}
    </span>
  );
}

function deltaTone(value: number | null) {
  if (value === null) return "border-[#E7E2DA] bg-white text-neutral-500";
  if (value > 0) return "border-green-200 bg-green-50 text-green-700";
  if (value < 0) return "border-red-200 bg-red-50 text-red-700";
  return "border-[#D9D6D1] bg-white text-neutral-700";
}

function MiniPrediction({ value }: { value: PredictionValue }) {
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white ${predictionMiniClass(
        value
      )}`}
    >
      {value}
    </span>
  );
}

function predictionMiniClass(value: PredictionValue) {
  if (value === "W") return "bg-green-600";
  if (value === "L") return "bg-[#C8102E]";
  return "bg-[#111111]";
}

function CorrectCircle({ correct }: { correct: boolean }) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-black text-white ${
        correct ? "bg-green-600" : "bg-[#C8102E]"
      }`}
    >
      {correct ? "✓" : "×"}
    </span>
  );
}

function PredictionButtons({
  fixtureId,
  selected,
  locked,
  saving,
  onChange,
  fullWidth = false,
}: {
  fixtureId: string;
  selected: PredictionValue;
  locked: boolean;
  saving: boolean;
  onChange: (fixtureId: string, newPrediction: PredictionValue) => void;
  fullWidth?: boolean;
}) {
  const options: PredictionValue[] = ["W", "D", "L"];

  return (
    <div className={`flex justify-center gap-2 ${fullWidth ? "w-full" : ""}`}>
      {options.map((option) => {
        const isSelected = selected === option;

        return (
          <button
            key={option}
            type="button"
            disabled={locked || saving}
            onClick={() => onChange(fixtureId, option)}
            className={`h-11 rounded-full border text-sm font-black transition ${
              fullWidth ? "flex-1" : "w-11"
            } ${predictionButtonClass(option, isSelected)} ${
              locked || saving
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            }`}
          >
            {saving && isSelected ? "…" : option}
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

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 text-center ${
        tone ?? "border-[#E7E2DA] bg-white text-[#111111]"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

function StatusBadge({
  locked,
  confirmed,
  status,
}: {
  locked: boolean;
  confirmed: boolean;
  status: string;
}) {
  if (confirmed) {
    return (
      <span className="rounded-full bg-[#111111] px-3 py-1 text-xs font-bold uppercase text-white">
        Confirmed
      </span>
    );
  }

  if (locked) {
    return (
      <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold uppercase text-neutral-700">
        Locked
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase text-[#C8102E]">
      {status}
    </span>
  );
}