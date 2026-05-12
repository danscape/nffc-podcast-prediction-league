"use client";

import { useMemo, useState } from "react";

type CommentRow = {
  id: string;
  created_at: string;
  three_words: string | null;
  comment: string | null;
};

export default function CommentsCarousel({ rows }: { rows: CommentRow[] }) {
  const [index, setIndex] = useState(0);

  const usableRows = useMemo(
    () =>
      rows.filter((row) => {
        return Boolean(row.three_words || row.comment);
      }),
    [rows],
  );

  if (!usableRows.length) {
    return (
      <section className="border border-white/20 bg-black">
        <div className="bg-red-700 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
          Fan Voices
        </div>
        <div className="p-4 text-sm font-bold text-white/60">
          No fan comments yet.
        </div>
      </section>
    );
  }

  const current = usableRows[index];
  const total = usableRows.length;

  function previous() {
    setIndex((currentIndex) =>
      currentIndex === 0 ? usableRows.length - 1 : currentIndex - 1,
    );
  }

  function next() {
    setIndex((currentIndex) =>
      currentIndex === usableRows.length - 1 ? 0 : currentIndex + 1,
    );
  }

  return (
    <section className="border border-cyan-300 bg-black">
      <div className="flex items-center justify-between gap-3 bg-red-700 px-3 py-2 text-white">
        <p className="text-xs font-black uppercase tracking-[0.16em]">
          Fan Voices
        </p>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/80">
          {index + 1} / {total}
        </p>
      </div>

      <div className="grid gap-4 p-4 md:p-5">
        {current.three_words ? (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
              Three words to describe the season
            </p>
            <p className="mt-2 text-2xl font-black uppercase leading-tight text-white md:text-4xl">
              “{current.three_words}”
            </p>
          </div>
        ) : null}

        {current.comment ? (
          <div className="border border-white/20 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-yellow-300">
              Fan comment
            </p>
            <p className="mt-2 text-base font-bold leading-relaxed text-white md:text-xl">
              “{current.comment}”
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={previous}
            className="border border-white/30 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white hover:border-cyan-300 hover:text-cyan-300"
          >
            Previous
          </button>

          <button
            type="button"
            onClick={next}
            className="border border-cyan-300 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-cyan-300 hover:border-green-400 hover:text-green-300"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
