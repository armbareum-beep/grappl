const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLocal() {
    console.log('Updating local sparring videos...');

    // Update all sparring videos to use the new valid ID
    const { data, error } = await supabase
        .from('sparring_videos')
        .update({
            video_url: '1157425472',
            thumbnail_url: 'https://vumbnail.com/1157425472.jpg',
            preview_vimeo_id: '1154123797'
        })
        .is('deleted_at', null)
        .select();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Updated ${data.length} videos`);
    console.log('Sample:', data[0]);
}

updateLocal();
