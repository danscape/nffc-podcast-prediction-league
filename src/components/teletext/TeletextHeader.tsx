import type { ReactNode } from "react";

type TeletextHeaderProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  className?: string;
};

export default function TeletextHeader({
  kicker,
  title,
  subtitle,
  rightSlot,
  className = "",
}: TeletextHeaderProps) {
  return (
    <header className={`teletext-square border-b border-white/40 ${className}`}>
      {kicker && (
        <div className="teletext-title-bar px-4 py-2 text-[0.65rem] md:text-xs">
          {kicker}
        </div>
      )}

      <div className="grid gap-3 bg-black px-4 py-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h1 className="inline-block bg-[var(--nffc-red,#e50914)] px-4 py-2 text-3xl font-black uppercase leading-tight tracking-[0.08em] text-[var(--nffc-white,#f5f5f5)] md:text-5xl">{title}</h1>

          {subtitle && (
            <p className="mt-2 max-w-3xl text-xs font-bold leading-5 text-white/70 md:text-sm">
              {subtitle}
            </p>
          )}
        </div>

        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </header>
  );
}
