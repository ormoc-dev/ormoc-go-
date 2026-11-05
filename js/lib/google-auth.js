import { getSupabase } from '../supabase.js';

export async function continueWithGoogle() {
  const supabase = await getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured yet. Update .env / .env.production.');
  }

  const redirectTo = new URL(window.location.href);
  redirectTo.searchParams.set('page', 'home');
  redirectTo.hash = '';

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo.toString(),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
}
