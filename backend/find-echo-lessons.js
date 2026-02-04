const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAllCourses() {
    console.log('Searching ALL courses for "데라히바"...\n');

    // Search ALL courses with 데라히바
    const { data: courses } = await supabase
        .from('courses')
        .select('id, title, price, published, created_at')
        .ilike('title', '%데라히바%')
        .eq('published', true);

    console.log(`=== Found ${courses?.length || 0} Courses with "데라히바" ===\n`);

    for (const course of courses || []) {
        console.log(`\n📚 Course: "${course.title}"`);
        console.log(`   ID: ${course.id}`);
        console.log(`   Price: ${course.price}원`);
        console.log(`   Created: ${course.created_at}`);

        // Get lessons for this course
        const { data: lessons } = await supabase
            .from('lessons')
            .select('id, title, vimeo_url, order_index')
            .eq('course_id', course.id)
            .order('order_index');

        console.log(`   Lessons: ${lessons?.length || 0}`);
        if (lessons && lessons.length > 0) {
            lessons.forEach((lesson, idx) => {
                console.log(`      ${idx + 1}. ${lesson.title}`);
                console.log(`         Vimeo: ${lesson.vimeo_url}`);
            });
        }
    }
}

findAllCourses().catch(console.error);
