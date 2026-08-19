import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { getSupabaseConfig } from "./config";
import { loginPathFor, sanitizeRedirectPath } from "./redirect";
import { createClient } from "./server";

export type VerifiedIdentity = {
  userId: string;
  email: string | null;
};

export async function getVerifiedIdentity(): Promise<VerifiedIdentity | null> {
  if (!getSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;

    if (
      error ||
      !claims ||
      typeof claims.sub !== "string" ||
      claims.sub.length === 0
    ) {
      return null;
    }

    return {
      userId: claims.sub,
      email: typeof claims.email === "string" ? claims.email : null,
    };
  } catch {
    return null;
  }
}

export async function requireVerifiedIdentity(
  returnTo = "/dashboard",
): Promise<VerifiedIdentity> {
  const identity = await getVerifiedIdentity();

  if (!identity) {
    redirect(loginPathFor(sanitizeRedirectPath(returnTo)));
  }

  return identity;
}

export async function getCurrentUser(): Promise<User | null> {
  if (!getSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    return error ? null : user;
  } catch {
    return null;
  }
}
