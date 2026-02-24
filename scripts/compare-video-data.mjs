import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkDrillData() {
    console.log('🔍 Checking Drill Data (which works)...');

    // 1. Get working drills
    const { data: drills } = await supabase
        .from('drills')
        .select('id, title, vimeo_url, video_url')
        .or('vimeo_url.neq.,video_url.neq.')
        .limit(5);

    if (drills) {
        drills.forEach(d => {
            console.log(`✅ Drill: ${d.title}`);
            console.log(`   URL: ${d.vimeo_url || d.video_url}`);
        });
    } else {
        console.log('❌ No drills found?!');
    }

    // 2. Get broken lessons
    console.log('\n🔍 Checking Lesson Data (which is broken)...');
    const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title, vimeo_url, video_url')
        .neq('vimeo_url', '')
        .limit(5);

    if (lessons) {
        lessons.forEach(l => {
            console.log(`❌ Lesson: ${l.title}`);
            console.log(`   URL: ${l.vimeo_url || l.video_url}`);
        });
    }
}

checkDrillData();
