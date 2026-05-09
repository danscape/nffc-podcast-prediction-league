"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import RankHistoryChart from "./RankHistoryChart";

type PlayerRankHistoryRow = {
  player_slug: string | null;
  player_name: string | null;
  short_name: string | null;
  gameweek: number;
  gameweek_label: string | null;
  overall_rank_after_gw: number | string | null;
};

export default function PlayerRankHistoryPanel({
  playerSlug,
}: {
  playerSlug: string | null;
}) {
  const [rows, setRows] = useState<PlayerRankHistoryRow[]>([]);
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRankHistory() {
      if (!playerSlug) {
        setRows([]);
        setPlayerCount(null);
        return;
      }

      const [{ data: rankData }, { count }] = await Promise.all([
        supabase
          .from("player_weekly_rank_history")
          .select("player_slug, player_name, short_name, gameweek, gameweek_label, overall_rank_after_gw")
          .eq("player_slug", playerSlug)
          .order("gameweek", { ascending: true }),
        supabase
          .from("players")
          .select("*", { count: "exact", head: true })
          .eq("active", true),
      ]);

      if (cancelled) return;

      setRows((rankData ?? []) as PlayerRankHistoryRow[]);
      setPlayerCount(count ?? null);
    }

    loadRankHistory();

    return () => {
      cancelled = true;
    };
  }, [playerSlug]);

  const latest = rows[rows.length - 1] ?? null;
  const playerName = latest?.short_name ?? latest?.player_name ?? null;

  return (
    <RankHistoryChart
      title="Player Rank Movement"
      subjectName={playerName}
      subjectType="player"
      subtitle="Individual table position after each confirmed gameweek."
      points={rows.map((row) => ({
        gameweek: Number(row.gameweek),
        gameweek_label: row.gameweek_label,
        rank: Number(row.overall_rank_after_gw ?? 0),
      }))}
      rankCount={playerCount ?? undefined}
      totalGameweeks={38}
    />
  );
}
