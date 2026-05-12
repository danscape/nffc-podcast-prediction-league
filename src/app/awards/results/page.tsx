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
  second_place_votes: number;
  third_place_votes: number;
};

type VoteRow = {
  option_id: string;
  label: string;
  votes: number;
};

function getValue(row: PlayerRow | VoteRow, pointsMode: boolean) {
  if (pointsMode && "points" in row) {
    return row.points;
  }

  if ("votes" in row) {
    return row.votes;
  }

  return 0;
}

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
    ...rows.map((row) => getValue(row, pointsMode)),
    1,
  );

  return (
    <section className="border border-white/20 bg-black">
      <div className="bg-red-700 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
        {title}
      </div>

      <div className="grid gap-3 p-3">
        {rows.map((row, index) => {
          const value = getValue(row, pointsMode);
          const pct = Math.max(4, Math.round((value / maxValue) * 100));

          return (
            <div key={row.option_id} className="grid gap-1">
              <div className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="mr-2 font-black text-cyan-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
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
                <div
                  className="h-full bg-green-400"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {pointsMode && "first_place_votes" in row ? (
                <div className="text-[10px] uppercase leading-relaxed tracking-[0.12em] text-yellow-300">
                  {row.first_place_votes} first // {row.second_place_votes} second //{" "}
                  {row.third_place_votes} third // {row.total_mentions} total mentions
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

async function getResults() {
  const [
    playerResult,
    signingResult,
    breakthroughResult,
    oneToWatchResult,
    favouriteGameResult,
    leastFavouriteGameResult,
    goalResult,
    worstGoalResult,
  ] = await Promise.all([
    supabase.from("award_results_player_of_season").select("*"),
    supabase.from("award_results_signing").select("*"),
    supabase.from("award_results_breakthrough").select("*"),
    supabase.from("award_results_one_to_watch").select("*"),
    supabase.from("award_results_favourite_game").select("*"),
    supabase.from("award_results_least_favourite_game").select("*"),
    supabase.from("award_results_goal_of_season").select("*"),
    supabase.from("award_results_worst_goal_conceded").select("*"),
  ]);

  return {
    playerRows: (playerResult.data || []) as PlayerRow[],
    signingRows: (signingResult.data || []) as VoteRow[],
    breakthroughRows: (breakthroughResult.data || []) as VoteRow[],
    oneToWatchRows: (oneToWatchResult.data || []) as VoteRow[],
    favouriteGameRows: (favouriteGameResult.data || []) as VoteRow[],
    leastFavouriteGameRows: (leastFavouriteGameResult.data || []) as VoteRow[],
    goalRows: (goalResult.data || []) as VoteRow[],
    worstGoalRows: (worstGoalResult.data || []) as VoteRow[],
    hasError:
      playerResult.error ||
      signingResult.error ||
      breakthroughResult.error ||
      oneToWatchResult.error ||
      favouriteGameResult.error ||
      leastFavouriteGameResult.error ||
      goalResult.error ||
      worstGoalResult.error,
  };
}

export default async function AwardsResultsPage() {
  const {
    playerRows,
    signingRows,
    breakthroughRows,
    oneToWatchRows,
    favouriteGameRows,
    leastFavouriteGameRows,
    goalRows,
    worstGoalRows,
    hasError,
  } = await getResults();

  const totalPlayerVotes = playerRows.reduce(
    (total, row) => total + row.total_mentions,
    0,
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto min-h-screen w-full max-w-2xl border-x border-white/20 bg-black md:my-6 md:min-h-0 md:border">
        <header className="border-b border-white/30 bg-red-700 px-4 py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em]">
            NFFC STATS // LIVE RESULTS
          </p>

          <h1 className="mt-2 text-3xl font-black uppercase leading-none">
            Forest Fan Awards
          </h1>

          <p className="mt-3 text-xs font-bold uppercase leading-relaxed tracking-[0.14em] text-white/85">
            Unofficial 2025/26 vote results
          </p>
        </header>

        <div className="grid gap-4 p-4">
          <div className="border border-cyan-300 p-3">
            <p className="text-sm font-bold leading-relaxed text-cyan-300">
              Live results update automatically as votes are submitted. Player of
              the Season scoring: 1st = 5 points, 2nd = 3 points, 3rd = 1 point.
            </p>

            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-white/60">
              Player ballot mentions counted: {totalPlayerVotes}
            </p>
          </div>

          {hasError ? (
            <div className="border border-red-500 p-3 text-sm font-bold text-red-300">
              Some results could not be loaded. Check the Supabase result views.
            </div>
          ) : null}

          <ResultBlock
            title="Player of the Season"
            rows={playerRows}
            pointsMode
          />

          <ResultBlock
            title="Signing of the Season"
            rows={signingRows}
          />

          <ResultBlock
            title="Breakthrough / Surprise of the Season"
            rows={breakthroughRows}
          />

          <ResultBlock
            title="One to Watch Next Season"
            rows={oneToWatchRows}
          />

          <ResultBlock
            title="Favourite Game"
            rows={favouriteGameRows}
          />

          <ResultBlock
            title="Least Favourite Game"
            rows={leastFavouriteGameRows}
          />

          <ResultBlock
            title="Goal of the Season"
            rows={goalRows}
          />

          <ResultBlock
            title="Worst Goal Conceded"
            rows={worstGoalRows}
          />

          <div className="grid grid-cols-1 gap-3 pb-6 sm:grid-cols-2">
            <Link
              href="/awards"
              className="border border-green-400 px-4 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-green-300"
            >
              Vote
            </Link>

            <Link
              href="/"
              className="border border-white/30 px-4 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-white"
            >
              NFFC Stats Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}