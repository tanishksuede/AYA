import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/['"]/g, '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').replace(/['"]/g, '').trim();

if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    supabaseUrl = 'https://' + supabaseUrl;
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing environment variables! VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set.');
}

let supabaseInstance: any;

try {
  supabaseInstance = createClient(
    supabaseUrl || 'https://dummy.supabase.co',
    supabaseAnonKey || 'dummy-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    }
  );
} catch (error) {
  console.error('[Supabase] Fatal error initializing client. Check your VITE_SUPABASE_URL.', error);
  // Fallback to dummy so the app doesn't crash on boot
  supabaseInstance = createClient('https://dummy.supabase.co', 'dummy-key');
}

export const supabase = supabaseInstance;
