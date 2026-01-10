const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMostRecent() {
    const { data, error } = await supabase
        .from('lessons')
        .select('id, title, vimeo_url, thumbnail_url, creator_id, course_id, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('MOST RECENT LESSON:', JSON.stringify(data[0], null, 2));
}

checkMostRecent();
