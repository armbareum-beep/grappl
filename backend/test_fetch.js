const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch(creatorId) {
    console.log('Fetching courses for creator:', creatorId);
    const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('creator_id', creatorId);

    const courseIds = courses?.map(c => c.id) || [];
    console.log('Course IDs:', courseIds);

    if (courseIds.length === 0) {
        console.log('No courses found.');
        return;
    }

    console.log('Fetching lessons for courses...');
    const { data: lessons, error } = await supabase
        .from('lessons')
        .select('*')
        .in('course_id', courseIds);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${lessons.length} lessons.`);
    lessons.forEach(l => {
        console.log(`- ${l.title}: vimeo_url = ${l.vimeo_url}`);
    });
}

// I need back the creatorId. I'll get it from the most recent lesson's course.
async function run() {
    const { data: recent } = await supabase.from('lessons').select('course_id').order('created_at', { ascending: false }).limit(1).single();
    if (recent && recent.course_id) {
        const { data: course } = await supabase.from('courses').select('creator_id').eq('id', recent.course_id).single();
        if (course) {
            await testFetch(course.creator_id);
        }
    }
}

run();
