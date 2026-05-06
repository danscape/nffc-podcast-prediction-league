import type { ReactNode } from "react";

type TeletextPillProps = {
  children: ReactNode;
  tone?: "default" | "base" | "total" | "streak" | "maverick" | "rogue" | "wrong";
  className?: string;
};

const toneClass: Record<NonNullable<TeletextPillProps["tone"]>, string> = {
  default: "border-white/40 text-white",
  base: "border-[var(--stat-green)] text-[var(--stat-green)]",
  total: "border-white text-white",
  streak: "border-[var(--stat-yellow)] text-[var(--stat-yellow)]",
  maverick: "border-[var(--stat-cyan)] text-[var(--stat-cyan)]",
  rogue: "border-[var(--stat-pink)] text-[var(--stat-pink)]",
  wrong: "border-[var(--stat-wrong)] text-[var(--stat-wrong)]",
};

export default function TeletextPill({
  children,
  tone = "default",
  className = "",
}: TeletextPillProps) {
  return (
    <span
      className={`inline-flex items-center justify-center border bg-black px-2 py-1 text-xs font-black uppercase leading-none ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
