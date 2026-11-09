import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
function validConfiguration(): boolean {
  try {
    return Boolean(
      url &&
      key &&
      !url.includes('your-project') &&
      !key.includes('your-public') &&
      new URL(url).protocol === 'https:',
    );
  } catch {
    return false;
  }
}

// Only the public publishable key belongs in a Vite application. Never use service_role here.
export const supabase = validConfiguration()
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

export const isSupabaseConfigured = Boolean(supabase);
