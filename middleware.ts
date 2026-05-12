import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname, search } = request.nextUrl;

  const isAwardsDomain = host === "awards.nffcstats.co.uk";

  if (!isAwardsDomain) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/awards";
    url.search = search;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/results") {
    const url = request.nextUrl.clone();
    url.pathname = "/awards/results";
    url.search = search;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/thanks") {
    const url = request.nextUrl.clone();
    url.pathname = "/awards/thanks";
    url.search = search;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
