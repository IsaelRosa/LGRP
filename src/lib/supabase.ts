import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) console.error('Supabase client variables are missing.');
const supabase = createClient(url || 'https://example.supabase.co', anon || 'missing-anon-key');
export default supabase;
