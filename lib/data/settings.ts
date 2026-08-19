import "server-only";

import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export async function getSettings() {
  const identity = await requireVerifiedIdentity("/settings");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, timezone, no_response_days")
    .eq("id", identity.userId)
    .single();

  if (error) throw new Error("Could not load your settings.");
  return { ...data, email: identity.email };
}
