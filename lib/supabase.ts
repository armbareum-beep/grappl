import { createClient } from '@supabase/supabase-js';

// Use environment variables with fallback to production values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vbfxwlhmgyvafskyukxa.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZnh3bGhtZ3l2YWZza3l1a3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxODYwODQsImV4cCI6MjA0NTc2MjA4NH0.ey1pcGc3M1o1JzdXBHYmF2ZlZSZSI6eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZnh3bGhtZ3l2YWZza3l1a3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAxODYwODQsImV4cCI6MjA0NTc2MjA4NH0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
