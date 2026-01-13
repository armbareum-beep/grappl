
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPreviews() {
    console.log('Checking courses for preview_vimeo_id...');
    const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title, preview_vimeo_id')
        .not('preview_vimeo_id', 'is', null);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Courses with preview_vimeo_id:', courses);
    }

    console.log('\nChecking sparring_videos for preview_vimeo_id...');
    const { data: sparring, error: sparringError } = await supabase
        .from('sparring_videos')
        .select('id, title, preview_vimeo_id')
        .not('preview_vimeo_id', 'is', null);

    if (sparringError) {
        console.error('Error:', sparringError);
    } else {
        console.log('Sparring videos with preview_vimeo_id:', sparring);
    }

    console.log('\nChecking lessons for is_preview:true and vimeo_url...');
    const { data: lessons, error: lessonError } = await supabase
        .from('lessons')
        .select('id, title, is_preview, vimeo_url')
        .eq('is_preview', true);

    if (lessonError) {
        console.error('Error:', lessonError);
    } else {
        console.log('Lessons with is_preview=true:', lessons);
    }
}

checkPreviews();
