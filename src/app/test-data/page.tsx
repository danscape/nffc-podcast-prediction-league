import { supabase } from "@/lib/supabaseClient";

export default async function TestDataPage() {
  const { data: fixtures, error: fixturesError } = await supabase
    .from("fixtures_with_uk_time")
    .select("gameweek_label, opponent_short, venue, kickoff_uk_time, prediction_lock_uk_time")
    .order("gameweek");

  const { data: teams, error: teamsError } = await supabase
    .from("admin_teams_overview")
    .select("team_name, abbreviation, parent_podcast_name, player_count")
    .order("sort_order");

  return (
    <main className="min-h-screen bg-[#F7F6F2] p-8 text-[#111111]">
      <h1 className="mb-6 text-3xl font-bold">Imported Data Test</h1>

      {(fixturesError || teamsError) && (
        <pre className="mb-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
          {JSON.stringify({ fixturesError, teamsError }, null, 2)}
        </pre>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold">Teams</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {teams?.map((team) => (
            <div key={team.team_name} className="rounded-lg border border-[#D9D6D1] bg-white p-4">
              <div className="font-semibold">{team.team_name}</div>
              <div className="text-sm text-neutral-600">
                {team.parent_podcast_name} / {team.abbreviation} / {team.player_count} players
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Fixtures</h2>
        <div className="grid gap-2">
          {fixtures?.map((fixture) => (
            <div
              key={fixture.gameweek_label}
              className="flex items-center justify-between rounded-lg border border-[#D9D6D1] bg-white px-4 py-3"
            >
              <span className="font-semibold">
                {fixture.gameweek_label} — {fixture.opponent_short} {fixture.venue}
              </span>
              <span className="text-sm text-neutral-600">
                {fixture.kickoff_uk_time ? String(fixture.kickoff_uk_time) : "Kick-off TBC"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}