import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type PlayerRow = {
  option_id: string;
  label: string;
  points: number;
  total_mentions: number;
  first_place_votes: number;
};

type VoteRow = {
  option_id: string;
  label: string;
  votes: number;
};

function ResultBlock({
  title,
  rows,
  pointsMode = false,
}: {
  title: string;
  rows: Array<PlayerRow | VoteRow>;
  pointsMode?: boolean;
}) {
  const maxValue = Math.max(
    ...rows.map((row) => (pointsMode ? ("points" in row ? row.points : 0) : "votes" in row ? row.votes : 0)),
    1,
  );

  return (
    <section className="border border-white/20 bg-black">
      <div className="bg-red-700 px-3 py-2 text-xs font-black uppercase tracking-[0.16em]">
        {title}
      </div>

      <div className="grid gap-3 p-3">
        {rows.slice(0, 5).map((row, index) => {
          const value = pointsMode && "points" in row ? row.points : "votes" in row ? row.votes : 0;
          const pct = Math.max(4, Math.round((value / maxValue) * 100));

          return (
            <div key={row.option_id} className="grid gap-1">
              <div className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="mr-2 text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
                  <span className="font-bold text-white">{row.label}</span>
                </div>
                <div className="shrink-0 font-black text-green-300">
                  {value}
                  <span className="ml-1 text-[10px] text-white/50">
                    {pointsMode ? "PTS" : "V"}
                  </span>
                </div>
              </div>

              <div className="h-2 border border-white/20 bg-black">
                <div className="h-full bg-green-400" style={{ width: `${pct}%` }} />
              </div>

              {pointsMode && "first_place_votes" in row ? (
                <div className="text-[10px] uppercase tracking-[0.12em] text-yellow-300">
                  {row.first_place_votes} first-place votes // {row.total_mentions} total mentions
                </div>
              ) : null}
            </div>
          );
        })}

        {!rows.length ? (
          <p className="text-sm text-white/60">No votes yet.</p>
        ) : null}
      </div>
    </section>
  );
}

export default async function AwardsThanksPage() {
  const [
    playerResult,
    signingResult,
    favouriteGameResult,
    goalResult,
    worstGoalResult,
  ] = await Promise.all([
    supabase.from("award_results_player_of_season").select("*").limit(5),
    supabase.from("award_results_signing").select("*").limit(5),
    supabase.from("award_results_favourite_game").select("*").limit(5),
    supabase.from("award_results_goal_of_season").select("*").limit(5),
    supabase.from("award_results_worst_goal_conceded").select("*").limit(5),
  ]);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto min-h-screen w-full max-w-2xl border-x border-white/20 bg-black md:my-6 md:min-h-0 md:border">
        <header className="border-b border-white/30 bg-red-700 px-4 py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em]">
            NFFC STATS // VOTE RECEIVED
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase leading-none">
            Thanks for voting
          </h1>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-white/85">
            Live results snapshot
          </p>
        </header>

        <div className="grid gap-4 p-4">
          <div className="border border-green-400 p-3">
            <p className="text-sm font-bold leading-relaxed text-green-300">
              Your vote has been submitted. Here’s how the fan vote is shaping up so far.
            </p>
          </div>

          <ResultBlock
            title="Player of the Season"
            rows={(playerResult.data || []) as PlayerRow[]}
            pointsMode
          />

          <ResultBlock
            title="Signing of the Season"
            rows={(signingResult.data || []) as VoteRow[]}
          />

          <ResultBlock
            title="Favourite Game"
            rows={(favouriteGameResult.data || []) as VoteRow[]}
          />

          <ResultBlock
            title="Goal of the Season"
            rows={(goalResult.data || []) as VoteRow[]}
          />

          <ResultBlock
            title="Worst Goal Conceded"
            rows={(worstGoalResult.data || []) as VoteRow[]}
          />

          <div className="grid grid-cols-1 gap-3 pb-6 sm:grid-cols-2">
            <Link
              href="/awards/results"
              className="border border-cyan-300 px-4 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-cyan-300"
            >
              Full Results
            </Link>

            <Link
              href="/awards"
              className="border border-white/30 px-4 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-white"
            >
              Back to Form
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}