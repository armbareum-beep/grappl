// Test if anon can read preview_vimeo_id
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnonAccess() {
    console.log('🔍 Testing anon access to preview_vimeo_id...\n');

    // Test 1: Select all fields with *
    console.log('Test 1: SELECT * FROM courses');
    const { data: allFields, error: error1 } = await supabase
        .from('courses')
        .select('*')
        .eq('published', true)
        .limit(1)
        .single();

    if (error1) {
        console.error('Error:', error1);
    } else {
        console.log('Result:', allFields);
        console.log('Has preview_vimeo_id field?', 'preview_vimeo_id' in allFields);
        console.log('preview_vimeo_id value:', allFields.preview_vimeo_id);
    }

    console.log('\n---\n');

    // Test 2: Explicitly select preview_vimeo_id
    console.log('Test 2: SELECT id, title, preview_vimeo_id FROM courses');
    const { data: explicitFields, error: error2 } = await supabase
        .from('courses')
        .select('id, title, preview_vimeo_id')
        .eq('published', true)
        .limit(1)
        .single();

    if (error2) {
        console.error('Error:', error2);
    } else {
        console.log('Result:', explicitFields);
    }
}

testAnonAccess().catch(console.error);
