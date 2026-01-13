
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificVideo() {
    console.log('🔍 Checking for "이바름" again (broader search)...\n');

    // Fetch ANY video with "이바름" (even if not published or filtered)
    const { data: videos, error } = await supabase
        .from('sparring_videos')
        .select('*')
        .ilike('title', '%이바름%');

    if (error) {
        console.error('❌ Error fetching videos:', error);
        return;
    }

    if (!videos || videos.length === 0) {
        console.log('⚠️ No videos found matching "이바름"');
        console.log('Listing ALL videos to check titles manually:');

        const { data: all } = await supabase.from('sparring_videos').select('id, title');
        all.forEach(v => console.log(`- ${v.title} (${v.id})`));
        return;
    }

    videos.forEach(v => {
        console.log(`\nFound: ${v.title}`);
        console.log(`ID: ${v.id}`);
        console.log(`Video URL: "${v.video_url}"`);
        console.log(`Is Published: ${v.is_published}`);
        console.log(`Review ID: ${v.preview_vimeo_id}`);
    });
}
checkSpecificVideo().catch(console.error);
