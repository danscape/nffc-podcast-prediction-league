"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ParentPodcastRow = {
  parent_podcast_id: string;
  podcast_name: string;
  display_name: string | null;
  abbreviation: string | null;
  x_handle: string | null;
  logo_url: string | null;
  logo_alt: string | null;
  brand_colour: string | null;
  sort_order: number | null;
  active: boolean;
  child_team_count: number;
};

type TeamRow = {
  team_id: string;
  team_name: string;
  display_name: string | null;
  abbreviation: string | null;
  x_handle: string | null;
  logo_url: string | null;
  logo_alt: string | null;
  brand_colour: string | null;
  sort_order: number | null;
  active: boolean;
  parent_podcast_id: string | null;
  parent_podcast_name: string | null;
  parent_podcast_display_name: string | null;
  parent_podcast_abbreviation: string | null;
  parent_podcast_x_handle: string | null;
  parent_podcast_logo_url: string | null;
  parent_podcast_logo_alt: string | null;
  parent_podcast_brand_colour: string | null;
  player_count: number;
};

type SaveResult = {
  success?: boolean;
  message?: string;
};

export default function AdminTeamsPage() {
  const [parentPodcasts, setParentPodcasts] = useState<ParentPodcastRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [parentDraft, setParentDraft] = useState<ParentPodcastRow | null>(null);
  const [teamDraft, setTeamDraft] = useState<TeamRow | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    setLoading(true);

    const [{ data: parentData }, { data: teamData }] = await Promise.all([
      supabase
        .from("admin_parent_podcasts_overview")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("admin_teams_overview")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    setParentPodcasts((parentData ?? []) as ParentPodcastRow[]);
    setTeams((teamData ?? []) as TeamRow[]);
    setLoading(false);
  }

  const filteredTeams = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return teams;

    return teams.filter((team) => {
      return [
        team.team_name,
        team.display_name,
        team.abbreviation,
        team.x_handle,
        team.parent_podcast_name,
        team.parent_podcast_abbreviation,
        team.logo_alt,
        team.brand_colour,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [teams, query]);

  const activeParents = parentPodcasts.filter((parent) => parent.active).length;
  const totalPlayers = teams.reduce(
    (total, team) => total + Number(team.player_count ?? 0),
    0
  );
  const teamLogos = teams.filter((team) => team.logo_url).length;
  const parentLogos = parentPodcasts.filter((parent) => parent.logo_url).length;

  function startParentEdit(parent: ParentPodcastRow) {
    setMessage(null);
    setEditingTeamId(null);
    setTeamDraft(null);
    setEditingParentId(parent.parent_podcast_id);
    setParentDraft({ ...parent });
  }

  function cancelParentEdit() {
    setEditingParentId(null);
    setParentDraft(null);
  }

  function startTeamEdit(team: TeamRow) {
    setMessage(null);
    setEditingParentId(null);
    setParentDraft(null);
    setEditingTeamId(team.team_id);
    setTeamDraft({ ...team });
  }

  function cancelTeamEdit() {
    setEditingTeamId(null);
    setTeamDraft(null);
  }

  function updateParentDraft(changes: Partial<ParentPodcastRow>) {
    setParentDraft((current) => (current ? { ...current, ...changes } : current));
  }

  function updateTeamDraft(changes: Partial<TeamRow>) {
    setTeamDraft((current) => (current ? { ...current, ...changes } : current));
  }

  async function saveParent(parent: ParentPodcastRow) {
    setSavingKey(`parent-${parent.parent_podcast_id}`);
    setMessage(null);

    const { data, error } = await supabase.rpc("admin_update_parent_podcast", {
      target_parent_podcast_id: parent.parent_podcast_id,
      new_podcast_name: parent.podcast_name,
      new_display_name: parent.display_name ?? "",
      new_abbreviation: parent.abbreviation ?? "",
      new_x_handle: parent.x_handle ?? "",
      new_logo_url: parent.logo_url ?? "",
      new_logo_alt: parent.logo_alt ?? "",
      new_brand_colour: parent.brand_colour ?? "",
      new_sort_order: parent.sort_order ?? 0,
      new_active: parent.active,
    });

    setSavingKey(null);

    const result = data as SaveResult | null;

    if (error || !result?.success) {
      setMessage({
        type: "error",
        text: result?.message ?? error?.message ?? "Could not save parent podcast.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Parent podcast saved.",
    });

    setEditingParentId(null);
    setParentDraft(null);
    await loadTeams();
  }

  async function saveTeam(team: TeamRow) {
    setSavingKey(`team-${team.team_id}`);
    setMessage(null);

    const { data, error } = await supabase.rpc("admin_update_team", {
      target_team_id: team.team_id,
      new_team_name: team.team_name,
      new_display_name: team.display_name ?? "",
      new_abbreviation: team.abbreviation ?? "",
      new_x_handle: team.x_handle ?? "",
      new_logo_url: team.logo_url ?? "",
      new_logo_alt: team.logo_alt ?? "",
      new_brand_colour: team.brand_colour ?? "",
      new_sort_order: team.sort_order ?? 0,
      new_active: team.active,
      new_parent_podcast_id: team.parent_podcast_id,
    });

    setSavingKey(null);

    const result = data as SaveResult | null;

    if (error || !result?.success) {
      setMessage({
        type: "error",
        text: result?.message ?? error?.message ?? "Could not save team.",
      });
      return;
    }

    setMessage({
      type: "success",
      text: "Team saved.",
    });

    setEditingTeamId(null);
    setTeamDraft(null);
    await loadTeams();
  }

  return (
    <main className="min-h-screen bg-[#F7F6F2] px-4 py-6 text-[#111111] sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                🔮 Admin
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-[#C8102E] md:text-5xl">
                Teams
              </h1>
              <p className="mt-3 text-sm font-semibold text-neutral-600">
                Edit one parent podcast or team at a time, including logo/icon and brand colour data.
              </p>
            </div>

            <Link
              href="/admin"
              className="w-full rounded-full border border-[#111111] px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E] sm:w-fit"
            >
              Back to admin
            </Link>
          </div>
        </header>

        {message && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm font-semibold ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <AdminStat label="Parent podcasts" value={parentPodcasts.length} />
          <AdminStat label="Teams" value={teams.length} />
          <AdminStat label="Team logos" value={teamLogos} />
          <AdminStat label="Players" value={totalPlayers} />
        </section>

        <section className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-5">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
              Search teams
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by team, parent podcast, abbreviation, X handle, logo alt or colour"
              className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
            />
          </label>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-6 text-xl font-black uppercase text-[#C8102E] shadow-sm">
            Loading teams…
          </div>
        ) : (
          <div className="grid gap-6">
            <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase">
                    Parent podcasts
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Main podcast/brand groups used for public labels, abbreviations and fallback assets.
                  </p>
                </div>
                <div className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
                  {parentLogos}/{parentPodcasts.length} logos
                </div>
              </div>

              <div className="grid gap-4">
                {parentPodcasts.map((parent) => {
                  const isEditing = editingParentId === parent.parent_podcast_id;
                  const draft = isEditing && parentDraft ? parentDraft : parent;

                  return (
                    <div
                      key={parent.parent_podcast_id}
                      className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4"
                    >
                      {!isEditing ? (
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex gap-4">
                            <LogoPreview
                              logoUrl={parent.logo_url}
                              alt={parent.logo_alt ?? parent.display_name ?? parent.podcast_name}
                              brandColour={parent.brand_colour}
                            />
                            <div>
                              <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                                {parent.abbreviation ?? "No abbreviation"}
                              </div>
                              <div className="mt-1 text-xl font-black">
                                {parent.display_name ?? parent.podcast_name}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-neutral-600">
                                {parent.x_handle ?? "No X handle"} · sort{" "}
                                {parent.sort_order ?? "—"} · {parent.child_team_count} linked team
                                {parent.child_team_count === 1 ? "" : "s"}
                              </div>
                              <div className="mt-1 text-xs font-bold uppercase text-neutral-500">
                                Logo {parent.logo_url ? "set" : "missing"} · Colour{" "}
                                {parent.brand_colour ?? "not set"}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <StatusBadge active={parent.active} />
                            <button
                              type="button"
                              onClick={() => startParentEdit(parent)}
                              className="rounded-full bg-[#111111] px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex gap-4">
                              <LogoPreview
                                logoUrl={draft.logo_url}
                                alt={draft.logo_alt ?? draft.display_name ?? draft.podcast_name}
                                brandColour={draft.brand_colour}
                              />
                              <div>
                                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                                  Editing parent podcast
                                </div>
                                <div className="mt-1 text-xl font-black">
                                  {draft.display_name ?? draft.podcast_name}
                                </div>
                              </div>
                            </div>

                            <StatusToggle
                              active={draft.active}
                              onChange={(active) => updateParentDraft({ active })}
                            />
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                            <TextField
                              label="Podcast name"
                              value={draft.podcast_name}
                              onChange={(value) =>
                                updateParentDraft({ podcast_name: value })
                              }
                              className="xl:col-span-2"
                            />
                            <TextField
                              label="Display name"
                              value={draft.display_name ?? ""}
                              onChange={(value) =>
                                updateParentDraft({ display_name: value })
                              }
                              className="xl:col-span-2"
                            />
                            <TextField
                              label="Abbr."
                              value={draft.abbreviation ?? ""}
                              onChange={(value) =>
                                updateParentDraft({ abbreviation: value })
                              }
                            />
                            <NumberField
                              label="Sort"
                              value={draft.sort_order ?? 0}
                              onChange={(value) =>
                                updateParentDraft({ sort_order: value })
                              }
                            />
                            <TextField
                              label="X handle"
                              value={draft.x_handle ?? ""}
                              onChange={(value) =>
                                updateParentDraft({ x_handle: value })
                              }
                              className="md:col-span-2 xl:col-span-2"
                            />
                            <TextField
                              label="Logo URL"
                              value={draft.logo_url ?? ""}
                              onChange={(value) =>
                                updateParentDraft({ logo_url: value })
                              }
                              className="md:col-span-2 xl:col-span-2"
                            />
                            <TextField
                              label="Logo alt"
                              value={draft.logo_alt ?? ""}
                              onChange={(value) =>
                                updateParentDraft({ logo_alt: value })
                              }
                              className="md:col-span-2 xl:col-span-1"
                            />
                            <TextField
                              label="Brand colour"
                              value={draft.brand_colour ?? ""}
                              onChange={(value) =>
                                updateParentDraft({ brand_colour: value })
                              }
                              placeholder="#C8102E"
                              className="md:col-span-2 xl:col-span-1"
                            />

                            <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-6 xl:flex-row xl:items-end">
                              <button
                                type="button"
                                onClick={() => saveParent(draft)}
                                disabled={
                                  savingKey === `parent-${draft.parent_podcast_id}`
                                }
                                className="w-full rounded-full bg-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingKey === `parent-${draft.parent_podcast_id}`
                                  ? "Saving…"
                                  : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelParentEdit}
                                className="w-full rounded-full border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-[#D9D6D1] bg-white p-4 shadow-sm md:p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase">Teams</h2>
                  <p className="text-sm text-neutral-600">
                    Team-level names and assets used for leaderboards, player groups and social graphics.
                  </p>
                </div>
                <div className="text-sm font-bold uppercase tracking-wide text-[#C8102E]">
                  {filteredTeams.length} shown / {teams.length} teams
                </div>
              </div>

              <div className="grid gap-4">
                {filteredTeams.map((team) => {
                  const isEditing = editingTeamId === team.team_id;
                  const draft = isEditing && teamDraft ? teamDraft : team;
                  const effectiveLogo = team.logo_url ?? team.parent_podcast_logo_url;
                  const effectiveColour =
                    team.brand_colour ?? team.parent_podcast_brand_colour;

                  return (
                    <div
                      key={team.team_id}
                      className="rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] p-4"
                    >
                      {!isEditing ? (
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex gap-4">
                            <LogoPreview
                              logoUrl={effectiveLogo}
                              alt={
                                team.logo_alt ??
                                team.parent_podcast_logo_alt ??
                                team.display_name ??
                                team.team_name
                              }
                              brandColour={effectiveColour}
                            />
                            <div>
                              <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                                {team.abbreviation ?? "No abbreviation"}
                              </div>
                              <div className="mt-1 text-xl font-black">
                                {team.display_name ?? team.team_name}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-neutral-600">
                                Parent:{" "}
                                {team.parent_podcast_display_name ??
                                  team.parent_podcast_name ??
                                  "None"}{" "}
                                · {team.x_handle ?? team.parent_podcast_x_handle ?? "No X handle"} ·{" "}
                                {team.player_count} player
                                {team.player_count === 1 ? "" : "s"} · sort{" "}
                                {team.sort_order ?? "—"}
                              </div>
                              <div className="mt-1 text-xs font-bold uppercase text-neutral-500">
                                Logo {effectiveLogo ? "set" : "missing"} · Colour{" "}
                                {effectiveColour ?? "not set"}
                                {!team.logo_url && team.parent_podcast_logo_url
                                  ? " · using parent logo"
                                  : ""}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <StatusBadge active={team.active} />
                            <button
                              type="button"
                              onClick={() => startTeamEdit(team)}
                              className="rounded-full bg-[#111111] px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex gap-4">
                              <LogoPreview
                                logoUrl={draft.logo_url ?? draft.parent_podcast_logo_url}
                                alt={
                                  draft.logo_alt ??
                                  draft.parent_podcast_logo_alt ??
                                  draft.display_name ??
                                  draft.team_name
                                }
                                brandColour={
                                  draft.brand_colour ?? draft.parent_podcast_brand_colour
                                }
                              />
                              <div>
                                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#C8102E]">
                                  Editing team
                                </div>
                                <div className="mt-1 text-xl font-black">
                                  {draft.display_name ?? draft.team_name}
                                </div>
                                <div className="text-sm font-semibold text-neutral-600">
                                  {draft.player_count} player
                                  {draft.player_count === 1 ? "" : "s"}
                                </div>
                              </div>
                            </div>

                            <StatusToggle
                              active={draft.active}
                              onChange={(active) => updateTeamDraft({ active })}
                            />
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                            <TextField
                              label="Team name"
                              value={draft.team_name}
                              onChange={(value) =>
                                updateTeamDraft({ team_name: value })
                              }
                              className="xl:col-span-2"
                            />
                            <TextField
                              label="Display name"
                              value={draft.display_name ?? ""}
                              onChange={(value) =>
                                updateTeamDraft({ display_name: value })
                              }
                              className="xl:col-span-2"
                            />
                            <TextField
                              label="Abbr."
                              value={draft.abbreviation ?? ""}
                              onChange={(value) =>
                                updateTeamDraft({ abbreviation: value })
                              }
                            />
                            <NumberField
                              label="Sort"
                              value={draft.sort_order ?? 0}
                              onChange={(value) =>
                                updateTeamDraft({ sort_order: value })
                              }
                            />
                            <TextField
                              label="X handle"
                              value={draft.x_handle ?? ""}
                              onChange={(value) =>
                                updateTeamDraft({ x_handle: value })
                              }
                              className="md:col-span-2 xl:col-span-2"
                            />
                            <label className="block md:col-span-2 xl:col-span-2">
                              <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
                                Parent podcast
                              </span>
                              <select
                                value={draft.parent_podcast_id ?? ""}
                                onChange={(event) =>
                                  updateTeamDraft({
                                    parent_podcast_id: event.target.value || null,
                                  })
                                }
                                className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
                              >
                                <option value="">No parent</option>
                                {parentPodcasts.map((parent) => (
                                  <option
                                    key={parent.parent_podcast_id}
                                    value={parent.parent_podcast_id}
                                  >
                                    {parent.display_name ?? parent.podcast_name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <TextField
                              label="Logo URL"
                              value={draft.logo_url ?? ""}
                              onChange={(value) =>
                                updateTeamDraft({ logo_url: value })
                              }
                              className="md:col-span-2 xl:col-span-2"
                            />
                            <TextField
                              label="Logo alt"
                              value={draft.logo_alt ?? ""}
                              onChange={(value) =>
                                updateTeamDraft({ logo_alt: value })
                              }
                              className="md:col-span-2 xl:col-span-2"
                            />
                            <TextField
                              label="Brand colour"
                              value={draft.brand_colour ?? ""}
                              onChange={(value) =>
                                updateTeamDraft({ brand_colour: value })
                              }
                              placeholder="#C8102E"
                              className="md:col-span-2 xl:col-span-2"
                            />

                            <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-6 xl:flex-row xl:items-end">
                              <button
                                type="button"
                                onClick={() => saveTeam(draft)}
                                disabled={savingKey === `team-${draft.team_id}`}
                                className="w-full rounded-full bg-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingKey === `team-${draft.team_id}`
                                  ? "Saving…"
                                  : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelTeamEdit}
                                className="w-full rounded-full border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>

                          {!draft.logo_url && draft.parent_podcast_logo_url && (
                            <div className="mt-4 rounded-2xl border border-[#D9D6D1] bg-white p-4 text-sm font-semibold text-neutral-600">
                              This team is currently using the parent podcast logo as its fallback.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function AdminStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#D9D6D1] bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black text-[#C8102E]">{value}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  className = "",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-white px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
      />
    </label>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-black uppercase text-green-800">
        Active
      </span>
    );
  }

  return (
    <span className="w-fit rounded-full bg-neutral-200 px-3 py-1 text-xs font-black uppercase text-neutral-700">
      Inactive
    </span>
  );
}

function StatusToggle({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (active: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`w-full rounded-full px-5 py-3 text-xs font-black uppercase tracking-wide transition sm:w-fit ${
        active
          ? "bg-green-100 text-green-800 hover:bg-green-200"
          : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

function LogoPreview({
  logoUrl,
  alt,
  brandColour,
}: {
  logoUrl: string | null;
  alt: string;
  brandColour: string | null;
}) {
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#D9D6D1] bg-white text-xs font-black uppercase text-neutral-400"
      style={{
        borderColor: brandColour || undefined,
      }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={alt}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        "Logo"
      )}
    </div>
  );
}