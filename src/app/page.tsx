import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import HomepageLeaderboardTabs from "@/components/leaderboards/web/HomepageLeaderboardTabs";

type AppSetting = {
  key: string;
  value: string;
};

type IndividualLeaderboardRow = {
  player_id: string;
  player_slug?: string | null;
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
  slug?: string | null;
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

type FixtureTableRow = {
  fixture_id: string;
  gameweek: number;
  gameweek_label: string;
  opponent: string;
  opponent_short: string;
  venue: "H" | "A";
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  forest_result: "W" | "D" | "L" | null;
  total_predictions: number;
  forest_win_count: number;
  draw_count: number;
  forest_loss_count: number;
  correct_count: number;
  forest_win_percent: number;
  draw_percent: number;
  forest_loss_percent: number;
  rogue_applied: boolean;
  maverick_applied: boolean;
};

type InsightCard = {
  team_id?: string | null;
  team_name?: string | null;
  slug?: string | null;
  label?: string | null;
  value?: number | null;
  suffix?: string | null;
  gameweek_label?: string | null;
  opponent_short?: string | null;
  venue?: "H" | "A" | null;
  text?: string | null;
};

type HomepageInsights = {
  latest_news: {
    average_accuracy: number;
    latest_gameweek_label: string | null;
    latest_result_text: string | null;
    individual_leader_name: string | null;
    individual_leader_points: number | null;
    team_leader_name: string | null;
    team_leader_points: number | null;
    team_of_the_week_name: string | null;
    team_of_the_week_points: number | null;
    streaker_of_the_week_name: string | null;
    streaker_of_the_week_value: number | null;
    optimism_change: number | null;
  };
  personality_cards: {
    most_optimistic_team: InsightCard | null;
    most_cautious_team: InsightCard | null;
    draw_merchants: InsightCard | null;
    most_volatile_team: InsightCard | null;
    most_steady_team: InsightCard | null;
  };
  fixture_insights: {
    most_divided_fixture: InsightCard | null;
    draw_trap: InsightCard | null;
  };
  mood_tracker: {
    remaining_fixture_count: number;
    total_remaining_predictions: number;
    forest_win_rate: number;
    draw_rate: number;
    forest_loss_rate: number;
    average_remaining_predicted_points: number;
    mood_label: string;
  } | null;
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

function formatSigned(value: number | null | undefined) {
  const numberValue = Number(value ?? 0);
  if (numberValue > 0) return `+${formatPoints(numberValue)}`;
  return formatPoints(numberValue);
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

function getMostAccuratePlayer(rows: IndividualLeaderboardRow[]) {
  return (
    [...rows]
      .filter((row) => Number(row.fixtures_scored ?? 0) > 0)
      .sort((a, b) => {
        const accuracyDifference = getAccuracyWhole(b) - getAccuracyWhole(a);
        if (accuracyDifference !== 0) return accuracyDifference;

        const correctDifference =
          Number(b.correct_predictions ?? 0) -
          Number(a.correct_predictions ?? 0);
        if (correctDifference !== 0) return correctDifference;

        return displayPlayerName(a).localeCompare(displayPlayerName(b));
      })[0] ?? null
  );
}

function getBonusKing(rows: IndividualLeaderboardRow[]) {
  return (
    [...rows]
      .filter((row) => getBonusPoints(row) > 0)
      .sort((a, b) => {
        const bonusDifference = getBonusPoints(b) - getBonusPoints(a);
        if (bonusDifference !== 0) return bonusDifference;

        const pointsDifference =
          Number(b.total_points ?? 0) - Number(a.total_points ?? 0);
        if (pointsDifference !== 0) return pointsDifference;

        return displayPlayerName(a).localeCompare(displayPlayerName(b));
      })[0] ?? null
  );
}

function insightTeamHref(card: InsightCard | null) {
  return card?.slug ? `/team/${card.slug}` : null;
}

export default async function HomePage() {
  const supabase = getSupabaseClient();

  const [
    { count: teamCount },
    { count: playerCount },
    { data: settingsData },
    { data: individualData },
    { data: teamData },
    { data: nextFixtureData },
    { data: completedFixturesData },
    { data: fixtureTableData },
    { data: insightsData },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
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
    supabase
      .from("homepage_fixture_table")
      .select("*")
      .order("gameweek", { ascending: false }),
    supabase.rpc("get_homepage_insights_v2"),
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
  const fixtureRows = (fixtureTableData ?? []) as FixtureTableRow[];
  const nextFixture = (nextFixtureData?.[0] ?? null) as FixtureRow | null;
  const completedFixtureCount = completedFixturesData?.length ?? 0;
  const insights = insightsData as HomepageInsights | null;

  const currentLeader = individualRows[0] ?? null;
  const leadingTeam = teamRows[0] ?? null;
  const averageAccuracy =
    insights?.latest_news.average_accuracy ??
    calculateAverageAccuracy(individualRows);
  const mostAccuratePlayer = getMostAccuratePlayer(individualRows);
  const bonusKing = getBonusKing(individualRows);
  const latestNews = insights?.latest_news;
  const moodTracker = insights?.mood_tracker;

  return (
    <main className="min-h-screen bg-[#F7F6F2] px-4 py-4 text-[#111111] sm:px-6 lg:px-8 lg:py-6">
      <section className="mx-auto max-w-7xl">
        <header className="mb-4 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
          <div>
            <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-1.5 text-[0.68rem] font-black uppercase tracking-[0.24em] text-[#C8102E] md:text-xs">
              🔮 NFFC Podcast Prediction League
            </div>

            <h1 className="max-w-4xl text-4xl font-black uppercase leading-[0.92] tracking-tight text-[#C8102E] md:text-6xl">
              NFFC Podcast
              <span className="block text-[#111111]">Prediction League</span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-neutral-700 md:text-base">
              Individual and team score prediction game for the Forest podcast
              community. Track the tables, follow the season mood, and see who
              called it right.
            </p>
          </div>
        </header>

        <section className="mb-4">
          <div className="rounded-3xl border border-[#111111] bg-[#111111] p-4 text-white shadow-sm md:p-5">
            <div className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-[#C8102E] md:text-xs">
              Latest News
            </div>

            <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight md:text-3xl">
                  {nextFixture
                    ? `${nextFixture.gameweek_label}: Forest ${
                        nextFixture.venue === "H" ? "v" : "at"
                      } ${nextFixture.opponent_short}`
                    : "Next fixture TBC"}
                </h2>

                <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-neutral-300 md:text-sm">
                  {nextFixture
                    ? `Kick-off: ${formatDateTime(
                        nextFixture.kickoff_at
                      )}. Predictions lock 5 minutes before kick-off.`
                    : "Fixture information will update from the league sync."}
                </p>
              </div>

              <div className="rounded-2xl border border-[#C8102E]/40 bg-[#C8102E]/10 px-4 py-3">
                <div className="text-[0.68rem] font-black uppercase tracking-wide text-[#C8102E]">
                  Average accuracy
                </div>
                <div className="mt-1 text-3xl font-black text-white">
                  {formatPercent(averageAccuracy)}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-5">
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
                label="Team of the Week"
                value={latestNews?.team_of_the_week_name ?? "TBC"}
                subValue={
                  latestNews?.team_of_the_week_points !== null &&
                  latestNews?.team_of_the_week_points !== undefined
                    ? `${formatTeamPoints(latestNews.team_of_the_week_points)} pts`
                    : undefined
                }
              />
              <DarkPulseStat
                label="Streaker of the Week"
                value={latestNews?.streaker_of_the_week_name ?? "TBC"}
                subValue={
                  latestNews?.streaker_of_the_week_value
                    ? `${latestNews.streaker_of_the_week_value} current streak`
                    : undefined
                }
              />
              <DarkPulseStat
                label="Mood tracker"
                value={moodTracker?.mood_label ?? "TBC"}
                subValue={
                  moodTracker
                    ? `${formatPoints(
                        moodTracker.average_remaining_predicted_points
                      )} pts remaining`
                    : undefined
                }
              />
            </div>
          </div>
        </section>

        <HomepageLeaderboardTabs
          individualRows={individualRows}
          teamRows={teamRows}
          fixtureRows={fixtureRows}
        />

        <section className="mt-4 mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <TeamInsightCard
            card={insights?.personality_cards.most_optimistic_team ?? null}
          />
          <TeamInsightCard
            card={insights?.personality_cards.most_cautious_team ?? null}
          />
          <TeamInsightCard
            card={insights?.personality_cards.draw_merchants ?? null}
          />
          <TeamInsightCard
            card={insights?.personality_cards.most_volatile_team ?? null}
          />
          <TeamInsightCard
            card={insights?.personality_cards.most_steady_team ?? null}
          />
        </section>

        <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FixtureInsightCard
            title="Most divided fixture"
            card={insights?.fixture_insights.most_divided_fixture ?? null}
          />
          <FixtureInsightCard
            title="Draw trap"
            card={insights?.fixture_insights.draw_trap ?? null}
          />
          <LightPulseStat
            label="Most accurate"
            value={displayPlayerName(mostAccuratePlayer)}
            helper={
              mostAccuratePlayer
                ? `${formatPercent(getAccuracyWhole(mostAccuratePlayer))} accuracy`
                : undefined
            }
          />
          <LightPulseStat
            label="Bonus king"
            value={displayPlayerName(bonusKing)}
            helper={
              bonusKing
                ? `${formatPoints(getBonusPoints(bonusKing))} bonus pts`
                : undefined
            }
          />
        </section>

        {moodTracker && (
          <section className="mb-4 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase">
                  Overall mood tracker
                </h2>
                <p className="text-sm font-semibold text-neutral-600">
                  Aggregate remaining fixture predictions only. No individual
                  future picks shown.
                </p>
              </div>
              <div className="text-sm font-black uppercase tracking-wide text-[#C8102E]">
                {moodTracker.remaining_fixture_count} fixtures left
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <MoodStat
                label="Forest win picks"
                value={formatPercent(moodTracker.forest_win_rate)}
              />
              <MoodStat
                label="Draw picks"
                value={formatPercent(moodTracker.draw_rate)}
              />
              <MoodStat
                label="Forest loss picks"
                value={formatPercent(moodTracker.forest_loss_rate)}
              />
              <MoodStat
                label="Predicted points left"
                value={formatPoints(
                  moodTracker.average_remaining_predicted_points
                )}
              />
            </div>
          </section>
        )}

        <footer className="mt-6 flex justify-center border-t border-[#D9D6D1] pt-4">
          <Link
            href="/admin/login"
            className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 transition hover:text-[#C8102E]"
          >
            Admin login
          </Link>
        </footer>
      </section>
    </main>
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
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
      <div className="text-[0.68rem] font-black uppercase leading-tight tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-black leading-tight text-white">
        {value}
      </div>
      {subValue && (
        <div className="mt-2 text-[0.68rem] font-bold uppercase tracking-wide text-[#C8102E]">
          {subValue}
        </div>
      )}
    </div>
  );
}

function LightPulseStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-[#D9D6D1] bg-white p-4 text-[#111111] shadow-sm">
      <div className="text-xs font-black uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black">{value}</div>
      {helper && (
        <div className="mt-1 text-xs font-bold uppercase tracking-wide text-[#C8102E]">
          {helper}
        </div>
      )}
    </div>
  );
}

function TeamInsightCard({ card }: { card: InsightCard | null }) {
  const href = insightTeamHref(card);
  const content = (
    <div className="h-full rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm transition hover:border-[#C8102E]">
      <div className="text-xs font-black uppercase tracking-wide text-[#C8102E]">
        {card?.label ?? "Team insight"}
      </div>
      <div className="mt-1 text-xl font-black">{card?.team_name ?? "TBC"}</div>
      <div className="mt-2 text-3xl font-black text-[#111111]">
        {card?.value !== null && card?.value !== undefined
          ? formatSigned(card.value)
          : "—"}
      </div>
      <div className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-500">
        {card?.suffix ?? "Completed fixtures only"}
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

function FixtureInsightCard({
  title,
  card,
}: {
  title: string;
  card: InsightCard | null;
}) {
  return (
    <div className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm">
      <div className="text-xs font-black uppercase tracking-wide text-[#C8102E]">
        {title}
      </div>
      <div className="mt-1 text-xl font-black">
        {card
          ? `${card.gameweek_label}: ${card.opponent_short} ${card.venue}`
          : "TBC"}
      </div>
      <div className="mt-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
        {card?.text ?? "Completed fixtures only"}
      </div>
    </div>
  );
}

function MoodStat({ label, value }: { label: string | number; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4">
      <div className="text-xs font-black uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black text-[#C8102E]">{value}</div>
    </div>
  );
}
