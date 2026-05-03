export function getAccuracyTone(value: number | null | undefined) {
  const accuracy = Number(value ?? 0);

  if (accuracy >= 40) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (accuracy >= 30) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

export function getSweepTone() {
  return "border-cyan-200 bg-cyan-50 text-cyan-600";
}

export function getBlankTone() {
  return "border-red-200 bg-red-50 text-[#C8102E]";
}

export function getWeeklyPointsTone() {
  return "border-green-200 bg-green-50 text-[#19B800]";
}

export function LeaderboardValuePill({
  value,
  tone,
  size = "md",
}: {
  value: string | number;
  tone?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClass =
    size === "xl"
      ? "min-w-[120px] rounded-2xl px-4 py-3 text-[2rem] leading-none"
      : size === "lg"
        ? "min-w-[90px] rounded-xl px-3 py-2 text-2xl"
        : size === "sm"
          ? "min-w-[58px] rounded-xl px-3 py-2 text-lg"
          : "min-w-[72px] rounded-xl px-3 py-2 text-2xl";

  return (
    <span
      className={`inline-flex items-center justify-center border font-black ${
        tone ?? "border-[#D9D6D1] bg-[#F7F6F2] text-[#111111]"
      } ${sizeClass}`}
    >
      {value}
    </span>
  );
}