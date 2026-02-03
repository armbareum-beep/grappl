
const { createClient } = require('@supabase/supabase-js');
// const fetch = require('node-fetch'); // Not needed in node 24 usually, but if needed, un-comment.
// Node 24 has global fetch.

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.production
const result = dotenv.config({ path: path.resolve(__dirname, '../.env.production') });
if (result.error) {
    console.error('Error loading .env.production:', result.error);
    process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL.trim() : '';
// Try ANON KEY for debugging connectivity
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY ? process.env.VITE_SUPABASE_ANON_KEY.trim() : '';
const VIMEO_TOKEN = process.env.VITE_VIMEO_ACCESS_TOKEN ? process.env.VITE_VIMEO_ACCESS_TOKEN.trim() : '';

if (!SUPABASE_URL || !SUPABASE_KEY || !VIMEO_TOKEN) {
    console.error('Missing env vars:', {
        url: !!SUPABASE_URL,
        key: !!SUPABASE_KEY,
        vimeo: !!VIMEO_TOKEN
    });
    process.exit(1);
}

console.log('DEBUG: Using ANON KEY for testing connectivity.');
console.log('Loaded Config:');
console.log('URL:', SUPABASE_URL);
console.log('Key Length:', SUPABASE_KEY.length);
console.log('Key Start:', SUPABASE_KEY.substring(0, 10));

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getBestVimeoThumbnail(vimeoId) {
    try {
        const cleanId = vimeoId.toString().split(':')[0];
        const res = await fetch(`https://api.vimeo.com/videos/${cleanId}/pictures`, {
            headers: {
                'Authorization': `Bearer ${VIMEO_TOKEN}`,
                'Accept': 'application/vnd.vimeo.*+json;version=3.4'
            }
        });
        if (!res.ok) return null;
        const data = await res.json();
        const firstPic = data.data?.[0];
        if (!firstPic) return null;

        // Sort by width descending and pick the largest
        const sizes = [...(firstPic.sizes || [])].sort((a, b) => b.width - a.width);
        return sizes[0]?.link || null;
    } catch (e) {
        console.error(`Error fetching Vimeo thumb for ${vimeoId}:`, e.message);
        return null;
    }
}

function extractVimeoId(url) {
    if (!url) return null;
    if (/^\d+$/.test(url)) return url;
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
}

async function processTable(tableName, vimeoCol = 'vimeo_url') {
    console.log(`\n--- Processing Table: ${tableName} ---`);
    const { data: records, error } = await supabase.from(tableName).select(`id, title, ${vimeoCol}, thumbnail_url`);
    if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return;
    }

    console.log(`Found ${records.length} records.`);
    let updatedCount = 0;

    // Process in chunks or effectively just loop
    for (const record of records) {
        const vUrl = record[vimeoCol];
        const vId = extractVimeoId(vUrl);
        if (!vId) continue;

        const bestUrl = await getBestVimeoThumbnail(vId);

        if (bestUrl && bestUrl !== record.thumbnail_url) {
            // Check if current is already high quality or similar? 
            // Just update if different for now to force sync

            const { error: updateError } = await supabase
                .from(tableName)
                .update({ thumbnail_url: bestUrl })
                .eq('id', record.id);

            if (updateError) {
                console.error(`  [${record.title}] Update failed:`, updateError.message);
            } else {
                console.log(`  [${record.title}] Updated: ${record.thumbnail_url?.substring(0, 30)}... -> ${bestUrl.substring(0, 30)}...`);
                updatedCount++;
            }
        } else {
            // process.stdout.write('.');
        }
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 100));
    }
    console.log(`\n${tableName} complete. Updated ${updatedCount} records.`);
}

async function run() {
    try {
        console.log('Starting migration...');
        await processTable('drills', 'vimeo_url');
        await processTable('lessons', 'vimeo_url');
        await processTable('sparring_videos', 'video_url');
        console.log('\nAll migrations completed successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

run();
