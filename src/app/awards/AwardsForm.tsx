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
  "w-full rounded-none border border-white/30 bg-black px-3 py-3 text-base font-bold text-white outline-none focus:border-green-400 md:px-4 md:py-4";

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
    <section className="grid gap-4 border-t border-white/20 px-4 py-5 sm:px-6 md:px-8 md:py-7">
      <div>
        <div className="bg-red-700 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white md:text-sm">
          {title}
        </div>
        {intro ? (
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-white/60 md:text-sm">
            {intro}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">{children}</div>
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
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  wide?: boolean;
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
      <div>
        <p className="text-[13px] font-black uppercase leading-snug tracking-[0.12em] text-white md:text-sm">
          {label}
        </p>
        {help ? (
          <p className="mt-1 text-xs leading-relaxed text-white/55 md:text-sm">
            {help}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
        className="flex min-h-14 w-full items-center justify-between gap-3 border border-white/30 bg-black px-3 py-3 text-left text-base font-bold text-white md:min-h-16 md:px-4 md:text-lg"
      >
        <span className={selected ? "text-white" : "text-white/50"}>
          {selected ? selected.label : "Tap to choose..."}
        </span>
        <span className="shrink-0 text-green-300">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="border border-green-400 bg-black md:col-span-2">
          <div className="border-b border-white/20 p-2 md:p-3">
            <input
              className="w-full border border-white/30 bg-black px-3 py-3 text-base font-bold text-white outline-none focus:border-green-400 md:px-4 md:py-4"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
            />
          </div>

          <div className="max-h-80 overflow-y-auto md:max-h-96">
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
                  className={`block min-h-12 w-full border-b border-white/10 px-3 py-3 text-left text-sm font-bold leading-snug md:min-h-14 md:px-4 md:text-base ${
                    active ? "bg-green-400 text-black" : "bg-black text-white"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}

            {!filteredOptions.length ? (
              <div className="px-3 py-4 text-sm text-white/60">
                No matching options.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <input value={value} required readOnly className="sr-only" />
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
        title="Player Awards"
        intro="Rank your top three for Player of the Season, then pick the other player awards."
      >
        <ChoiceField
          label="Player of the Season — 1st Choice"
          help="Worth 5 points."
          value={form.player_1st_id}
          onChange={(value) => update("player_1st_id", value)}
          options={players}
        />

        <ChoiceField
          label="Player of the Season — 2nd Choice"
          help="Worth 3 points."
          value={form.player_2nd_id}
          onChange={(value) => update("player_2nd_id", value)}
          options={players}
        />

        <ChoiceField
          label="Player of the Season — 3rd Choice"
          help="Worth 1 point."
          value={form.player_3rd_id}
          onChange={(value) => update("player_3rd_id", value)}
          options={players}
        />

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
        />

        {playerPickError ? (
          <div className="border border-red-500 px-3 py-2 text-sm font-bold text-red-300 md:col-span-2">
            {playerPickError}
          </div>
        ) : null}
      </Section>

      <Section
        title="Match Awards"
        intro="Pick the Forest game you enjoyed most and the one you would rather forget."
      >
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
      </Section>

      <Section
        title="Goal Awards"
        intro="Pick the best Forest goal and the goal conceded that annoyed you most."
      >
        <ChoiceField
          label="Goal of the Season"
          value={form.goal_id}
          onChange={(value) => update("goal_id", value)}
          options={goals}
          wide
        />

        <ChoiceField
          label="Worst Goal Conceded"
          value={form.goal_conceded_id}
          onChange={(value) => update("goal_conceded_id", value)}
          options={goalsConceded}
          wide
        />
      </Section>

      <Section
        title="Optional Extras"
        intro="Optional answers for the final results write-up and social posts."
      >
        <label className="grid gap-2">
          <span className="text-[13px] font-black uppercase leading-snug tracking-[0.12em] text-white md:text-sm">
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
          <span className="text-[13px] font-black uppercase leading-snug tracking-[0.12em] text-white md:text-sm">
            Any quick comment on your picks?
          </span>
          <textarea
            className={`${fieldClass} min-h-28 resize-y`}
            value={form.comment}
            onChange={(event) => update("comment", event.target.value)}
            maxLength={500}
            placeholder="Optional short comment for the final write-up."
          />
        </label>
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
          className="w-full border border-green-400 bg-black px-4 py-4 text-base font-black uppercase tracking-[0.16em] text-green-300 disabled:opacity-50 md:text-lg"
        >
          {status === "submitting" ? "Submitting..." : "Submit vote"}
        </button>
      </div>
    </form>
  );
}