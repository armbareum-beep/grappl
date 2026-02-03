
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
    console.log('🔍 Listing all courses to find Half Guard Pass...\n');

    const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, published')
        .order('created_at', { ascending: false })
        .limit(50);

    if (coursesError) {
        console.error('Error fetching courses:', coursesError);
    } else {
        console.log(`Found ${courses.length} courses:`);
        courses.forEach(c => console.log(`- [${c.id}] ${c.title} (Published: ${c.published})`));
    }

    console.log('\nSearching for "Wrist" or "리스트" lessons...');
    const { data: locks, error: locksError } = await supabase
        .from('lessons')
        .select(`
            id, title, lesson_number, course_id,
            course:courses(title)
        `)
        .or('title.ilike.%Wrist%,title.ilike.%리스트%')
        .limit(20);

    if (locksError) {
        console.error('Error searching lessons:', locksError);
    } else {
        console.log(`Found ${locks.length} lessons matching "Wrist/리스트":`);
        locks.forEach(l => {
            console.log(`- Lesson: "${l.title}"`);
            console.log(`  -> Belongs to Course: "${l.course?.title || 'No Course'}" (${l.course_id})`);
        });
    }
}

investigate().catch(console.error);
