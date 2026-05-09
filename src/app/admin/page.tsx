import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type FixtureRow = {
  id: string;
  gameweek: number;
  gameweek_label: string;
  opponent: string;
  opponent_short: string;
  venue: "H" | "A";
  kickoff_at: string | null;
  prediction_lock_at?: string | null;
  status: string;
  result_confirmed: boolean;
  home_score: number | null;
  away_score: number | null;
  forest_result: "W" | "D" | "L" | null;
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "TBC";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function formatScore(fixture: FixtureRow | null) {
  if (!fixture) return "—";

  if (fixture.home_score === null || fixture.away_score === null) {
    return "Not entered";
  }

  return `${fixture.home_score}-${fixture.away_score}`;
}

export default async function AdminPage() {
  const supabase = getSupabaseClient();

  const [
    { count: teamCount, error: teamError },
    { count: playerCount, error: playerError },
    { count: fixtureCount, error: fixtureError },
    { count: predictionCount, error: predictionError },
    { data: completedFixturesData, error: completedError },
    { data: nextFixtureData, error: nextFixtureError },
    { data: latestFixtureData, error: latestFixtureError },
    { count: cupCompetitionCount, error: cupCompetitionError },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
    supabase.from("fixtures").select("*", { count: "exact", head: true }),
    supabase
      .from("current_predictions")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("fixtures")
      .select("id")
      .eq("result_confirmed", true)
      .order("gameweek", { ascending: true }),
    supabase
      .from("fixtures")
      .select(
        "id, gameweek, gameweek_label, opponent, opponent_short, venue, kickoff_at, prediction_lock_at, status, result_confirmed, home_score, away_score, forest_result"
      )
      .neq("status", "finished")
      .order("gameweek", { ascending: true })
      .limit(1),
    supabase
      .from("fixtures")
      .select(
        "id, gameweek, gameweek_label, opponent, opponent_short, venue, kickoff_at, prediction_lock_at, status, result_confirmed, home_score, away_score, forest_result"
      )
      .eq("result_confirmed", true)
      .order("gameweek", { ascending: false })
      .limit(1),
    supabase
      .from("cup_competitions")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
  ]);

  const errors = [
    teamError?.message,
    playerError?.message,
    fixtureError?.message,
    predictionError?.message,
    completedError?.message,
    nextFixtureError?.message,
    latestFixtureError?.message,
    cupCompetitionError?.message,
  ].filter(Boolean);

  const completedFixtureCount = completedFixturesData?.length ?? 0;
  const nextFixture = (nextFixtureData?.[0] ?? null) as FixtureRow | null;
  const latestFixture = (latestFixtureData?.[0] ?? null) as FixtureRow | null;

  const totalPossiblePredictions = (playerCount ?? 0) * (fixtureCount ?? 0);
  const predictionCoverage =
    totalPossiblePredictions > 0
      ? Math.round(((predictionCount ?? 0) / totalPossiblePredictions) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-[var(--nffc-black,#000000)] px-4 py-6 font-mono text-[var(--nffc-white,#f5f5f5)] sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-5 shadow-none md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex w-fit border-b-2 border-[var(--nffc-red,#e50914)] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[var(--nffc-red,#e50914)]">
                🔮 Admin
              </div>

              <h1 className="text-4xl font-black uppercase tracking-tight text-[var(--nffc-red,#e50914)] md:text-6xl">
                Control Centre
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--nffc-muted,#a7a7a7)] md:text-base">
                Manage fixtures, predictions, players, teams, cup outcomes,
                reminders, social posts and leaderboard checks for the NFFC
                Podcast Prediction League.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/"
                className="rounded-none border border-[#111111] px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-[var(--nffc-white,#f5f5f5)] transition hover:border-[var(--nffc-red,#e50914)] hover:text-[var(--nffc-red,#e50914)]"
              >
                Public homepage
              </Link>
              <Link
                href="/admin/leaderboards"
                className="rounded-none bg-[var(--nffc-black,#000000)] px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-white transition hover:bg-[var(--nffc-red,#e50914)]"
              >
                Leaderboards
              </Link>
            </div>
          </div>
        </header>

        {errors.length > 0 && (
          <div className="mb-6 rounded-none border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Some dashboard data could not be loaded: {errors.join(" · ")}
          </div>
        )}

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <AdminStat label="Teams" value={teamCount ?? 0} />
          <AdminStat label="Players" value={playerCount ?? 0} />
          <AdminStat label="Fixtures" value={fixtureCount ?? 0} />
          <AdminStat label="Completed GWs" value={completedFixtureCount} />
          <AdminStat
            label="Prediction coverage"
            value={`${predictionCoverage}%`}
            highlight
          />
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-2">
          <FixturePanel
            eyebrow="Next fixture"
            title={
              nextFixture
                ? `${nextFixture.gameweek_label}: Forest ${
                    nextFixture.venue === "H" ? "v" : "at"
                  } ${nextFixture.opponent_short}`
                : "Next fixture TBC"
            }
            rows={[
              ["Kick-off", formatDateTime(nextFixture?.kickoff_at)],
              ["Prediction lock", formatDateTime(nextFixture?.prediction_lock_at)],
              ["Status", nextFixture?.status ?? "TBC"],
            ]}
          />

          <FixturePanel
            eyebrow="Latest confirmed"
            title={
              latestFixture
                ? `${latestFixture.gameweek_label}: ${latestFixture.opponent_short} ${latestFixture.venue}`
                : "No confirmed results yet"
            }
            rows={[
              ["Score", formatScore(latestFixture)],
              ["Forest result", latestFixture?.forest_result ?? "—"],
              ["Status", latestFixture?.status ?? "—"],
            ]}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AdminCard
            title="Leaderboards"
            description="Review individual and team tables after confirmed results."
            href="/admin/leaderboards"
            cta="Open leaderboards"
            accent
          />

          <AdminCard
            title="Fixtures"
            description="Manage league fixtures, kick-off times, result status and confirmed scores."
            href="/admin/fixtures"
            cta="Open fixtures"
          />

          <AdminCard
            title="Predictions"
            description="Review or manage player fixture predictions and access links."
            href="/admin/predictions"
            cta="Open predictions"
          />

          <AdminCard
            title="Players"
            description="Review player records, tokens, team links and active status."
            href="/admin/players"
            cta="Open players"
          />

          <AdminCard
            title="Teams"
            description="Manage podcast teams, parent podcasts, logos and display names."
            href="/admin/teams"
            cta="Open teams"
          />

          <AdminCard
            title="Cups"
            description={`Manage cup competitions, actual rounds and bonuses. ${
              cupCompetitionCount ?? 0
            } active competitions.`}
            href="/admin/cups"
            cta="Open cups"
          />

          <AdminCard
            title="Reminders"
            description="Check and trigger fixture reminder emails before each gameweek."
            href="/admin/reminders"
            cta="Open reminders"
          />

          <AdminCard
            title="Season"
            description="Review season settings, current season config and wider game controls."
            href="/admin/season"
            cta="Open season"
          />

          <AdminCard
            title="Social"
            description="Prepare leaderboard copy, weekly updates and social-output checks."
            href="/admin/social"
            cta="Open social"
          />

          <AdminCard
            title="Login"
            description="Return to the admin login screen or check admin access."
            href="/admin/login"
            cta="Open login"
          />
        </section>

        <section className="mt-6 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-5 shadow-none md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase">Reminder emails</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--nffc-muted,#a7a7a7)]">
                Fixture reminders are currently sent through the API route after
                a dry-run check. Test mode should be used before sending to all
                players.
              </p>
            </div>

            <Link
              href="/admin/reminders"
              className="rounded-none bg-[var(--nffc-black,#000000)] px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-white transition hover:bg-[var(--nffc-red,#e50914)]"
            >
              Open reminders
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}

function AdminStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-none border p-4 shadow-none ${
        highlight
          ? "border-[var(--nffc-red,#e50914)] bg-[var(--nffc-red,#e50914)] text-white"
          : "border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] text-[var(--nffc-white,#f5f5f5)]"
      }`}
    >
      <div
        className={`text-xs font-black uppercase tracking-wide ${
          highlight ? "text-white/75" : "text-[var(--nffc-muted,#a7a7a7)]"
        }`}
      >
        {label}
      </div>
      <div className="mt-1 text-3xl font-black">{value}</div>
    </div>
  );
}

function FixturePanel({
  eyebrow,
  title,
  rows,
}: {
  eyebrow: string;
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-5 shadow-none md:p-6">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-[var(--nffc-red,#e50914)]">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-[var(--nffc-white,#f5f5f5)]">
        {title}
      </h2>

      <div className="mt-4 grid gap-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 rounded-none border border-[rgba(245,245,245,0.35)] bg-[var(--nffc-black,#000000)] px-4 py-3"
          >
            <div className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
              {label}
            </div>
            <div className="text-right text-sm font-black text-[var(--nffc-white,#f5f5f5)]">
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminCard({
  title,
  description,
  href,
  cta,
  accent = false,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-none border p-5 shadow-none transition hover:-translate-y-0.5 hover:shadow-none ${
        accent
          ? "border-[#111111] bg-[var(--nffc-black,#000000)] text-white"
          : "border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] text-[var(--nffc-white,#f5f5f5)]"
      }`}
    >
      <div className="text-xs font-black uppercase tracking-[0.22em] text-[var(--nffc-red,#e50914)]">
        Admin area
      </div>

      <h2 className="mt-3 text-2xl font-black uppercase tracking-tight">
        {title}
      </h2>

      <p
        className={`mt-3 text-sm font-semibold leading-6 ${
          accent ? "text-[var(--nffc-muted,#a7a7a7)]" : "text-[var(--nffc-muted,#a7a7a7)]"
        }`}
      >
        {description}
      </p>

      <div
        className={`mt-5 inline-flex rounded-none px-4 py-2 text-xs font-black uppercase tracking-wide ${
          accent
            ? "bg-[var(--nffc-panel,#070707)] text-[var(--nffc-white,#f5f5f5)]"
            : "border border-[#111111] text-[var(--nffc-white,#f5f5f5)]"
        }`}
      >
        {cta}
      </div>
    </Link>
  );
}
