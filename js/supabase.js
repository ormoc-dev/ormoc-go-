import { getEnv } from './env.js';

let client = null;

/**
 * Creates (once) a Supabase browser client.
 * Requires SUPABASE_URL + SUPABASE_ANON_KEY in .env / .env.production.
 */
export async function getSupabase() {
  if (client) return client;

  const env = getEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY
    || env.SUPABASE_URL.includes('YOUR_PROJECT_REF')
    || env.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')) {
    console.warn('[OrmocGo] Supabase is not configured yet. Update .env / .env.production.');
    return null;
  }

  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
