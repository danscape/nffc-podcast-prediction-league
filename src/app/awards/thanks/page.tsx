import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://awards.nffcstats.co.uk"),
  title: { absolute: "Unofficial NFFC End of Season Awards" },
  description:
    "Thanks for voting in the unofficial Nottingham Forest end-of-season fan awards.",
  openGraph: {
    title: { absolute: "Unofficial NFFC End of Season Awards" },
    description:
      "Thanks for voting in the unofficial Nottingham Forest end-of-season fan awards.",
    url: "https://awards.nffcstats.co.uk/awards/thanks",
    siteName: "NFFC Stats",
    images: [
      {
        url: "https://awards.nffcstats.co.uk/awards/forest-fan-awards-social.png",
        width: 1200,
        height: 630,
        alt: "Forest Fan Awards 2025/26",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: { absolute: "Unofficial NFFC End of Season Awards" },
    description:
      "Thanks for voting in the unofficial Nottingham Forest end-of-season fan awards.",
    images: ["https://awards.nffcstats.co.uk/awards/forest-fan-awards-social.png"],
  },
};

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

function PlayerRaceBlock({ rows }: { rows: PlayerRow[] }) {
  const leaderPoints = Math.max(...rows.map((row) => row.points), 1);

  return (
    <section className="border border-green-400 bg-black">
      <div className="bg-red-700 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
        Player of the Season // Live Race
      </div>

      <div className="grid gap-4 p-3">
        {rows.slice(0, 10).map((row, index) => {
          const width = Math.max(3, Math.round((row.points / leaderPoints) * 100));

          return (
            <div key={row.option_id} className="grid gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-black uppercase leading-snug text-white md:text-base">
                    <span className="mr-2 text-cyan-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {row.label}
                  </div>

                  <div className="mt-1 text-[10px] font-bold uppercase leading-relaxed tracking-[0.12em] text-yellow-300">
                    {row.first_place_votes} first // {row.total_mentions} mentions
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xl font-black text-green-300">
                    {row.points}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                    pts
                  </div>
                </div>
              </div>

              <div className="h-3 border border-white/20 bg-black">
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

function MiniVoteBlock({ title, rows }: { title: string; rows: VoteRow[] }) {
  const top = rows[0];

  return (
    <section className="border border-white/20 bg-black p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
        {title}
      </p>

      {top ? (
        <div className="mt-2 flex items-start justify-between gap-3">
          <p className="text-sm font-black uppercase leading-snug text-white">
            {top.label}
          </p>
          <p className="shrink-0 text-lg font-black text-green-300">
            {top.votes}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-white/60">No votes yet.</p>
      )}
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
    supabase.from("award_results_player_of_season").select("*").limit(10),
    supabase.from("award_results_signing").select("*").limit(5),
    supabase.from("award_results_favourite_game").select("*").limit(5),
    supabase.from("award_results_goal_of_season").select("*").limit(5),
    supabase.from("award_results_worst_goal_conceded").select("*").limit(5),
  ]);

  const playerRows = (playerResult.data || []) as PlayerRow[];
  const signingRows = (signingResult.data || []) as VoteRow[];
  const favouriteGameRows = (favouriteGameResult.data || []) as VoteRow[];
  const goalRows = (goalResult.data || []) as VoteRow[];
  const worstGoalRows = (worstGoalResult.data || []) as VoteRow[];

  return (
    <main className="min-h-screen bg-black text-white md:px-6 md:py-8">
      <section className="mx-auto min-h-screen w-full max-w-5xl border-x border-white/20 bg-black md:min-h-0 md:border">
        <header className="border-b border-white/30 bg-red-700 px-4 py-5 md:px-8 md:py-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] md:text-sm">
            NFFC STATS // VOTE RECEIVED
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase leading-none md:text-6xl">
            Thanks for voting
          </h1>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-white/85 md:text-base">
            Live results snapshot
          </p>
        </header>

        <div className="grid gap-4 p-4 md:p-8">
          <div className="border border-green-400 p-3 md:p-4">
            <p className="text-sm font-bold leading-relaxed text-green-300 md:text-base">
              Your vote has been submitted. Here’s how the Player of the Season
              race is shaping up so far.
            </p>
          </div>

          <PlayerRaceBlock rows={playerRows} />

          <div className="grid gap-3 md:grid-cols-2">
            <MiniVoteBlock title="Signing of the Season" rows={signingRows} />
            <MiniVoteBlock title="Favourite Game" rows={favouriteGameRows} />
            <MiniVoteBlock title="Goal of the Season" rows={goalRows} />
            <MiniVoteBlock title="Worst Goal Conceded" rows={worstGoalRows} />
          </div>

          <div className="grid grid-cols-1 gap-3 pb-6 sm:grid-cols-2">
            <Link
              href="/awards/results"
              className="border border-cyan-300 px-4 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-cyan-300"
            >
              Full Results
            </Link>

            <Link
              href="/awards"
              className="border border-green-400 px-4 py-3 text-center text-sm font-black uppercase tracking-[0.14em] text-green-300"
            >
              Vote
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
