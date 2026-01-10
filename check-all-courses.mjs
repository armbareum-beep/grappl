// Check all courses including unpublished
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllCourses() {
    console.log('🔍 Checking ALL courses (including unpublished)...\n');

    const { data, error } = await supabase
        .from('courses')
        .select('id, title, category, published, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total courses: ${data.length}\n`);

    const published = data.filter(c => c.published);
    const unpublished = data.filter(c => !c.published);

    console.log(`✅ Published: ${published.length}`);
    published.forEach(c => console.log(`  - ${c.title} (${c.category})`));

    console.log(`\n❌ Unpublished: ${unpublished.length}`);
    unpublished.forEach(c => console.log(`  - ${c.title} (${c.category})`));
}

checkAllCourses().catch(console.error);
