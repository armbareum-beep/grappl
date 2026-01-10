// Update unpublished courses to published
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function publishAllCourses() {
    console.log('📢 Publishing all unpublished courses...\n');

    // Get unpublished courses
    const { data: unpublished, error: fetchError } = await supabase
        .from('courses')
        .select('id, title, published')
        .eq('published', false);

    if (fetchError) {
        console.error('Error fetching courses:', fetchError);
        return;
    }

    console.log(`Found ${unpublished.length} unpublished courses:\n`);
    unpublished.forEach(c => console.log(`  - ${c.title}`));

    // Update all to published = true
    const { data, error } = await supabase
        .from('courses')
        .update({ published: true })
        .eq('published', false)
        .select();

    if (error) {
        console.error('\n❌ Error updating courses:', error);
        return;
    }

    console.log(`\n✅ Successfully published ${data.length} courses!`);
    data.forEach(c => console.log(`  ✓ ${c.title}`));
}

publishAllCourses().catch(console.error);
