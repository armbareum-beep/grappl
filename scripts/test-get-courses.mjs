// Test getCourses to check previewVimeoId
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGetCourses() {
    console.log('🔍 Testing getCourses with preview_vimeo_id...\n');

    const { data, error } = await supabase
        .from('courses')
        .select(`
            *,
            lessons:lessons(vimeo_url, lesson_number)
        `)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(12);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total courses: ${data.length}\n`);

    data.forEach(course => {
        const sortedLessons = (course.lessons || []).sort((a, b) => a.lesson_number - b.lesson_number);
        const firstLesson = sortedLessons[0];

        console.log(`📚 Course: "${course.title}"`);
        console.log(`   - ID: ${course.id}`);
        console.log(`   - preview_vimeo_id: ${course.preview_vimeo_id || 'NULL'}`);
        console.log(`   - First lesson vimeo_url: ${firstLesson?.vimeo_url || 'NULL'}`);
        console.log(`   - Has preview: ${!!course.preview_vimeo_id ? '✅' : '❌'}`);
        console.log('');
    });
}

testGetCourses().catch(console.error);
