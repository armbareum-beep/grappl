import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkAll() {
    console.log('--- DRILLS ---');
    const { data: drills } = await supabase.from('drills').select('title, vimeo_url, video_url').limit(5);
    console.log(JSON.stringify(drills, null, 2));

    console.log('\n--- LESSONS ---');
    const { data: lessons } = await supabase.from('lessons').select('title, vimeo_url, video_url').limit(5);
    console.log(JSON.stringify(lessons, null, 2));

    console.log('\n--- SPARRING ---');
    const { data: sparring } = await supabase.from('sparring_videos').select('title, video_url').limit(5);
    console.log(JSON.stringify(sparring, null, 2));
}

checkAll();
