const path = require('path');
const fs = require('fs');

// Load environment variables - Priority: .env.production > .env.local
const prodEnvPath = path.join(__dirname, '../.env.production');
const localEnvPath = path.join(__dirname, '../.env.local');

if (fs.existsSync(prodEnvPath)) {
    console.log('Using .env.production');
    require('dotenv').config({ path: prodEnvPath });
} else {
    console.log('Using .env.local');
    require('dotenv').config({ path: localEnvPath });
}

const { createClient } = require('@supabase/supabase-js');
const { Vimeo } = require('vimeo');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const vimeoClientId = process.env.VIMEO_CLIENT_ID || process.env.VITE_VIMEO_CLIENT_ID;
const vimeoSecret = process.env.VIMEO_CLIENT_SECRET || process.env.VITE_VIMEO_CLIENT_SECRET;
const vimeoToken = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey || !vimeoClientId || !vimeoSecret || !vimeoToken) {
    console.error('Missing environment variables.');
    console.log('SUPABASE_URL:', !!supabaseUrl);
    console.log('SUPABASE_KEY:', !!supabaseKey);
    console.log('VIMEO_TOKEN:', !!vimeoToken);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const vimeo = new Vimeo(vimeoClientId, vimeoSecret, vimeoToken);

async function getAllVimeoIdsFromDB() {
    console.log('Fetching Vimeo IDs from database...');
    const ids = new Set();

    // 1. Lessons
    const { data: lessons, error: lErr } = await supabase.from('lessons').select('video_url, vimeo_url');
    if (lErr) console.error('Error fetching lessons:', lErr.message);
    lessons?.forEach(l => {
        if (l.video_url) ids.add(l.video_url.toString().trim());
        if (l.vimeo_url) ids.add(l.vimeo_url.toString().trim());
    });

    // 2. Sparring Videos
    const { data: sparring, error: sErr } = await supabase.from('sparring_videos').select('video_url, preview_vimeo_id');
    if (sErr) console.error('Error fetching sparring_videos:', sErr.message);
    sparring?.forEach(s => {
        if (s.video_url) ids.add(s.video_url.toString().trim());
        if (s.preview_vimeo_id) ids.add(s.preview_vimeo_id.toString().trim());
    });

    // 3. Drills
    const { data: drills, error: dErr } = await supabase.from('drills').select('vimeo_url, description_video_url');
    if (dErr) console.error('Error fetching drills:', dErr.message);
    drills?.forEach(d => {
        if (d.vimeo_url) ids.add(d.vimeo_url.toString().trim());
        if (d.description_video_url) ids.add(d.description_video_url.toString().trim());
    });

    // 4. Courses
    const { data: courses, error: cErr } = await supabase.from('courses').select('preview_vimeo_id');
    if (cErr) console.error('Error fetching courses:', cErr.message);
    courses?.forEach(c => {
        if (c.preview_vimeo_id) ids.add(c.preview_vimeo_id.toString().trim());
    });

    const cleanIds = Array.from(ids).filter(id => id && id.length > 5);
    console.log(`Found ${cleanIds.length} unique Vimeo IDs in database.`);
    return new Set(cleanIds);
}

async function getAllVideosFromVimeo() {
    console.log('Fetching all videos from Vimeo account...');
    let allVideos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        console.log(`Fetching page ${page}...`);
        const response = await new Promise((resolve, reject) => {
            vimeo.request({
                method: 'GET',
                path: '/me/videos',
                query: {
                    page: page,
                    per_page: 100,
                    fields: 'uri,name,link,created_time'
                }
            }, (error, body) => {
                if (error) reject(error);
                else resolve(body);
            });
        });

        allVideos = allVideos.concat(response.data);
        if (response.paging.next) {
            page++;
        } else {
            hasMore = false;
        }
    }

    console.log(`Fetched ${allVideos.length} videos from Vimeo account.`);
    return allVideos;
}

async function run() {
    try {
        const dbIds = await getAllVimeoIdsFromDB();
        const vimeoVideos = await getAllVideosFromVimeo();

        const unlinked = vimeoVideos.filter(video => {
            const videoId = video.uri.split('/').pop();
            return !dbIds.has(videoId);
        });

        console.log('\n--- Unlinked Vimeo Videos ---');
        console.log(`Total: ${unlinked.length}`);

        if (unlinked.length > 0) {
            const reportPath = path.join(__dirname, 'unlinked_vimeo_report.json');
            fs.writeFileSync(reportPath, JSON.stringify(unlinked, null, 2));
            console.log(`Report saved to ${reportPath}`);

            unlinked.forEach(v => {
                console.log(`- [${v.uri.split('/').pop()}] ${v.name} (${v.link}) - Created: ${v.created_time}`);
            });
        } else {
            console.log('No unlinked videos found! Everything is perfectly synced.');
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

run();
