const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertSparring() {
    console.log('Inserting sparring video to local DB...');

    const { data, error } = await supabase
        .from('sparring_videos')
        .insert({
            title: '이바름 스파링',
            description: '',
            video_url: '1157425472',
            thumbnail_url: 'https://vumbnail.com/1157425472.jpg',
            preview_vimeo_id: '1154123797',
            creator_id: 'ae056ab7-d52d-46ca-9ce8-14ce6d901f4a',
            is_published: true,
            price: 5000,
            uniform_type: 'Gi',
            category: 'Sparring',
            views: 0,
            likes: 0,
            related_items: []
        })
        .select();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Inserted successfully:', data[0]);
}

insertSparring();
