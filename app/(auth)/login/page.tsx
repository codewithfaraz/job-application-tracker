import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getVerifiedIdentity } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { sanitizeRedirectPath } from "@/lib/supabase/redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your private job-search workspace.",
};

type LoginSearchParams = {
  error?: string | string[];
  next?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function authErrorMessage(code: string | undefined) {
  switch (code) {
    case "confirmation_failed":
      return "That confirmation link is invalid or has expired. Request a new one by signing up again.";
    case "callback_failed":
      return "We could not finish signing you in. Try again.";
    case "supabase_not_configured":
      return "Authentication is not configured for this environment yet.";
    default:
      return undefined;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const query = await searchParams;
  const nextPath = sanitizeRedirectPath(firstValue(query.next));
  const configured = isSupabaseConfigured();

  if (configured && (await getVerifiedIdentity())) {
    redirect(nextPath);
  }

  return (
    <AuthForm
      configured={configured}
      initialMessage={authErrorMessage(firstValue(query.error))}
      mode="sign-in"
      nextPath={nextPath}
    />
  );
}
