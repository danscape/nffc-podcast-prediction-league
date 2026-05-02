import { createClient } from "@supabase/supabase-js";

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  homeTeam: {
    id: number;
    name: string;
    shortName?: string;
    tla?: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName?: string;
    tla?: string;
  };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: {
      home: number | null;
      away: number | null;
    };
  };
};

type ExistingFixture = {
  id: string;
  season: string;
  gameweek: number;
  gameweek_label: string;
  opponent: string | null;
  opponent_short: string | null;
  venue: "H" | "A" | null;
  external_api_id: string | null;
};

type AppSettings = {
  currentSeason: string;
  footballDataSeason: string;
};

type SyncResult = {
  apiId: string;
  gameweek: number | null;
  fixture: string;
  action: "updated" | "skipped";
  message: string;
};

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "").trim();
}

async function isAuthorisedLiveRequest(
  request: Request,
  supabase: ReturnType<typeof getSupabaseClient>
) {
  const token = getBearerToken(request);
  const cronSecret = process.env.CRON_SECRET;

  if (!token) return false;

  if (cronSecret && token === cronSecret) {
    return true;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user?.email) {
    return false;
  }

  const { data: adminRows, error: adminError } = await supabase
    .from("admin_users")
    .select("email, active")
    .eq("email", userData.user.email)
    .eq("active", true)
    .limit(1);

  if (adminError) {
    return false;
  }

  return Boolean(adminRows?.length);
}

function normaliseName(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isForestLikeTeam(value: string | null | undefined) {
  const normalised = normaliseName(value);

  return (
    normalised === "nottingham forest" ||
    normalised === "nottingham" ||
    normalised === "forest" ||
    normalised.includes("nottingham forest")
  );
}

function isSuspiciousOpponent(value: string | null | undefined) {
  const normalised = normaliseName(value);

  return (
    normalised === "nottingham" ||
    normalised === "nottingham forest" ||
    normalised === "forest" ||
    normalised.includes("nottingham forest")
  );
}

function forestResultFromMatch(match: FootballDataMatch, forestTeamId: number) {
  const winner = match.score?.winner;

  if (!winner) return null;
  if (winner === "DRAW") return "D";

  const forestHome = match.homeTeam.id === forestTeamId;

  if (winner === "HOME_TEAM") return forestHome ? "W" : "L";
  if (winner === "AWAY_TEAM") return forestHome ? "L" : "W";

  return null;
}

function appStatusFromApiStatus(status: string) {
  const normalised = status.toUpperCase();

  if (normalised === "FINISHED") return "finished";
  if (normalised === "IN_PLAY" || normalised === "PAUSED") return "live";

  if (
    normalised === "POSTPONED" ||
    normalised === "SUSPENDED" ||
    normalised === "CANCELLED"
  ) {
    return "postponed";
  }

  return "scheduled";
}

function predictionLockFromKickoff(kickoffAt: string) {
  return new Date(new Date(kickoffAt).getTime() - 5 * 60 * 1000).toISOString();
}

function fixtureLabel(match: FootballDataMatch, forestTeamId: number) {
  const forestHome = match.homeTeam.id === forestTeamId;
  const opponent = forestHome ? match.awayTeam : match.homeTeam;
  const venue = forestHome ? "H" : "A";

  return `${opponent.shortName ?? opponent.name} ${venue}`;
}

function fixtureDebugLabel(match: FootballDataMatch) {
  return `${match.homeTeam.name} v ${match.awayTeam.name}`;
}

async function getAppSettings(
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["current_season", "football_data_season"]);

  if (error) {
    throw new Error(error.message);
  }

  const settings = new Map(
    (data ?? []).map((row: { key: string; value: string }) => [
      row.key,
      row.value,
    ])
  );

  const currentSeason = settings.get("current_season");
  const footballDataSeason = settings.get("football_data_season");

  if (!currentSeason) {
    throw new Error("Missing app_settings current_season.");
  }

  if (!footballDataSeason) {
    throw new Error("Missing app_settings football_data_season.");
  }

  return {
    currentSeason,
    footballDataSeason,
  };
}

async function fetchForestMatches(footballDataSeason: string) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  const teamId = process.env.FOOTBALL_DATA_TEAM_ID ?? "351";
  const competitionCode = process.env.FOOTBALL_DATA_COMPETITION_CODE ?? "PL";

  if (!apiKey) {
    throw new Error("Missing FOOTBALL_DATA_API_KEY.");
  }

  const url = new URL(`https://api.football-data.org/v4/teams/${teamId}/matches`);
  url.searchParams.set("limit", "100");
  url.searchParams.set("competitions", competitionCode);
  url.searchParams.set("season", footballDataSeason);

  const response = await fetch(url.toString(), {
    headers: {
      "X-Auth-Token": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`football-data.org error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    matches?: FootballDataMatch[];
  };

  return data.matches ?? [];
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;

    const forestTeamId = Number(process.env.FOOTBALL_DATA_TEAM_ID ?? 351);
    const supabase = getSupabaseClient();

    if (!dryRun) {
      const authorised = await isAuthorisedLiveRequest(request, supabase);

      if (!authorised) {
        return Response.json(
          {
            success: false,
            message: "Unauthorised live fixture sync request.",
          },
          { status: 401 }
        );
      }
    }

    const { currentSeason, footballDataSeason } = await getAppSettings(supabase);
    const matches = await fetchForestMatches(footballDataSeason);

    const { data: existingData, error: existingError } = await supabase
      .from("fixtures")
      .select(
        "id, season, gameweek, gameweek_label, opponent, opponent_short, venue, external_api_id"
      )
      .eq("season", currentSeason)
      .order("gameweek", { ascending: true })
      .range(0, 100);

    if (existingError) {
      return Response.json(
        {
          success: false,
          message: existingError.message,
        },
        { status: 500 }
      );
    }

    const existingFixtures = (existingData ?? []) as ExistingFixture[];

    const byExternalId = new Map(
      existingFixtures
        .filter((fixture) => fixture.external_api_id)
        .map((fixture) => [fixture.external_api_id, fixture])
    );

    const byGameweek = new Map(
      existingFixtures.map((fixture) => [fixture.gameweek, fixture])
    );

    const results: SyncResult[] = [];

    for (const match of matches) {
      const apiId = String(match.id);
      const gameweek = match.matchday ?? null;
      const homeIsForest = match.homeTeam.id === forestTeamId;
      const awayIsForest = match.awayTeam.id === forestTeamId;

      if (!homeIsForest && !awayIsForest) {
        results.push({
          apiId,
          gameweek,
          fixture: fixtureDebugLabel(match),
          action: "skipped",
          message: `Neither team has Forest team ID ${forestTeamId}.`,
        });
        continue;
      }

      if (homeIsForest && awayIsForest) {
        results.push({
          apiId,
          gameweek,
          fixture: fixtureDebugLabel(match),
          action: "skipped",
          message: "Both teams have the Forest team ID. Skipped as unsafe.",
        });
        continue;
      }

      const forestHome = homeIsForest;
      const opponent = forestHome ? match.awayTeam : match.homeTeam;
      const venue = forestHome ? "H" : "A";
      const opponentName = opponent.name;
      const opponentShort = opponent.shortName ?? opponent.tla ?? opponent.name;

      if (isSuspiciousOpponent(opponentName) || isSuspiciousOpponent(opponentShort)) {
        results.push({
          apiId,
          gameweek,
          fixture: fixtureDebugLabel(match),
          action: "skipped",
          message: `Opponent resolved as suspicious Forest-like value: ${opponentShort}.`,
        });
        continue;
      }

      const existing =
        byExternalId.get(apiId) ??
        (gameweek ? byGameweek.get(gameweek) : undefined);

      if (!existing || !gameweek) {
        results.push({
          apiId,
          gameweek,
          fixture: fixtureLabel(match, forestTeamId),
          action: "skipped",
          message: "No matching local fixture found by API ID or gameweek.",
        });
        continue;
      }

      const localOpponent = existing.opponent_short ?? existing.opponent ?? "";
      const localVenue = existing.venue;

      if (localVenue && localVenue !== venue) {
        results.push({
          apiId,
          gameweek,
          fixture: fixtureLabel(match, forestTeamId),
          action: "skipped",
          message: `Venue mismatch. Local ${localVenue}, API ${venue}.`,
        });
        continue;
      }

      if (isForestLikeTeam(localOpponent)) {
        results.push({
          apiId,
          gameweek,
          fixture: fixtureLabel(match, forestTeamId),
          action: "skipped",
          message: `Local opponent is suspicious before update: ${localOpponent}.`,
        });
        continue;
      }

      const apiHomeScore = match.score?.fullTime?.home ?? null;
      const apiAwayScore = match.score?.fullTime?.away ?? null;
      const apiForestResult = forestResultFromMatch(match, forestTeamId);
      const appStatus = appStatusFromApiStatus(match.status);

      const updatePayload = {
        external_api_id: apiId,
        opponent: opponentName,
        opponent_short: opponentShort,
        venue,
        kickoff_at: match.utcDate,
        prediction_lock_at: predictionLockFromKickoff(match.utcDate),
        status: appStatus,
        api_status: match.status,
        api_home_score: apiHomeScore,
        api_away_score: apiAwayScore,
        api_forest_result: apiForestResult,
        api_last_synced_at: new Date().toISOString(),
      };

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from("fixtures")
          .update(updatePayload)
          .eq("id", existing.id)
          .eq("season", currentSeason);

        if (updateError) {
          results.push({
            apiId,
            gameweek,
            fixture: fixtureLabel(match, forestTeamId),
            action: "skipped",
            message: updateError.message,
          });
          continue;
        }
      }

      results.push({
        apiId,
        gameweek,
        fixture: fixtureLabel(match, forestTeamId),
        action: "updated",
        message: dryRun ? "Would update local fixture." : "Updated local fixture.",
      });
    }

    return Response.json({
      success: true,
      dryRun,
      currentSeason,
      footballDataSeason,
      matchCount: matches.length,
      localFixtureCount: existingFixtures.length,
      updatedCount: results.filter((result) => result.action === "updated").length,
      skippedCount: results.filter((result) => result.action === "skipped").length,
      results,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error.",
      },
      { status: 500 }
    );
  }
}