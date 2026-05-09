type RankHistoryPoint = {
  gameweek: number;
  gameweek_label?: string | null;
  rank: number;
};

type RankHistoryChartProps = {
  title: string;
  subtitle?: string;
  points: RankHistoryPoint[];
  totalGameweeks?: number;
  rankCount?: number;
};

function formatPoint(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : String(value);
}

export default function RankHistoryChart({
  title,
  subtitle = "Ranking after each confirmed gameweek.",
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

  const chartWidth = 1200;
  const chartHeight = 800;
  const paddingLeft = 64;
  const paddingRight = 28;
  const paddingTop = 70;
  const paddingBottom = 86;
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

  const pathData = cleanedPoints
    .map((point, index) => {
      const x = xForGameweek(point.gameweek);
      const y = yForRank(point.rank);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const latestPoint = cleanedPoints[cleanedPoints.length - 1] ?? null;
  const bestRank = cleanedPoints.length
    ? Math.min(...cleanedPoints.map((point) => point.rank))
    : null;
  const worstRank = cleanedPoints.length
    ? Math.max(...cleanedPoints.map((point) => point.rank))
    : null;

  const xTicks = Array.from({ length: totalGameweeks }, (_, index) => index + 1);
  const visibleXTicks = xTicks.filter(
    (gameweek) =>
      gameweek === 1 ||
      gameweek === totalGameweeks ||
      gameweek % 2 === 0 ||
      cleanedPoints.some((point) => point.gameweek === gameweek)
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
    <section className="my-6 w-full bg-[var(--nffc-black,#000000)]">
      <div className="border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)]">
        <div className="bg-[var(--nffc-red,#e50914)] px-3 py-2 text-xl font-black uppercase tracking-[0.12em] text-white md:px-5 md:py-3 md:text-4xl">
          {title}
        </div>

        <div className="grid gap-px bg-[#242424] md:grid-cols-[1fr_160px_160px_160px_160px]">
          <div className="bg-[var(--nffc-black,#000000)] px-3 py-3 md:px-5">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-[var(--nffc-muted,#a7a7a7)] md:text-sm">
              {subtitle}
            </div>
          </div>

          <MiniStat label="Current Rank" value={formatPoint(latestPoint?.rank)} tone="green" />
          <MiniStat label="Best Rank" value={formatPoint(bestRank)} tone="yellow" />
          <MiniStat label="Lowest Rank" value={formatPoint(worstRank)} tone="red" />
          <MiniStat label="Tracked GWs" value={String(cleanedPoints.length)} tone="cyan" />
        </div>

        <div className="overflow-x-auto bg-[var(--nffc-black,#000000)] px-2 py-4 md:px-5 md:py-6">
          {cleanedPoints.length ? (
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label={title}
              className="aspect-[3/2] min-w-[760px] w-full"
            >
              <rect
                x={paddingLeft}
                y={paddingTop}
                width={innerWidth}
                height={innerHeight}
                fill="transparent"
                stroke="#242424"
                strokeWidth="1"
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
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 14}
                      y={y + 5}
                      textAnchor="end"
                      className="fill-white text-[15px] font-black uppercase"
                    >
                      {rank}
                    </text>
                  </g>
                );
              })}

              {visibleXTicks.map((gameweek) => {
                const x = xForGameweek(gameweek);
                const isConfirmed = cleanedPoints.some(
                  (point) => point.gameweek === gameweek
                );

                return (
                  <g key={`gw-${gameweek}`}>
                    <line
                      x1={x}
                      x2={x}
                      y1={paddingTop}
                      y2={chartHeight - paddingBottom}
                      stroke={isConfirmed ? "#444444" : "#202020"}
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={chartHeight - 20}
                      textAnchor="middle"
                      className={`text-[13px] font-black uppercase ${
                        isConfirmed ? "fill-white" : "fill-[#666666]"
                      }`}
                    >
                      {gameweek}
                    </text>
                  </g>
                );
              })}

              <text
                x={paddingLeft}
                y={chartHeight - 5}
                className="fill-[#8f8f8f] text-[12px] font-black uppercase tracking-[0.08em]"
              >
                Gameweek
              </text>

              <text
                x={8}
                y={paddingTop + 12}
                className="fill-[#8f8f8f] text-[12px] font-black uppercase tracking-[0.08em]"
              >
                Rank
              </text>

              <path
                d={pathData}
                fill="none"
                stroke="#22e55e"
                strokeWidth="6"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {cleanedPoints.map((point) => {
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
                      r={isLatest ? 10 : 7}
                      fill="#000000"
                      stroke={isLatest ? "#ffe44d" : "#22e55e"}
                      strokeWidth={isLatest ? 4 : 3}
                    />
                    <text
                      x={x}
                      y={Math.max(18, y - 14)}
                      textAnchor="middle"
                      className="fill-white text-[14px] font-black uppercase"
                    >
                      {point.rank}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="border border-[#242424] px-4 py-6 text-sm font-black uppercase tracking-[0.12em] text-[var(--nffc-muted,#a7a7a7)]">
              No rank history available yet.
            </div>
          )}
        </div>

      </div>
    </section>
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
    <div className="bg-[var(--nffc-black,#000000)] px-3 py-3">
      <div className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-black uppercase leading-none ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
