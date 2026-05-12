import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://awards.nffcstats.co.uk"),
  title: { absolute: "Unofficial NFFC End of Season Awards" },
  description:
    "Vote in the unofficial Nottingham Forest end-of-season fan awards.",
  openGraph: {
    title: { absolute: "Unofficial NFFC End of Season Awards" },
    description:
      "Vote in the unofficial Nottingham Forest end-of-season fan awards.",
    url: "https://awards.nffcstats.co.uk/awards",
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
      "Vote in the unofficial Nottingham Forest end-of-season fan awards.",
    images: ["https://awards.nffcstats.co.uk/awards/forest-fan-awards-social.png"],
  },
};

import AwardsForm from "./AwardsForm";

export const dynamic = "force-dynamic";

type Option = {
  id: string;
  label: string;
  meta?: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function mapPlayer(row: { id: string; name: string; position: string | null }) {
  return {
    id: row.id,
    label: row.name,
    meta: row.position,
  };
}

function mapDisplay(row: { id: string; display_label: string }) {
  return {
    id: row.id,
    label: row.display_label,
    meta: null,
  };
}

export default async function AwardsPage() {
  const [
    playersResult,
    signingsResult,
    fixturesResult,
    goalsResult,
    goalsConcededResult,
  ] = await Promise.all([
    supabase
      .from("award_players")
      .select("id, name, position")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("award_players")
      .select("id, name, position")
      .eq("is_active", true)
      .eq("is_signing", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("award_fixtures")
      .select("id, display_label")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("match_date", { ascending: true }),

    supabase
      .from("award_goals")
      .select("id, display_label")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("match_date", { ascending: true }),

    supabase
      .from("award_goals_conceded")
      .select("id, display_label")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("match_date", { ascending: true }),
  ]);

  const players: Option[] = (playersResult.data || []).map(mapPlayer);
  const signings: Option[] = (signingsResult.data || []).map(mapPlayer);
  const fixtures: Option[] = (fixturesResult.data || []).map(mapDisplay);
  const goals: Option[] = (goalsResult.data || []).map(mapDisplay);
  const goalsConceded: Option[] = (goalsConcededResult.data || []).map(mapDisplay);

  const loadError =
    playersResult.error ||
    signingsResult.error ||
    fixturesResult.error ||
    goalsResult.error ||
    goalsConcededResult.error;

  return (
    <main className="min-h-screen bg-black text-white md:px-6 md:py-8">
      <section className="mx-auto min-h-screen w-full max-w-5xl border-x border-white/20 bg-black md:min-h-0 md:border">
        <header className="border-b border-white/30 bg-red-700 px-4 py-4 sm:px-6 md:px-8 md:py-7">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white sm:text-xs md:text-sm">
            NFFC STATS // FAN VOTE
          </p>

          <h1 className="mt-2 text-3xl font-black uppercase leading-none tracking-tight text-white sm:text-5xl md:text-6xl">
            Forest Fan Awards
          </h1>

          <p className="mt-3 max-w-3xl text-xs font-black uppercase leading-snug tracking-[0.16em] text-white/85 sm:text-sm md:text-base">
            2025/26 unofficial end-of-season vote
          </p>
        </header>

        <div className="border-b border-white/20 px-4 py-4 text-sm leading-relaxed text-white/85 sm:px-6 md:px-8 md:py-6 md:text-base">
          <p className="max-w-4xl">
            Pick your Forest awards for the season. Player of the Season is
            ranked: <span className="font-bold text-green-300">1st = 5</span>,{" "}
            <span className="font-bold text-yellow-300">2nd = 3</span>,{" "}
            <span className="font-bold text-cyan-300">3rd = 1</span>.
          </p>

          <p className="mt-3 text-[11px] font-bold uppercase leading-relaxed tracking-[0.16em] text-cyan-300 md:text-xs">
            One entry per person. Duplicate or suspicious entries may be removed.
          </p>
        </div>

        {loadError ? (
          <div className="m-4 border border-red-500 p-4 text-sm font-bold text-red-300 md:m-8">
            Could not load award options. Check the Supabase tables and RLS
            policies.
          </div>
        ) : (
          <AwardsForm
            players={players}
            signings={signings.length ? signings : players}
            fixtures={fixtures}
            goals={goals}
            goalsConceded={goalsConceded}
          />
        )}
      </section>
    </main>
  );
}