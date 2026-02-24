// Check courses with preview_vimeo_id
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPreviewVideos() {
    console.log('🔍 Checking courses with preview_vimeo_id...\n');

    const { data, error } = await supabase
        .from('courses')
        .select('id, title, published, preview_vimeo_id')
        .eq('published', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total published courses: ${data.length}\n`);

    const withPreview = data.filter(c => c.preview_vimeo_id);
    const withoutPreview = data.filter(c => !c.preview_vimeo_id);

    console.log(`✅ Courses WITH preview_vimeo_id: ${withPreview.length}`);
    withPreview.forEach(c => console.log(`  - ${c.title} → ${c.preview_vimeo_id}`));

    console.log(`\n❌ Courses WITHOUT preview_vimeo_id: ${withoutPreview.length}`);
    withoutPreview.forEach(c => console.log(`  - ${c.title}`));
}

checkPreviewVideos().catch(console.error);
