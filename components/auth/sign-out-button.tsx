"use client";

import { useFormStatus } from "react-dom";

import { signOutAction } from "@/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-md border border-border bg-paper px-3 py-2 text-xs font-semibold text-evergreen-deep outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-cobalt disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SubmitButton />
    </form>
  );
}
