import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getVerifiedIdentity } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { sanitizeRedirectPath } from "@/lib/supabase/redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your private job-search workspace.",
};

type SignupSearchParams = {
  next?: string | string[];
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<SignupSearchParams>;
}) {
  const query = await searchParams;
  const requestedPath = Array.isArray(query.next) ? query.next[0] : query.next;
  const nextPath = sanitizeRedirectPath(requestedPath);
  const configured = isSupabaseConfigured();

  if (configured && (await getVerifiedIdentity())) {
    redirect(nextPath);
  }

  return (
    <AuthForm
      configured={configured}
      mode="sign-up"
      nextPath={nextPath}
    />
  );
}
