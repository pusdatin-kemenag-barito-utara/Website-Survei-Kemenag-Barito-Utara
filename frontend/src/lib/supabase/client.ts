import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = (import.meta as any)?.env?.PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any)?.env?.PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SCHEMA = (import.meta as any)?.env?.PUBLIC_PUSDATIN_SCHEMA || 'kemenag_survey';

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
