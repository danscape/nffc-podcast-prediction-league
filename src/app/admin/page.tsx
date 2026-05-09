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

type AuditRow = {
  id: string;
  created_at: string;
  actor_type: string;
  actor_label: string;
  target_player_name: string;
  target_team_name: string | null;
  fixture_gameweek: number | null;
  fixture_label: string | null;
  fixture_opponent_short: string | null;
  fixture_venue: string | null;
  old_prediction: string | null;
  new_prediction: string | null;
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
    { data: auditData, error: auditError },
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
    supabase
      .from("prediction_change_audit")
      .select(
        "id, created_at, actor_type, actor_label, target_player_name, target_team_name, fixture_gameweek, fixture_label, fixture_opponent_short, fixture_venue, old_prediction, new_prediction"
      )
      .order("created_at", { ascending: false })
      .limit(8),
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
    auditError?.message,
  ].filter(Boolean);

  const completedFixtureCount = completedFixturesData?.length ?? 0;
  const nextFixture = (nextFixtureData?.[0] ?? null) as FixtureRow | null;
  const latestFixture = (latestFixtureData?.[0] ?? null) as FixtureRow | null;
  const auditRows = (auditData ?? []) as AuditRow[];

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
            title="Audit Log"
            description="See who changed what predictions and when."
            href="/admin/audit"
            cta="Open audit log"
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

        <AuditPreviewPanel rows={auditRows} />
      </section>
    </main>
  );
}


function auditFixtureLabel(row: AuditRow) {
  return [
    row.fixture_label ?? (row.fixture_gameweek ? `GW${row.fixture_gameweek}` : "GW?"),
    row.fixture_opponent_short,
    row.fixture_venue,
  ]
    .filter(Boolean)
    .join(" ");
}

function auditActorTone(actorType: string) {
  if (actorType === "admin") return "text-[var(--stat-yellow,#ffe44d)]";
  if (actorType === "player") return "text-[var(--stat-cyan,#59efff)]";
  if (actorType === "historic") return "text-[var(--stat-orange,#ff9f1c)]";
  return "text-white";
}

function AuditPreviewPanel({ rows }: { rows: AuditRow[] }) {
  return (
    <section className="mt-6 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-5 shadow-none md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase text-[var(--stat-yellow,#ffe44d)]">
            Prediction Audit Log
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--nffc-muted,#a7a7a7)]">
            Latest recorded prediction changes across player and admin saves.
          </p>
        </div>

        <Link
          href="/admin/audit"
          className="rounded-none border border-[var(--stat-yellow,#ffe44d)] bg-[var(--nffc-black,#000000)] px-5 py-3 text-center text-xs font-black uppercase tracking-wide text-[var(--stat-yellow,#ffe44d)] transition hover:bg-[var(--stat-yellow,#ffe44d)] hover:text-black"
        >
          Open full audit log
        </Link>
      </div>

      <div className="mt-4 border border-[#242424] bg-[var(--nffc-black,#000000)]">
        <div className="hidden grid-cols-[160px_120px_minmax(150px,1fr)_minmax(150px,1fr)_150px_70px_70px] border-b border-[var(--nffc-red,#e50914)] text-xs font-black uppercase tracking-[0.12em] text-white xl:grid">
          <div className="border-r border-[#242424] px-3 py-2">When</div>
          <div className="border-r border-[#242424] px-3 py-2">Actor</div>
          <div className="border-r border-[#242424] px-3 py-2">Player</div>
          <div className="border-r border-[#242424] px-3 py-2">Team</div>
          <div className="border-r border-[#242424] px-3 py-2">Fixture</div>
          <div className="border-r border-[#242424] px-3 py-2 text-center">Old</div>
          <div className="px-3 py-2 text-center">New</div>
        </div>

        {rows.length ? (
          rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-px border-b border-[#242424] bg-[#242424] last:border-b-0 xl:grid-cols-[160px_120px_minmax(150px,1fr)_minmax(150px,1fr)_150px_70px_70px] xl:gap-0"
            >
              <div className="bg-[var(--nffc-black,#000000)] px-3 py-2 text-xs font-black uppercase tracking-[0.06em] text-white xl:border-r xl:border-[#242424]">
                {formatDateTime(row.created_at)}
              </div>
              <div className={`bg-[var(--nffc-black,#000000)] px-3 py-2 text-xs font-black uppercase tracking-[0.08em] xl:border-r xl:border-[#242424] ${auditActorTone(row.actor_type)}`}>
                {row.actor_label}
              </div>
              <div className="bg-[var(--nffc-black,#000000)] px-3 py-2 text-sm font-black uppercase text-white xl:border-r xl:border-[#242424]">
                {row.target_player_name}
              </div>
              <div className="bg-[var(--nffc-black,#000000)] px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--nffc-muted,#a7a7a7)] xl:border-r xl:border-[#242424]">
                {row.target_team_name ?? "—"}
              </div>
              <div className="bg-[var(--nffc-black,#000000)] px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-white xl:border-r xl:border-[#242424]">
                {auditFixtureLabel(row)}
              </div>
              <div className="bg-[var(--nffc-black,#000000)] px-3 py-2 text-center text-lg font-black uppercase text-[var(--stat-wrong,#ff3030)] xl:border-r xl:border-[#242424]">
                {row.old_prediction ?? "—"}
              </div>
              <div className="bg-[var(--nffc-black,#000000)] px-3 py-2 text-center text-lg font-black uppercase text-[var(--stat-green,#22e55e)]">
                {row.new_prediction ?? "—"}
              </div>
            </div>
          ))
        ) : (
          <div className="px-3 py-5 text-sm font-black uppercase tracking-[0.1em] text-[var(--nffc-muted,#a7a7a7)]">
            No audit rows recorded yet.
          </div>
        )}
      </div>
    </section>
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
