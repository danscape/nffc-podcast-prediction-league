import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PublicPageShell from "@/components/layout/PublicPageShell";
import PublicMasthead from "@/components/layout/PublicMasthead";

type ResultValue = "W" | "D" | "L";

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
    forest_result: ResultValue | null;
    correct_count: number;
    team_player_count: number;
    team_fixture_points: number;
    league_average_team_points: number;
    points_vs_average: number;
    fixture_team_rank: number;
    fixture_team_count: number;
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
    forest_result: ResultValue | null;
    actual_forest_points: number | null;
    team_player_count: number;
    predicted_w_count: number;
    predicted_d_count: number;
    predicted_l_count: number;
    correct_count: number;
    incorrect_count: number;
    correct_percentage: number;
    team_fixture_points: number;
    league_average_team_points: number;
    points_vs_average: number;
    fixture_team_rank: number;
    fixture_team_count: number;
    clean_sweep: boolean;
    blank: boolean;
  }[];
  average_tracker: {
    weeks_above_average: number;
    weeks_below_average: number;
    weeks_level_average: number;
    average_points_vs_field: number;
    best_margin_vs_field: number;
    worst_margin_vs_field: number;
  } | null;
  personality: {
    profile_label: string;
    forest_win_pick_rate: number;
    draw_pick_rate: number;
    forest_loss_pick_rate: number;
  } | null;
  rank_summary: {
    highest_rank: number;
    lowest_rank: number;
    latest_rank: number;
    previous_rank: number | null;
    movement: number;
  } | null;
  rank_history: {
    fixture_id: string;
    gameweek: number;
    gameweek_label: string;
    opponent_short: string;
    venue: "H" | "A";
    team_fixture_points: number;
    running_team_points: number;
    team_rank: number;
    team_rank_out_of: number;
  }[];
  sweep_blank_events: {
    fixture_id: string;
    gameweek: number;
    gameweek_label: string;
    opponent_short: string;
    venue: "H" | "A";
    event_type: "Clean sweep" | "Blank";
    team_fixture_points: number;
    correct_count: number;
    team_player_count: number;
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

function toNumber(value: number | string | null | undefined) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatPoints(value: number | null | undefined) {
  return toNumber(value).toFixed(2).replace(".00", "");
}

function formatWhole(value: number | null | undefined) {
  return String(Math.round(toNumber(value)));
}

function formatPercent(value: number | null | undefined) {
  return `${Math.round(toNumber(value))}%`;
}

function displayTeamName(team: NonNullable<TeamPageData["team"]>) {
  return team.display_name ?? team.team_name;
}

function formatSignedPoints(value: number | null | undefined) {
  const numberValue = toNumber(value);
  if (numberValue > 0) return `+${formatPoints(numberValue)}`;
  return formatPoints(numberValue);
}

function formatMovement(value: number | null | undefined) {
  const numberValue = toNumber(value);
  if (numberValue > 0) return `▲ ${numberValue}`;
  if (numberValue < 0) return `▼ ${Math.abs(numberValue)}`;
  return "—";
}

function resultLabel(result: ResultValue | null) {
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
  return `${fixture.gameweek_label} ${fixture.opponent_short} ${fixture.venue}`;
}

function resultTone(result: ResultValue | null) {
  if (result === "W") return "text-[var(--stat-green,#22e55e)]";
  if (result === "D") return "text-[var(--stat-yellow,#ffe44d)]";
  if (result === "L") return "text-[var(--stat-wrong,#ff3030)]";
  return "text-white";
}

function positiveNegativeTone(value: number | null | undefined) {
  const numberValue = toNumber(value);
  if (numberValue > 0) return "text-[var(--stat-green,#22e55e)]";
  if (numberValue < 0) return "text-[var(--stat-wrong,#ff3030)]";
  return "text-white";
}

function bonusTone(value: number | null | undefined, colour: "yellow" | "cyan" | "pink" | "green") {
  if (toNumber(value) <= 0) return "text-white";
  if (colour === "yellow") return "text-[var(--stat-yellow,#ffe44d)]";
  if (colour === "cyan") return "text-[var(--stat-cyan,#59efff)]";
  if (colour === "pink") return "text-[var(--stat-pink,#ff4fd8)]";
  return "text-[var(--stat-green,#22e55e)]";
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
      <PublicPageShell topPadding="reduced">
        <PublicMasthead active="none" title="Team Terminal" />
        <section className="w-full">
          <div className="bg-[var(--nffc-red,#e50914)] px-5 py-3 text-3xl font-black uppercase tracking-[0.08em] text-white">
            Team page error
          </div>
          <div className="border border-[#444444] bg-[var(--nffc-black,#000000)] p-6 text-xl font-black uppercase text-[var(--stat-wrong,#ff3030)]">
            {error.message}
          </div>
        </section>
      </PublicPageShell>
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
  const averageTracker = pageData.average_tracker;
  const personality = pageData.personality;
  const rankSummary = pageData.rank_summary;
  const rankHistory = pageData.rank_history ?? [];
  const sweepBlankEvents = pageData.sweep_blank_events ?? [];
  const players = pageData.players ?? [];
  const form = [...(pageData.form ?? [])].sort((a, b) => a.gameweek - b.gameweek);
  const fixtures = pageData.fixtures ?? [];

  return (
    <PublicPageShell topPadding="reduced">
      <PublicMasthead active="none" title="Team Terminal" />

      <section className="w-full">
        <header className="mb-6 bg-[var(--nffc-black,#000000)]">
          <section className="grid gap-[2px] bg-[#444444] lg:grid-cols-[minmax(0,1fr)_520px]">
            <div className="bg-[var(--nffc-black,#000000)] p-5 md:p-6">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-[var(--nffc-red,#e50914)]">
                Team profile
              </div>

              <h1 className="mt-3 text-[clamp(3rem,6vw,7.2rem)] font-black uppercase leading-none tracking-[-0.06em] text-white">
                {displayTeamName(team)}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-2xl font-black uppercase leading-none tracking-[0.04em] md:text-3xl">
                {team.parent_podcast_display_name || team.parent_podcast ? (
                  <span className="text-[var(--nffc-red,#e50914)]">
                    {team.parent_podcast_display_name ?? team.parent_podcast}
                  </span>
                ) : null}

                {team.x_handle ? (
                  <>
                    <span className="text-white">/</span>
                    <span className="text-[var(--stat-cyan,#59efff)]">
                      {team.x_handle}
                    </span>
                  </>
                ) : null}
              </div>

              <p className="mt-5 max-w-4xl text-base font-black uppercase tracking-[0.1em] text-[var(--nffc-muted,#a7a7a7)]">
                Completed fixture performance only. Future predictions are not shown.
              </p>
            </div>

            <section className="grid gap-[2px] bg-[#444444] sm:grid-cols-2">
              <TerminalStat
                label="Rank"
                value={
                  leaderboard?.team_rank
                    ? `${leaderboard.team_rank}/${leaderboard.team_rank_out_of}`
                    : "—"
                }
                tone="red"
              />
              <TerminalStat
                label="Movement"
                value={formatMovement(rankSummary?.movement)}
                tone={
                  toNumber(rankSummary?.movement) > 0
                    ? "green"
                    : toNumber(rankSummary?.movement) < 0
                      ? "red"
                      : "white"
                }
              />
              <TerminalStat
                label="Total points"
                value={formatPoints(leaderboard?.total_team_points)}
                tone="green"
              />
              <TerminalStat
                label="Players"
                value={leaderboard?.player_count ?? players.length}
                tone="white"
              />
              <TerminalStat
                label="Clean sweeps"
                value={leaderboard?.clean_sweeps ?? 0}
                tone="cyan"
              />
              <TerminalStat
                label="Blanks"
                value={leaderboard?.blanks ?? 0}
                tone="red"
              />
            </section>
          </section>
        </header>

        <section className="mb-6 grid gap-[2px] bg-[#444444] md:grid-cols-3 xl:grid-cols-6">
          <TerminalStat
            label="Accuracy"
            value={formatPercent(summary?.correct_prediction_rate)}
            tone={toNumber(summary?.correct_prediction_rate) >= 40 ? "green" : "red"}
          />
          <TerminalStat
            label="Average GW score"
            value={formatPoints(summary?.average_team_score)}
            tone="white"
          />
          <TerminalStat
            label="Best GW score"
            value={formatPoints(summary?.best_gameweek_score)}
            tone="green"
          />
          <TerminalStat
            label="Worst GW score"
            value={formatPoints(summary?.worst_gameweek_score)}
            tone="red"
          />
          <TerminalStat
            label="Bonus points"
            value={formatPoints(summary?.total_bonus_points)}
            tone={toNumber(summary?.total_bonus_points) > 0 ? "cyan" : "white"}
          />
          <TerminalStat
            label="Completed GWs"
            value={summary?.completed_fixtures ?? 0}
            tone="white"
          />
        </section>

        <section className="mb-6 grid gap-[2px] bg-[#444444] xl:grid-cols-3">
          <TerminalPanel title="Rank Story">
            <InfoRows
              rows={[
                ["Current rank", rankSummary?.latest_rank ? `${rankSummary.latest_rank}/${leaderboard?.team_rank_out_of ?? "—"}` : "—", "red"],
                ["Previous GW", rankSummary?.previous_rank ? `${rankSummary.previous_rank}` : "No previous rank", "white"],
                ["Best rank", rankSummary?.highest_rank ?? "—", "green"],
                ["Lowest rank", rankSummary?.lowest_rank ?? "—", "red"],
              ]}
            />
          </TerminalPanel>

          <TerminalPanel title="Versus The Field">
            <InfoRows
              rows={[
                ["Above average", averageTracker?.weeks_above_average ?? 0, "green"],
                ["Below average", averageTracker?.weeks_below_average ?? 0, "red"],
                ["Level average", averageTracker?.weeks_level_average ?? 0, "white"],
                ["Avg v field", `${formatSignedPoints(averageTracker?.average_points_vs_field)} pts`, positiveNegativeTone(averageTracker?.average_points_vs_field)],
                ["Best margin", `${formatSignedPoints(averageTracker?.best_margin_vs_field)} pts`, "green"],
                ["Worst margin", `${formatSignedPoints(averageTracker?.worst_margin_vs_field)} pts`, "red"],
              ]}
            />
          </TerminalPanel>

          <TerminalPanel title="Team Profile">
            <InfoRows
              rows={[
                ["Profile", personality?.profile_label ?? "Balanced", "cyan"],
                ["Forest win picks", formatPercent(personality?.forest_win_pick_rate), "green"],
                ["Draw picks", formatPercent(personality?.draw_pick_rate), "yellow"],
                ["Forest loss picks", formatPercent(personality?.forest_loss_pick_rate), "red"],
              ]}
            />
          </TerminalPanel>
        </section>

        <section className="mb-6 grid gap-[2px] bg-[#444444] xl:grid-cols-[1.2fr_0.8fr]">
          <TerminalPanel title="Team Players" noPadding>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-[var(--nffc-red,#e50914)] text-sm font-black uppercase tracking-[0.16em] text-white">
                    <th className="px-4 py-3 text-left">Player</th>
                    <th className="px-4 py-3 text-center">Pts</th>
                    <th className="px-4 py-3 text-center">Acc</th>
                    <th className="px-4 py-3 text-center">Correct</th>
                    <th className="px-4 py-3 text-center">Streak</th>
                    <th className="px-4 py-3 text-center">Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => {
                    const name = player.short_name ?? player.player_name;

                    return (
                      <tr
                        key={player.player_id}
                        className="border-b border-[#242424] last:border-b-0"
                      >
                        <td className="px-4 py-3 text-2xl font-black uppercase text-white">
                          {player.player_slug ? (
                            <Link
                              href={`/player/${player.player_slug}`}
                              className="transition hover:text-[var(--stat-green,#22e55e)]"
                            >
                              {name}
                            </Link>
                          ) : (
                            name
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-3xl font-black text-[var(--stat-green,#22e55e)]">
                          {formatPoints(player.total_points)}
                        </td>
                        <td className="px-4 py-3 text-center text-2xl font-black text-[var(--stat-green,#22e55e)]">
                          {formatPercent(player.accuracy_percentage)}
                        </td>
                        <td className="px-4 py-3 text-center text-2xl font-black text-white">
                          {player.correct_predictions}
                          <span className="text-base text-[var(--nffc-muted,#a7a7a7)]">
                            /{player.fixtures_scored}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-center text-2xl font-black ${bonusTone(player.current_streak, "yellow")}`}>
                          {player.current_streak}
                        </td>
                        <td className={`px-4 py-3 text-center text-2xl font-black ${bonusTone(player.bonus_points, "cyan")}`}>
                          {formatPoints(player.bonus_points)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TerminalPanel>

          <TerminalPanel title="Standout Stats">
            <InfoRows
              rows={[
                [
                  "MVP",
                  standout?.mvp_name
                    ? `${standout.mvp_name} / ${formatPercent(standout.mvp_accuracy_percentage)}`
                    : "TBC",
                  "green",
                ],
                [
                  "Best fixture",
                  standout?.best_fixture
                    ? `${fixtureLabel(standout.best_fixture)} / ${formatPoints(standout.best_fixture.team_fixture_points)} pts`
                    : "TBC",
                  "green",
                ],
                [
                  "Worst fixture",
                  standout?.worst_fixture
                    ? `${fixtureLabel(standout.worst_fixture)} / ${formatPoints(standout.worst_fixture.team_fixture_points)} pts`
                    : "TBC",
                  "red",
                ],
                [
                  "Prediction split",
                  `W ${summary?.total_w_predictions ?? 0} / D ${summary?.total_d_predictions ?? 0} / L ${summary?.total_l_predictions ?? 0}`,
                  "white",
                ],
              ]}
            />
          </TerminalPanel>
        </section>

        <TerminalPanel title="Recent Form" className="mb-6">
          <div className="grid gap-[2px] bg-[#444444] md:grid-cols-5">
            {form.length ? (
              form.map((fixture) => (
                <div
                  key={fixture.fixture_id}
                  className="bg-[var(--nffc-black,#000000)] p-4"
                >
                  <div className="text-sm font-black uppercase tracking-[0.16em] text-[var(--nffc-red,#e50914)]">
                    {fixture.gameweek_label}
                  </div>
                  <div className={`mt-2 text-2xl font-black uppercase ${resultTone(fixture.forest_result)}`}>
                    {fixture.opponent_short} {fixture.venue}
                  </div>
                  <div className="mt-3 text-5xl font-black leading-none text-[var(--stat-green,#22e55e)]">
                    {formatPoints(fixture.team_fixture_points)}
                  </div>
                  <div className="mt-2 text-sm font-black uppercase tracking-[0.12em] text-white">
                    {fixture.correct_count}/{fixture.team_player_count} correct
                  </div>
                  <div className={`mt-2 text-sm font-black uppercase tracking-[0.12em] ${positiveNegativeTone(fixture.points_vs_average)}`}>
                    {formatSignedPoints(fixture.points_vs_average)} v field
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text="No completed fixtures yet." />
            )}
          </div>
        </TerminalPanel>

        <section className="grid gap-[2px] bg-[#444444] xl:grid-cols-2">
          <TerminalPanel title="Rank History" noPadding>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-[var(--nffc-red,#e50914)] text-sm font-black uppercase tracking-[0.16em] text-white">
                    <th className="px-4 py-3 text-left">GW</th>
                    <th className="px-4 py-3 text-left">Fixture</th>
                    <th className="px-4 py-3 text-center">Pts</th>
                    <th className="px-4 py-3 text-center">Running</th>
                    <th className="px-4 py-3 text-center">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {rankHistory.length ? (
                    rankHistory.map((row) => (
                      <tr
                        key={row.fixture_id}
                        className="border-b border-[#242424] last:border-b-0"
                      >
                        <td className="px-4 py-3 text-xl font-black uppercase text-[var(--nffc-red,#e50914)]">
                          {row.gameweek_label}
                        </td>
                        <td className="px-4 py-3 text-xl font-black uppercase text-white">
                          {row.opponent_short} {row.venue}
                        </td>
                        <td className="px-4 py-3 text-center text-2xl font-black text-[var(--stat-green,#22e55e)]">
                          {formatPoints(row.team_fixture_points)}
                        </td>
                        <td className="px-4 py-3 text-center text-2xl font-black text-[var(--stat-green,#22e55e)]">
                          {formatPoints(row.running_team_points)}
                        </td>
                        <td className="px-4 py-3 text-center text-2xl font-black text-white">
                          {row.team_rank}/{row.team_rank_out_of}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-sm font-black uppercase tracking-[0.14em] text-[var(--nffc-muted,#a7a7a7)]" colSpan={5}>
                        No rank history yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TerminalPanel>

          <TerminalPanel title="Sweeps And Blanks">
            <div className="grid gap-[2px] bg-[#444444]">
              {sweepBlankEvents.length ? (
                sweepBlankEvents.map((event) => (
                  <div
                    key={`${event.fixture_id}-${event.event_type}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 bg-[var(--nffc-black,#000000)] px-4 py-3"
                  >
                    <div>
                      <div className={`text-sm font-black uppercase tracking-[0.18em] ${
                        event.event_type === "Clean sweep"
                          ? "text-[var(--stat-cyan,#59efff)]"
                          : "text-[var(--stat-wrong,#ff3030)]"
                      }`}>
                        {event.event_type}
                      </div>
                      <div className="mt-1 text-2xl font-black uppercase text-white">
                        {event.gameweek_label} {event.opponent_short} {event.venue}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white">
                        {event.correct_count}/{event.team_player_count}
                      </div>
                      <div className="text-sm font-black uppercase tracking-[0.12em] text-[var(--stat-green,#22e55e)]">
                        {formatPoints(event.team_fixture_points)} pts
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState text="No clean sweeps or blanks yet." />
              )}
            </div>
          </TerminalPanel>
        </section>

        <TerminalPanel
          title="Completed Fixture History"
          className="mt-6"
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-[var(--nffc-red,#e50914)] text-sm font-black uppercase tracking-[0.16em] text-white">
                  <th className="px-4 py-3 text-left">GW</th>
                  <th className="px-4 py-3 text-left">Fixture</th>
                  <th className="px-4 py-3 text-left">Result</th>
                  <th className="px-4 py-3 text-left">Pick split</th>
                  <th className="px-4 py-3 text-center">Correct</th>
                  <th className="px-4 py-3 text-center">Pts</th>
                  <th className="px-4 py-3 text-center">V field</th>
                </tr>
              </thead>
              <tbody>
                {fixtures.length ? (
                  fixtures.map((fixture) => (
                    <tr
                      key={fixture.fixture_id}
                      className="border-b border-[#242424] last:border-b-0"
                    >
                      <td className="px-4 py-3 text-xl font-black uppercase text-[var(--nffc-red,#e50914)]">
                        {fixture.gameweek_label}
                      </td>
                      <td className="px-4 py-3 text-xl font-black uppercase text-white">
                        {fixture.opponent_short} {fixture.venue}
                      </td>
                      <td className={`px-4 py-3 text-xl font-black uppercase ${resultTone(fixture.forest_result)}`}>
                        {resultLabel(fixture.forest_result)}
                      </td>
                      <td className="px-4 py-3 text-xl font-black uppercase text-white">
                        <span className="text-[var(--stat-green,#22e55e)]">W {fixture.predicted_w_count}</span>
                        <span className="px-2 text-white">/</span>
                        <span className="text-[var(--stat-yellow,#ffe44d)]">D {fixture.predicted_d_count}</span>
                        <span className="px-2 text-white">/</span>
                        <span className="text-[var(--stat-wrong,#ff3030)]">L {fixture.predicted_l_count}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xl font-black text-white">
                        {fixture.correct_count}/{fixture.team_player_count}
                      </td>
                      <td className="px-4 py-3 text-center text-2xl font-black text-[var(--stat-green,#22e55e)]">
                        {formatPoints(fixture.team_fixture_points)}
                      </td>
                      <td className={`px-4 py-3 text-center text-xl font-black ${positiveNegativeTone(fixture.points_vs_average)}`}>
                        {formatSignedPoints(fixture.points_vs_average)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm font-black uppercase tracking-[0.14em] text-[var(--nffc-muted,#a7a7a7)]" colSpan={7}>
                      No completed fixtures yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TerminalPanel>
      </section>
    </PublicPageShell>
  );
}

function TerminalStat({
  label,
  value,
  tone = "white",
}: {
  label: string;
  value: string | number;
  tone?: "green" | "yellow" | "cyan" | "pink" | "red" | "white";
}) {
  return (
    <div className="bg-[var(--nffc-black,#000000)] p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className={`mt-2 text-4xl font-black uppercase leading-none ${toneClass(tone)}`}>
        {value}
      </div>
    </div>
  );
}

function TerminalPanel({
  title,
  children,
  className = "",
  noPadding = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <section className={`bg-[var(--nffc-black,#000000)] ${className}`}>
      <h2 className="bg-[var(--nffc-red,#e50914)] px-5 py-3 text-3xl font-black uppercase tracking-[0.08em] text-white md:text-4xl">
        {title}
      </h2>
      <div className={noPadding ? "" : "p-4 md:p-5"}>
        {children}
      </div>
    </section>
  );
}

function InfoRows({
  rows,
}: {
  rows: [string, string | number, string][];
}) {
  return (
    <div className="grid gap-[2px] bg-[#444444]">
      {rows.map(([label, value, tone]) => (
        <div
          key={label}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 bg-[var(--nffc-black,#000000)] px-4 py-3"
        >
          <div className={`text-sm font-black uppercase tracking-[0.18em] ${labelToneClass(label)}`}>
            {label}
          </div>
          <div className={`text-[1.65rem] font-black uppercase leading-none ${toneClass(tone)}`}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-[var(--nffc-black,#000000)] p-4 text-sm font-black uppercase tracking-[0.14em] text-[var(--nffc-muted,#a7a7a7)]">
      {text}
    </div>
  );
}

function labelToneClass(label: string) {
  const lower = label.toLowerCase();

  if (lower.includes("win") || lower.includes("best") || lower.includes("above")) {
    return "text-[var(--stat-green,#22e55e)]";
  }

  if (lower.includes("draw") || lower.includes("streak")) {
    return "text-[var(--stat-yellow,#ffe44d)]";
  }

  if (lower.includes("loss") || lower.includes("worst") || lower.includes("blank") || lower.includes("below")) {
    return "text-[var(--stat-wrong,#ff3030)]";
  }

  if (lower.includes("profile") || lower.includes("mvp") || lower.includes("bonus")) {
    return "text-[var(--stat-cyan,#59efff)]";
  }

  return "text-[var(--nffc-muted,#a7a7a7)]";
}

function toneClass(tone: string) {
  if (tone.includes("text-")) return tone;
  if (tone === "green") return "text-[var(--stat-green,#22e55e)]";
  if (tone === "yellow") return "text-[var(--stat-yellow,#ffe44d)]";
  if (tone === "cyan") return "text-[var(--stat-cyan,#59efff)]";
  if (tone === "pink") return "text-[var(--stat-pink,#ff4fd8)]";
  if (tone === "red") return "text-[var(--stat-wrong,#ff3030)]";
  return "text-white";
}
