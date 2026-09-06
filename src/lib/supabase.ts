import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { authStorage } from './storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('إعدادات Supabase العامة غير مكتملة.');

export const supabase = createClient(url, key, {
  auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
