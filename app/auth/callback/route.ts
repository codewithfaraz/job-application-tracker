import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { sanitizeRedirectPath } from "@/lib/supabase/redirect";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function privateRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function loginErrorUrl(request: NextRequest, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return url;
}

export async function GET(request: NextRequest) {
  if (!getSupabaseConfig()) {
    return privateRedirect(loginErrorUrl(request, "supabase_not_configured"));
  }

  const code = request.nextUrl.searchParams.get("code");
  const nextPath = sanitizeRedirectPath(
    request.nextUrl.searchParams.get("next"),
  );

  if (!code) {
    return privateRedirect(loginErrorUrl(request, "callback_failed"));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: claimsData, error: claimsError } =
        await supabase.auth.getClaims();

      if (!claimsError && claimsData?.claims?.sub) {
        return privateRedirect(new URL(nextPath, request.url));
      }
    }
  } catch {
    // The safe error redirect below intentionally hides provider details.
  }

  return privateRedirect(loginErrorUrl(request, "callback_failed"));
}
