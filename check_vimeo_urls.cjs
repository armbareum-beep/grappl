
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = require('dotenv').parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUrls() {
    console.log('Checking Lessons...');
    const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, title, vimeo_url')
        .limit(10);

    if (lessonsError) console.error('Error fetching lessons:', lessonsError);
    else console.table(lessons);

    console.log('\nChecking Drills...');
    const { data: drills, error: drillsError } = await supabase
        .from('drills')
        .select('id, title, vimeo_url, description_video_url')
        .limit(10);

    if (drillsError) console.error('Error fetching drills:', drillsError);
    else console.table(drills);
}

checkUrls().catch(console.error);
