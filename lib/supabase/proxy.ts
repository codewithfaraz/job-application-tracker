import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/types/database";

import { getSupabaseConfig } from "./config";

const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/applications",
  "/pipeline",
  "/calendar",
  "/analytics",
  "/resumes",
  "/settings",
] as const;

const AUTH_ROUTES = ["/login", "/signup"] as const;

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some((route) =>
    matchesRoute(pathname, route),
  );
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => matchesRoute(pathname, route));
}

function copySessionResponse(
  source: NextResponse,
  destination: NextResponse,
) {
  source.cookies.getAll().forEach((cookie) => {
    destination.cookies.set(cookie);
  });

  for (const header of ["cache-control", "expires", "pragma"] as const) {
    const value = source.headers.get(header);

    if (value) {
      destination.headers.set(header, value);
    }
  }

  return destination;
}

function redirectToLogin(
  request: NextRequest,
  response?: NextResponse,
  error?: string,
) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  if (error) {
    loginUrl.searchParams.set("error", error);
  }

  const redirectResponse = NextResponse.redirect(loginUrl);
  return response
    ? copySessionResponse(response, redirectResponse)
    : redirectResponse;
}

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();

  if (!config) {
    if (isProtectedRoute(request.nextUrl.pathname)) {
      return redirectToLogin(
        request,
        undefined,
        "supabase_not_configured",
      );
    }

    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  // Always create this client per request. Sharing it can leak user state
  // between requests on warm server instances.
  const supabase = createServerClient<Database>(
    config.url,
    config.publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Keep this immediately after client creation. It verifies the JWT and
  // refreshes expired tokens before Server Components read the cookies.
  let isAuthenticated = false;

  try {
    const { data, error } = await supabase.auth.getClaims();
    isAuthenticated = Boolean(!error && data?.claims?.sub);
  } catch {
    isAuthenticated = false;
  }
  const pathname = request.nextUrl.pathname;

  if (!isAuthenticated && isProtectedRoute(pathname)) {
    return redirectToLogin(request, supabaseResponse);
  }

  if (isAuthenticated && isAuthRoute(pathname)) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return copySessionResponse(
      supabaseResponse,
      NextResponse.redirect(dashboardUrl),
    );
  }

  return supabaseResponse;
}
