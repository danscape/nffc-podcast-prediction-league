import type { ReactNode } from "react";

type TeletextStatProps = {
  label: string;
  value: string | number;
  subValue?: string | number;
  tone?: "default" | "green" | "yellow" | "cyan" | "pink" | "red" | "white";
  icon?: ReactNode;
  className?: string;
};

const toneClass: Record<NonNullable<TeletextStatProps["tone"]>, string> = {
  default: "text-white",
  green: "text-[var(--stat-green)]",
  yellow: "text-[var(--stat-yellow)]",
  cyan: "text-[var(--stat-cyan)]",
  pink: "text-[var(--stat-pink)]",
  red: "text-[var(--stat-wrong)]",
  white: "text-white",
};

export default function TeletextStat({
  label,
  value,
  subValue,
  tone = "default",
  icon,
  className = "",
}: TeletextStatProps) {
  return (
    <div className={`teletext-panel teletext-square p-3 ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="teletext-stat-label">{label}</div>
      </div>

      <div
        className={`mt-2 text-2xl font-black leading-none ${toneClass[tone]}`}
      >
        {value}
      </div>

      {subValue !== undefined && (
        <div className="mt-1 text-xs font-black uppercase tracking-wide text-white/60">
          {subValue}
        </div>
      )}
    </div>
  );
}
