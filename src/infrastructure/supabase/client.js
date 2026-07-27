import { createClient } from '@supabase/supabase-js';

import { env } from '../../config/env';
import { LargeSecureStore } from './largeSecureStore';

export const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
