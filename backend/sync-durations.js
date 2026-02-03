const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load env
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const vimeoTokenLocal = process.env.VITE_VIMEO_ACCESS_TOKEN;
// Also load prod token just in case
const envProd = fs.readFileSync(path.join(__dirname, '../.env.production'), 'utf8');
const vimeoTokenProd = envProd.match(/VITE_VIMEO_ACCESS_TOKEN=(.*)/)?.[1]?.trim();

const vimeoTokens = [vimeoTokenLocal, vimeoTokenProd].filter(Boolean);

if (!supabaseUrl || !supabaseKey || vimeoTokens.length === 0) {
    console.error('Missing credentials');
    console.error('URL:', supabaseUrl);
    console.error('Key length:', supabaseKey ? supabaseKey.length : 0);
    console.error('Vimeo Tokens found:', vimeoTokens.length);
    process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);
console.log('Supabase Key length:', supabaseKey.length);
console.log('Vimeo Tokens available:', vimeoTokens.length);

const supabase = createClient(supabaseUrl, supabaseKey);

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function getVimeoVideoInfo(videoIdOrUrl) {
    let videoId = videoIdOrUrl;
    if (videoIdOrUrl.includes('vimeo.com/')) {
        videoId = videoIdOrUrl.split('vimeo.com/')[1].split('?')[0].split(':')[0];
    }

    for (const token of vimeoTokens) {
        try {
            const response = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.vimeo.*+json;version=3.4'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    duration: data.duration,
                    thumbnail: data.pictures?.base_link,
                    title: data.name
                };
            } else if (response.status !== 404 && response.status !== 401) {
                console.error(`Vimeo API error for ${videoId} with token: ${response.status}`);
            }
        } catch (err) {
            console.error(`Error fetching Vimeo info for ${videoIdOrUrl} with token:`, err);
        }
    }

    console.warn(`All Vimeo tokens failed for ${videoIdOrUrl}`);
    return null;
}

async function syncTable(tableName, urlField, columns) {
    console.log(`\nChecking table: ${tableName}...`);
    // Filter columns to only include those that are requested
    const selectCols = ['id', 'title', urlField, ...columns].join(',');

    // Build query to find 0:00 durations
    let query = supabase.from(tableName).select(selectCols);

    // We'll fetch all and filter in JS to avoid complex OR logic with potentially missing columns
    const { data: items, error } = await query;

    if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return;
    }

    const filtered = items.filter(item => {
        const val = item[urlField];
        if (!val || val === 'error' || val.toString().startsWith('ERROR')) return false;

        const hasNoDuration =
            (columns.includes('length') && (!item.length || item.length === '0:00')) ||
            (columns.includes('duration_minutes') && (!item.duration_minutes || item.duration_minutes === 0));
        return hasNoDuration;
    });

    console.log(`Found ${filtered.length} items to update in ${tableName}.`);

    for (const item of filtered) {
        const vimeoIdOrUrl = item[urlField];
        console.log(`Updating [${item.id}] ${item.title} (${vimeoIdOrUrl})...`);

        const info = await getVimeoVideoInfo(vimeoIdOrUrl);
        if (info && info.duration > 0) {
            const updates = {};
            if (columns.includes('length')) updates.length = formatDuration(info.duration);
            if (columns.includes('duration_minutes')) updates.duration_minutes = Math.floor(info.duration / 60);

            const { error: updateError } = await supabase
                .from(tableName)
                .update(updates)
                .eq('id', item.id);

            if (updateError) {
                console.error(`Failed to update ${item.id}:`, updateError);
            } else {
                console.log(`Successfully updated: ${JSON.stringify(updates)}`);
            }
        } else {
            console.warn(`Could not fetch valid duration for ${vimeoIdOrUrl}`);
        }

        await new Promise(r => setTimeout(r, 200));
    }
}

async function run() {
    await syncTable('lessons', 'vimeo_url', ['length', 'duration_minutes']);
    await syncTable('drills', 'vimeo_url', ['length', 'duration_minutes']);
    await syncTable('sparring_videos', 'video_url', ['length', 'duration_minutes']);
    console.log('\nAll sync tasks completed.');
}

run().catch(console.error);
