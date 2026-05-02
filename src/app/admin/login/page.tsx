"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("nffcstats@gmail.com");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSigningIn(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSigningIn(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <main className="min-h-screen bg-[#F7F6F2] px-4 py-8 text-[#111111] sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col justify-center">
        <div className="rounded-3xl border border-[#D9D6D1] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-3 inline-flex w-fit border-b-2 border-[#C8102E] pb-2 text-xs font-black uppercase tracking-[0.25em] text-[#C8102E]">
            🔮 Admin
          </div>

          <h1 className="text-4xl font-black uppercase tracking-tight text-[#C8102E]">
            Admin login
          </h1>

          <p className="mt-4 text-sm leading-6 text-neutral-600">
            Sign in with the admin email and password.
          </p>

          <form onSubmit={signIn} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
                Email address
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
                required
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#D9D6D1] bg-[#F7F6F2] px-4 py-3 text-base font-bold outline-none focus:border-[#C8102E]"
                required
              />
            </label>

            <button
              type="submit"
              disabled={signingIn}
              className="w-full rounded-full bg-[#111111] px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#C8102E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {signingIn ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
              {errorMessage}
            </div>
          )}

          <Link
            href="/"
            className="mt-6 inline-flex text-sm font-bold uppercase tracking-wide text-[#C8102E]"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}