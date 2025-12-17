const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkDrills() {
    console.log('=== Checking Recent Drills ===\n');

    const { data: drills, error } = await supabase
        .from('drills')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.log('Error:', error.message);
        return;
    }

    console.log(`Found ${drills.length} recent drills:\n`);
    drills.forEach(d => {
        console.log(`Drill ID: ${d.id}`);
        console.log(`Title: ${d.title}`);
        console.log(`Action Video: ${d.action_video}`);
        console.log(`Description Video: ${d.description_video}`);
        console.log(`Vimeo URL: ${d.vimeo_url}`);
        console.log(`Description Vimeo URL: ${d.description_video_url}`);
        console.log(`Created: ${d.created_at}`);
        console.log('---\n');
    });
}

checkDrills();
