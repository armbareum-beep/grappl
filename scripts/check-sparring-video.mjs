
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllSparring() {
    console.log('🔍 Checking ALL published sparring videos...\n');

    // Fetch all published sparring videos
    const { data: videos, error } = await supabase
        .from('sparring_videos')
        .select('*')
        .eq('is_published', true)
        .limit(20);

    if (error) {
        console.error('❌ Error fetching videos:', error);
        return;
    }

    if (!videos || videos.length === 0) {
        console.log('⚠️ No published sparring videos found!');
        return;
    }

    console.log(`Found ${videos.length} published videos:`);
    videos.forEach(v => {
        console.log(`\n[${v.id}] ${v.title}`);
        console.log(`  Preview ID: ${v.preview_vimeo_id || 'NULL'}`);
        console.log(`  Video URL: "${v.video_url}"`);

        const url = v.video_url;
        let extractedId = null;
        if (/^\d+$/.test(url)) {
            extractedId = url;
            console.log(`  ✅ Logic: Format is ID`);
        } else {
            const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
            extractedId = match ? match[1] : null;
            if (extractedId) {
                console.log(`  ✅ Logic: Extracted ID -> ${extractedId}`);
            } else {
                console.log(`  ❌ Logic: FAILED to extract ID`);
            }
        }
    });
}

checkAllSparring().catch(console.error);
