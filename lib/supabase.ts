import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jwoxgduvbjfpcuhwkvch.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3b3hnZHV2YmpmcGN1aHdrdmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzg5ODQsImV4cCI6MjA4NjkxNDk4NH0.4d8wvEeSUE1I1Rr9IFqOFQLyqSSQbJgsBwq2dGeVG4Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
