import SocialGraphicFrame from "./SocialGraphicFrame";
import {
  formatGraphicPercent,
  formatWholeGraphicPoints,
  getRoundedPercentSplit,
  GraphicHeroStat,
  GraphicPercentCard,
  GraphicTeamCard,
} from "./SocialGraphicBits";

type MoodTracker = {
  remaining_fixture_count: number;
  forest_win_rate: number;
  draw_rate: number;
  forest_loss_rate: number;
  average_remaining_predicted_points: number;
  mood_label: string;
};

type InsightCard = {
  team_name?: string | null;
  slug?: string | null;
};

function teamHref(card: InsightCard | null) {
  return card?.slug ? `/team/${card.slug}` : null;
}

export default function RunInMoodGraphic({
  moodTracker,
  mostOptimisticTeam,
  mostCautiousTeam,
  drawMerchants,
}: {
  moodTracker: MoodTracker | null;
  mostOptimisticTeam: InsightCard | null;
  mostCautiousTeam: InsightCard | null;
  drawMerchants: InsightCard | null;
}) {
  if (!moodTracker) return null;

  const split = getRoundedPercentSplit(
    moodTracker.forest_win_rate,
    moodTracker.draw_rate,
    moodTracker.forest_loss_rate
  );

  return (
    <SocialGraphicFrame title="Run-in Mood" footer="#NFFC">
      <div className="grid gap-3">
        <div className="rounded-3xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
          <div className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/55">
            Current mood
          </div>
          <div className="mt-2 text-5xl font-black uppercase leading-none text-white">
            {moodTracker.mood_label}
          </div>
        </div>

        <GraphicHeroStat
          label="Projected from remaining games"
          value={formatWholeGraphicPoints(
            moodTracker.average_remaining_predicted_points
          )}
          subValue={`points expected from ${moodTracker.remaining_fixture_count} games`}
        />

        <div className="grid grid-cols-3 gap-2">
          <GraphicPercentCard label="Wins" value={split.win} tone="win" />
          <GraphicPercentCard label="Draws" value={split.draw} tone="draw" />
          <GraphicPercentCard label="Losses" value={split.loss} tone="loss" />
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/10">
          <div
            className="grid h-8"
            style={{
              gridTemplateColumns: `${Math.max(split.win, 0.01)}fr ${Math.max(
                split.draw,
                0.01
              )}fr ${Math.max(split.loss, 0.01)}fr`,
            }}
          >
            <div className="bg-green-500" />
            <div className="bg-amber-400" />
            <div className="bg-red-600" />
          </div>
        </div>

        <div className="grid gap-2">
          <GraphicTeamCard
            label="Most optimistic"
            teamName={mostOptimisticTeam?.team_name ?? "TBC"}
            href={teamHref(mostOptimisticTeam)}
          />
          <GraphicTeamCard
            label="Most cautious"
            teamName={mostCautiousTeam?.team_name ?? "TBC"}
            href={teamHref(mostCautiousTeam)}
          />
          <GraphicTeamCard
            label="Draw merchants"
            teamName={drawMerchants?.team_name ?? "TBC"}
            href={teamHref(drawMerchants)}
          />
        </div>

        <div className="rounded-2xl border border-white/15 bg-black/20 p-3 text-xs font-semibold leading-5 text-white/65">
          Aggregate remaining predictions only. No individual future picks shown.
        </div>
      </div>
    </SocialGraphicFrame>
  );
}
