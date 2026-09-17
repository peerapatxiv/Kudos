"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Lazily-created singleton browser client. Returns null if env vars are missing. */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!);
  }
  return browserClient;
}
