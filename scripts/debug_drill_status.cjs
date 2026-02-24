
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key Length:', supabaseKey ? supabaseKey.length : 0);

if (!supabaseUrl || !supabaseKey) {
    console.error('Could not load Supabase credentials from .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestDrill() {
    console.log('Fetching latest drill...');
    const { data: drills, error } = await supabase
        .from('drills')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Error fetching drills:', error);
        return;
    }

    console.log('Latest 3 Drills:');
    drills.forEach(d => {
        console.log(`\n[${d.id}] ${d.title}`);
        console.log(`  - Created: ${d.created_at}`);
        console.log(`  - Vimeo URL: ${d.vimeo_url}`);
        console.log(`  - Desc Video URL: ${d.description_video_url}`);
        console.log(`  - Thumbnail: ${d.thumbnail_url}`);
    });
}

checkLatestDrill();
