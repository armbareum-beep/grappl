import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkLogic() {
    console.log('🔍 Checking getDailyFreeLesson Logic...');

    // 1. Check Featured
    const kstDate = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
    console.log(`Getting featured for date: ${kstDate}`);

    const { data: featured, error: featuredError } = await supabase
        .from('daily_featured_content')
        .select('*')
        .eq('date', kstDate)
        .eq('featured_type', 'lesson')
        .maybeSingle();

    if (featuredError) console.error('Featured Error:', featuredError.message);
    console.log('Featured Result:', featured || 'None');

    // 2. Check Fallback Query
    console.log('\nChecking Fallback Query (lessons with published courses)...');

    const { data: lessons, error: fallbackError } = await supabase
        .from('lessons')
        .select('id, title, vimeo_url, thumbnail_url, courses!inner(id, title, published, thumbnail_url)')
        .eq('courses.published', true)
        .neq('vimeo_url', '')
        .limit(10);

    if (fallbackError) {
        console.error('❌ Fallback Query Error:', fallbackError.message);
        if (fallbackError.message.includes('inner')) {
            console.log('💡 Tip: "inner" join failure often means foreign key issues or filtered out parent rows.');
        }
    } else {
        console.log(`✅ Fallback Fetch Result: found ${lessons.length} items`);
        lessons.forEach(l => {
            const thumb = l.thumbnail_url || l.courses?.thumbnail_url;
            console.log(`   - ${l.title}`);
            console.log(`     Thumbnail: ${thumb ? '✅ Present' : '❌ MISSING'} (${thumb?.substring(0, 30)}...)`);
        });
    }

    // 3. Diagnosis if empty
    if (!lessons || lessons.length === 0) {
        console.log('\n🕵️ Diagnosis:');

        // Check total lessons
        const { count } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
        console.log(`   - Total Lessons: ${count}`);

        // Check lessons with vimeo_url
        const { count: vimeoCount } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).neq('vimeo_url', '');
        console.log(`   - Lessons with Vimeo URL: ${vimeoCount}`);

        // Check published courses
        const { count: courseCount } = await supabase.from('courses').select('*', { count: 'exact', head: true }).eq('published', true);
        console.log(`   - Published Courses: ${courseCount}`);

        // Check raw join without filter
        const { data: rawJoin } = await supabase.from('lessons').select('id, course_id').not('course_id', 'is', null).limit(5);
        console.log('   - Sample raw join check (lessons with course_id):', rawJoin);
    }
}

checkLogic();
