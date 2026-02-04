const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

// Gather all possible Vimeo tokens
const tokens = new Set();
if (process.env.VIMEO_ACCESS_TOKEN) tokens.add(process.env.VIMEO_ACCESS_TOKEN);
if (process.env.VITE_VIMEO_ACCESS_TOKEN) tokens.add(process.env.VITE_VIMEO_ACCESS_TOKEN);

// Try to read from .env.production as well
try {
    const prodEnv = fs.readFileSync(path.join(__dirname, '../.env.production'), 'utf8');
    const match = prodEnv.match(/VITE_VIMEO_ACCESS_TOKEN=(.*)/);
    if (match && match[1]) tokens.add(match[1].trim());
} catch (e) { }

const VIMEO_TOKENS = Array.from(tokens);

if (!SUPABASE_URL || !SUPABASE_KEY || VIMEO_TOKENS.length === 0) {
    console.error('Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

async function getVimeoDuration(vimeoId, vimeoHash) {
    // Try each token
    for (const token of VIMEO_TOKENS) {
        try {
            const res = await fetch(`https://api.vimeo.com/videos/${vimeoId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.vimeo.*+json;version=3.4'
                }
            });
            if (res.ok) {
                const data = await res.json();
                return data.duration;
            }
        } catch (e) { }
    }

    // Try oEmbed fallback
    try {
        const oembedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}${vimeoHash ? `/${vimeoHash}` : ''}`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
            const data = await res.json();
            return data.duration;
        }
    } catch (e) { }

    return null;
}

async function syncTable(tableName, vimeoCol = 'vimeo_url') {
    console.log(`\n--- Syncing ${tableName} ---`);

    const { data: records, error } = await supabase
        .from(tableName)
        .select(`id, title, ${vimeoCol}, length`);

    if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return;
    }

    const toUpdate = records.filter(r => {
        const val = r[vimeoCol];
        if (!val || val === 'error' || val.toString().startsWith('ERROR')) return false;
        return !r.length || ['0', '0:00', '00:00', '0:0', '0:0:00'].includes(r.length);
    });

    console.log(`Found ${toUpdate.length} records needing update.`);

    for (const record of toUpdate) {
        let vimeoVal = record[vimeoCol];
        let vimeoId, vimeoHash;

        if (vimeoVal.includes(':')) {
            [vimeoId, vimeoHash] = vimeoVal.split(':');
        } else if (vimeoVal.includes('vimeo.com/')) {
            const parts = vimeoVal.split('vimeo.com/')[1].split('?')[0].split('/');
            vimeoId = parts[0];
            vimeoHash = parts[1];
        } else {
            vimeoId = vimeoVal;
        }

        if (!/^\d+$/.test(vimeoId)) continue;

        try {
            console.log(`Processing "${record.title}" (${vimeoId})...`);
            const seconds = await getVimeoDuration(vimeoId, vimeoHash);

            if (seconds !== null && seconds > 0) {
                const length = formatDuration(seconds);
                const { error: updateError } = await supabase
                    .from(tableName)
                    .update({ length, duration_minutes: Math.floor(seconds / 60) })
                    .eq('id', record.id);

                if (updateError) console.error(`  Error updating:`, updateError);
                else console.log(`  ✅ Updated: ${length}`);
            } else {
                console.warn(`  ❌ Could not find duration`);
            }
        } catch (err) {
            console.error(`  ❌ Exception:`, err.message);
        }
    }
}

async function run() {
    await syncTable('lessons', 'vimeo_url');
    await syncTable('drills', 'vimeo_url');
    await syncTable('sparring_videos', 'video_url');
    console.log('\nSync completed.');
}

run();
