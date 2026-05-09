import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type CupSummary = {
  competition: string;
  competition_slug: string;
  actual_round_reached: string | null;
  awarded_gameweek_label: string | null;
  total_players: number;
  correct_players: number;
  wrong_players: number;
  total_bonus_awarded: number;
  most_common_predicted_round: string | null;
  most_common_prediction_count: number | null;
  most_common_prediction_percentage: number | null;
  correct_percentage: number | null;
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(1).replace(".0", "")}%`;
}

function formatRound(value: string | null | undefined) {
  return value ?? "TBC";
}

export const dynamic = "force-dynamic";

export default async function CupsPage() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("cup_prediction_competition_summary")
    .select("*")
    .order("competition", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const cups = (data ?? []) as CupSummary[];

  return (
    <main className="min-h-screen bg-[var(--nffc-black,#000000)] px-3 py-3 font-mono text-[var(--nffc-white,#f5f5f5)] sm:px-4 lg:px-8">
      <section className="w-full max-w-none">
        <SiteMenu />

        <header className="mt-3 border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)]">
          <div className="bg-[var(--nffc-red,#e50914)] px-3 py-2 text-sm font-black uppercase tracking-[0.18em] text-white">
            NFFC Stats / Cup Terminal
          </div>

          <div className="p-4 md:p-6">
            <h1 className="text-4xl font-black uppercase leading-none tracking-[-0.04em] text-[var(--stat-yellow,#ffe44d)] md:text-6xl">
              Cups
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-black uppercase leading-5 tracking-[0.08em] text-white md:text-base">
              Cup specialist predictions, most common rounds and correct-pick breakdowns.
            </p>
          </div>
        </header>

        <section className="mt-3 grid gap-3 md:grid-cols-3">
          {cups.map((cup) => (
            <Link
              key={cup.competition_slug}
              href={`/cups/${cup.competition_slug}`}
              className="group block border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] transition hover:border-[var(--stat-yellow,#ffe44d)]"
            >
              <div className="bg-[var(--nffc-red,#e50914)] px-3 py-2 text-sm font-black uppercase tracking-[0.12em] text-white">
                {cup.competition}
              </div>

              <div className="p-3">
                <div className="text-3xl font-black uppercase leading-none text-white group-hover:text-[var(--stat-yellow,#ffe44d)]">
                  {cup.competition}
                </div>
                <div className="mt-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--nffc-muted,#a7a7a7)]">
                  View cup prediction board →
                </div>
              </div>

              <div className="grid gap-px bg-[#242424]">
                <CupStat label="Actual" value={formatRound(cup.actual_round_reached)} tone="yellow" />
                <CupStat
                  label="Popular"
                  value={`${formatRound(cup.most_common_predicted_round)} / ${cup.most_common_prediction_count ?? 0}`}
                  tone="cyan"
                />
                <CupStat
                  label="Correct"
                  value={`${cup.correct_players} / ${cup.total_players}`}
                  tone="green"
                />
                <CupStat label="Accuracy" value={formatPercent(cup.correct_percentage)} tone="white" />
              </div>
            </Link>
          ))}
        </section>
      </section>
    </main>
  );
}

function SiteMenu() {
  return (
    <nav className="grid gap-2 border border-[var(--nffc-red,#e50914)] bg-[var(--nffc-red,#e50914)] p-2 md:grid-cols-[auto_1fr_auto_auto_auto] md:items-center">
      <Link href="/" className="flex items-center bg-[var(--nffc-black,#000000)] px-3 py-2">
        <img
          src="/brand/nffc-podcast-prediction-league-banner.png"
          alt="NFFC Podcast Prediction League"
          className="h-10 w-auto"
        />
      </Link>

      <div className="hidden text-2xl font-black uppercase tracking-[0.08em] text-white md:block">
        Cup Terminal
      </div>

      <MenuLink href="/">Home</MenuLink>
      <MenuLink href="/weekly-results">GW Results</MenuLink>
      <MenuLink href="/cups">Cups</MenuLink>
    </nav>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="border border-white bg-[var(--nffc-black,#000000)] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
    >
      {children}
    </Link>
  );
}

function CupStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "yellow" | "cyan" | "white";
}) {
  const toneClass =
    tone === "green"
      ? "text-[var(--stat-green,#22e55e)]"
      : tone === "yellow"
        ? "text-[var(--stat-yellow,#ffe44d)]"
        : tone === "cyan"
          ? "text-[var(--stat-cyan,#59efff)]"
          : "text-white";

  return (
    <div className="grid grid-cols-[105px_1fr] bg-[var(--nffc-black,#000000)] text-xs font-black uppercase tracking-[0.08em] md:grid-cols-[125px_1fr]">
      <div className="border-r border-[#242424] px-3 py-2 text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className={`px-3 py-2 text-right ${toneClass}`}>{value}</div>
    </div>
  );
}
