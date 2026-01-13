// Direct test of the exact getCourses logic
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

function transformCourse(data) {
    return {
        id: data.id,
        title: data.title,
        description: data.description,
        creatorId: data.creator_id,
        creatorName: data.creator?.name || 'Unknown',
        creatorProfileImage: data.creator?.profile_image || null,
        category: data.category,
        difficulty: data.difficulty,
        thumbnailUrl: data.thumbnail_url,
        price: data.price,
        views: data.views,
        lessonCount: data.lesson_count,
        createdAt: data.created_at,
        uniformType: data.uniform_type,
        isSubscriptionExcluded: data.is_subscription_excluded,
        published: data.published,
        previewVimeoId: data.preview_vimeo_id,
    };
}

async function testGetCoursesLogic() {
    console.log('🔍 Testing exact getCourses logic...\n');

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

    console.log(`Raw data count: ${data.length}\n`);

    const transformed = (data || []).map((d) => {
        const sortedLessons = (d.lessons || []).sort((a, b) => a.lesson_number - b.lesson_number);
        const firstLesson = sortedLessons[0];

        const course = transformCourse(d);
        return {
            ...course,
            lessonCount: d.lessons?.length || 0,
            creatorProfileImage: d.creator?.profile_image || null,
            previewVideoUrl: firstLesson?.vimeo_url,
        };
    });

    console.log('Transformed courses:\n');
    transformed.forEach(c => {
        console.log(`📚 ${c.title}`);
        console.log(`   previewVimeoId: ${c.previewVimeoId || 'UNDEFINED'}`);
        console.log(`   Has preview: ${!!c.previewVimeoId ? '✅' : '❌'}`);
        console.log('');
    });

    const withPreview = transformed.filter(c => !!c.previewVimeoId);
    console.log(`\n✅ Courses with preview: ${withPreview.length}`);
    withPreview.forEach(c => console.log(`   - ${c.title}`));
}

testGetCoursesLogic().catch(console.error);
