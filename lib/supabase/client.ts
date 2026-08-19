import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

import { requireSupabaseConfig } from "./config";

export function createClient() {
  const { url, publishableKey } = requireSupabaseConfig();

  return createBrowserClient<Database>(url, publishableKey);
}
