async function parseUpstreamResponse(response: Response) {
  const text = await response.text();

  try {
    return {
      parsedAsJson: true,
      data: JSON.parse(text),
      rawText: text,
    };
  } catch {
    return {
      parsedAsJson: false,
      data: null,
      rawText: text.slice(0, 1000),
    };
  }
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return Response.json(
        {
          success: false,
          message: "Unauthorised cron request.",
          hasCronSecret: Boolean(cronSecret),
        },
        { status: 401 }
      );
    }

    const syncUrl = new URL("/api/fixtures/sync", request.url);

    const response = await fetch(syncUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({
        dryRun: false,
      }),
      cache: "no-store",
    });

    const upstream = await parseUpstreamResponse(response);

    return Response.json(
      {
        success: response.ok && upstream.data?.success === true,
        route: "/api/cron/sync-fixtures",
        upstreamUrl: syncUrl.toString(),
        upstreamStatus: response.status,
        upstreamStatusText: response.statusText,
        upstreamParsedAsJson: upstream.parsedAsJson,
        result: upstream.data,
        rawText: upstream.parsedAsJson ? undefined : upstream.rawText,
      },
      {
        status: response.ok ? 200 : 500,
      }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        route: "/api/cron/sync-fixtures",
        message: error instanceof Error ? error.message : "Unknown cron error.",
      },
      { status: 500 }
    );
  }
}