"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import RankHistoryChart from "./RankHistoryChart";

type TeamRankHistoryRow = {
  slug: string | null;
  team_name: string | null;
  display_name: string | null;
  gameweek: number;
  gameweek_label: string | null;
  team_rank: number | string | null;
  team_rank_out_of: number | string | null;
};

export default function TeamRankHistoryPanel({
  teamSlug,
}: {
  teamSlug: string | null;
}) {
  const [rows, setRows] = useState<TeamRankHistoryRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadRankHistory() {
      if (!teamSlug) {
        setRows([]);
        return;
      }

      const { data } = await supabase
        .from("team_rank_history")
        .select("slug, team_name, display_name, gameweek, gameweek_label, team_rank, team_rank_out_of")
        .eq("slug", teamSlug)
        .order("gameweek", { ascending: true });

      if (cancelled) return;

      setRows((data ?? []) as TeamRankHistoryRow[]);
    }

    loadRankHistory();

    return () => {
      cancelled = true;
    };
  }, [teamSlug]);

  const latest = rows[rows.length - 1] ?? null;

  const teamName = latest?.display_name ?? latest?.team_name ?? null;

  return (
    <RankHistoryChart
      title="Team Rank Movement"
      subjectName={teamName}
      subjectType="team"
      subtitle="Team table position after each confirmed gameweek."
      points={rows.map((row) => ({
        gameweek: Number(row.gameweek),
        gameweek_label: row.gameweek_label,
        rank: Number(row.team_rank ?? 0),
      }))}
      rankCount={latest?.team_rank_out_of ? Number(latest.team_rank_out_of) : undefined}
      totalGameweeks={38}
    />
  );
}
