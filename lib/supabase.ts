import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eryhwjndozjpifbizsnw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_kTlZmhg3U3A1xzp-diSj_w_lbE0on9R';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
