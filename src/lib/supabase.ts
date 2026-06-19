import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Publishable (anon) keys are safe to ship in the client — Row Level Security
// protects the data. Values fall back to the project defaults so the app runs
// out of the box; override via EXPO_PUBLIC_* env vars.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://xgekhomwstiqjjazvpgy.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_uS2VcJwLbqWkYUDUY5Emxg_bW24INwm';

// On web, AsyncStorage maps to localStorage; on native it persists the session.
const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export const SUPABASE_PROJECT = {
  url: SUPABASE_URL,
  projectId: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_ID ?? 'xgekhomwstiqjjazvpgy',
};
