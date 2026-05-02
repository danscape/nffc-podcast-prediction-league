export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json(
      {
        success: false,
        message: "Unauthorised cron request.",
      },
      { status: 401 }
    );
  }

  const reminderUrl = new URL("/api/email/fixture-reminders", request.url);

  const response = await fetch(reminderUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({
      dryRun: false,
    }),
  });

  const data = await response.json();

  return Response.json({
    success: response.ok && data?.success === true,
    route: "/api/cron/send-reminders",
    upstreamStatus: response.status,
    result: data,
  });
}