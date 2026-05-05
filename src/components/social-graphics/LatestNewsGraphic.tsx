import SocialGraphicFrame from "./SocialGraphicFrame";
import {
  formatGraphicPercent,
  formatGraphicPoints,
  formatWholeGraphicPoints,
  GraphicStatCard,
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
}: {
  nextFixture: FixtureRow | null;
  averageAccuracy: number;
  currentLeaderName: string;
  currentLeaderPoints: number | null;
  leadingTeamName: string;
  leadingTeamPoints: number | null;
  latestNews: LatestNewsData | null;
  moodTracker: MoodTracker;
}) {
  const fixtureTitle = nextFixture
    ? `${nextFixture.gameweek_label}: Forest ${
        nextFixture.venue === "H" ? "v" : "at"
      } ${nextFixture.opponent_short}`
    : "Next fixture TBC";

  return (
    <SocialGraphicFrame title="Latest News">
      <div className="grid gap-3">
        <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
          <div className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-white/55">
            Next up
          </div>
          <div className="mt-2 text-2xl font-black uppercase leading-tight text-white">
            {fixtureTitle}
          </div>
          <div className="mt-2 text-xs font-semibold leading-5 text-white/65">
            Kick-off: {formatDateTime(nextFixture?.kickoff_at ?? null)}
          </div>
        </div>

        <div className="grid grid-cols-[0.9fr_1.1fr] gap-3">
          <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <div className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-white/55">
              Average accuracy
            </div>
            <div className="mt-2 text-5xl font-black leading-none text-white">
              {formatGraphicPercent(averageAccuracy)}
            </div>
            <div className="mt-2 text-[0.66rem] font-black uppercase tracking-wide text-white/65">
              scored players
            </div>
          </div>

          <GraphicStatCard
            label="Run-in mood"
            value={moodTracker?.mood_label ?? "TBC"}
            subValue={
              moodTracker
                ? `${formatWholeGraphicPoints(
                    moodTracker.average_remaining_predicted_points
                  )} pts expected`
                : undefined
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <GraphicStatCard
            label="Player leader"
            value={currentLeaderName}
            subValue={
              currentLeaderPoints !== null
                ? `${formatGraphicPoints(currentLeaderPoints)} pts`
                : undefined
            }
          />
          <GraphicStatCard
            label="Team leader"
            value={leadingTeamName}
            subValue={
              leadingTeamPoints !== null
                ? `${Number(leadingTeamPoints ?? 0).toFixed(2)} pts`
                : undefined
            }
          />
          <GraphicStatCard
            label="Team of the Week"
            value={latestNews?.team_of_the_week_name ?? "TBC"}
            subValue={
              latestNews?.team_of_the_week_points !== null &&
              latestNews?.team_of_the_week_points !== undefined
                ? `${Number(latestNews.team_of_the_week_points).toFixed(2)} pts`
                : undefined
            }
          />
          <GraphicStatCard
            label="Streaker"
            value={latestNews?.streaker_of_the_week_name ?? "TBC"}
            subValue={
              latestNews?.streaker_of_the_week_value
                ? `${latestNews.streaker_of_the_week_value} current streak`
                : undefined
            }
          />
        </div>
      </div>
    </SocialGraphicFrame>
  );
}
