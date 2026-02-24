// Test specific course with preview
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSpecificCourse() {
    console.log('🔍 Testing specific course with preview...\n');

    const courseId = '65f85c5f-722c-4219-b425-893047915524'; // 리버스 데라히바 가드패스

    const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log('✅ Course found:');
        console.log('   Title:', data.title);
        console.log('   preview_vimeo_id:', data.preview_vimeo_id);
        console.log('   published:', data.published);
    }

    console.log('\n---\n');

    // Test getCourses pattern
    console.log('Testing getCourses pattern...\n');
    const { data: courses, error: error2 } = await supabase
        .from('courses')
        .select(`
            *,
            lessons:lessons(vimeo_url, lesson_number)
        `)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(12);

    if (error2) {
        console.error('❌ Error:', error2);
    } else {
        console.log(`✅ Found ${courses.length} courses\n`);
        courses.forEach(c => {
            console.log(`📚 ${c.title}`);
            console.log(`   preview_vimeo_id: ${c.preview_vimeo_id || 'NULL'}`);
        });
    }
}

testSpecificCourse().catch(console.error);
