
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPreviews() {
    console.log('Checking courses for preview_vimeo_id using ANON key...');
    const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title, preview_vimeo_id')
        .eq('title', '리버스 데라히바 가드패스');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Courses data:', courses);
    }
}

checkPreviews();
