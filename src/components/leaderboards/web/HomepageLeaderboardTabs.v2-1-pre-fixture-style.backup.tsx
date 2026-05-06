"use client";

import { useState } from "react";
import CompactIndividualLeaderboard from "@/components/leaderboards/web/CompactIndividualLeaderboard";
import CompactTeamLeaderboard from "@/components/leaderboards/web/CompactTeamLeaderboard";
import IndividualLeaderboard from "@/components/leaderboards/web/IndividualLeaderboard";
import TeamLeaderboard from "@/components/leaderboards/web/TeamLeaderboard";

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

type ActiveTab = "teams" | "players" | "fixtures";

function formatPercent(value: number | null | undefined) {
  return `${Math.round(Number(value ?? 0))}%`;
}

function resultLabel(result: "W" | "D" | "L" | null) {
  if (result === "W") return "Forest win";
  if (result === "D") return "Draw";
  if (result === "L") return "Forest loss";
  return "—";
}

export default function HomepageLeaderboardTabs({
  individualRows,
  teamRows,
  fixtureRows,
}: {
  individualRows: IndividualLeaderboardRow[];
  teamRows: TeamLeaderboardRow[];
  fixtureRows: FixtureTableRow[];
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("teams");
  const [showFullMobileStats, setShowFullMobileStats] = useState(false);

  function changeTab(nextTab: ActiveTab) {
    setActiveTab(nextTab);
    setShowFullMobileStats(false);
  }

  return (
    <section id="leaderboards" className="scroll-mt-6">
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-3 shadow-none">
        <TableButton
          label="Team Table"
          active={activeTab === "teams"}
          onClick={() => changeTab("teams")}
        />
        <TableButton
          label="Player Table"
          active={activeTab === "players"}
          onClick={() => changeTab("players")}
        />
        <TableButton
          label="Fixture Table"
          active={activeTab === "fixtures"}
          onClick={() => changeTab("fixtures")}
        />
      </div>

      <div className="2xl:hidden">
        {activeTab === "teams" ? (
          <CompactTeamLeaderboard rows={teamRows} />
        ) : activeTab === "players" ? (
          <CompactIndividualLeaderboard rows={individualRows} />
        ) : (
          <FixtureTable rows={fixtureRows} compact />
        )}

        {activeTab !== "fixtures" && (
          <button
            type="button"
            onClick={() => setShowFullMobileStats((current) => !current)}
            className="mt-3 w-full rounded-full border border-[#111111] bg-[var(--nffc-panel,#070707)] px-5 py-3 text-xs font-black uppercase tracking-wide text-[var(--nffc-white,#f5f5f5)] transition hover:border-[#C8102E] hover:text-[#C8102E]"
          >
            {showFullMobileStats ? "Hide full stats" : "Show full stats"}
          </button>
        )}

        {showFullMobileStats && (
          <div className="mt-4">
            {activeTab === "teams" ? (
              <TeamLeaderboard rows={teamRows} />
            ) : activeTab === "players" ? (
              <IndividualLeaderboard rows={individualRows} />
            ) : null}
          </div>
        )}
      </div>

      <div className="hidden 2xl:block">
        {activeTab === "teams" ? (
          <TeamLeaderboard rows={teamRows} />
        ) : activeTab === "players" ? (
          <IndividualLeaderboard rows={individualRows} />
        ) : (
          <FixtureTable rows={fixtureRows} />
        )}
      </div>
    </section>
  );
}

function TableButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-3 text-[0.68rem] font-black uppercase tracking-wide transition md:text-xs ${
        active
          ? "bg-[#111111] text-white"
          : "border border-[#111111] bg-[var(--nffc-panel,#070707)] text-[var(--nffc-white,#f5f5f5)] hover:border-[#C8102E] hover:text-[#C8102E]"
      }`}
    >
      {label}
    </button>
  );
}

function FixtureTable({
  rows,
  compact = false,
}: {
  rows: FixtureTableRow[];
  compact?: boolean;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] p-4 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
        Fixture table not available yet.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="grid gap-2">
        {rows.map((row) => (
          <div
            key={row.fixture_id}
            className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-3 shadow-none"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#C8102E]">
                  {row.gameweek_label}
                </div>
                <div className="mt-1 text-lg font-black">
                  {row.opponent_short} {row.venue}
                </div>
              </div>
              <div className="text-right text-sm font-black">
                {resultLabel(row.forest_result)}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <MiniPercent label="W" value={row.forest_win_percent} />
              <MiniPercent label="D" value={row.draw_percent} />
              <MiniPercent label="L" value={row.forest_loss_percent} />
            </div>

            <div className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
              Correct {row.correct_count}/{row.total_predictions}
              {row.maverick_applied ? " · Maverick" : ""}
              {row.rogue_applied ? " · Rogue" : ""}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none md:p-5">
      <div className="mb-4">
        <h2 className="text-2xl font-black uppercase">Fixture table</h2>
        <p className="text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
          Completed fixtures only. Future prediction splits are not shown.
        </p>
      </div>

      <div className="overflow-hidden rounded-none border border-[var(--nffc-white,#f5f5f5)]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#111111] text-white">
            <tr>
              <th className="px-4 py-3">GW</th>
              <th className="px-4 py-3">Fixture</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Forest W</th>
              <th className="px-4 py-3">Draw</th>
              <th className="px-4 py-3">Forest L</th>
              <th className="px-4 py-3">Correct</th>
              <th className="px-4 py-3">Bonuses</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.fixture_id}
                className="border-b border-[rgba(245,245,245,0.35)] last:border-b-0"
              >
                <td className="px-4 py-3 font-black text-[#C8102E]">
                  {row.gameweek_label}
                </td>
                <td className="px-4 py-3 font-black">
                  {row.opponent_short} {row.venue}
                </td>
                <td className="px-4 py-3 font-bold">
                  {resultLabel(row.forest_result)}
                </td>
                <td className="px-4 py-3 font-bold">
                  {formatPercent(row.forest_win_percent)}
                </td>
                <td className="px-4 py-3 font-bold">
                  {formatPercent(row.draw_percent)}
                </td>
                <td className="px-4 py-3 font-bold">
                  {formatPercent(row.forest_loss_percent)}
                </td>
                <td className="px-4 py-3 font-bold">
                  {row.correct_count}/{row.total_predictions}
                </td>
                <td className="px-4 py-3 font-bold">
                  {row.maverick_applied ? "Maverick" : ""}
                  {row.maverick_applied && row.rogue_applied ? " · " : ""}
                  {row.rogue_applied ? "Rogue" : ""}
                  {!row.maverick_applied && !row.rogue_applied ? "—" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MiniPercent({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[rgba(245,245,245,0.35)] bg-[var(--nffc-black,#000000)] px-3 py-2">
      <div className="text-[0.62rem] font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-[var(--nffc-white,#f5f5f5)]">
        {formatPercent(value)}
      </div>
    </div>
  );
}
