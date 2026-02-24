import { supabase } from './lib/supabase';

async function check() {
    const { count: drillCount, error: drillError } = await supabase.from('drills').select('*', { count: 'exact', head: true }).neq('vimeo_url', '').not('vimeo_url', 'like', 'ERROR%');
    const { count: lessonCount, error: lessonError } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).neq('vimeo_url', '').not('vimeo_url', 'like', 'ERROR%');
    const { count: sparringCount, error: sparringError } = await supabase.from('sparring_videos').select('*', { count: 'exact', head: true }).neq('video_url', '').not('video_url', 'like', 'ERROR%');

    console.log({
        drillCount,
        lessonCount,
        sparringCount,
        drillError,
        lessonError,
        sparringError
    });
}

check();
