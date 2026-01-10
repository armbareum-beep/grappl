import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars from .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listCourses() {
    const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title');

    if (error) {
        console.error('Error fetching courses:', error);
        return;
    }

    console.log('Courses:');
    courses.forEach(c => {
        console.log(`[${c.id}] ${c.title}`);
    });
}

listCourses();
