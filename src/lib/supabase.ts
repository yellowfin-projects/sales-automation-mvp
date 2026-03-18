import { createClient, SupabaseClient } from "@supabase/supabase-js";

// These are safe to expose in the browser — the anon key only allows
// access that Row Level Security (RLS) policies permit.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create client only if credentials are configured.
// During build or when unconfigured, calls will fail gracefully.
export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
