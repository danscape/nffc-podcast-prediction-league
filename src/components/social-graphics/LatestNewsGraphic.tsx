import Image from "next/image";
import {
  formatGraphicPercent,
  formatGraphicPoints,
  formatWholeGraphicPoints,
} from "./SocialGraphicBits";

type FixtureRow = {
  gameweek_label: string;
  opponent_short: string;
  venue: "H" | "A";
  kickoff_at: string | null;
};

type LatestNewsData = {
  team_of_the_week_name: string | null;
  team_of_the_week_points: number | null;
  streaker_of_the_week_name: string | null;
  streaker_of_the_week_value: number | null;
};

type MoodTracker = {
  mood_label: string;
  average_remaining_predicted_points: number;
} | null;

function formatDateTime(value: string | null) {
  if (!value) return "TBC";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

export default function LatestNewsGraphic({
  nextFixture,
  averageAccuracy,
  currentLeaderName,
  currentLeaderPoints,
  leadingTeamName,
  leadingTeamPoints,
  latestNews,
  moodTracker,
  inFormPlayer,
  inFormTeam,
}: {
  nextFixture: FixtureRow | null;
  averageAccuracy: number;
  currentLeaderName: string;
  currentLeaderPoints: number | null;
  leadingTeamName: string;
  leadingTeamPoints: number | null;
  latestNews: LatestNewsData | null;
  moodTracker: MoodTracker;
  inFormPlayer?: {
    playerName: string;
    points: number;
    fixturesCount?: number | null;
    fromGameweek?: number | null;
    toGameweek?: number | null;
  } | null;
  inFormTeam?: {
    teamName: string;
    points: number;
    fixturesCount?: number | null;
    fromGameweek?: number | null;
    toGameweek?: number | null;
  } | null;
}) {
  const fixtureTitle = nextFixture
    ? `${nextFixture.gameweek_label}: Forest ${
        nextFixture.venue === "H" ? "v" : "at"
      } ${nextFixture.opponent_short}`
    : "Next fixture TBC";

  return (
    <section className="bg-[var(--nffc-black,#000000)] text-white">
      <GraphicBlockHeader title="Latest News" />

      <div className="border border-[#242424] border-t-0 bg-[var(--nffc-black,#000000)]">
        <div className="grid border-b border-[#242424] lg:grid-cols-[1.4fr_0.6fr]">
          <div className="border-r border-[#242424] px-5 py-4">
            <div className="text-sm font-black uppercase tracking-[0.14em] text-[var(--nffc-red,#e50914)]">
              Next Up
            </div>

            <div className="mt-2 text-3xl font-black uppercase leading-none tracking-[0.04em] text-white md:text-4xl">
              {fixtureTitle}
            </div>

            <div className="mt-3 text-lg font-black uppercase tracking-[0.08em] text-white">
              Kick-off{" "}
              <span className="text-[var(--stat-yellow,#ffe44d)]">
                {formatDateTime(nextFixture?.kickoff_at ?? null)}
              </span>
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="text-sm font-black uppercase tracking-[0.14em] text-white">
              Average Accuracy
            </div>

            <div className="mt-2 text-5xl font-black leading-none text-[var(--stat-green,#22e55e)] md:text-6xl">
              {formatGraphicPercent(averageAccuracy)}
            </div>

            <div className="mt-2 text-sm font-black uppercase tracking-[0.12em] text-white">
              Scored players
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-[#242424] md:grid-cols-2 xl:grid-cols-4">
          <TeletextStat
            label="Player Leader"
            value={currentLeaderName}
            subValue={
              currentLeaderPoints !== null
                ? `${formatGraphicPoints(currentLeaderPoints)} pts`
                : undefined
            }
            tone="green"
          />

          <TeletextStat
            label="Team Leader"
            value={leadingTeamName}
            subValue={
              leadingTeamPoints !== null
                ? `${Number(leadingTeamPoints ?? 0).toFixed(2)} pts`
                : undefined
            }
            tone="green"
          />

          <TeletextStat
            label="Run-In Mood"
            value={moodTracker?.mood_label ?? "TBC"}
            subValue={
              moodTracker
                ? `${formatWholeGraphicPoints(
                    moodTracker.average_remaining_predicted_points
                  )} pts expected`
                : undefined
            }
            tone="yellow"
          />

          <TeletextStat
            label="Streaker"
            value={latestNews?.streaker_of_the_week_name ?? "TBC"}
            subValue={
              latestNews?.streaker_of_the_week_value
                ? `${latestNews.streaker_of_the_week_value} current streak`
                : undefined
            }
            tone="yellow"
          />
        </div>

        <div className="grid gap-px bg-[#242424] md:grid-cols-2">
          <TeletextStat
            label="In-Form Team"
            value={inFormTeam?.teamName ?? "TBC"}
            subValue={
              inFormTeam
                ? `${Number(inFormTeam.points ?? 0).toFixed(2)} pts / ${
                    inFormTeam.fromGameweek && inFormTeam.toGameweek
                      ? `GW${inFormTeam.fromGameweek}-GW${inFormTeam.toGameweek}`
                      : "last 5 completed GWs"
                  }`
                : undefined
            }
            tone="cyan"
            large
          />

          <TeletextStat
            label="In-Form Player"
            value={inFormPlayer?.playerName ?? "TBC"}
            subValue={
              inFormPlayer
                ? `${formatGraphicPoints(inFormPlayer.points)} pts / ${
                    inFormPlayer.fromGameweek && inFormPlayer.toGameweek
                      ? `GW${inFormPlayer.fromGameweek}-GW${inFormPlayer.toGameweek}`
                      : "last 5 completed GWs"
                  }`
                : undefined
            }
            tone="green"
            large
          />
        </div>
      </div>
    </section>
  );
}

function TeletextStat({
  label,
  value,
  subValue,
  tone = "white",
  large = false,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  tone?: "green" | "yellow" | "cyan" | "red" | "white";
  large?: boolean;
}) {
  const toneClass =
    tone === "green"
      ? "text-[var(--stat-green,#22e55e)]"
      : tone === "yellow"
        ? "text-[var(--stat-yellow,#ffe44d)]"
        : tone === "cyan"
          ? "text-[var(--stat-cyan,#59efff)]"
          : tone === "red"
            ? "text-[var(--stat-wrong,#ff3030)]"
            : "text-white";

  return (
    <div className="bg-[var(--nffc-black,#000000)] px-5 py-4">
      <div className="text-sm font-black uppercase tracking-[0.14em] text-white">
        {label}
      </div>

      <div
        className={`mt-2 font-black uppercase leading-none tracking-[0.04em] ${toneClass} ${
          large ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"
        }`}
      >
        {value}
      </div>

      {subValue && (
        <div className="mt-2 text-sm font-black uppercase tracking-[0.1em] text-white">
          {subValue}
        </div>
      )}
    </div>
  );
}

function GraphicBlockHeader({ title }: { title: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_240px] items-center bg-[var(--nffc-red,#e50914)]">
      <h2 className="px-5 py-3 text-2xl font-black uppercase tracking-[0.08em] text-white md:text-3xl">
        {title}
      </h2>

      <div className="flex h-full items-center justify-end bg-[var(--nffc-red,#e50914)] px-2">
        <Image
          src="/brand/nffc-podcast-prediction-league-banner.png"
          alt="NFFC Podcast Prediction League"
          width={500}
          height={140}
          className="h-14 w-auto object-contain"
        />
      </div>
    </div>
  );
}

