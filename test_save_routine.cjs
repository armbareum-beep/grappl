
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey ? supabaseKey.length : 0);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('--- Checking weekly_routine_plans Table ---');
    const { data, error } = await supabase
        .from('weekly_routine_plans')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching weekly_routine_plans:', error);
        console.log('\n--- Recommendation ---');
        console.log('It seems the table "weekly_routine_plans" is missing or inaccessible.');
        console.log('Try creating it with the following SQL:');
        console.log(`
CREATE TABLE IF NOT EXISTS public.weekly_routine_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT false,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    thumbnail_url TEXT,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.weekly_routine_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own weekly routines" ON public.weekly_routine_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly routines" ON public.weekly_routine_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly routines" ON public.weekly_routine_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly routines" ON public.weekly_routine_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Public view policy (if needed)
CREATE POLICY "Anyone can view public weekly routines" ON public.weekly_routine_plans
    FOR SELECT USING (is_public = true);
        `);
    } else {
        console.log('Table weekly_routine_plans exists.');
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table exists but has no data.');
        }
    }
}

test();
