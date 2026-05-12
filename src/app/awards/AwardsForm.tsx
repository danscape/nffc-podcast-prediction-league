"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Option = {
  id: string;
  label: string;
  meta?: string | null;
};

type Props = {
  players: Option[];
  signings: Option[];
  fixtures: Option[];
  goals: Option[];
  goalsConceded: Option[];
};

type FormState = {
  player_1st_id: string;
  player_2nd_id: string;
  player_3rd_id: string;
  signing_id: string;
  breakthrough_id: string;
  one_to_watch_id: string;
  favourite_fixture_id: string;
  least_favourite_fixture_id: string;
  goal_id: string;
  goal_conceded_id: string;
  three_words: string;
  comment: string;
};

const initialForm: FormState = {
  player_1st_id: "",
  player_2nd_id: "",
  player_3rd_id: "",
  signing_id: "",
  breakthrough_id: "",
  one_to_watch_id: "",
  favourite_fixture_id: "",
  least_favourite_fixture_id: "",
  goal_id: "",
  goal_conceded_id: "",
  three_words: "",
  comment: "",
};

const fieldClass =
  "w-full rounded-none border border-white/30 bg-black px-3 py-3 text-base font-bold text-white outline-none focus:border-green-400 md:px-4 md:py-4 md:text-lg";

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 border-t border-white/20 px-4 py-6 sm:px-6 md:px-8 md:py-8">
      <div>
        <div className="bg-red-700 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white md:text-lg">
          {title}
        </div>
        {intro ? (
          <p className="mt-3 max-w-4xl text-sm font-bold leading-relaxed text-white/70 md:text-base">
            {intro}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function ChoiceField({
  label,
  help,
  value,
  onChange,
  options,
  wide = false,
  required = true,
  badge,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  wide?: boolean;
  required?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.id === value);

  const filteredOptions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) {
      return options;
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(cleanQuery),
    );
  }, [options, query]);

  return (
    <div className={`grid gap-2 ${wide ? "md:col-span-2" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase leading-snug tracking-[0.1em] text-white md:text-lg">
            {label}
          </p>
          {help ? (
            <p className="mt-1 text-xs font-bold leading-relaxed text-white/60 md:text-sm">
              {help}
            </p>
          ) : null}
        </div>

        {badge ? (
          <div className="shrink-0 border border-green-400 px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-green-300 md:px-3 md:py-2 md:text-sm">
            {badge}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
        className="flex min-h-16 w-full items-center justify-between gap-3 border border-white/35 bg-black px-4 py-4 text-left text-base font-bold text-white hover:border-green-400 md:min-h-20 md:text-xl"
      >
        <span className={selected ? "text-white" : "text-white/45"}>
          {selected ? selected.label : "Tap to choose..."}
        </span>
        <span className="shrink-0 text-2xl text-green-300">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div className="border border-green-400 bg-black md:col-span-2">
          <div className="border-b border-white/20 p-2 md:p-3">
            <input
              className="w-full border border-white/30 bg-black px-3 py-3 text-base font-bold text-white outline-none focus:border-green-400 md:px-4 md:py-4 md:text-lg"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              autoFocus
            />
          </div>

          <div className="max-h-80 overflow-y-auto md:max-h-[28rem]">
            {filteredOptions.map((option) => {
              const active = option.id === value;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`block min-h-14 w-full border-b border-white/10 px-4 py-4 text-left text-base font-bold leading-snug md:min-h-16 md:text-lg ${
                    active ? "bg-green-400 text-black" : "bg-black text-white"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}

            {!filteredOptions.length ? (
              <div className="px-4 py-5 text-sm text-white/60">
                No matching options.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <input value={value} required={required} readOnly className="sr-only" />
    </div>
  );
}

function PlayerPodium({
  form,
  update,
  players,
}: {
  form: FormState;
  update: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  players: Option[];
}) {
  return (
    <div className="grid gap-4">
      <div className="border border-green-400 bg-black p-4 md:p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300 md:text-sm">
          Player of the Season scoring
        </p>
        <p className="mt-2 text-sm font-bold leading-relaxed text-white/80 md:text-base">
          Pick three different players. Your 1st choice gets 5 points, 2nd gets
          3 points, and 3rd gets 1 point.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="border border-green-400 p-3 md:p-4">
          <ChoiceField
            label="1st Choice"
            help="Your Player of the Season. Worth 5 points."
            badge="5 pts"
            value={form.player_1st_id}
            onChange={(value) => update("player_1st_id", value)}
            options={players}
          />
        </div>

        <div className="border border-yellow-300 p-3 md:p-4">
          <ChoiceField
            label="2nd Choice"
            help="Runner-up. Worth 3 points."
            badge="3 pts"
            value={form.player_2nd_id}
            onChange={(value) => update("player_2nd_id", value)}
            options={players}
          />
        </div>

        <div className="border border-cyan-300 p-3 md:p-4">
          <ChoiceField
            label="3rd Choice"
            help="Third place. Worth 1 point."
            badge="1 pt"
            value={form.player_3rd_id}
            onChange={(value) => update("player_3rd_id", value)}
            options={players}
          />
        </div>
      </div>
    </div>
  );
}

export default function AwardsForm({
  players,
  signings,
  fixtures,
  goals,
  goalsConceded,
}: Props) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const playerPickError = useMemo(() => {
    const picks = [
      form.player_1st_id,
      form.player_2nd_id,
      form.player_3rd_id,
    ].filter(Boolean);

    if (picks.length < 3) {
      return "";
    }

    return new Set(picks).size === picks.length
      ? ""
      : "Please choose three different players for Player of the Season.";
  }, [form.player_1st_id, form.player_2nd_id, form.player_3rd_id]);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submitVote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    if (playerPickError) {
      setStatus("error");
      setErrorMessage(playerPickError);
      return;
    }

    const response = await fetch("/api/awards/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus("error");
      setErrorMessage(result.error || "Vote could not be submitted.");
      return;
    }

    router.push("/awards/thanks");
  }

  return (
    <form className="pb-6" onSubmit={submitVote}>
      <Section
        title="Player of the Season"
        intro="This is the main award. Rank your top three Forest players in order."
      >
        <PlayerPodium form={form} update={update} players={players} />

        {playerPickError ? (
          <div className="border border-red-500 px-4 py-3 text-sm font-bold text-red-300 md:text-base">
            {playerPickError}
          </div>
        ) : null}
      </Section>

      <Section
        title="Other Player Awards"
        intro="Pick one player for each of the other season awards."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <ChoiceField
            label="Signing of the Season"
            value={form.signing_id}
            onChange={(value) => update("signing_id", value)}
            options={signings}
          />

          <ChoiceField
            label="Breakthrough / Surprise of the Season"
            value={form.breakthrough_id}
            onChange={(value) => update("breakthrough_id", value)}
            options={players}
          />

          <ChoiceField
            label="One to Watch Next Season"
            value={form.one_to_watch_id}
            onChange={(value) => update("one_to_watch_id", value)}
            options={players}
            wide
          />
        </div>
      </Section>

      <Section
        title="Match Awards"
        intro="Pick the Forest game you enjoyed most and the one you would rather forget."
      >
        <div className="grid gap-5">
          <ChoiceField
            label="Favourite Game"
            value={form.favourite_fixture_id}
            onChange={(value) => update("favourite_fixture_id", value)}
            options={fixtures}
            wide
          />

          <ChoiceField
            label="Least Favourite Game"
            value={form.least_favourite_fixture_id}
            onChange={(value) => update("least_favourite_fixture_id", value)}
            options={fixtures}
            wide
          />
        </div>
      </Section>

      <Section
        title="Goal Awards"
        intro="Pick the best Forest goal. Worst goal conceded is optional."
      >
        <div className="grid gap-5">
          <ChoiceField
            label="Goal of the Season"
            value={form.goal_id}
            onChange={(value) => update("goal_id", value)}
            options={goals}
            wide
          />

          <ChoiceField
            label="Worst Goal Conceded"
            help="Optional."
            value={form.goal_conceded_id}
            onChange={(value) => update("goal_conceded_id", value)}
            options={goalsConceded}
            wide
            required={false}
          />
        </div>
      </Section>

      <Section
        title="Optional Extras"
        intro="Optional answers for the final results write-up and social posts."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-black uppercase leading-snug tracking-[0.1em] text-white md:text-lg">
              Describe Forest&apos;s season in three words
            </span>
            <input
              className={fieldClass}
              value={form.three_words}
              onChange={(event) => update("three_words", event.target.value)}
              maxLength={80}
              placeholder="e.g. chaotic, brilliant, stressful"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-black uppercase leading-snug tracking-[0.1em] text-white md:text-lg">
              Any quick comment on your picks?
            </span>
            <textarea
              className={`${fieldClass} min-h-32 resize-y`}
              value={form.comment}
              onChange={(event) => update("comment", event.target.value)}
              maxLength={500}
              placeholder="Optional short comment for the final write-up."
            />
          </label>
        </div>
      </Section>

      <div className="sticky bottom-0 border-t border-white/20 bg-black/95 px-4 py-4 backdrop-blur sm:px-6 md:px-8">
        {status === "error" ? (
          <div className="mb-3 border border-red-500 px-3 py-2 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={status === "submitting" || Boolean(playerPickError)}
          className="w-full border border-green-400 bg-black px-4 py-4 text-base font-black uppercase tracking-[0.16em] text-green-300 disabled:opacity-50 md:text-xl"
        >
          {status === "submitting" ? "Submitting..." : "Submit vote"}
        </button>
      </div>
    </form>
  );
}
