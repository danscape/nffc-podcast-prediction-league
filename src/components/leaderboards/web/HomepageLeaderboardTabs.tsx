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

export default function HomepageLeaderboardTabs({
  individualRows,
  teamRows,
}: {
  individualRows: IndividualLeaderboardRow[];
  teamRows: TeamLeaderboardRow[];
}) {
  const [activeTab, setActiveTab] = useState<"teams" | "individuals">("teams");
  const [showFullMobileStats, setShowFullMobileStats] = useState(false);

  function changeTab(nextTab: "teams" | "individuals") {
    setActiveTab(nextTab);
    setShowFullMobileStats(false);
  }

  return (
    <section id="leaderboards" className="scroll-mt-6">
      <div className="mb-4 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
              Leaderboards
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-[#111111] md:text-4xl">
              Tables
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-neutral-600">
              Teams first for the headline table. Switch to individuals for the
              full player race.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:w-fit">
            <button
              type="button"
              onClick={() => changeTab("teams")}
              className={`rounded-full px-5 py-3 text-xs font-black uppercase tracking-wide transition ${
                activeTab === "teams"
                  ? "bg-[#111111] text-white"
                  : "border border-[#111111] bg-white text-[#111111] hover:border-[#C8102E] hover:text-[#C8102E]"
              }`}
            >
              Teams
            </button>
            <button
              type="button"
              onClick={() => changeTab("individuals")}
              className={`rounded-full px-5 py-3 text-xs font-black uppercase tracking-wide transition ${
                activeTab === "individuals"
                  ? "bg-[#111111] text-white"
                  : "border border-[#111111] bg-white text-[#111111] hover:border-[#C8102E] hover:text-[#C8102E]"
              }`}
            >
              Individuals
            </button>
          </div>
        </div>
      </div>

      <div className="2xl:hidden">
        {activeTab === "teams" ? (
          <CompactTeamLeaderboard rows={teamRows} />
        ) : (
          <CompactIndividualLeaderboard rows={individualRows} />
        )}

        <button
          type="button"
          onClick={() => setShowFullMobileStats((current) => !current)}
          className="mt-3 w-full rounded-full border border-[#111111] bg-white px-5 py-3 text-xs font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E]"
        >
          {showFullMobileStats ? "Hide full stats" : "Show full stats"}
        </button>

        {showFullMobileStats && (
          <div className="mt-4">
            {activeTab === "teams" ? (
              <TeamLeaderboard rows={teamRows} />
            ) : (
              <IndividualLeaderboard rows={individualRows} />
            )}
          </div>
        )}
      </div>

      <div className="hidden 2xl:block">
        {activeTab === "teams" ? (
          <TeamLeaderboard rows={teamRows} />
        ) : (
          <IndividualLeaderboard rows={individualRows} />
        )}
      </div>
    </section>
  );
}
