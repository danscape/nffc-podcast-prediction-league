"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type AdminState = "loading" | "not-signed-in" | "not-admin" | "admin";

type DashboardCounts = {
  teams: number;
  players: number;
  fixtures: number;
  predictions: number;
};

export default function AdminDashboardPage() {
  const [adminState, setAdminState] = useState<AdminState>("loading");
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [counts, setCounts] = useState<DashboardCounts>({
    teams: 0,
    players: 0,
    fixtures: 0,
    predictions: 0,
  });

  useEffect(() => {
    async function loadAdmin() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session?.user?.email) {
        setAdminState("not-signed-in");
        return;
      }

      setAdminEmail(session.user.email);

      const { data: adminRows, error: adminError } = await supabase
        .from("admin_users")
        .select("email, active")
        .eq("email", session.user.email)
        .eq("active", true)
        .limit(1);

      if (adminError || !adminRows?.length) {
        setAdminState("not-admin");
        return;
      }

      const [
        { count: teamCount },
        { count: playerCount },
        { count: fixtureCount },
        { count: predictionCount },
      ] = await Promise.all([
        supabase.from("teams").select("*", { count: "exact", head: true }),
        supabase.from("players").select("*", { count: "exact", head: true }),
        supabase.from("fixtures").select("*", { count: "exact", head: true }),
        supabase
          .from("current_predictions")
          .select("*", { count: "exact", head: true }),
      ]);

      setCounts({
        teams: teamCount ?? 0,
        players: playerCount ?? 0,
        fixtures: fixtureCount ?? 0,
        predictions: predictionCount ?? 0,
      });

      setAdminState("admin");
    }

    loadAdmin();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setAdminState("not-signed-in");
    setAdminEmail(null);
  }

  if (adminState === "loading") {
    return (
      <main className="min-h-screen bg-[#F7F6F2] px-4 py-8 text-[#111111] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-6 shadow-sm">
            <div className="text-xl font-black uppercase text-[#C8102E]">
              Loading admin…
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (adminState === "not-signed-in") {
    return (
      <main className="min-h-screen bg-[#F7F6F2] px-4 py-8 text-[#111111] sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col justify-center">
          <div className="rounded-3xl border border-[#D9D6D1] bg-white p-6 text-center shadow-sm md:p-8">
            <h1 className="text-3xl font-black uppercase text-[#C8102E]">
              Admin access required
            </h1>
            <p className="mt-3 text-sm text-neutral-600">
              Sign in with the admin email address to manage the prediction league.
            </p>
            <Link
              href="/admin/login"
              className="mt-6 inline-flex rounded-full bg-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-white"
            >
              Go to login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (adminState === "not-admin") {
    return (
      <main className="min-h-screen bg-[#F7F6F2] px-4 py-8 text-[#111111] sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col justify-center">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-sm md:p-8">
            <h1 className="text-3xl font-black uppercase text-red-800">
              Not authorised
            </h1>
            <p className="mt-3 text-sm text-red-700">
              {adminEmail} is signed in but is not listed as an active admin.
            </p>
            <button
              type="button"
              onClick={signOut}
              className="mt-6 rounded-full bg-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F6F2] px-4 py-6 text-[#111111] sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl border border-[#D9D6D1] bg-white p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
                🔮 Admin dashboard
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-[#C8102E] md:text-5xl">
                Prediction League
                <span className="block text-[#111111]">Admin</span>
              </h1>
              <p className="mt-3 text-sm font-semibold text-neutral-600">
                Signed in as {adminEmail}
              </p>
            </div>

            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-full border border-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#111111] transition hover:border-[#C8102E] hover:text-[#C8102E] sm:w-fit"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <AdminStat label="Teams" value={counts.teams} />
          <AdminStat label="Players" value={counts.players} />
          <AdminStat label="Fixtures" value={counts.fixtures} />
          <AdminStat label="Predictions" value={counts.predictions} />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AdminCard
            title="Players"
            description="View players, tokens, emails, teams and joined gameweek."
            href="/admin/players"
          />
          <AdminCard
            title="Teams"
            description="Manage parent podcasts, team names, abbreviations, X handles and logo fields."
            href="/admin/teams"
          />
          <AdminCard
            title="Fixtures"
            description="Review GW labels, opponents, kick-off times, locks and results."
            href="/admin/fixtures"
          />
<AdminCard
  title="Season / API Sync"
  description="Manage active season settings and run fixture/results API syncs."
  href="/admin/season"
/>
          <AdminCard
            title="Manual predictions"
            description="Update player predictions when entries are sent outside the form."
            href="/admin/predictions"
          />
          <AdminCard
            title="Leaderboards"
            description="Check individual and team tables after scoring."
            href="/admin/leaderboards"
          />
          <AdminCard
            title="Social output"
            description="Generate weekly post copy and graphics data."
            href="/admin/social"
          />
          <AdminCard
            title="Reminder emails"
            description="Dry-run or send fixture reminder emails around 2 days before Premier League kick-off."
            href="/admin/reminders"
          />
        </section>
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

function AdminCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-[#D9D6D1] bg-white p-5 shadow-sm transition hover:border-[#C8102E]"
    >
      <h2 className="text-2xl font-black uppercase text-[#111111]">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-600">{description}</p>
      <div className="mt-5 text-sm font-black uppercase tracking-wide text-[#C8102E]">
        Open →
      </div>
    </Link>
  );
}