import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// The anon key is safe to ship to the browser by design — Supabase access
// control is enforced by Row Level Security policies on each table, not by
// keeping this key secret. See supabase/schema.sql for the policies.
//
// `supabase` is only null when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// aren't set — App.tsx checks isSupabaseConfigured before using it, so
// nothing downstream should ever call a method on a null client. Falling
// back to a friendly "finish setup" screen instead of throwing at import
// time (which would blank-screen the whole app) matches how every other
// optional integration here degrades.
export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url, anonKey) : null;
