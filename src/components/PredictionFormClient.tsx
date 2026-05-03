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
    gw1_predicted_points?: number | null;
    pre_gw1_predicted_points?: number | null;
    initial_predicted_points?: number | null;
    baseline_predicted_points?: number | null;
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

function isConfirmedPrediction(prediction: PlayerPageData["predictions"][number]) {
  return prediction.status === "finished" && prediction.forest_result !== null;
}

function formatRank(value: number | null | undefined, total?: number | null) {
  if (!value || value <= 0) return "—";
  if (total && total > 0) return `${value}/${total}`;
  return `${value}`;
}

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1).replace(".0", "");
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${Math.round(Number(value))}%`;
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

function getGw1PredictedPoints(projection: PlayerPageData["projection"]) {
  if (!projection) return null;

  return (
    projection.gw1_predicted_points ??
    projection.pre_gw1_predicted_points ??
    projection.initial_predicted_points ??
    projection.baseline_predicted_points ??
    null
  );
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
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [showCupPredictions, setShowCupPredictions] = useState(false);
  const [showOtherPredictions, setShowOtherPredictions] = useState(false);
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

  const sortedPredictions = useMemo(() => {
    return [...predictions].sort((a, b) => a.gameweek - b.gameweek);
  }, [predictions]);

  const openPredictions = useMemo(() => {
    return sortedPredictions.filter((prediction) => {
      return !prediction.is_locked && !isConfirmedPrediction(prediction);
    });
  }, [sortedPredictions]);

  const completedPredictions = useMemo(() => {
    return sortedPredictions.filter((prediction) => isConfirmedPrediction(prediction));
  }, [sortedPredictions]);

  const performanceStats = useMemo(() => {
    const correctCount = completedPredictions.filter(
      (prediction) => prediction.prediction === prediction.forest_result
    ).length;

    const actualPointsSoFar = completedPredictions.reduce((total, prediction) => {
      if (!prediction.forest_result) return total;
      return total + predictionToPoints(prediction.forest_result);
    }, 0);

    const predictedCompletedPoints = completedPredictions.reduce(
      (total, prediction) => total + predictionToPoints(prediction.prediction),
      0
    );

    const actualVsPredicted = actualPointsSoFar - predictedCompletedPoints;

    const accuracyPercentage =
      completedPredictions.length > 0
        ? Math.round((correctCount / completedPredictions.length) * 100)
        : null;

    return {
      correctCount,
      completedCount: completedPredictions.length,
      actualPointsSoFar,
      predictedCompletedPoints,
      actualVsPredicted,
      accuracyPercentage,
    };
  }, [completedPredictions]);

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
      gw1_predicted_points: getGw1PredictedPoints(initialData.projection),
    };
  }, [
    initialData.projection,
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
  const playerDisplayName = player.short_name ?? player.player_name;
  const teamDisplayName = player.team_display_name ?? player.team_name;
  const scoreTotal = scoreSummary?.total_points ?? rankings?.individual_points ?? 0;

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#111111]">
      <section className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:py-6">
        <header className="mb-4 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-1.5 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#C8102E]">
            🔮 NFFC Podcast Prediction League
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-[#C8102E] sm:text-4xl">
                {playerDisplayName}
              </h1>
              <p className="mt-2 text-base font-black text-[#111111]">
                {teamDisplayName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:w-fit">
              <Link
                href="/#leaderboards"
                className="rounded-full bg-[#111111] px-4 py-2.5 text-center text-[0.68rem] font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
              >
                Leaderboards
              </Link>

              <Link
                href="/"
                className="rounded-full border border-[#111111] px-4 py-2.5 text-center text-[0.68rem] font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E]"
              >
                Homepage
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
            <TopStat label="Rank" value={individualRankLabel} />
            <TopStat label="Score" value={formatPoints(scoreTotal)} highlight />
            <TopStat
              label="Accuracy"
              value={formatPercent(
                performanceStats.accuracyPercentage ??
                  rankings?.individual_accuracy_percentage
              )}
            />
            <TopStat label="Team rank" value={teamRankLabel} />
            <TopStat label="Team score" value={formatPoints(rankings?.team_points)} />
          </div>
        </header>

        {message && (
          <AlertMessage type={message.type} text={message.text} />
        )}

        {emailMessage && (
          <AlertMessage type={emailMessage.type} text={emailMessage.text} />
        )}

        <section className="mb-4 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4">
            <h2 className="text-2xl font-black uppercase">Your Predictions</h2>
            <p className="mt-1 text-sm font-semibold text-neutral-600">
              Select W, D or L for each unlocked fixture.
            </p>
          </div>

          <div className="grid gap-2">
            {openPredictions.length ? (
              openPredictions.map((prediction) => (
                <PredictionEntryRow
                  key={prediction.fixture_id}
                  prediction={prediction}
                  saving={savingFixtureId === prediction.fixture_id}
                  onChange={updatePrediction}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-600">
                No unlocked fixture predictions are currently available.
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
            <ProjectionStat
              label="Predicted points"
              value={projection.total_now_predicted}
              helper="Actual Forest points + remaining picks"
              highlight
            />
            <ProjectionStat
              label="All picks came in"
              value={projection.full_prediction_set_points}
              helper="If your whole set was correct"
            />
            <ProjectionStat
              label="Predicted at GW1"
              value={
                projection.gw1_predicted_points === null
                  ? "TBC"
                  : projection.gw1_predicted_points
              }
              helper="Pre-GW1 baseline"
            />
            <ProjectionStat
              label="Actual v predicted"
              value={`${formatSignedNumber(projection.actual_vs_predicted)} pts`}
              helper="Actual points v completed picks"
            />
          </div>
        </section>

        <section className="grid gap-3">
          <ExpandableButton
            open={showScoreBreakdown}
            onClick={() => setShowScoreBreakdown((current) => !current)}
            title="Score breakdown"
            meta={`${scoreRows.length} scored GWs`}
          />

          {showScoreBreakdown && (
            <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                <ScoreStat
                  label="Total"
                  value={scoreSummary?.total_points ?? 0}
                  highlight
                />
                <ScoreStat label="Base" value={scoreSummary?.base_points ?? 0} />
                <ScoreStat
                  label="Streaker"
                  value={scoreSummary?.streak_bonus ?? 0}
                />
                <ScoreStat
                  label="Maverick"
                  value={scoreSummary?.maverick_bonus ?? 0}
                />
                <ScoreStat label="Rogue" value={scoreSummary?.rogue_bonus ?? 0} />
                <ScoreStat label="Cup" value={scoreSummary?.cup_bonus ?? 0} />
              </div>

              <div className="mt-4 grid gap-2">
                {scoreRows.length ? (
                  scoreRows.map((score) => (
                    <ScoreBreakdownRow
                      key={`${score.gameweek}-${score.opponent_short}`}
                      score={score}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-600">
                    No scored fixtures yet.
                  </div>
                )}
              </div>
            </section>
          )}

          <ExpandableButton
            open={showCupPredictions}
            onClick={() => setShowCupPredictions((current) => !current)}
            title="Cup predictions"
            meta={`${extraData?.cup_predictions?.length ?? 0} cups`}
          />

          {showCupPredictions && (
            <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
              <div className="grid gap-3">
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
                          {cup.is_locked && <LockedBadge />}
                        </div>

                        <select
                          value={cup.predicted_round_reached ?? ""}
                          disabled={
                            cup.is_locked ||
                            savingExtraKey === `cup-${cup.competition}`
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
                  <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-600">
                    Cup predictions loading or not available.
                  </div>
                )}
              </div>
            </section>
          )}

          <ExpandableButton
            open={showOtherPredictions}
            onClick={() => setShowOtherPredictions((current) => !current)}
            title="Other predictions"
            meta={`${extraData?.custom_answers?.length ?? 0} questions`}
          />

          {showOtherPredictions && (
            <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
              <div className="grid gap-3">
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
                        {answer.is_locked && <LockedBadge />}
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
                  <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-600">
                    Other predictions loading or not available.
                  </div>
                )}
              </div>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}

function AlertMessage({
  type,
  text,
}: {
  type: "success" | "error" | "pending";
  text: string;
}) {
  return (
    <div
      className={`mb-4 rounded-2xl border p-4 text-sm font-semibold ${
        type === "success"
          ? "border-green-200 bg-green-50 text-green-800"
          : type === "error"
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-[#D9D6D1] bg-white text-neutral-700"
      }`}
    >
      {text}
    </div>
  );
}

function TopStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        highlight
          ? "border-[#111111] bg-[#111111] text-white"
          : "border-[#D9D6D1] bg-[#F7F6F2] text-[#111111]"
      }`}
    >
      <div className="text-[0.68rem] font-black uppercase tracking-wide opacity-65">
        {label}
      </div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}

function ProjectionStat({
  label,
  value,
  helper,
  highlight = false,
}: {
  label: string;
  value: string | number;
  helper: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        highlight
          ? "border-[#C8102E] bg-[#C8102E] text-white"
          : "border-[#D9D6D1] bg-[#F7F6F2] text-[#111111]"
      }`}
    >
      <div className="text-[0.68rem] font-black uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black">{value}</div>
      <div className="mt-1 text-[0.68rem] font-bold leading-4 opacity-65">
        {helper}
      </div>
    </div>
  );
}

function PredictionEntryRow({
  prediction,
  saving,
  onChange,
}: {
  prediction: PlayerPageData["predictions"][number];
  saving: boolean;
  onChange: (fixtureId: string, newPrediction: PredictionValue) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#C8102E]">
            {prediction.gameweek_label}
          </div>
          <div className="truncate text-lg font-black text-[#111111]">
            {prediction.opponent_short} {prediction.venue}
          </div>
        </div>

        <div className="text-right text-xs font-bold uppercase tracking-wide text-neutral-500">
          Forest result
        </div>
      </div>

      <PredictionButtons
        fixtureId={prediction.fixture_id}
        selected={prediction.prediction}
        locked={prediction.is_locked || isConfirmedPrediction(prediction)}
        saving={saving}
        onChange={onChange}
        fullWidth
      />
    </div>
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

function ExpandableButton({
  open,
  onClick,
  title,
  meta,
}: {
  open: boolean;
  onClick: () => void;
  title: string;
  meta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[#D9D6D1] bg-white px-4 py-4 text-left shadow-sm transition hover:border-[#C8102E]"
    >
      <div>
        <div className="text-lg font-black uppercase text-[#111111]">{title}</div>
        <div className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-500">
          {meta}
        </div>
      </div>

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111111] text-2xl font-black leading-none text-white">
        {open ? "−" : "+"}
      </div>
    </button>
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
      className={`rounded-2xl border p-3 ${
        highlight
          ? "border-[#111111] bg-[#111111] text-white"
          : "border-[#D9D6D1] bg-[#F7F6F2] text-[#111111]"
      }`}
    >
      <div className="text-[0.68rem] font-bold uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

function ScoreBreakdownRow({ score }: { score: ScoreRowWithRunning }) {
  const correct = score.prediction === score.actual_result;

  return (
    <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#C8102E]">
            {score.gameweek_label}
          </div>
          <div className="mt-0.5 text-lg font-black">
            {score.opponent_short} {score.venue}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[0.68rem] font-black uppercase tracking-wide text-neutral-500">
            Running
          </div>
          <div className="text-xl font-black">{score.runningTotal}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black">
        <MiniScore label="Pick" value={score.prediction} />
        <MiniScore label="Result" value={score.actual_result} />
        <MiniScore label="Correct" value={correct ? "✓" : "×"} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <BreakdownPart label="base" value={score.base_points} />
        <BreakdownPart label="streak" value={score.streak_bonus} />
        <BreakdownPart label="maverick" value={score.maverick_bonus} />
        <BreakdownPart label="rogue" value={score.rogue_bonus} />
        <BreakdownPart label="cup" value={score.cup_bonus} />
        <BreakdownPart label="total" value={score.total_points} dark />
      </div>
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E7E2DA] bg-white px-3 py-2">
      <div className="text-[0.62rem] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-0.5 text-lg text-[#111111]">{value}</div>
    </div>
  );
}

function BreakdownPart({
  label,
  value,
  dark = false,
}: {
  label: string;
  value: number;
  dark?: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${
        dark
          ? "border-[#111111] bg-[#111111] text-white"
          : value > 0
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-[#D9D6D1] bg-white text-neutral-500"
      }`}
    >
      {value} {label}
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

function LockedBadge() {
  return (
    <span className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-bold uppercase text-neutral-700">
      Locked
    </span>
  );
}
