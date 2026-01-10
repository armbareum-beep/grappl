const { createClient } = require('@supabase/supabase-js');
const path = require('path');
// LOAD PRODUCTION ENV
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });

const supabaseUrl = process.env.VITE_SUPABASE_URL; // In production env it's VITE_
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // I'll use anon for public check or service role if I had it
// Wait, I need a service role key for some updates, but for select any key works if RLS allows.

console.log('Checking Production DB:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProd() {
    const { data, error } = await supabase
        .from('lessons')
        .select('id, title, vimeo_url, thumbnail_url, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Production Recent Lessons:', JSON.stringify(data, null, 2));
}

checkProd();
