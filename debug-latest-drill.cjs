
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestDrill() {
    console.log('Fetching latest drill...');

    const { data, error } = await supabase
        .from('drills')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching drill:', error);
        return;
    }

    if (!data) {
        console.log('No drills found.');
        return;
    }

    console.log('Latest Drill Found:');
    console.log('ID:', data.id);
    console.log('Title:', data.title);
    console.log('Creator:', data.creator_id);
    console.log('Vimeo URL:', data.vimeo_url);
    console.log('Video URL:', data.video_url);
    console.log('Created At:', data.created_at);
}

checkLatestDrill();
