export default function LeaderboardMiniStat({
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