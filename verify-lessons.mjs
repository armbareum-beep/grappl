import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env.local manually since we are running a script
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('🔍 Checking database connection...');
    console.log(`   URL: ${supabaseUrl}`);

    // Check Courses
    const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('id, title, published')
        .limit(5);

    if (courseError) {
        console.error('❌ Error fetching courses:', courseError.message);
    } else {
        console.log(`✅ Courses found: ${courses.length} (showing max 5)`);
        courses.forEach(c => console.log(`   - [${c.published ? 'Public' : 'Hidden'}] ${c.title}`));
    }

    // Check Lessons
    const { data: lessons, error: lessonError } = await supabase
        .from('lessons')
        .select('id, title, course_id')
        .limit(5);

    if (lessonError) {
        console.error('❌ Error fetching lessons:', lessonError.message);
    } else {
        console.log(`✅ Lessons found: ${lessons.length} (showing max 5)`);
        lessons.forEach(l => console.log(`   - ${l.title} (Course: ${l.course_id})`));
    }
}

checkData();
