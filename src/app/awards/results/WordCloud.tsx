type WordCloudRow = {
  word: string;
  count: number;
};

export default function WordCloud({ rows }: { rows: WordCloudRow[] }) {
  if (!rows.length) {
    return (
      <section className="border border-white/20 bg-black">
        <div className="bg-red-700 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
          Season in Three Words
        </div>
        <div className="p-4 text-sm font-bold text-white/60">
          No three-word answers yet.
        </div>
      </section>
    );
  }

  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  function sizeClass(count: number) {
    const ratio = count / maxCount;

    if (ratio >= 0.8) return "text-4xl md:text-6xl text-green-300";
    if (ratio >= 0.55) return "text-3xl md:text-5xl text-cyan-300";
    if (ratio >= 0.35) return "text-2xl md:text-4xl text-yellow-300";
    if (ratio >= 0.2) return "text-xl md:text-3xl text-pink-300";

    return "text-base md:text-2xl text-white";
  }

  return (
    <section className="border border-yellow-300 bg-black">
      <div className="flex items-center justify-between gap-3 bg-red-700 px-3 py-2 text-white">
        <p className="text-xs font-black uppercase tracking-[0.16em]">
          Season in Three Words
        </p>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/80">
          Word cloud
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 p-4 md:p-6">
        {rows.slice(0, 40).map((row) => (
          <span
            key={row.word}
            title={`${row.word}: ${row.count}`}
            className={`font-black uppercase leading-none tracking-[0.04em] ${sizeClass(row.count)}`}
          >
            {row.word}
          </span>
        ))}
      </div>
    </section>
  );
}
