// Quick test to check lessons in database
import { supabase } from './lib/supabase';

async function checkLessons() {
    console.log('=== Checking Lessons ===');

    // All lessons
    const { data: allLessons } = await supabase
        .from('lessons')
        .select('id, title, vimeo_url, video_url')
        .limit(10);

    console.log('Total lessons (first 10):', allLessons?.length);
    allLessons?.forEach(l => {
        console.log(`- ${l.title}: vimeo=${l.vimeo_url ? 'YES' : 'NO'}, video=${l.video_url ? 'YES' : 'NO'}`);
    });

    // Lessons with vimeo_url
    const { data: vimeoLessons } = await supabase
        .from('lessons')
        .select('id, title, vimeo_url')
        .not('vimeo_url', 'is', null)
        .neq('vimeo_url', '');

    console.log('\nLessons with vimeo_url:', vimeoLessons?.length);
}

checkLessons();
