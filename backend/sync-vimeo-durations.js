const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const VIMEO_TOKEN = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN;

if (!SUPABASE_URL || !SUPABASE_KEY || !VIMEO_TOKEN) {
    console.error('Missing environment variables. Make sure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and VIMEO_ACCESS_TOKEN are set.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

async function syncTable(tableName, vimeoCol = 'vimeo_url') {
    console.log(`\n--- Syncing ${tableName} ---`);

    // Find records with 0:00 length or null length
    const { data: records, error } = await supabase
        .from(tableName)
        .select(`id, title, ${vimeoCol}, length`);

    if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return;
    }

    const toUpdate = records.filter(r => !r.length || r.length === '0:00' || r.length === '00:00');
    console.log(`Found ${toUpdate.length} records needing update out of ${records.length} total.`);

    for (const record of toUpdate) {
        const vimeoVal = record[vimeoCol];
        if (!vimeoVal) continue;

        // Handle both "ID" and "ID:HASH" formats
        const vimeoId = vimeoVal.split(':')[0].split('/').pop();
        if (!/^\d+$/.test(vimeoId)) {
            console.log(`Skipping record ${record.id}: Invalid Vimeo ID "${vimeoId}"`);
            continue;
        }

        try {
            console.log(`Fetching Vimeo info for ${record.title} (${vimeoId})...`);
            const res = await fetch(`https://api.vimeo.com/videos/${vimeoId}`, {
                headers: {
                    'Authorization': `Bearer ${VIMEO_TOKEN}`,
                    'Accept': 'application/vnd.vimeo.*+json;version=3.4'
                }
            });

            if (!res.ok) {
                console.warn(`Failed to fetch Vimeo info for ${vimeoId}: ${res.status} ${res.statusText}`);
                continue;
            }

            const videoInfo = await res.json();
            const seconds = videoInfo.duration || 0;
            const length = formatDuration(seconds);
            const duration_minutes = Math.floor(seconds / 60);

            if (seconds === 0) {
                console.warn(`Vimeo reported 0 duration for ${vimeoId}. Skipping DB update.`);
                continue;
            }

            const { error: updateError } = await supabase
                .from(tableName)
                .update({
                    length,
                    duration_minutes
                })
                .eq('id', record.id);

            if (updateError) {
                console.error(`Error updating ${tableName} record ${record.id}:`, updateError);
            } else {
                console.log(`✅ Updated ${record.title}: ${length}`);
            }
        } catch (err) {
            console.error(`❌ Exception syncing record ${record.id}:`, err.message);
        }
    }
}

async function run() {
    await syncTable('lessons', 'vimeo_url');
    // Drills and Sparring don't have length columns currently
    // await syncTable('drills', 'vimeo_url');
    // await syncTable('sparring_videos', 'video_url');
    console.log('\nSync completed.');
}

run();
