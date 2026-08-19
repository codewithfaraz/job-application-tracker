import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { sanitizeRedirectPath } from "@/lib/supabase/redirect";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && EMAIL_OTP_TYPES.has(value);
}

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

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const nextPath = sanitizeRedirectPath(
    request.nextUrl.searchParams.get("next"),
  );

  if (!tokenHash || !isEmailOtpType(type)) {
    return privateRedirect(loginErrorUrl(request, "confirmation_failed"));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

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

  return privateRedirect(loginErrorUrl(request, "confirmation_failed"));
}
