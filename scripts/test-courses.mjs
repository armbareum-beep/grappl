// Test script to check getCourses function
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGetCourses() {
    console.log('🔍 Testing getCourses...');

    // Test 1: With creator join
    console.log('\n--- Test 1: With creator join ---');
    const { data: data1, error: error1 } = await supabase
        .from('courses')
        .select(`
            *,
            creator:creators!creator_id(name, profile_image),
            lessons:lessons(vimeo_url, lesson_number)
        `)
        .eq('published', true)
        .order('created_at', { ascending: false });

    console.log('Result 1:', { count: data1?.length, error: error1 });
    if (data1) console.log('Sample course:', data1[0]);

    // Test 2: Without creator join
    console.log('\n--- Test 2: Without creator join ---');
    const { data: data2, error: error2 } = await supabase
        .from('courses')
        .select(`
            *,
            lessons:lessons(vimeo_url, lesson_number)
        `)
        .eq('published', true)
        .order('created_at', { ascending: false });

    console.log('Result 2:', { count: data2?.length, error: error2 });
    if (data2) console.log('Sample course:', data2[0]);

    // Test 3: Just courses
    console.log('\n--- Test 3: Just courses ---');
    const { data: data3, error: error3 } = await supabase
        .from('courses')
        .select('*')
        .eq('published', true);

    console.log('Result 3:', { count: data3?.length, error: error3 });
    if (data3) {
        console.log('All courses:');
        data3.forEach(c => console.log(`  - ${c.title} (${c.category})`));
    }
}

testGetCourses().catch(console.error);
