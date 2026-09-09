import { createBrowserClient } from '@supabase/ssr'

function getEnv(key: string, fallback = '') {
  if (typeof window !== 'undefined' && (window as any).__ENV__?.[key]) {
    return (window as any).__ENV__[key];
  }
  return (import.meta.env as any)[key] || fallback;
}

const SUPABASE_URL = getEnv('PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = getEnv('PUBLIC_SUPABASE_ANON_KEY');
export const SUPABASE_SCHEMA = getEnv('PUBLIC_PUSDATIN_SCHEMA', 'kemenag_survey');

export function createClient() {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return null as any;
    }
    return createBrowserClient(
      SUPABASE_URL,
      SUPABASE_KEY,
      {
        db: {
          schema: SUPABASE_SCHEMA,
        },
        cookieOptions: {
          name: 'sb-survey-auth-token',
        },
      }
    )
  } catch (e) {
    console.warn('[Supabase] Client init error:', e)
    return null as any
  }
}
