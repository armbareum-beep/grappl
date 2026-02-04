const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load env
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const vimeoTokenLocal = process.env.VITE_VIMEO_ACCESS_TOKEN;
const envProd = fs.readFileSync(path.join(__dirname, '../.env.production'), 'utf8');
const vimeoTokenProd = envProd.match(/VITE_VIMEO_ACCESS_TOKEN=(.*)/)?.[1]?.trim();
const vimeoTokens = [vimeoTokenLocal, vimeoTokenProd].filter(Boolean);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAspectRatios() {
    console.log('Using Supabase URL:', supabaseUrl);
    console.log(`Found ${vimeoTokens.length} Vimeo tokens.`);

    // Fetch latest 20 lessons to check
    const { data: lessons, error } = await supabase
        .from('lessons')
        .select('id, title, vimeo_url')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('DB Error:', error);
        return;
    }

    console.log(`\nChecking ${lessons.length} recent lessons...`);

    for (const lesson of lessons) {
        let videoId = null;
        if (lesson.vimeo_url) {
            if (lesson.vimeo_url.includes('vimeo.com/')) {
                videoId = lesson.vimeo_url.split('vimeo.com/')[1].split('?')[0].split(':')[0];
            } else if (/^\d+$/.test(lesson.vimeo_url)) {
                videoId = lesson.vimeo_url;
            }
        }

        if (!videoId) {
            console.log(`[${lesson.title}] No valid Vimeo ID found.`);
            continue;
        }

        let infoFound = false;
        for (const token of vimeoTokens) {
            try {
                const res = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    const w = data.width;
                    const h = data.height;
                    const ratio = w / h;
                    const is16_9 = Math.abs(ratio - (16 / 9)) < 0.05;

                    console.log(`[${lesson.title}] ${w}x${h} (Ratio: ${ratio.toFixed(2)}) ${is16_9 ? '✅ 16:9' : '⚠️ ' + (w / 100).toFixed(0) + ':' + (h / 100).toFixed(0)}`);
                    infoFound = true;
                    break;
                }
            } catch (e) {
                // Ignore error, try next token
            }
        }
        if (!infoFound) console.log(`[${lesson.title}] Failed to fetch Vimeo info.`);
    }
}

checkAspectRatios();
