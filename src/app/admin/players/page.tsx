"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type PlayerRow = {
  player_id: string;
  legacy_code: string | null;
  player_name: string;
  short_name: string | null;
  name_and_pod: string | null;
  email: string;
  joined_gameweek: number;
  active: boolean;
  access_token: string;
  team_name: string;
  team_display_name: string | null;
  team_abbreviation: string | null;
  parent_podcast: string | null;
  parent_podcast_abbreviation: string | null;
  parent_x_handle: string | null;
  table_display_name: string | null;
  prediction_rows: number;
  last_prediction_update: string | null;
};

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlayers() {
      setLoading(true);

      const { data, error } = await supabase
        .from("admin_players_overview")
        .select("*")
        .order("team_name", { ascending: true })
        .order("player_name", { ascending: true });

      if (!error && data) {
        setPlayers(data as PlayerRow[]);
      }

      setLoading(false);
    }

    loadPlayers();
  }, []);

  const filteredPlayers = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return players;

    return players.filter((player) => {
      return [
        player.player_name,
        player.short_name,
        player.email,
        player.team_name,
        player.parent_podcast,
        player.legacy_code,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [players, query]);

  function predictionUrl(token: string) {
    if (typeof window === "undefined") return `/predict/${token}`;
    return `${window.location.origin}/predict/${token}`;
  }

  async function copyPredictionLink(token: string) {
    const url = predictionUrl(token);
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);

    window.setTimeout(() => {
      setCopiedToken(null);
    }, 2000);
  }

  return (
    <main className="min-h-screen bg-[var(--nffc-black,#000000)] px-4 py-6 text-[var(--nffc-white,#f5f5f5)] sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-5 shadow-none md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                🔮 Admin
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-[#C8102E] md:text-5xl">
                Players
              </h1>
              <p className="mt-3 text-sm font-semibold text-[var(--nffc-muted,#a7a7a7)]">
                Review player records, teams and prediction links.
              </p>
            </div>

            <Link
              href="/admin"
              className="w-full rounded-full border border-[#111111] px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-[var(--nffc-white,#f5f5f5)] transition hover:border-[#C8102E] hover:text-[#C8102E] sm:w-fit"
            >
              Back to admin
            </Link>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <AdminStat label="Players" value={players.length} />
          <AdminStat
            label="Active"
            value={players.filter((player) => player.active).length}
          />
          <AdminStat
            label="GW2 joiners"
            value={players.filter((player) => player.joined_gameweek === 2).length}
          />
          <AdminStat
            label="Prediction rows"
            value={players.reduce(
              (total, player) => total + Number(player.prediction_rows ?? 0),
              0
            )}
          />
        </section>

        <section className="mb-6 rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none md:p-5">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
              Search players
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, team, email or PPL code"
              className="mt-2 w-full rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
            />
          </label>
        </section>

        {loading ? (
          <div className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-6 text-xl font-black uppercase text-[#C8102E] shadow-none">
            Loading players…
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] shadow-none xl:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-[#111111] text-white">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Predictions</th>
                    <th className="px-4 py-3">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player) => (
                    <tr
                      key={player.player_id}
                      className="border-b border-[rgba(245,245,245,0.35)] last:border-b-0"
                    >
                      <td className="px-4 py-3 font-black">
                        {player.legacy_code}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-black">
                          {player.table_display_name ?? player.player_name}
                        </div>
                        <div className="text-xs text-[var(--nffc-muted,#a7a7a7)]">
                          {player.player_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--nffc-muted,#a7a7a7)]">
                        {player.email}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold">
                          {player.team_display_name ?? player.team_name}
                        </div>
                        <div className="text-xs text-[var(--nffc-muted,#a7a7a7)]">
                          {player.parent_podcast}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        GW{player.joined_gameweek}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {player.prediction_rows}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => copyPredictionLink(player.access_token)}
                          className="rounded-full bg-[#111111] px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
                        >
                          {copiedToken === player.access_token
                            ? "Copied"
                            : "Copy link"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 xl:hidden">
              {filteredPlayers.map((player) => (
                <div
                  key={player.player_id}
                  className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                        {player.legacy_code}
                      </div>
                      <div className="mt-1 text-xl font-black">
                        {player.table_display_name ?? player.player_name}
                      </div>
                      <div className="text-sm text-[var(--nffc-muted,#a7a7a7)]">
                        {player.email}
                      </div>
                    </div>

                    <div className="rounded-full bg-[#111111] px-3 py-1 text-xs font-black uppercase text-white">
                      GW{player.joined_gameweek}
                    </div>
                  </div>

                  <div className="mt-4 rounded-none bg-[var(--nffc-black,#000000)] p-3">
                    <div className="text-sm font-black">
                      {player.team_display_name ?? player.team_name}
                    </div>
                    <div className="text-xs text-[var(--nffc-muted,#a7a7a7)]">
                      {player.parent_podcast}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-bold text-[var(--nffc-muted,#a7a7a7)]">
                      {player.prediction_rows} prediction rows
                    </div>
                    <button
                      type="button"
                      onClick={() => copyPredictionLink(player.access_token)}
                      className="rounded-full bg-[#111111] px-4 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
                    >
                      {copiedToken === player.access_token
                        ? "Copied"
                        : "Copy prediction link"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function AdminStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-panel,#070707)] p-4 shadow-none">
      <div className="text-xs font-bold uppercase tracking-wide text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black text-[#C8102E]">{value}</div>
    </div>
  );
}