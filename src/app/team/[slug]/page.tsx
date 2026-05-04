import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type TeamPageData = {
  found: boolean;
  team: {
    team_id: string;
    team_name: string;
    display_name: string | null;
    abbreviation: string | null;
    slug: string;
    x_handle: string | null;
    logo_url: string | null;
    logo_alt: string | null;
    brand_colour: string | null;
    parent_podcast: string | null;
    parent_podcast_display_name: string | null;
  } | null;
  leaderboard: {
    team_rank: number;
    team_rank_out_of: number;
    total_team_points: number;
    clean_sweeps: number;
    blanks: number;
    player_count: number;
    best_player_accuracy_percentage: number;
    mvp_player_id: string | null;
    mvp_player_name: string | null;
    mvp_short_name: string | null;
    mvp_accuracy_percentage: number;
    latest_gameweek: number | null;
    latest_gameweek_label: string | null;
    latest_opponent_short: string | null;
    points_this_week: number;
  } | null;
  summary: {
    completed_fixtures: number;
    average_team_score: number;
    best_gameweek_score: number;
    worst_gameweek_score: number;
    total_correct_predictions: number;
    total_completed_predictions: number;
    correct_prediction_rate: number;
    total_w_predictions: number;
    total_d_predictions: number;
    total_l_predictions: number;
    streak_bonus: number;
    maverick_bonus: number;
    rogue_bonus: number;
    cup_bonus: number;
    total_bonus_points: number;
  } | null;
  players: {
    player_id: string;
    player_name: string;
    short_name: string | null;
    player_slug: string | null;
    total_points: number;
    base_points: number;
    streak_bonus: number;
    maverick_bonus: number;
    rogue_bonus: number;
    cup_bonus: number;
    bonus_points: number;
    correct_predictions: number;
    fixtures_scored: number;
    accuracy_percentage: number;
    current_streak: number;
    best_streak: number;
  }[];
  form: {
    fixture_id: string;
    gameweek: number;
    gameweek_label: string;
    opponent_short: string;
    venue: "H" | "A";
    forest_result: "W" | "D" | "L" | null;
    correct_count: number;
    team_player_count: number;
    team_fixture_points: number;
    clean_sweep: boolean;
    blank: boolean;
  }[];
  fixtures: {
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
    actual_forest_points: number | null;
    team_player_count: number;
    predicted_w_count: number;
    predicted_d_count: number;
    predicted_l_count: number;
    correct_count: number;
    incorrect_count: number;
    correct_percentage: number;
    team_fixture_points: number;
    clean_sweep: boolean;
    blank: boolean;
  }[];
  standout: {
    mvp_name: string | null;
    mvp_accuracy_percentage: number;
    best_fixture: {
      gameweek_label: string;
      opponent_short: string;
      venue: "H" | "A";
      team_fixture_points: number;
      correct_count: number;
      team_player_count: number;
    } | null;
    worst_fixture: {
      gameweek_label: string;
      opponent_short: string;
      venue: "H" | "A";
      team_fixture_points: number;
      correct_count: number;
      team_player_count: number;
    } | null;
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

function formatPoints(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(2).replace(".00", "");
}

function formatPercent(value: number | null | undefined) {
  return `${Math.round(Number(value ?? 0))}%`;
}

function displayTeamName(team: NonNullable<TeamPageData["team"]>) {
  return team.display_name ?? team.team_name;
}

function resultLabel(result: "W" | "D" | "L" | null) {
  if (result === "W") return "Forest win";
  if (result === "D") return "Draw";
  if (result === "L") return "Forest loss";
  return "—";
}

function fixtureLabel(fixture: {
  gameweek_label: string;
  opponent_short: string;
  venue: "H" | "A";
}) {
  return `${fixture.gameweek_label} · ${fixture.opponent_short} ${fixture.venue}`;
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc("get_public_team_page", {
    target_team_slug: resolvedParams.slug,
  });

  if (error) {
    return (
      <main className="min-h-screen bg-[#F7F6F2] px-4 py-8 text-[#111111]">
        <section className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
          <h1 className="text-3xl font-black uppercase text-red-800">
            Team page error
          </h1>
          <p className="mt-3 text-sm font-semibold text-red-700">
            {error.message}
          </p>
        </section>
      </main>
    );
  }

  const pageData = data as TeamPageData | null;

  if (!pageData?.found || !pageData.team) {
    notFound();
  }

  const team = pageData.team;
  const leaderboard = pageData.leaderboard;
  const summary = pageData.summary;
  const standout = pageData.standout;
  const players = pageData.players ?? [];
  const form = [...(pageData.form ?? [])].sort((a, b) => a.gameweek - b.gameweek);
  const fixtures = pageData.fixtures ?? [];

  return (
    <main className="min-h-screen bg-[#F7F6F2] px-4 py-6 text-[#111111] sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 overflow-hidden rounded-3xl border border-[#D9D6D1] bg-white shadow-sm">
          <div
            className="h-2"
            style={{ backgroundColor: team.brand_colour ?? "#C8102E" }}
          />
          <div className="p-5 md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                  🔮 Team page
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tight text-[#C8102E] md:text-6xl">
                  {displayTeamName(team)}
                </h1>
                <p className="mt-3 text-sm font-semibold text-neutral-600 md:text-base">
                  Completed fixture performance only. Future predictions are not shown.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {team.x_handle ? <InfoPill label="X" value={team.x_handle} /> : null}
                  {team.parent_podcast_display_name || team.parent_podcast ? (
                    <InfoPill
                      label="Podcast"
                      value={team.parent_podcast_display_name ?? team.parent_podcast ?? ""}
                    />
                  ) : null}
                  {team.abbreviation ? (
                    <InfoPill label="Code" value={team.abbreviation} />
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/#leaderboards"
                  className="rounded-full bg-[#111111] px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
                >
                  Leaderboards
                </Link>
                <Link
                  href="/"
                  className="rounded-full border border-[#111111] px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E]"
                >
                  Homepage
                </Link>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              <TopStat
                label="Rank"
                value={
                  leaderboard?.team_rank
                    ? `${leaderboard.team_rank}/${leaderboard.team_rank_out_of}`
                    : "—"
                }
              />
              <TopStat
                label="Points"
                value={formatPoints(leaderboard?.total_team_points)}
                highlight
              />
              <TopStat
                label="Players"
                value={leaderboard?.player_count ?? players.length}
              />
              <TopStat label="Sweeps" value={leaderboard?.clean_sweeps ?? 0} />
              <TopStat label="Blanks" value={leaderboard?.blanks ?? 0} />
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MiniStat
            label="Accuracy"
            value={formatPercent(summary?.correct_prediction_rate)}
          />
          <MiniStat
            label="Average GW score"
            value={formatPoints(summary?.average_team_score)}
          />
          <MiniStat
            label="Best GW score"
            value={formatPoints(summary?.best_gameweek_score)}
          />
          <MiniStat
            label="Worst GW score"
            value={formatPoints(summary?.worst_gameweek_score)}
          />
          <MiniStat
            label="Bonus points"
            value={formatPoints(summary?.total_bonus_points)}
          />
          <MiniStat
            label="Completed GWs"
            value={summary?.completed_fixtures ?? 0}
          />
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel title="Team players" description="Scored performance to date.">
            <div className="overflow-hidden rounded-2xl border border-[#D9D6D1]">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#111111] text-white">
                  <tr>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Pts</th>
                    <th className="px-4 py-3">Acc.</th>
                    <th className="px-4 py-3">Correct</th>
                    <th className="px-4 py-3">Streak</th>
                    <th className="px-4 py-3">Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => {
                    const name = player.short_name ?? player.player_name;
                    const playerContent = (
                      <span className="font-black">{name}</span>
                    );

                    return (
                      <tr
                        key={player.player_id}
                        className="border-b border-[#E7E2DA] last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          {player.player_slug ? (
                            <Link
                              href={`/player/${player.player_slug}`}
                              className="font-black text-[#111111] underline decoration-[#C8102E]/30 underline-offset-4 transition hover:text-[#C8102E]"
                            >
                              {name}
                            </Link>
                          ) : (
                            playerContent
                          )}
                        </td>
                        <td className="px-4 py-3 font-black">
                          {formatPoints(player.total_points)}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {formatPercent(player.accuracy_percentage)}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {player.correct_predictions}/{player.fixtures_scored}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {player.current_streak}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {formatPoints(player.bonus_points)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Standout stats" description="Best, worst and MVP markers.">
            <div className="grid gap-3">
              <MiniStat
                label="MVP"
                value={
                  standout?.mvp_name
                    ? `${standout.mvp_name} · ${formatPercent(
                        standout.mvp_accuracy_percentage
                      )}`
                    : "TBC"
                }
              />
              <MiniStat
                label="Best fixture"
                value={
                  standout?.best_fixture
                    ? `${fixtureLabel(standout.best_fixture)} · ${formatPoints(
                        standout.best_fixture.team_fixture_points
                      )} pts`
                    : "TBC"
                }
              />
              <MiniStat
                label="Worst fixture"
                value={
                  standout?.worst_fixture
                    ? `${fixtureLabel(standout.worst_fixture)} · ${formatPoints(
                        standout.worst_fixture.team_fixture_points
                      )} pts`
                    : "TBC"
                }
              />
              <MiniStat
                label="Prediction split to date"
                value={`W ${summary?.total_w_predictions ?? 0} · D ${
                  summary?.total_d_predictions ?? 0
                } · L ${summary?.total_l_predictions ?? 0}`}
              />
            </div>
          </Panel>
        </section>

        <Panel title="Recent form" description="Last five completed fixtures only.">
          <div className="grid gap-3 md:grid-cols-5">
            {form.length ? (
              form.map((fixture) => (
                <div
                  key={fixture.fixture_id}
                  className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4"
                >
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#C8102E]">
                    {fixture.gameweek_label}
                  </div>
                  <div className="mt-1 text-lg font-black">
                    {fixture.opponent_short} {fixture.venue}
                  </div>
                  <div className="mt-2 text-3xl font-black">
                    {formatPoints(fixture.team_fixture_points)}
                  </div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-500">
                    {fixture.correct_count}/{fixture.team_player_count} correct
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text="No completed fixtures yet." />
            )}
          </div>
        </Panel>

        <div className="mt-6">
          <Panel
            title="Completed fixture history"
            description="Only completed fixtures are shown. No future picks are exposed."
          >
            <div className="overflow-hidden rounded-2xl border border-[#D9D6D1]">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#111111] text-white">
                  <tr>
                    <th className="px-4 py-3">GW</th>
                    <th className="px-4 py-3">Fixture</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3">Pick split</th>
                    <th className="px-4 py-3">Correct</th>
                    <th className="px-4 py-3">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {fixtures.length ? (
                    fixtures.map((fixture) => (
                      <tr
                        key={fixture.fixture_id}
                        className="border-b border-[#E7E2DA] last:border-b-0"
                      >
                        <td className="px-4 py-3 font-black text-[#C8102E]">
                          {fixture.gameweek_label}
                        </td>
                        <td className="px-4 py-3 font-black">
                          {fixture.opponent_short} {fixture.venue}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {resultLabel(fixture.forest_result)}
                        </td>
                        <td className="px-4 py-3 font-bold text-neutral-700">
                          W {fixture.predicted_w_count} · D{" "}
                          {fixture.predicted_d_count} · L{" "}
                          {fixture.predicted_l_count}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {fixture.correct_count}/{fixture.team_player_count}
                        </td>
                        <td className="px-4 py-3 font-black">
                          {formatPoints(fixture.team_fixture_points)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-sm font-semibold text-neutral-600" colSpan={6}>
                        No completed fixtures yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </section>
    </main>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-[#D9D6D1] bg-[#F7F6F2] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#111111]">
      <span className="text-neutral-500">{label}</span> {value}
    </span>
  );
}

function TopStat({
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
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-[#111111] bg-[#111111] text-white"
          : "border-[#D9D6D1] bg-[#F7F6F2] text-[#111111]"
      }`}
    >
      <div className="text-xs font-black uppercase tracking-wide opacity-65">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#D9D6D1] bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-[#111111]">{value}</div>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-black uppercase">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-neutral-600">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4 text-sm font-semibold text-neutral-600">
      {text}
    </div>
  );
}
