import { createBrowserClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// These are safe to expose in the browser — the anon key only allows
// access that Row Level Security (RLS) policies permit.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Browser client with cookie-based auth session handling.
 * Use this in client components ("use client").
 */
export const supabase: SupabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : createClient(
        "https://placeholder.supabase.co",
        "placeholder"
      );

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
