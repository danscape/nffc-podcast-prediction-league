type RankHistoryPoint = {
  gameweek: number;
  gameweek_label?: string | null;
  rank: number;
};

type RankHistoryChartProps = {
  title: string;
  subtitle?: string;
  subjectName?: string | null;
  subjectType?: "player" | "team";
  points: RankHistoryPoint[];
  totalGameweeks?: number;
  rankCount?: number;
};

const GAME_LOGO_SRC = "/brand/nffc-podcast-prediction-league-banner.png";

function formatPoint(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : String(value);
}

export default function RankHistoryChart({
  title,
  subtitle = "Rank after each confirmed gameweek.",
  subjectName,
  subjectType = "player",
  points,
  totalGameweeks = 38,
  rankCount,
}: RankHistoryChartProps) {
  const cleanedPoints = points
    .filter((point) => Number.isFinite(point.gameweek) && Number.isFinite(point.rank))
    .sort((a, b) => a.gameweek - b.gameweek);

  const highestRankNumber = Math.max(
    rankCount ?? 0,
    ...cleanedPoints.map((point) => point.rank),
    1
  );

  const latestPoint = cleanedPoints[cleanedPoints.length - 1] ?? null;
  const bestRank = cleanedPoints.length
    ? Math.min(...cleanedPoints.map((point) => point.rank))
    : null;
  const lowestRank = cleanedPoints.length
    ? Math.max(...cleanedPoints.map((point) => point.rank))
    : null;

  return (
    <section className="my-0 w-full bg-[var(--nffc-black,#000000)] md:my-6">
      <div className="mx-auto w-full max-w-[1500px] border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)]">
        <div className="bg-[var(--nffc-red,#e50914)] px-2 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-white md:px-5 md:py-3 md:text-2xl">
League Position Over Time
        </div>

        <div className="w-full bg-[var(--nffc-black,#000000)] p-2 md:aspect-[3/2] md:p-5">
          <div className="grid h-auto gap-2 md:h-full md:grid-rows-[auto_auto_1fr] md:gap-4">
            <header className="grid gap-2 md:grid-cols-[1fr_auto] md:items-start md:gap-3">
              <div className="min-w-0">
                <div className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-[var(--nffc-muted,#a7a7a7)] md:text-sm">
                  {subjectType === "team" ? "Team Rank Tracker" : "Player Rank Tracker"}
                </div>

                <h2 className="mt-0.5 text-[clamp(1.8rem,10vw,3.2rem)] font-black uppercase leading-[0.88] tracking-[-0.07em] text-[var(--stat-yellow,#ffe44d)] md:mt-1 md:text-[clamp(4rem,7vw,7.5rem)]">
                  {subjectName ?? title}
                </h2>

                <div className="mt-1 text-[0.56rem] font-black uppercase leading-3 tracking-[0.06em] text-white md:mt-2 md:text-lg md:leading-6">
                  {subtitle}
                </div>
              </div>

              <div className="flex justify-start md:justify-end">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={GAME_LOGO_SRC}
                  alt="NFFC Podcast Prediction League"
                  className="h-8 w-auto border border-[#242424] bg-black object-contain md:h-16"
                />
              </div>
            </header>

            <div className="grid grid-cols-2 gap-px bg-[#242424] md:grid-cols-4">
              <MiniStat label="Current" value={formatPoint(latestPoint?.rank)} tone="yellow" />
              <MiniStat label="Best" value={formatPoint(bestRank)} tone="green" />
              <MiniStat label="Lowest" value={formatPoint(lowestRank)} tone="red" />
              <MiniStat label="Tracked GWs" value={String(cleanedPoints.length)} tone="cyan" />
            </div>

            <div className="min-h-0 border border-[#242424] bg-[var(--nffc-black,#000000)] p-1.5 md:p-4">
              {cleanedPoints.length ? (
                <ResponsiveRankSvg
                  points={cleanedPoints}
                  totalGameweeks={totalGameweeks}
                  highestRankNumber={highestRankNumber}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-center text-sm font-black uppercase tracking-[0.12em] text-[var(--nffc-muted,#a7a7a7)]">
                  No rank history available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResponsiveRankSvg({
  points,
  totalGameweeks,
  highestRankNumber,
}: {
  points: RankHistoryPoint[];
  totalGameweeks: number;
  highestRankNumber: number;
}) {
  const chartWidth = 1200;
  const chartHeight = 620;
  const paddingLeft = 74;
  const paddingRight = 32;
  const paddingTop = 58;
  const paddingBottom = 78;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const xForGameweek = (gameweek: number) => {
    if (totalGameweeks <= 1) return paddingLeft;
    return paddingLeft + ((gameweek - 1) / (totalGameweeks - 1)) * innerWidth;
  };

  const yForRank = (rank: number) => {
    if (highestRankNumber <= 1) return paddingTop;
    return paddingTop + ((rank - 1) / (highestRankNumber - 1)) * innerHeight;
  };

  const pathData = points
    .map((point, index) => {
      const x = xForGameweek(point.gameweek);
      const y = yForRank(point.rank);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const latestPoint = points[points.length - 1] ?? null;

  const visibleXTicks = Array.from({ length: totalGameweeks }, (_, index) => index + 1).filter(
    (gameweek) =>
      gameweek === 1 ||
      gameweek === totalGameweeks ||
      gameweek % 4 === 0 ||
      points.some((point) => point.gameweek === gameweek)
  );

  const yTicks = Array.from(
    new Set([
      1,
      Math.ceil(highestRankNumber / 4),
      Math.ceil(highestRankNumber / 2),
      Math.ceil((highestRankNumber * 3) / 4),
      highestRankNumber,
    ])
  )
    .filter((rank) => rank >= 1 && rank <= highestRankNumber)
    .sort((a, b) => a - b);

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      role="img"
      aria-label="Rank movement chart"
      className="h-[210px] w-full sm:h-[240px] md:h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect
        x={paddingLeft}
        y={paddingTop}
        width={innerWidth}
        height={innerHeight}
        fill="transparent"
        stroke="#242424"
        strokeWidth="2"
      />

      {yTicks.map((rank) => {
        const y = yForRank(rank);

        return (
          <g key={`rank-${rank}`}>
            <line
              x1={paddingLeft}
              x2={chartWidth - paddingRight}
              y1={y}
              y2={y}
              stroke="#242424"
              strokeWidth="2"
            />
            <text
              x={paddingLeft - 16}
              y={y + 7}
              textAnchor="end"
              className="fill-white text-[20px] font-black uppercase"
            >
              {rank}
            </text>
          </g>
        );
      })}

      {visibleXTicks.map((gameweek) => {
        const x = xForGameweek(gameweek);
        const isConfirmed = points.some((point) => point.gameweek === gameweek);

        return (
          <g key={`gw-${gameweek}`}>
            <line
              x1={x}
              x2={x}
              y1={paddingTop}
              y2={chartHeight - paddingBottom}
              stroke={isConfirmed ? "#444444" : "#202020"}
              strokeWidth="2"
            />
            <text
              x={x}
              y={chartHeight - 28}
              textAnchor="middle"
              className={`text-[18px] font-black uppercase ${
                isConfirmed ? "fill-white" : "fill-[#666666]"
              }`}
            >
              {gameweek}
            </text>
          </g>
        );
      })}

      <path
        d={pathData}
        fill="none"
        stroke="#22e55e"
        strokeWidth="9"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {points.map((point) => {
        const x = xForGameweek(point.gameweek);
        const y = yForRank(point.rank);
        const isLatest =
          latestPoint?.gameweek === point.gameweek &&
          latestPoint?.rank === point.rank;

        return (
          <g key={`${point.gameweek}-${point.rank}`}>
            <circle
              cx={x}
              cy={y}
              r={isLatest ? 15 : 10}
              fill="#000000"
              stroke={isLatest ? "#ffe44d" : "#22e55e"}
              strokeWidth={isLatest ? 6 : 5}
            />
            <text
              x={x}
              y={Math.max(24, y - 20)}
              textAnchor="middle"
              className="fill-white text-[20px] font-black uppercase"
            >
              {point.rank}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "yellow" | "cyan" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "text-[var(--stat-green,#22e55e)]"
      : tone === "yellow"
        ? "text-[var(--stat-yellow,#ffe44d)]"
        : tone === "red"
          ? "text-[var(--stat-wrong,#ff3030)]"
          : "text-[var(--stat-cyan,#59efff)]";

  return (
    <div className="bg-[var(--nffc-black,#000000)] px-2 py-1.5 md:px-3 md:py-3">
      <div className="text-[0.5rem] font-black uppercase tracking-[0.1em] text-[var(--nffc-muted,#a7a7a7)] md:text-xs">
        {label}
      </div>
      <div className={`mt-0.5 text-base font-black uppercase leading-none md:mt-1 md:text-4xl ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
