"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInAction, signUpAction } from "@/actions/auth";
import type {
  AuthActionState,
  AuthFieldErrors,
  AuthFieldName,
} from "@/lib/validation/auth";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  nextPath: string;
  configured: boolean;
  initialMessage?: string;
};

type FieldProps = {
  autoComplete: string;
  errors: AuthFieldErrors | undefined;
  label: string;
  name: AuthFieldName;
  placeholder: string;
  type?: "email" | "password" | "text";
};

function Field({
  autoComplete,
  errors,
  label,
  name,
  placeholder,
  type = "text",
}: FieldProps) {
  const messages = errors?.[name];
  const errorId = `${name}-error`;

  return (
    <div className="space-y-2">
      <label
        className="block text-[13px] font-semibold tracking-[-0.01em] text-evergreen-deep"
        htmlFor={name}
      >
        {label}
      </label>
      <input
        aria-describedby={messages?.length ? errorId : undefined}
        aria-invalid={messages?.length ? true : undefined}
        autoComplete={autoComplete}
        className="h-11 w-full rounded-md border border-input bg-white px-3.5 text-[14px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/10 disabled:cursor-not-allowed disabled:bg-muted"
        id={name}
        name={name}
        placeholder={placeholder}
        required={name !== "displayName"}
        type={type}
      />
      {messages?.length ? (
        <p
          className="text-[12px] leading-5 text-rose"
          id={errorId}
          role="alert"
        >
          {messages[0]}
        </p>
      ) : null}
    </div>
  );
}

export function AuthForm({
  mode,
  nextPath,
  configured,
  initialMessage,
}: AuthFormProps) {
  const isSignIn = mode === "sign-in";
  const action = isSignIn ? signInAction : signUpAction;
  const initialState: AuthActionState = initialMessage
    ? { status: "error", message: initialMessage }
    : { status: "idle", message: "" };
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="w-full max-w-[430px]">
      <div className="mb-8">
        <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {isSignIn ? "Welcome back" : "Create your workspace"}
        </p>
        <h1 className="font-display text-[34px] leading-[1.08] tracking-[-0.035em] text-evergreen-deep sm:text-[40px]">
          {isSignIn ? "Pick up where you left off." : "Keep the whole search in view."}
        </h1>
        <p className="mt-4 max-w-[38ch] text-[14px] leading-6 text-muted-foreground">
          {isSignIn
            ? "Your applications, conversations, and next interviews are waiting."
            : "One private record for every role, resume, conversation, and decision."}
        </p>
      </div>

      {!configured ? (
        <div
          className="mb-5 rounded-md border border-amber/25 bg-amber-soft px-4 py-3 text-[13px] leading-5 text-amber"
          role="status"
        >
          Authentication needs a Supabase project URL and publishable key in
          <code className="mx-1 rounded-sm bg-white/60 px-1 py-0.5 font-mono text-[11px]">
            .env.local
          </code>
          before you can continue.
        </div>
      ) : null}

      {state.message ? (
        <div
          aria-live="polite"
          className={`mb-5 rounded-[8px] border px-4 py-3 text-[13px] leading-5 ${
            state.status === "success"
              ? "border-evergreen/15 bg-mint-soft text-evergreen"
              : "border-rose/15 bg-rose-soft text-rose"
          }`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </div>
      ) : null}

      <form action={formAction} className="space-y-4" noValidate>
        <input name="next" type="hidden" value={nextPath} />

        {!isSignIn ? (
          <Field
            autoComplete="name"
            errors={state.fieldErrors}
            label="Name (optional)"
            name="displayName"
            placeholder="How should we address you?"
          />
        ) : null}

        <Field
          autoComplete="email"
          errors={state.fieldErrors}
          label="Email"
          name="email"
          placeholder="you@example.com"
          type="email"
        />

        <Field
          autoComplete={isSignIn ? "current-password" : "new-password"}
          errors={state.fieldErrors}
          label="Password"
          name="password"
          placeholder={isSignIn ? "Your password" : "At least 8 characters"}
          type="password"
        />

        {!isSignIn ? (
          <Field
            autoComplete="new-password"
            errors={state.fieldErrors}
            label="Confirm password"
            name="confirmPassword"
            placeholder="Repeat your password"
            type="password"
          />
        ) : null}

        <button
          className="mt-2 h-11 w-full rounded-md bg-evergreen-deep px-4 text-[13px] font-semibold text-white transition-[background-color,transform] hover:bg-evergreen active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-muted-foreground"
          disabled={pending || !configured}
          type="submit"
        >
          {pending
            ? isSignIn
              ? "Signing in…"
              : "Creating account…"
            : isSignIn
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-[13px] leading-5 text-muted-foreground">
        {isSignIn ? "New to the tracker?" : "Already have an account?"}{" "}
        <Link
          className="font-semibold text-evergreen-deep underline decoration-border underline-offset-4 transition-colors hover:decoration-evergreen"
          href={
            isSignIn
              ? `/signup?next=${encodeURIComponent(nextPath)}`
              : `/login?next=${encodeURIComponent(nextPath)}`
          }
        >
          {isSignIn ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
