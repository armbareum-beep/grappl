
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLessons() {
    console.log('Fetching lessons for course 65f85c5f-722c-4219-b425-893047915524...');
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', '65f85c5f-722c-4219-b425-893047915524')
        .order('lesson_number');

    if (error) console.error('Error:', error);
    else console.log('Data:', JSON.stringify(data, null, 2));
}

checkLessons();
