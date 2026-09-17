export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True once the client-facing Supabase env vars are present. Never checks the service-role key here. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
