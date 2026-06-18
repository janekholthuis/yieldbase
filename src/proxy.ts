// Next.js proxy (formerly "middleware"): refresh the Supabase session on every
// request and guard protected route groups. Public routes are in PUBLIC_PREFIXES.
//
// MUST live in `src/` because this project uses a `src/` directory — a
// root-level file is silently ignored by Next.js (it never ran, which dropped
// the redirect target and disabled the session refresh; see BUG-003 in
// docs/QA-RESULTS-2026-06-12.md). Renamed middleware.ts → proxy.ts per the
// Next 16 convention (the `middleware` filename is deprecated).
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/kunde-portal",
  "/selbstauskunft", // Token-Link: Selbstauskunft ohne Login
  "/auth", // callback routes
  "/start", // öffentliche Marketing-Landingpage
  "/roadmap", // öffentliche Produkt-Roadmap
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Unauthenticated user hitting a protected route → send to login,
  // preserving the originally requested path so we can return there post-login.
  if (!user && !isPublic(pathname) && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
