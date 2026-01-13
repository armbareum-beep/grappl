// Check daily free lesson
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDailyFreeLesson() {
    console.log('🔍 Checking daily free lesson...\n');

    const today = new Date().toISOString().split('T')[0];
    console.log(`Today: ${today}\n`);

    // Check featured content
    const { data: featured } = await supabase
        .from('daily_featured_content')
        .select('*')
        .eq('date', today)
        .eq('featured_type', 'course');

    console.log('Featured content for today:', featured);

    if (featured && featured.length > 0) {
        const courseId = featured[0].featured_id;
        console.log(`\nFeatured course ID: ${courseId}`);

        // Get course details
        const { data: course } = await supabase
            .from('courses')
            .select('id, title, preview_vimeo_id')
            .eq('id', courseId)
            .single();

        console.log('Course details:', course);

        // Get first lesson
        const { data: lessons } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('lesson_number', { ascending: true })
            .limit(1);

        console.log('First lesson:', lessons?.[0]);
    } else {
        console.log('\n❌ No featured content for today');
    }
}

checkDailyFreeLesson().catch(console.error);
