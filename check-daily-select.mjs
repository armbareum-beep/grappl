
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kclnrglcnfvfhkexizxl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjbG5yZ2xjbmZ2ZmhrZXhpenhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzExNjgsImV4cCI6MjA3OTI0NzE2OH0.yNHhEyKcUQJ--FixzA2KjZ88FwFezMotVxRkMjQ_DM0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDailySelection() {
    console.log('🔍 Checking TODAYS selection logic...\n');

    // 1. Fetch Candidates (Same logic as API)
    const { data, error } = await supabase
        .from('sparring_videos')
        .select('*')
        .eq('is_published', true)
        .neq('video_url', '')
        .not('video_url', 'like', 'ERROR%')
        .order('id')
        .limit(50);

    if (error) {
        console.error('API Error:', error);
        return;
    }

    console.log(`Found ${data.length} candidates.`);

    // 2. Apply Selection Logic
    const todayObj = new Date();
    const seed = todayObj.getFullYear() * 10000 + (todayObj.getMonth() + 1) * 100 + todayObj.getDate();
    const x = Math.sin(seed + 123) * 10000;
    const index = Math.floor((x - Math.floor(x)) * data.length);
    const selected = data[index];

    console.log(`\n📅 Today's Date: ${todayObj.toISOString().split('T')[0]}`);
    console.log(`Selected Index: ${index}`);
    console.log(`\n✅ SELECTED VIDEO:`);
    console.log(`Title: ${selected.title}`);
    console.log(`ID: ${selected.id}`);
    console.log(`Video URL: ${selected.video_url}`);
    console.log(`Preview ID: ${selected.preview_vimeo_id || 'NULL'}`);
}

checkDailySelection().catch(console.error);
