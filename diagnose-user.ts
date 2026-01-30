import { supabase } from './lib/supabase';

async function diagnoseUser() {
    console.log('=== Diagnosing test1 user ===\n');

    // 1. Find user by email
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, owned_video_ids, is_subscriber, subscription_tier')
        .or('email.ilike.%test1%,id.ilike.%test1%')
        .limit(5);

    if (userError) {
        console.error('Error fetching user:', userError);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No users found matching "test1"');
        return;
    }

    console.log('Found users:');
    users.forEach(user => {
        console.log(`\nUser: ${user.email}`);
        console.log(`ID: ${user.id}`);
        console.log(`Subscriber: ${user.is_subscriber}`);
        console.log(`Tier: ${user.subscription_tier}`);
        console.log(`owned_video_ids:`, user.owned_video_ids);
        console.log(`owned_video_ids type:`, Array.isArray(user.owned_video_ids) ? 'array' : typeof user.owned_video_ids);

        if (Array.isArray(user.owned_video_ids) && user.owned_video_ids.length > 0) {
            console.log(`First ID: "${user.owned_video_ids[0]}" (length: ${user.owned_video_ids[0]?.length})`);
        }
    });

    // 2. Check a sample course
    console.log('\n\n=== Checking sample courses ===\n');
    const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('id, title, vimeo_url, preview_vimeo_id')
        .limit(3);

    if (!courseError && courses) {
        courses.forEach(course => {
            console.log(`\nCourse: ${course.title}`);
            console.log(`ID: ${course.id}`);
            console.log(`vimeo_url: ${course.vimeo_url}`);
            console.log(`preview_vimeo_id: ${course.preview_vimeo_id}`);
        });
    }

    // 3. Check a sample lesson
    console.log('\n\n=== Checking sample lessons ===\n');
    const { data: lessons, error: lessonError } = await supabase
        .from('lessons')
        .select('id, title, vimeo_url')
        .limit(3);

    if (!lessonError && lessons) {
        lessons.forEach(lesson => {
            console.log(`\nLesson: ${lesson.title}`);
            console.log(`ID: ${lesson.id}`);
            console.log(`vimeo_url: ${lesson.vimeo_url}`);
        });
    }

    console.log('\n\n=== Diagnosis complete ===');
}

diagnoseUser().catch(console.error);
