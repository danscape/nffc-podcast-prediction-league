import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { maskProfanity } from "@/lib/maskProfanity";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ipHashSalt = process.env.AWARDS_IP_HASH_SALT;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

if (!ipHashSalt) {
  throw new Error("Missing AWARDS_IP_HASH_SALT");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

type AwardVotePayload = {
  player_1st_id?: string;
  player_2nd_id?: string;
  player_3rd_id?: string;
  signing_id?: string;
  breakthrough_id?: string;
  one_to_watch_id?: string;
  favourite_fixture_id?: string;
  least_favourite_fixture_id?: string;
  goal_id?: string;
  goal_conceded_id?: string;
  three_words?: string;
  comment?: string;
};

const requiredFields: Array<keyof AwardVotePayload> = [
  "player_1st_id",
  "player_2nd_id",
  "player_3rd_id",
  "signing_id",
  "breakthrough_id",
  "one_to_watch_id",
  "favourite_fixture_id",
  "least_favourite_fixture_id",
  "goal_id",
];

function getClientIpFromHeaders(headerStore: Headers) {
  const forwardedFor = headerStore.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = headerStore.get("x-real-ip");

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function hashIp(ip: string) {
  return crypto
    .createHash("sha256")
    .update(`${ip}:${ipHashSalt}`)
    .digest("hex");
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AwardVotePayload;

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    if (
      body.player_1st_id === body.player_2nd_id ||
      body.player_1st_id === body.player_3rd_id ||
      body.player_2nd_id === body.player_3rd_id
    ) {
      return NextResponse.json(
        {
          error:
            "Please choose three different players for Player of the Season.",
        },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const headerStore = await headers();

    const existingVoteCookie = cookieStore.get("forest_awards_voted")?.value;
    const ip = getClientIpFromHeaders(headerStore);
    const ipHash = hashIp(ip);
    const userAgent = headerStore.get("user-agent");

    const { count, error: duplicateCheckError } = await supabaseAdmin
      .from("award_votes")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash);

    if (duplicateCheckError) {
      return NextResponse.json(
        { error: duplicateCheckError.message },
        { status: 500 },
      );
    }

    const duplicateIp = Boolean(count && count > 0);
    const duplicateCookie = Boolean(existingVoteCookie);

    const { error: insertError } = await supabaseAdmin
      .from("award_votes")
      .insert({
        player_1st_id: body.player_1st_id,
        player_2nd_id: body.player_2nd_id,
        player_3rd_id: body.player_3rd_id,
        signing_id: body.signing_id,
        breakthrough_id: body.breakthrough_id,
        one_to_watch_id: body.one_to_watch_id,
        favourite_fixture_id: body.favourite_fixture_id,
        least_favourite_fixture_id: body.least_favourite_fixture_id,
        goal_id: body.goal_id,
        goal_conceded_id: body.goal_conceded_id || null,
        three_words: cleanText(body.three_words, 80),
        comment: cleanText(body.comment, 500),
        ip_hash: ipHash,
        user_agent: userAgent,
        duplicate_ip: duplicateIp,
        duplicate_cookie: duplicateCookie,
        included_in_results: !duplicateCookie,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    cookieStore.set("forest_awards_voted", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    return NextResponse.json({
      ok: true,
      duplicate_ip: duplicateIp,
      duplicate_cookie: duplicateCookie,
    });
  } catch (error) {
    console.error("Award vote submit error:", error);

    return NextResponse.json(
      { error: "Unable to submit vote." },
      { status: 500 },
    );
  }
}
