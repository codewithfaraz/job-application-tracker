"use server";

import type { AuthError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getSupabaseConfig,
  SupabaseConfigurationError,
} from "@/lib/supabase/config";
import { sanitizeRedirectPath } from "@/lib/supabase/redirect";
import { createClient } from "@/lib/supabase/server";
import {
  authFieldErrors,
  type AuthActionState,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function errorState(
  message: string,
  fieldErrors?: AuthActionState["fieldErrors"],
): AuthActionState {
  return {
    status: "error",
    message,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

function authServiceMessage(error: AuthError, flow: "sign-in" | "sign-up") {
  switch (error.code) {
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "email_not_confirmed":
      return "Confirm your email before signing in.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a moment, then try again.";
    case "signup_disabled":
      return "New account creation is currently disabled.";
    case "weak_password":
      return "Choose a stronger password and try again.";
    default:
      return flow === "sign-in"
        ? "We could not sign you in. Check your details and try again."
        : "We could not create your account. Try again in a moment.";
  }
}

function configurationErrorState() {
  return errorState(
    "Authentication is not configured yet. Add the Supabase project URL and publishable key to .env.local.",
  );
}

function validOrigin(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

async function getRequestOrigin() {
  const configuredOrigin = validOrigin(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? null,
  );

  if (configuredOrigin) return configuredOrigin;

  const requestHeaders = await headers();
  const origin = validOrigin(requestHeaders.get("origin"));

  if (origin) return origin;

  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) return null;

  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = forwardedProtocol === "http" ? "http" : "https";

  return validOrigin(`${protocol}://${host}`);
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!getSupabaseConfig()) {
    return configurationErrorState();
  }

  const parsed = signInSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    next: formValue(formData, "next"),
  });

  if (!parsed.success) {
    return errorState("Check the highlighted fields.", authFieldErrors(parsed.error));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      return errorState(authServiceMessage(error, "sign-in"));
    }

    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();

    if (claimsError || !claimsData?.claims?.sub) {
      await supabase.auth.signOut({ scope: "local" });
      return errorState("Your session could not be verified. Sign in again.");
    }
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return configurationErrorState();
    }

    return errorState("Authentication is temporarily unavailable. Try again.");
  }

  revalidatePath("/", "layout");
  redirect(sanitizeRedirectPath(parsed.data.next));
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!getSupabaseConfig()) {
    return configurationErrorState();
  }

  const parsed = signUpSchema.safeParse({
    displayName: formValue(formData, "displayName"),
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
    next: formValue(formData, "next"),
  });

  if (!parsed.success) {
    return errorState("Check the highlighted fields.", authFieldErrors(parsed.error));
  }

  let hasVerifiedSession = false;

  try {
    const supabase = await createClient();
    const origin = await getRequestOrigin();
    const nextPath = sanitizeRedirectPath(parsed.data.next);
    const callbackUrl = origin
      ? `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      : undefined;
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        ...(callbackUrl ? { emailRedirectTo: callbackUrl } : {}),
        data: parsed.data.displayName
          ? { display_name: parsed.data.displayName }
          : {},
      },
    });

    if (error) {
      return errorState(authServiceMessage(error, "sign-up"));
    }

    const { data: claimsData } = await supabase.auth.getClaims();
    hasVerifiedSession = Boolean(claimsData?.claims?.sub);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return configurationErrorState();
    }

    return errorState("Account creation is temporarily unavailable. Try again.");
  }

  if (hasVerifiedSession) {
    revalidatePath("/", "layout");
    redirect(sanitizeRedirectPath(parsed.data.next));
  }

  return {
    status: "success",
    message:
      "Check your inbox to confirm your email, then return here to sign in.",
  };
}

export async function signOutAction() {
  if (getSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getClaims();

      if (data?.claims?.sub) {
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch {
      // Redirecting to login remains safe. Proxy will send a still-valid
      // session back to the app rather than treating it as signed out.
    }
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
