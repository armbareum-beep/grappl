
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNullCourseId() {
    console.log('Testing creation of lesson with NULL course_id...');

    // Need a valid creator_id. We'll pick one from existing courses.
    const { data: courses } = await supabase.from('courses').select('creator_id').limit(1);
    if (!courses || courses.length === 0) {
        console.error('No courses found to get a valid creator_id');
        return;
    }
    const creatorId = courses[0].creator_id;
    console.log('Using creator_id:', creatorId);

    const { data, error } = await supabase
        .from('lessons')
        .insert({
            title: 'Test Lesson Null Course',
            description: 'Testing if course_id can be null',
            creator_id: creatorId,
            course_id: null, // This is what we are testing
            lesson_number: 999,
            length: '0:00',
            difficulty: 'Beginner',
            category: 'Standing'
        })
        .select()
        .single();

    if (error) {
        console.error('FAILED to create lesson with NULL course_id:', error.message);
        console.error('Error details:', error);
    } else {
        console.log('SUCCESS! Created lesson with NULL course_id:', data.id);
        // Clean up
        await supabase.from('lessons').delete().eq('id', data.id);
        console.log('Cleaned up test lesson.');
    }
}

testNullCourseId();
