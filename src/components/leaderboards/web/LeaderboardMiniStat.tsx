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
      className={`rounded-none border p-3 text-center ${
        tone ?? "border-[rgba(245,245,245,0.35)] bg-[var(--nffc-panel,#070707)] text-[var(--nffc-white,#f5f5f5)]"
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}