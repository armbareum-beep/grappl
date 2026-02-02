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

    // Find records with missing or zero length
    const { data: records, error } = await supabase
        .from(tableName)
        .select(`id, title, ${vimeoCol}, length`);

    if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return;
    }

    const toUpdate = records.filter(r =>
        !r.length ||
        r.length === '0' ||
        r.length === '0:00' ||
        r.length === '00:00'
    );
    console.log(`Found ${toUpdate.length} records needing update out of ${records.length} total.`);

    for (const record of toUpdate) {
        let vimeoVal = record[vimeoCol];
        if (!vimeoVal) continue;

        // Extract ID and Hash
        let vimeoId, vimeoHash;
        if (vimeoVal.includes(':')) {
            [vimeoId, vimeoHash] = vimeoVal.split(':');
        } else if (vimeoVal.includes('/')) {
            vimeoId = vimeoVal.split('/').pop();
        } else {
            vimeoId = vimeoVal;
        }

        if (!/^\d+$/.test(vimeoId)) {
            console.log(`Skipping record "${record.title}": Invalid Vimeo ID "${vimeoId}"`);
            continue;
        }

        try {
            console.log(`Processing "${record.title}" (${vimeoId})...`);

            let seconds = 0;

            // Method 1: Authenticated API
            try {
                const res = await fetch(`https://api.vimeo.com/videos/${vimeoId}`, {
                    headers: {
                        'Authorization': `Bearer ${VIMEO_TOKEN}`,
                        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    seconds = data.duration;
                }
            } catch (e) { }

            // Method 2: oEmbed Fallback (useful if token scope is limited or video is from another account)
            if (!seconds) {
                const oembedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}${vimeoHash ? `/${vimeoHash}` : ''}`;
                const res = await fetch(oembedUrl);
                if (res.ok) {
                    const data = await res.json();
                    seconds = data.duration;
                }
            }

            if (!seconds) {
                console.warn(`  Could not find duration for ${vimeoId}`);
                continue;
            }

            const length = formatDuration(seconds);
            const duration_minutes = Math.floor(seconds / 60);

            const { error: updateError } = await supabase
                .from(tableName)
                .update({
                    length,
                    duration_minutes
                })
                .eq('id', record.id);

            if (updateError) {
                console.error(`  Error updating record:`, updateError);
            } else {
                console.log(`  ✅ Updated: ${length}`);
            }
        } catch (err) {
            console.error(`  ❌ Exception:`, err.message);
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
