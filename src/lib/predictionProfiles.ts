export type PredictionProfileInput = {
  prediction_profile?: string | null;
  projected_forest_points?: number | null;
  projected_points?: number | null;
  forest_points?: number | null;
  predicted_wins?: number | null;
  predicted_draws?: number | null;
  predicted_losses?: number | null;
};

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

export function getProjectedForestPoints(input: PredictionProfileInput) {
  const explicitPoints =
    safeNumber(input.projected_forest_points) ??
    safeNumber(input.projected_points) ??
    safeNumber(input.forest_points);

  if (explicitPoints !== null) return explicitPoints;

  const wins = safeNumber(input.predicted_wins);
  const draws = safeNumber(input.predicted_draws);

  if (wins !== null || draws !== null) {
    return (wins ?? 0) * 3 + (draws ?? 0);
  }

  return null;
}

export function getPredictionProfile(input: PredictionProfileInput) {
  if (input.prediction_profile) return input.prediction_profile.toUpperCase();

  const projectedPoints = getProjectedForestPoints(input);

  if (projectedPoints === null) return "PROFILE TBC";

  if (projectedPoints >= 60) return "EUROPE & BEYOND";
  if (projectedPoints >= 50) return "TOP HALF HOPES";
  if (projectedPoints >= 43) return "SAFE & STEADY";

  return "SURVIVAL MODE";
}
