import Link from "next/link";

export type AuditLogRow = {
  id: string;
  created_at: string;
  actor_type: string;
  actor_label: string;
  source?: string | null;
  target_player_name: string;
  target_team_name: string | null;
  fixture_gameweek: number | null;
  fixture_label: string | null;
  fixture_opponent_short: string | null;
  fixture_venue: string | null;
  old_prediction: string | null;
  new_prediction: string | null;
};

type AuditLogPanelProps = {
  rows: AuditLogRow[];
  title?: string;
  description?: string;
  showSummary?: boolean;
  compact?: boolean;
  fullLogHref?: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function auditFixtureLabel(row: AuditLogRow) {
  return [
    row.fixture_label ?? (row.fixture_gameweek ? `GW${row.fixture_gameweek}` : "GW?"),
    row.fixture_opponent_short,
    row.fixture_venue,
  ]
    .filter(Boolean)
    .join(" ");
}

function auditActorTone(actorType: string) {
  if (actorType === "admin") return "text-[var(--stat-yellow,#ffe44d)]";
  if (actorType === "player") return "text-[var(--stat-cyan,#59efff)]";
  if (actorType === "historic") return "text-[var(--stat-orange,#ff9f1c)]";
  return "text-white";
}

function displayFrom(row: AuditLogRow) {
  return row.old_prediction ?? "—";
}

function displayTo(row: AuditLogRow) {
  return row.new_prediction ?? "—";
}

export default function AuditLogPanel({
  rows,
  title = "Latest Prediction Changes",
  description,
  showSummary = false,
  compact = false,
  fullLogHref,
}: AuditLogPanelProps) {
  const adminCount = rows.filter((row) => row.actor_type === "admin").length;
  const playerCount = rows.filter((row) => row.actor_type === "player").length;
  const historicCount = rows.filter(
    (row) => row.actor_type === "historic" || row.source === "historic_current_state_backfill"
  ).length;

  return (
    <section className={compact ? "mt-6" : ""}>
      {showSummary ? (
        <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
          <AuditStat label="Rows" value={String(rows.length)} tone="white" />
          <AuditStat label="Admin changes" value={String(adminCount)} tone="yellow" />
          <AuditStat label="Player changes" value={String(playerCount)} tone="cyan" />
          <AuditStat label="Historic" value={String(historicCount)} tone="orange" />
          <AuditStat
            label="Latest"
            value={rows[0] ? formatDateTime(rows[0].created_at) : "None"}
            tone="green"
          />
        </section>
      ) : null}

      <section className="rounded-none border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)] shadow-none">
        <div className="flex flex-col gap-3 bg-[var(--nffc-red,#e50914)] px-3 py-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-white md:text-xl">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-white">
                {description}
              </p>
            ) : null}
          </div>

          {fullLogHref ? (
            <Link
              href={fullLogHref}
              className="w-fit border border-white bg-[var(--nffc-black,#000000)] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white hover:text-black"
            >
              Open full log
            </Link>
          ) : null}
        </div>

        <div className="hidden xl:block">
          <div className="grid grid-cols-[180px_140px_minmax(220px,1fr)_minmax(220px,1fr)_170px_85px_85px] border-b border-[var(--nffc-red,#e50914)] text-xs font-black uppercase tracking-[0.12em] text-white">
            <Cell head>When</Cell>
            <Cell head>Actor</Cell>
            <Cell head>Player</Cell>
            <Cell head>Team</Cell>
            <Cell head>Fixture</Cell>
            <Cell head>From</Cell>
            <Cell head last>To</Cell>
          </div>

          {rows.length ? (
            rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[180px_140px_minmax(220px,1fr)_minmax(220px,1fr)_170px_85px_85px] border-b border-[#242424] text-sm font-black uppercase tracking-[0.05em] text-white last:border-b-0"
              >
                <Cell>{formatDateTime(row.created_at)}</Cell>
                <Cell className={auditActorTone(row.actor_type)}>{row.actor_label}</Cell>
                <Cell>{row.target_player_name}</Cell>
                <Cell muted>{row.target_team_name ?? "—"}</Cell>
                <Cell>{auditFixtureLabel(row)}</Cell>
                <Cell className="text-[var(--stat-wrong,#ff3030)]">{displayFrom(row)}</Cell>
                <Cell className="text-[var(--stat-green,#22e55e)]" last>
                  {displayTo(row)}
                </Cell>
              </div>
            ))
          ) : (
            <div className="px-3 py-5 text-sm font-black uppercase tracking-[0.1em] text-[var(--nffc-muted,#a7a7a7)]">
              No audit rows recorded yet.
            </div>
          )}
        </div>

        <div className="grid gap-px bg-[#242424] xl:hidden">
          {rows.length ? (
            rows.map((row) => (
              <div key={row.id} className="bg-[var(--nffc-black,#000000)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-black uppercase text-white">
                      {row.target_player_name}
                    </div>
                    <div className="mt-1 truncate text-xs font-black uppercase tracking-[0.08em] text-[var(--nffc-muted,#a7a7a7)]">
                      {auditFixtureLabel(row)} / {row.target_team_name ?? "—"}
                    </div>
                  </div>

                  <div className="text-right text-lg font-black uppercase">
                    <span className="text-[var(--stat-wrong,#ff3030)]">{displayFrom(row)}</span>
                    <span className="px-1 text-[var(--nffc-muted,#a7a7a7)]">→</span>
                    <span className="text-[var(--stat-green,#22e55e)]">{displayTo(row)}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#242424] pt-2 text-xs font-black uppercase tracking-[0.08em]">
                  <span className={auditActorTone(row.actor_type)}>{row.actor_label}</span>
                  <span className="text-[var(--nffc-muted,#a7a7a7)]">
                    {formatDateTime(row.created_at)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[var(--nffc-black,#000000)] px-3 py-5 text-sm font-black uppercase tracking-[0.08em] text-[var(--nffc-muted,#a7a7a7)]">
              No audit rows recorded yet.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function Cell({
  children,
  head = false,
  muted = false,
  last = false,
  className = "",
}: {
  children: React.ReactNode;
  head?: boolean;
  muted?: boolean;
  last?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        "px-3 py-3",
        last ? "" : "border-r border-[#242424]",
        head ? "text-white" : "",
        muted ? "text-[var(--nffc-muted,#a7a7a7)]" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function AuditStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "yellow" | "cyan" | "orange" | "white";
}) {
  const toneClass =
    tone === "green"
      ? "text-[var(--stat-green,#22e55e)]"
      : tone === "yellow"
        ? "text-[var(--stat-yellow,#ffe44d)]"
        : tone === "cyan"
          ? "text-[var(--stat-cyan,#59efff)]"
          : tone === "orange"
            ? "text-[var(--stat-orange,#ff9f1c)]"
            : "text-white";

  return (
    <div className="border border-[var(--nffc-white,#f5f5f5)] bg-[var(--nffc-black,#000000)]">
      <div className="border-b border-[#242424] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--nffc-muted,#a7a7a7)]">
        {label}
      </div>
      <div className={`px-3 py-3 text-lg font-black uppercase ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
