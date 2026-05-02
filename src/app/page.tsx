import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type AppSetting = {
  key: string;
  value: string;
};

type IndividualLeaderboardRow = {
  player_id: string;
  player_name: string;
  short_name: string | null;
  team_name: string;
  base_points: number;
  streak_bonus: number;
  maverick_bonus: number;
  rogue_bonus: number;
  cup_bonus: number;
  total_points: number;
  correct_predictions: number;
  fixtures_scored: number;
  accuracy_percentage: number;
  bonus_points: number | null;
  accuracy_whole_percentage: number | null;
  best_streak: number | null;
  current_streak: number | null;
};

type TeamLeaderboardRow = {
  team_id: string;
  team_name: string;
  display_name: string | null;
  x_handle: string | null;
  total_team_points: number;
  clean_sweeps: number;
  blanks: number;
  best_player_accuracy_percentage: number;
  logo_url: string | null;
  logo_alt: string | null;
  brand_colour: string | null;
  mvp_player_id?: string | null;
  mvp_player_name?: string | null;
  mvp_short_name?: string | null;
  mvp_accuracy_percentage?: number | null;
};

type FixtureRow = {
  gameweek: number;
  gameweek_label: string;
  opponent: string;
  opponent_short: string;
  venue: "H" | "A";
  kickoff_at: string | null;
  status: string;
  result_confirmed: boolean;
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1).replace(".0", "");
}

function formatDateTime(value: string | null) {
  if (!value) return "TBC";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function displayPlayerName(row: IndividualLeaderboardRow) {
  return row.short_name ?? row.player_name;
}

function getBonusPoints(row: IndividualLeaderboardRow) {
  return (
    row.bonus_points ??
    row.streak_bonus + row.maverick_bonus + row.rogue_bonus + row.cup_bonus
  );
}

function getAccuracyWhole(row: IndividualLeaderboardRow) {
  return row.accuracy_whole_percentage ?? Math.round(Number(row.accuracy_percentage ?? 0));
}

function displayMvpName(row: TeamLeaderboardRow) {
  return row.mvp_short_name ?? row.mvp_player_name ?? "—";
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "0%";
  return `${Math.round(Number(value))}%`;
}

export default async function HomePage() {
  const supabase = getSupabaseClient();

  const [
    { count: teamCount },
    { count: playerCount },
    { count: fixtureCount },
    { count: predictionCount },
    { data: settingsData },
    { data: individualData },
    { data: teamData },
    { data: nextFixtureData },
    { data: completedFixturesData },
  ] = await Promise.all([
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
    supabase.from("fixtures").select("*", { count: "exact", head: true }),
    supabase.from("current_predictions").select("*", { count: "exact", head: true }),
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["current_season", "season_label"]),
    supabase
      .from("individual_leaderboard")
      .select("*")
      .order("total_points", { ascending: false })
      .order("accuracy_whole_percentage", { ascending: false })
      .order("player_name", { ascending: true })
      .range(0, 1000),
    supabase
      .from("team_leaderboard")
      .select("*")
      .order("total_team_points", { ascending: false })
      .order("clean_sweeps", { ascending: false })
      .order("blanks", { ascending: true })
      .order("team_name", { ascending: true })
      .range(0, 1000),
    supabase
      .from("fixtures")
      .select(
        "gameweek, gameweek_label, opponent, opponent_short, venue, kickoff_at, status, result_confirmed"
      )
      .neq("status", "finished")
      .order("gameweek", { ascending: true })
      .limit(1),
    supabase
      .from("fixtures")
      .select("gameweek")
      .eq("status", "finished")
      .eq("result_confirmed", true),
  ]);

  const settings = new Map(
    ((settingsData ?? []) as AppSetting[]).map((setting) => [
      setting.key,
      setting.value,
    ])
  );

  const season =
    settings.get("season_label") ?? settings.get("current_season") ?? "2025/26";
  const individualRows = (individualData ?? []) as IndividualLeaderboardRow[];
  const teamRows = (teamData ?? []) as TeamLeaderboardRow[];
  const nextFixture = (nextFixtureData?.[0] ?? null) as FixtureRow | null;
  const completedFixtureCount = completedFixturesData?.length ?? 0;

  const totalPossiblePredictions = (playerCount ?? 0) * (fixtureCount ?? 0);
  const predictionCompletion =
    totalPossiblePredictions > 0
      ? Math.round(((predictionCount ?? 0) / totalPossiblePredictions) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-[#F7F6F2] px-4 py-6 text-[#111111] sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-5 shadow-sm md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex w-fit border-b-2 border-[#C8102E] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                🔮 NFFC Podcast Prediction League
              </div>

              <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-tight text-[#C8102E] md:text-7xl">
                NFFC Podcast
                <span className="block text-[#111111]">Prediction League</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base font-semibold leading-7 text-neutral-700 md:text-lg">
                Individual and team score prediction game for the Forest podcast
                community. Track the tables, follow the season mood, and see who
                called it right.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/admin/login"
                  className="rounded-full bg-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
                >
                  Admin login
                </Link>
                <a
                  href="#leaderboards"
                  className="rounded-full border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E]"
                >
                  View leaderboards
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-[#D9D6D1] bg-[#F7F6F2] p-5 shadow-sm">
              <div className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                Current setup
              </div>

              <SetupRow label="Season" value={season} />
              <SetupRow label="Teams" value={teamCount ?? 0} />
              <SetupRow label="Players" value={playerCount ?? 0} />
              <SetupRow label="Fixtures" value={fixtureCount ?? 0} />
              <SetupRow label="Completed GWs" value={completedFixtureCount} />
              <SetupRow label="Timezone" value="Europe/London" />
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-3 md:grid-cols-4">
          <StatCard label="Current season" value={season} />
          <StatCard label="Predictions stored" value={predictionCount ?? 0} />
          <StatCard label="Prediction coverage" value={`${predictionCompletion}%`} />
          <StatCard
            label="Next fixture"
            value={
              nextFixture
                ? `${nextFixture.gameweek_label} ${nextFixture.opponent_short} ${nextFixture.venue}`
                : "TBC"
            }
            subValue={nextFixture ? formatDateTime(nextFixture.kickoff_at) : undefined}
          />
        </section>

        <section id="leaderboards" className="grid gap-6">
          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase text-[#111111]">
                  Individual leaderboard
                </h2>
                <p className="mt-1 text-sm font-semibold text-neutral-600">
                  All players ranked by total score, then accuracy.
                </p>
              </div>
              <div className="text-sm font-black uppercase tracking-wide text-[#C8102E]">
                {individualRows.length} players
              </div>
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-[#D9D6D1] 2xl:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#111111] text-white">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3 text-right">Total Score</th>
                    <th className="px-4 py-3 text-right">Points</th>
                    <th className="px-4 py-3 text-right">Bonus Pts</th>
                    <th className="px-4 py-3 text-right">Correct</th>
                    <th className="px-4 py-3 text-right">Accuracy</th>
                    <th className="px-4 py-3 text-right">Best Streak</th>
                    <th className="px-4 py-3 text-right">Current Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {individualRows.length ? (
                    individualRows.map((row, index) => (
                      <tr
                        key={row.player_id}
                        className="border-b border-[#E7E2DA] last:border-b-0"
                      >
                        <td className="px-4 py-3 text-xl font-black text-[#C8102E]">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-black">{displayPlayerName(row)}</div>
                          {row.short_name && row.short_name !== row.player_name && (
                            <div className="text-xs text-neutral-500">
                              {row.player_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold">{row.team_name}</td>
                        <td className="px-4 py-3 text-right text-2xl font-black">
                          {formatPoints(row.total_points)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {formatPoints(row.base_points)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {formatPoints(getBonusPoints(row))}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {row.correct_predictions}/{row.fixtures_scored}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {getAccuracyWhole(row)}%
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {row.best_streak ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {row.current_streak ?? 0}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-neutral-600" colSpan={10}>
                        Individual leaderboard not available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 2xl:hidden">
              {individualRows.length ? (
                individualRows.map((row, index) => (
                  <div
                    key={row.player_id}
                    className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                          Rank {index + 1}
                        </div>
                        <div className="mt-1 text-xl font-black">
                          {displayPlayerName(row)}
                        </div>
                        <div className="text-sm font-semibold text-neutral-600">
                          {row.team_name}
                        </div>
                      </div>
                      <div className="text-3xl font-black text-[#C8102E]">
                        {formatPoints(row.total_points)}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold md:grid-cols-4">
                      <MiniStat label="Points" value={formatPoints(row.base_points)} />
                      <MiniStat
                        label="Bonus Pts"
                        value={formatPoints(getBonusPoints(row))}
                      />
                      <MiniStat
                        label="Correct"
                        value={`${row.correct_predictions}/${row.fixtures_scored}`}
                      />
                      <MiniStat label="Accuracy" value={`${getAccuracyWhole(row)}%`} />
                      <MiniStat label="Best Streak" value={row.best_streak ?? 0} />
                      <MiniStat
                        label="Current Streak"
                        value={row.current_streak ?? 0}
                      />
                      <MiniStat
                        label="Streaker"
                        value={formatPoints(row.streak_bonus)}
                      />
                      <MiniStat
                        label="Mav/Rogue/Cup"
                        value={`${formatPoints(row.maverick_bonus)}/${formatPoints(
                          row.rogue_bonus
                        )}/${formatPoints(row.cup_bonus)}`}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-600">
                  Individual leaderboard not available yet.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.55fr]">
            <div className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black uppercase text-[#111111]">
                    Team table
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-neutral-600">
                    Podcast team standings with MVP player.
                  </p>
                </div>
                <div className="text-sm font-black uppercase tracking-wide text-[#C8102E]">
                  {teamRows.length} teams
                </div>
              </div>

              <div className="grid gap-3">
                {teamRows.length ? (
                  teamRows.map((row, index) => (
                    <div
                      key={row.team_id}
                      className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {row.logo_url ? (
                            <img
                              src={row.logo_url}
                              alt={row.logo_alt ?? row.display_name ?? row.team_name}
                              className="h-12 w-12 rounded-xl border border-[#D9D6D1] bg-white object-contain"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#D9D6D1] bg-white text-xs font-black text-[#C8102E]">
                              {row.team_name.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                              Rank {index + 1}
                            </div>
                            <div className="mt-1 text-lg font-black">
                              {row.display_name ?? row.team_name}
                            </div>
                            <div className="mt-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                              Clean sweeps {row.clean_sweeps} · Blanks {row.blanks}
                            </div>
                            <div className="mt-2 text-xs font-bold uppercase tracking-wide text-neutral-600">
                              MVP {displayMvpName(row)} ·{" "}
                              {formatPercent(
                                row.mvp_accuracy_percentage ??
                                  row.best_player_accuracy_percentage
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-3xl font-black text-[#C8102E]">
                          {formatPoints(row.total_team_points)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-600">
                    Team leaderboard not available yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-[#D9D6D1] bg-[#111111] p-5 text-white shadow-sm md:p-6">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                Season pulse
              </div>
              <h2 className="mt-3 text-3xl font-black uppercase">
                {nextFixture
                  ? `${nextFixture.gameweek_label}: Forest ${
                      nextFixture.venue === "H" ? "v" : "at"
                    } ${nextFixture.opponent_short}`
                  : "Next fixture TBC"}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-neutral-300">
                {nextFixture
                  ? `Kick-off: ${formatDateTime(
                      nextFixture.kickoff_at
                    )}. Predictions lock 5 minutes before kick-off.`
                  : "Fixture information will update from the API sync."}
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function SetupRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#D9D6D1] py-3 last:border-b-0">
      <span className="text-sm font-semibold text-neutral-500">{label}</span>
      <span className="text-lg font-black text-[#111111]">{value}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#D9D6D1] bg-white p-4 shadow-sm">
      <div className="text-xs font-black uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black text-[#C8102E]">{value}</div>
      {subValue && (
        <div className="mt-2 text-xs font-semibold text-neutral-500">
          {subValue}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}