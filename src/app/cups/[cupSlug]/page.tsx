import Link from "next/link";
import { notFound } from "next/navigation";
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

type RoundSummary = {
  competition: string;
  competition_slug: string;
  predicted_round_reached: string;
  actual_round_reached: string | null;
  prediction_count: number;
  correct_count: number;
  total_players: number;
  prediction_percentage: number;
  round_sort_order: number;
};

type PlayerCupResult = {
  id: string;
  player_id: string;
  competition: string;
  competition_slug: string;
  predicted_round_reached: string | null;
  actual_round_reached: string | null;
  bonus_awarded: number | null;
  awarded_gameweek_label: string | null;
  prediction_correct: boolean | null;
  player_name: string;
  short_name: string;
  player_slug: string | null;
  team_name: string | null;
  team_display_name: string | null;
  team_abbreviation: string | null;
  team_logo_url: string | null;
  team_logo_alt: string | null;
  team_slug: string | null;
};

type PageProps = {
  params: Promise<{
    cupSlug: string;
  }>;
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

function displayPlayer(row: PlayerCupResult) {
  return row.short_name || row.player_name;
}

function displayTeam(row: PlayerCupResult) {
  return row.team_display_name || row.team_name || "—";
}

export const dynamic = "force-dynamic";

export default async function CupDetailPage({ params }: PageProps) {
  const { cupSlug } = await params;
  const supabase = getSupabaseClient();

  const [
    { data: summaryData, error: summaryError },
    { data: roundData, error: roundError },
    { data: playerData, error: playerError },
  ] = await Promise.all([
    supabase
      .from("cup_prediction_competition_summary")
      .select("*")
      .eq("competition_slug", cupSlug)
      .maybeSingle(),
    supabase
      .from("cup_prediction_round_summary")
      .select("*")
      .eq("competition_slug", cupSlug)
      .order("round_sort_order", { ascending: true }),
    supabase
      .from("cup_prediction_player_results")
      .select("*")
      .eq("competition_slug", cupSlug)
      .order("prediction_correct", { ascending: false })
      .order("predicted_round_reached", { ascending: true })
      .order("player_name", { ascending: true }),
  ]);

  if (summaryError) throw new Error(summaryError.message);
  if (roundError) throw new Error(roundError.message);
  if (playerError) throw new Error(playerError.message);
  if (!summaryData) notFound();

  const summary = summaryData as CupSummary;
  const rounds = (roundData ?? []) as RoundSummary[];
  const players = (playerData ?? []) as PlayerCupResult[];

  const correctPlayers = players.filter((player) => player.prediction_correct === true);
  const wrongPlayers = players.filter((player) => player.prediction_correct === false);
  const awaitingPlayers = players.filter((player) => player.prediction_correct === null);
  const totalPlayers = summary.total_players ?? players.length;
  const maxRoundCount = Math.max(...rounds.map((round) => round.prediction_count), 1);
  const pageTitle = summary.competition;

  return (
    <main className="min-h-screen bg-[var(--nffc-black,#000000)] px-2 py-3 font-mono text-[var(--nffc-white,#f5f5f5)] sm:px-4 lg:px-6">
      <section className="mx-auto max-w-[1540px]">
        <SiteMenu title={`${pageTitle} Board`} />

        <section className="mt-3 border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)]">
          <div className="bg-[var(--nffc-red,#e50914)] px-3 py-3 text-sm font-black uppercase tracking-[0.18em] text-white">
            NFFC Stats / Cup Specialist Board
          </div>

          <div className="grid gap-4 p-3 md:grid-cols-[1fr_430px] md:p-5">
            <div>
              <Link
                href="/cups"
                className="mb-4 inline-block border border-[#242424] bg-[var(--nffc-black,#000000)] px-3 py-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--nffc-muted,#a7a7a7)] hover:border-[var(--nffc-red,#e50914)] hover:text-white"
              >
                ← Cups
              </Link>

              <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-[var(--stat-yellow,#ffe44d)] md:text-9xl">
                {pageTitle}
              </h1>

              <p className="mt-4 max-w-4xl text-xs font-black uppercase leading-5 tracking-[0.08em] text-white md:text-lg">
                Predicted round distribution and Cup Specialist Bonus results.
              </p>
            </div>

            <div className="grid content-start gap-px bg-[#242424]">
              <HeroStat label="Actual round" value={formatRound(summary.actual_round_reached)} tone="yellow" />
              <HeroStat
                label="Most common"
                value={`${formatRound(summary.most_common_predicted_round)} / ${summary.most_common_prediction_count ?? 0}`}
                tone="cyan"
              />
              <HeroStat label="Correct picks" value={`${summary.correct_players} / ${totalPlayers}`} tone="green" />
              <HeroStat label="Accuracy" value={formatPercent(summary.correct_percentage)} tone="white" />
            </div>
          </div>
        </section>

        <section className="mt-3 grid gap-3 xl:grid-cols-[1fr_360px]">
          <section className="border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)]">
            <SectionTitle title="Predicted Round Distribution" />

            <div className="grid gap-px bg-[#242424]">
              {rounds.map((round) => (
                <RoundDistributionRow
                  key={round.predicted_round_reached}
                  round={round}
                  maxRoundCount={maxRoundCount}
                  actualRound={summary.actual_round_reached}
                />
              ))}
            </div>
          </section>

          <section className="border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)]">
            <SectionTitle title="Social Stats" />
            <div className="grid gap-px bg-[#242424]">
              <HeroStat label="Players" value={String(totalPlayers)} tone="white" />
              <HeroStat label="Correct" value={String(summary.correct_players ?? 0)} tone="green" />
              <HeroStat label="Wrong" value={String(summary.wrong_players ?? 0)} tone="red" />
              <HeroStat label="Bonus pts" value={String(summary.total_bonus_awarded ?? 0)} tone="cyan" />
              <HeroStat label="Awarded" value={summary.awarded_gameweek_label ?? "TBC"} tone="yellow" />
            </div>
          </section>
        </section>

        <section className="mt-3 grid gap-3">
          <PlayerResultPanel
            title="Correct Round Picks"
            subtitle={`${correctPlayers.length} player${correctPlayers.length === 1 ? "" : "s"} called ${formatRound(summary.actual_round_reached)}`}
            players={correctPlayers}
            tone="green"
          />

          <PlayerResultPanel
            title={summary.actual_round_reached ? "Wrong Round Picks" : "Awaiting Result"}
            subtitle={
              summary.actual_round_reached
                ? `${wrongPlayers.length} player${wrongPlayers.length === 1 ? "" : "s"} missed the round`
                : `${awaitingPlayers.length} player${awaitingPlayers.length === 1 ? "" : "s"} awaiting final cup result`
            }
            players={summary.actual_round_reached ? wrongPlayers : awaitingPlayers}
            tone={summary.actual_round_reached ? "red" : "yellow"}
          />
        </section>
      </section>
    </main>
  );
}

function SiteMenu({ title }: { title: string }) {
  return (
    <nav className="grid gap-2 border border-[var(--nffc-red,#e50914)] bg-[var(--nffc-red,#e50914)] p-2 md:grid-cols-[auto_1fr_auto_auto_auto] md:items-center">
      <Link href="/" className="flex items-center bg-[var(--nffc-black,#000000)] px-3 py-3">
        <img
          src="/brand/nffc-podcast-prediction-league-banner.png"
          alt="NFFC Podcast Prediction League"
          className="h-10 w-auto"
        />
      </Link>

      <div className="hidden text-2xl font-black uppercase tracking-[0.08em] text-white md:block">
        {title}
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

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="bg-[var(--nffc-red,#e50914)] px-3 py-3 text-sm font-black uppercase tracking-[0.14em] text-white md:text-xl">
      {title}
    </div>
  );
}

function HeroStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "yellow" | "cyan" | "red" | "white";
}) {
  const toneClass =
    tone === "green"
      ? "text-[var(--stat-green,#22e55e)]"
      : tone === "yellow"
        ? "text-[var(--stat-yellow,#ffe44d)]"
        : tone === "cyan"
          ? "text-[var(--stat-cyan,#59efff)]"
          : tone === "red"
            ? "text-[var(--stat-wrong,#ff3030)]"
            : "text-white";

  return (
    <div className="grid grid-cols-[130px_1fr] bg-[var(--nffc-black,#000000)] text-xs font-black uppercase tracking-[0.08em] md:grid-cols-[190px_1fr] md:text-base">
      <div className="border-r border-[#242424] px-3 py-3 text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className={`px-3 py-3 text-right md:py-3 ${toneClass}`}>{value}</div>
    </div>
  );
}

function RoundDistributionRow({
  round,
  maxRoundCount,
  actualRound,
}: {
  round: RoundSummary;
  maxRoundCount: number;
  actualRound: string | null;
}) {
  const isActual = actualRound === round.predicted_round_reached;
  const width = `${Math.max(7, (round.prediction_count / maxRoundCount) * 100)}%`;

  return (
    <div className="grid gap-2 bg-[var(--nffc-black,#000000)] px-3 py-3 md:grid-cols-[250px_1fr_150px] md:items-center">
      <div className={`text-sm font-black uppercase tracking-[0.08em] md:text-xl ${isActual ? "text-[var(--stat-green,#22e55e)]" : "text-white"}`}>
        {round.predicted_round_reached}
      </div>

      <div className="h-7 border border-[#242424] bg-[#050505] md:h-9">
        <div className="h-full bg-[var(--stat-yellow,#ffe44d)]" style={{ width }} />
      </div>

      <div className="text-right text-xs font-black uppercase tracking-[0.08em] md:text-lg">
        <span className="inline-block min-w-6 text-center text-[var(--stat-yellow,#ffe44d)]">
          {round.prediction_count}
        </span>
        <span className="px-1 text-[var(--nffc-muted,#a7a7a7)]">/</span>
        <span className="inline-block min-w-12 text-right text-white">
          {formatPercent(round.prediction_percentage)}
        </span>
      </div>
    </div>
  );
}

function PlayerResultPanel({
  title,
  subtitle,
  players,
  tone,
}: {
  title: string;
  subtitle: string;
  players: PlayerCupResult[];
  tone: "green" | "red" | "yellow";
}) {
  const toneClass =
    tone === "green"
      ? "text-[var(--stat-green,#22e55e)]"
      : tone === "yellow"
        ? "text-[var(--stat-yellow,#ffe44d)]"
        : "text-[var(--stat-wrong,#ff3030)]";

  const rowToneBorder =
    tone === "green"
      ? "border-l-[var(--stat-green,#22e55e)]"
      : tone === "yellow"
        ? "border-l-[var(--stat-yellow,#ffe44d)]"
        : "border-l-[var(--stat-wrong,#ff3030)]";

  return (
    <section className="w-full border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)]">
      <SectionTitle title={title} />

      <div className="border-b border-[#242424] px-3 py-3 text-xs font-black uppercase tracking-[0.1em] md:text-base text-[var(--nffc-muted,#a7a7a7)]">
        {subtitle}
      </div>

      <div className="hidden lg:block">
        <div className="grid grid-cols-[70px_minmax(230px,1fr)_minmax(230px,1fr)_minmax(190px,260px)_95px] border-b border-[var(--nffc-red,#e50914)] text-xs font-black uppercase tracking-[0.14em] text-white md:text-base">
          <div className="border-r border-[#242424] px-2 py-3 text-center">#</div>
          <div className="border-r border-[#242424] px-3 py-3">Player</div>
          <div className="border-r border-[#242424] px-3 py-3">Team</div>
          <div className="border-r border-[#242424] px-3 py-3">Pick</div>
          <div className="px-2 py-3 text-center">Pts</div>
        </div>

        {players.length ? (
          players.map((player, index) => (
            <div
              key={player.id}
              className="grid grid-cols-[70px_minmax(230px,1fr)_minmax(230px,1fr)_minmax(190px,260px)_95px] border-b border-[#242424] text-sm font-black uppercase tracking-[0.06em] text-white md:text-lg last:border-b-0"
            >
              <div className="border-r border-[#242424] px-2 py-3 text-center text-[var(--nffc-red,#e50914)]">
                {index + 1}
              </div>
              <div className="border-r border-[#242424] px-3 py-3">
                {displayPlayer(player)}
              </div>
              <div className="border-r border-[#242424] px-3 py-3 text-[var(--nffc-muted,#a7a7a7)]">
                {displayTeam(player)}
              </div>
              <div className="border-r border-[#242424] px-3 py-3">
                {player.predicted_round_reached ?? "—"}
              </div>
              <div className={`px-2 py-3 text-center tabular-nums ${toneClass}`}>
                {player.bonus_awarded ?? 0}
              </div>
            </div>
          ))
        ) : (
          <div className="px-3 py-4 text-sm font-black uppercase tracking-[0.08em] md:text-xl text-[var(--nffc-muted,#a7a7a7)]">
            No players in this group.
          </div>
        )}
      </div>

      <div className="grid gap-px bg-[#242424] lg:hidden">
        {players.length ? (
          players.map((player, index) => (
            <div
              key={player.id}
              className={`grid grid-cols-[34px_minmax(0,1fr)_52px] items-center border-l-4 ${rowToneBorder} bg-[var(--nffc-black,#000000)] px-2 py-2`}
            >
              <div className="text-xs font-black uppercase tabular-nums text-[var(--nffc-red,#e50914)]">
                {index + 1}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-black uppercase leading-4 text-white">
                  {displayPlayer(player)}
                  <span className="px-1 text-[var(--nffc-muted,#a7a7a7)]">/</span>
                  <span className={toneClass}>{player.predicted_round_reached ?? "—"}</span>
                </div>
                <div className="truncate text-[0.64rem] font-black uppercase leading-3 tracking-[0.06em] text-[var(--nffc-muted,#a7a7a7)]">
                  {displayTeam(player)}
                </div>
              </div>

              <div className={`text-right text-sm font-black uppercase tabular-nums ${toneClass}`}>
                {player.bonus_awarded ?? 0} pts
              </div>
            </div>
          ))
        ) : (
          <div className="bg-[var(--nffc-black,#000000)] px-3 py-4 text-sm font-black uppercase tracking-[0.08em] md:text-xl text-[var(--nffc-muted,#a7a7a7)]">
            No players in this group.
          </div>
        )}
      </div>
    </section>
  );
}

