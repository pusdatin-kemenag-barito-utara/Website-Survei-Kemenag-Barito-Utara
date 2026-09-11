import { createBrowserClient } from '@supabase/ssr'

function getEnv(key: string, fallback = '') {
  if (typeof window !== 'undefined') {
    const winEnv = (window as any).__ENV__ || (window as any).__PUBLIC_ENV__;
    if (winEnv && winEnv[key]) {
      return winEnv[key];
    }
  }
  return (import.meta.env as any)[key] || fallback;
}

export const SUPABASE_SCHEMA = 'kemenag_survey';

export function createClient() {
  const url = getEnv('PUBLIC_SUPABASE_URL');
  const key = getEnv('PUBLIC_SUPABASE_ANON_KEY');
  const schema = getEnv('PUBLIC_PUSDATIN_SCHEMA', SUPABASE_SCHEMA);

  try {
    if (!url || !key) {
      return null as any;
    }
    return createBrowserClient(
      url,
      key,
      {
        db: {
          schema,
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
