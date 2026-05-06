import Link from "next/link";

export function formatGraphicPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1).replace(".0", "");
}

export function formatWholeGraphicPoints(value: number | null | undefined) {
  return String(Math.round(Number(value ?? 0)));
}

export function formatGraphicPercent(value: number | null | undefined) {
  return `${Math.round(Number(value ?? 0))}%`;
}

export function getRoundedPercentSplit(win: number, draw: number, loss: number) {
  const values = [
    { key: "win", value: Number(win ?? 0) },
    { key: "draw", value: Number(draw ?? 0) },
    { key: "loss", value: Number(loss ?? 0) },
  ];

  const total = values.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    return { win: 0, draw: 0, loss: 0 };
  }

  const normalised = values.map((item) => {
    const exact = (item.value / total) * 100;
    return {
      ...item,
      exact,
      floor: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  let remaining = 100 - normalised.reduce((sum, item) => sum + item.floor, 0);
  const sorted = [...normalised].sort((a, b) => b.remainder - a.remainder);

  for (const item of sorted) {
    if (remaining <= 0) break;
    item.floor += 1;
    remaining -= 1;
  }

  return {
    win: sorted.find((item) => item.key === "win")?.floor ?? 0,
    draw: sorted.find((item) => item.key === "draw")?.floor ?? 0,
    loss: sorted.find((item) => item.key === "loss")?.floor ?? 0,
  };
}

export function GraphicStatCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="rounded-none border border-white/15 bg-[var(--nffc-panel,#070707)]/10 p-3 ">
      <div className="text-[0.64rem] font-black uppercase leading-tight tracking-[0.18em] text-white/55">
        {label}
      </div>
      <div className="mt-1 text-xl font-black leading-tight text-white">
        {value}
      </div>
      {subValue && (
        <div className="mt-2 text-[0.64rem] font-black uppercase tracking-wide text-white/65">
          {subValue}
        </div>
      )}
    </div>
  );
}

export function GraphicHeroStat({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="rounded-none border border-white/15 bg-[var(--nffc-panel,#070707)]/10 p-4 ">
      <div className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/55">
        {label}
      </div>
      <div className="mt-2 text-6xl font-black leading-none text-white">
        {value}
      </div>
      {subValue && (
        <div className="mt-2 text-xs font-black uppercase tracking-wide text-white/70">
          {subValue}
        </div>
      )}
    </div>
  );
}

export function GraphicPercentCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "win" | "draw" | "loss";
}) {
  const toneClass =
    tone === "win"
      ? "border-green-300/40 bg-green-500/15 text-green-100"
      : tone === "draw"
        ? "border-amber-300/40 bg-amber-400/15 text-amber-100"
        : "border-red-300/40 bg-red-500/15 text-red-100";

  return (
    <div className={`rounded-none border p-3 text-center  ${toneClass}`}>
      <div className="text-[0.62rem] font-black uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black leading-none">
        {formatGraphicPercent(value)}
      </div>
    </div>
  );
}

export function GraphicTeamCard({
  label,
  teamName,
  href,
}: {
  label: string;
  teamName: string;
  href?: string | null;
}) {
  const content = (
    <div className="h-full rounded-none border border-white/15 bg-[var(--nffc-panel,#070707)]/10 p-3  transition hover:border-white/35">
      <div className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-white/55">
        {label}
      </div>
      <div className="mt-1 text-lg font-black leading-tight text-white">
        {teamName}
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}
