const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    // Hack to get column names: query one row and check keys
    const { data, error } = await supabase
        .from('sparring_videos')
        .select('*')
        .limit(1)
        .single();

    if (error) { console.error(error); return; }

    console.log('Columns in sparring_videos:', Object.keys(data).join(', '));
    console.log('Sample Data:', JSON.stringify(data, null, 2));
}

checkColumns();
