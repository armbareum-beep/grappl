import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkTrending() {
    console.log('🔍 Checking Trending Courses Logic...');

    const { data, error } = await supabase
        .from('courses')
        .select('*, creator:creators(name, profile_image), lessons(count)')
        .eq('published', true)
        .limit(50)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching courses:', error);
    } else {
        console.log(`✅ Found ${data.length} published courses.`);
        if (data.length > 0) {
            console.log('First 3 courses:');
            data.slice(0, 3).forEach(c => {
                console.log(`- ${c.title} (Creator: ${c.creator?.name}, Lessons: ${c.lessons?.length || 0})`);
            });
        }
    }
}

checkTrending();
