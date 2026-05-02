import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default async function HomePage() {
  const [
    { data: settings },
    { count: teamCount },
    { count: playerCount },
    { count: fixtureCount },
  ] = await Promise.all([
    supabase.from("app_settings").select("*"),
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase.from("players").select("*", { count: "exact", head: true }),
    supabase.from("fixtures").select("*", { count: "exact", head: true }),
  ]);

  const settingsMap = Object.fromEntries(
    (settings ?? []).map((setting) => [setting.key, setting.value])
  );

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#111111]">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
        <div className="mb-8 inline-flex w-fit items-center gap-3 border-b-2 border-[#C8102E] pb-2 text-sm font-semibold uppercase tracking-[0.25em] text-[#C8102E]">
          🔮 NFFC Podcast Prediction League
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
          <div>
            <h1 className="max-w-4xl text-5xl font-black uppercase tracking-tight text-[#C8102E] md:text-7xl">
              NFFC Podcast
              <span className="block text-[#111111]">Prediction League</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-700">
              Individual and team score prediction game for the Forest podcast
              community. Predict every game, track the table, and follow the
              season&apos;s changing mood.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/test-data"
                className="rounded-full bg-[#111111] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#C8102E]"
              >
                View imported data
              </Link>

              <Link
                href="/test-supabase"
                className="rounded-full border border-[#111111] px-5 py-3 text-sm font-bold uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E]"
              >
                Supabase test
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-6 shadow-sm">
            <div className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-[#C8102E]">
              Current setup
            </div>

            <div className="space-y-4">
              <Stat label="Season" value={settingsMap.current_season ?? "TBC"} />
              <Stat label="Teams" value={String(teamCount ?? 0)} />
              <Stat label="Players" value={String(playerCount ?? 0)} />
              <Stat label="Fixtures" value={String(fixtureCount ?? 0)} />
              <Stat label="Timezone" value={settingsMap.timezone ?? "Europe/London"} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#D9D6D1] pb-3">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-xl font-black text-[#111111]">{value}</span>
    </div>
  );
}