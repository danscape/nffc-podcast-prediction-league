import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import CommentsCarousel from "./CommentsCarousel";

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

type CommentRow = {
  id: string;
  created_at: string;
  three_words: string | null;
  comment: string | null;
};

function StatCard({
  label,
  value,
  sub,
  tone = "green",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "green" | "cyan" | "yellow" | "pink";
}) {
  const toneClass = {
    green: "border-green-400 text-green-300",
    cyan: "border-cyan-300 text-cyan-300",
    yellow: "border-yellow-300 text-yellow-300",
    pink: "border-pink-300 text-pink-300",
  }[tone];

  return (
    <div className={`border bg-black p-3 md:p-4 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black uppercase leading-none md:text-4xl">
        {value}
      </p>
      {sub ? (
        <p className="mt-2 text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] text-white/55 md:text-xs">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function PlayerRaceBlock({ rows }: { rows: PlayerRow[] }) {
  const leaderPoints = Math.max(...rows.map((row) => row.points), 1);

  return (
    <section className="border border-green-400 bg-black">
      <div className="flex items-center justify-between gap-3 bg-red-700 px-3 py-2 text-white">
        <p className="text-xs font-black uppercase tracking-[0.16em] md:text-sm">
          Player of the Season // Live Points Race
        </p>
        <p className="hidden text-[10px] font-black uppercase tracking-[0.14em] text-white/80 sm:block">
          1st = 5 // 2nd = 3 // 3rd = 1
        </p>
      </div>

      <div className="grid gap-4 p-3 md:p-5">
        {rows.map((row, index) => {
          const width = Math.max(3, Math.round((row.points / leaderPoints) * 100));
          const isLeader = index === 0;

          return (
            <div
              key={row.option_id}
              className={`grid gap-2 border p-3 ${
                isLeader ? "border-green-400" : "border-white/15"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-black uppercase leading-snug text-white md:text-xl">
                    <span className="mr-2 text-cyan-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {row.label}
                  </div>

                  <div className="mt-1 text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] text-yellow-300 md:text-xs">
                    {row.first_place_votes} first // {row.second_place_votes} second //{" "}
                    {row.third_place_votes} third // {row.total_mentions} mentions
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-2xl font-black text-green-300 md:text-4xl">
                    {row.points}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                    pts
                  </div>
                </div>
              </div>

              <div className="h-5 border border-white/20 bg-black md:h-6">
                <div
                  className="h-full bg-green-400"
                  style={{ width: `${width}%` }}
                />
              </div>
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

function AwardResultBlock({
  title,
  rows,
  tone = "green",
}: {
  title: string;
  rows: VoteRow[];
  tone?: "green" | "cyan" | "yellow" | "pink";
}) {
  const maxVotes = Math.max(...rows.map((row) => row.votes), 1);

  const barClass = {
    green: "bg-green-400",
    cyan: "bg-cyan-300",
    yellow: "bg-yellow-300",
    pink: "bg-pink-300",
  }[tone];

  const titleClass = {
    green: "text-green-300",
    cyan: "text-cyan-300",
    yellow: "text-yellow-300",
    pink: "text-pink-300",
  }[tone];

  return (
    <section className="border border-white/20 bg-black">
      <div className="bg-red-700 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
        {title}
      </div>

      <div className="grid gap-3 p-3">
        {rows.slice(0, 8).map((row, index) => {
          const width = Math.max(4, Math.round((row.votes / maxVotes) * 100));
          const isLeader = index === 0;

          return (
            <div
              key={row.option_id}
              className={`grid gap-1 ${isLeader ? "border border-white/15 p-2" : ""}`}
            >
              <div className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="mr-2 font-black text-cyan-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={`font-bold ${isLeader ? titleClass : "text-white"}`}>
                    {row.label}
                  </span>
                </div>

                <div className="shrink-0 font-black text-green-300">
                  {row.votes}
                  <span className="ml-1 text-[10px] text-white/50">V</span>
                </div>
              </div>

              <div className="h-2 border border-white/20 bg-black">
                <div
                  className={`h-full ${barClass}`}
                  style={{ width: `${width}%` }}
                />
              </div>
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
    commentsResult,
  ] = await Promise.all([
    supabase.from("award_results_player_of_season").select("*"),
    supabase.from("award_results_signing").select("*"),
    supabase.from("award_results_breakthrough").select("*"),
    supabase.from("award_results_one_to_watch").select("*"),
    supabase.from("award_results_favourite_game").select("*"),
    supabase.from("award_results_least_favourite_game").select("*"),
    supabase.from("award_results_goal_of_season").select("*"),
    supabase.from("award_results_worst_goal_conceded").select("*"),
    supabase.from("award_results_fan_comments").select("*").limit(30),
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
    commentRows: (commentsResult.data || []) as CommentRow[],
    hasError:
      playerResult.error ||
      signingResult.error ||
      breakthroughResult.error ||
      oneToWatchResult.error ||
      favouriteGameResult.error ||
      leastFavouriteGameResult.error ||
      goalResult.error ||
      worstGoalResult.error ||
      commentsResult.error,
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
    commentRows,
    hasError,
  } = await getResults();

  const leader = playerRows[0];
  const second = playerRows[1];

  const validBallots = playerRows.reduce(
    (max, row) => Math.max(max, row.first_place_votes),
    0,
  );

  const leaderMargin = leader && second ? leader.points - second.points : leader?.points || 0;

  return (
    <main className="min-h-screen bg-black text-white md:px-6 md:py-8">
      <section className="mx-auto min-h-screen w-full max-w-6xl border-x border-white/20 bg-black md:min-h-0 md:border">
        <header className="border-b border-white/30 bg-red-700 px-4 py-5 md:px-8 md:py-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] md:text-sm">
            NFFC STATS // LIVE RESULTS
          </p>

          <h1 className="mt-2 text-3xl font-black uppercase leading-none md:text-6xl">
            Forest Fan Awards
          </h1>

          <p className="mt-3 text-xs font-bold uppercase leading-relaxed tracking-[0.14em] text-white/85 md:text-base">
            Unofficial 2025/26 vote results
          </p>
        </header>

        <div className="grid gap-4 p-4 md:p-8">
          {hasError ? (
            <div className="border border-red-500 p-3 text-sm font-bold text-red-300">
              Some results could not be loaded. Check the Supabase result views.
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-4">
            <StatCard
              label="Valid Ballots"
              value={validBallots}
              tone="cyan"
              sub="Counted in live results"
            />
            <StatCard
              label="Current Leader"
              value={leader ? leader.label : "-"}
              tone="green"
              sub={leader ? `${leader.points} points` : "No votes yet"}
            />
            <StatCard
              label="Lead Margin"
              value={leaderMargin}
              tone="yellow"
              sub="Points ahead of 2nd"
            />
            <StatCard
              label="First-Place Votes"
              value={leader ? leader.first_place_votes : 0}
              tone="pink"
              sub={leader ? `For ${leader.label}` : "No leader yet"}
            />
          </div>

          <PlayerRaceBlock rows={playerRows} />

          <CommentsCarousel rows={commentRows} />

          <div className="grid gap-4 lg:grid-cols-2">
            <AwardResultBlock
              title="Signing of the Season"
              rows={signingRows}
              tone="green"
            />

            <AwardResultBlock
              title="Breakthrough / Surprise of the Season"
              rows={breakthroughRows}
              tone="cyan"
            />

            <AwardResultBlock
              title="One to Watch Next Season"
              rows={oneToWatchRows}
              tone="yellow"
            />

            <AwardResultBlock
              title="Favourite Game / Game of the Season"
              rows={favouriteGameRows}
              tone="green"
            />

            <AwardResultBlock
              title="Least Favourite Game"
              rows={leastFavouriteGameRows}
              tone="pink"
            />

            <AwardResultBlock
              title="Goal of the Season"
              rows={goalRows}
              tone="cyan"
            />

            <AwardResultBlock
              title="Worst Goal Conceded"
              rows={worstGoalRows}
              tone="pink"
            />
          </div>

          <div className="pb-6">
            <Link
              href="/awards"
              className="block border border-green-400 px-4 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-green-300"
            >
              Vote
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
