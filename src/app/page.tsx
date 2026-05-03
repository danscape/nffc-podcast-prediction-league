import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import HomepageLeaderboardTabs from "@/components/leaderboards/web/HomepageLeaderboardTabs";

type AppSetting = {
  key: string;
  value: string;
};

type IndividualLeaderboardRow = {
  player_id: string;
  player_name: string;
  short_name: string | null;
  table_display_name?: string | null;
  team_name: string;
  team_display_name?: string | null;
  team_abbreviation?: string | null;
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
  team_logo_url?: string | null;
  team_logo_alt?: string | null;
  team_brand_colour?: string | null;
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
  latest_gameweek?: number | null;
  latest_gameweek_label?: string | null;
  latest_opponent_short?: string | null;
  points_this_week?: number | null;
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

function formatDateTime(value: string | null) {
  if (!value) return "TBC";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(1).replace(".0", "");
}

function formatTeamPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "0%";
  return `${Math.round(Number(value))}%`;
}

function displayPlayerName(row: IndividualLeaderboardRow | null) {
  if (!row) return "TBC";
  return row.table_display_name ?? row.short_name ?? row.player_name;
}

function displayTeamName(row: TeamLeaderboardRow | null) {
  if (!row) return "TBC";
  return row.display_name ?? row.team_name;
}

function getAccuracyWhole(row: IndividualLeaderboardRow) {
  return (
    row.accuracy_whole_percentage ??
    Math.round(Number(row.accuracy_percentage ?? 0))
  );
}

function getBonusPoints(row: IndividualLeaderboardRow) {
  return (
    row.bonus_points ??
    row.streak_bonus + row.maverick_bonus + row.rogue_bonus + row.cup_bonus
  );
}

function calculateAverageAccuracy(rows: IndividualLeaderboardRow[]) {
  const scoredRows = rows.filter((row) => Number(row.fixtures_scored ?? 0) > 0);

  if (!scoredRows.length) return 0;

  const totalAccuracy = scoredRows.reduce((total, row) => {
    return total + getAccuracyWhole(row);
  }, 0);

  return Math.round(totalAccuracy / scoredRows.length);
}

function getLongestStreaker(rows: IndividualLeaderboardRow[]) {
  return [...rows]
    .filter((row) => Number(row.best_streak ?? 0) > 0)
    .sort((a, b) => {
      const streakDifference = Number(b.best_streak ?? 0) - Number(a.best_streak ?? 0);
      if (streakDifference !== 0) return streakDifference;

      const pointsDifference = Number(b.total_points ?? 0) - Number(a.total_points ?? 0);
      if (pointsDifference !== 0) return pointsDifference;

      return displayPlayerName(a).localeCompare(displayPlayerName(b));
    })[0] ?? null;
}

function getMostAccuratePlayer(rows: IndividualLeaderboardRow[]) {
  return [...rows]
    .filter((row) => Number(row.fixtures_scored ?? 0) > 0)
    .sort((a, b) => {
      const accuracyDifference = getAccuracyWhole(b) - getAccuracyWhole(a);
      if (accuracyDifference !== 0) return accuracyDifference;

      const correctDifference =
        Number(b.correct_predictions ?? 0) - Number(a.correct_predictions ?? 0);
      if (correctDifference !== 0) return correctDifference;

      const pointsDifference = Number(b.total_points ?? 0) - Number(a.total_points ?? 0);
      if (pointsDifference !== 0) return pointsDifference;

      return displayPlayerName(a).localeCompare(displayPlayerName(b));
    })[0] ?? null;
}

function getBonusKing(rows: IndividualLeaderboardRow[]) {
  return [...rows]
    .filter((row) => getBonusPoints(row) > 0)
    .sort((a, b) => {
      const bonusDifference = getBonusPoints(b) - getBonusPoints(a);
      if (bonusDifference !== 0) return bonusDifference;

      const pointsDifference = Number(b.total_points ?? 0) - Number(a.total_points ?? 0);
      if (pointsDifference !== 0) return pointsDifference;

      return displayPlayerName(a).localeCompare(displayPlayerName(b));
    })[0] ?? null;
}

export default async function HomePage() {
  const supabase = getSupabaseClient();

  const [
    { count: teamCount },
    { count: playerCount },
    { count: fixtureCount },
    { data: settingsData },
    { data: individualData },
    { data: teamData },
    { data: nextFixtureData },
    { data: completedFixturesData },
  ] = await Promise.all([
    supabase.from("teams").select("*", { count: "exact", head: true }).eq("active", true),
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
    supabase.from("fixtures").select("*", { count: "exact", head: true }),
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
      .order("best_player_accuracy_percentage", { ascending: false })
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

  const currentLeader = individualRows[0] ?? null;
  const leadingTeam = teamRows[0] ?? null;
  const averageAccuracy = calculateAverageAccuracy(individualRows);
  const longestStreaker = getLongestStreaker(individualRows);
  const mostAccuratePlayer = getMostAccuratePlayer(individualRows);
  const bonusKing = getBonusKing(individualRows);

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
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[#111111] bg-[#111111] p-5 text-white shadow-sm md:p-6">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
              Season pulse
            </div>

            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight md:text-4xl">
              {nextFixture
                ? `${nextFixture.gameweek_label}: Forest ${
                    nextFixture.venue === "H" ? "v" : "at"
                  } ${nextFixture.opponent_short}`
                : "Next fixture TBC"}
            </h2>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-neutral-300">
              {nextFixture
                ? `Kick-off: ${formatDateTime(
                    nextFixture.kickoff_at
                  )}. Predictions lock 5 minutes before kick-off.`
                : "Fixture information will update from the league sync."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <DarkPulseStat
                label="Longest streaker"
                value={displayPlayerName(longestStreaker)}
                subValue={
                  longestStreaker
                    ? `${longestStreaker.best_streak ?? 0} correct in a row`
                    : undefined
                }
              />

              <DarkPulseStat
                label="Current leader"
                value={displayPlayerName(currentLeader)}
                subValue={
                  currentLeader
                    ? `${formatPoints(currentLeader.total_points)} pts`
                    : undefined
                }
              />

              <DarkPulseStat
                label="Leading team"
                value={displayTeamName(leadingTeam)}
                subValue={
                  leadingTeam
                    ? `${formatTeamPoints(leadingTeam.total_team_points)} pts`
                    : undefined
                }
              />

              <DarkPulseStat
                label="Most accurate"
                value={displayPlayerName(mostAccuratePlayer)}
                subValue={
                  mostAccuratePlayer
                    ? `${formatPercent(getAccuracyWhole(mostAccuratePlayer))} accuracy`
                    : undefined
                }
              />

              <DarkPulseStat
                label="Bonus king"
                value={displayPlayerName(bonusKing)}
                subValue={bonusKing ? `${formatPoints(getBonusPoints(bonusKing))} bonus pts` : undefined}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <LightPulseStat label="Completed GWs" value={completedFixtureCount} />
            <LightPulseStat label="Players" value={playerCount ?? 0} />
            <LightPulseStat label="Teams" value={teamCount ?? 0} />
            <LightPulseStat
              label="Average accuracy"
              value={formatPercent(averageAccuracy)}
              highlight
            />
          </div>
        </section>

        <HomepageLeaderboardTabs
          individualRows={individualRows}
          teamRows={teamRows}
        />
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

function DarkPulseStat({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="text-xs font-black uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-black leading-tight text-white">{value}</div>
      {subValue && (
        <div className="mt-2 text-xs font-bold uppercase tracking-wide text-[#C8102E]">
          {subValue}
        </div>
      )}
    </div>
  );
}

function LightPulseStat({
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
      className={`rounded-3xl border p-5 shadow-sm ${
        highlight
          ? "border-[#C8102E] bg-[#C8102E] text-white"
          : "border-[#D9D6D1] bg-white text-[#111111]"
      }`}
    >
      <div
        className={`text-xs font-black uppercase tracking-wide ${
          highlight ? "text-white/75" : "text-neutral-500"
        }`}
      >
        {label}
      </div>
      <div className="mt-2 text-4xl font-black">{value}</div>
    </div>
  );
}