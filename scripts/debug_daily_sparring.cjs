
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDailySparring() {
    console.log('--- Debugging Daily Free Sparring ---');

    // 1. Featured Content
    const today = new Date().toISOString().split('T')[0];
    console.log('Checking for featured content on:', today);

    const { data: featured, error: featuredError } = await supabase
        .from('daily_featured_content')
        .select('featured_id')
        .eq('date', today)
        .eq('featured_type', 'sparring')
        .maybeSingle();

    if (featuredError) console.error('Featured Error:', featuredError);
    console.log('Featured result:', featured);

    let sparringId = featured?.featured_id;
    let selectedSparring = null;

    if (sparringId) {
        console.log('Fetching specific featured sparring:', sparringId);
        const { data: sparring, error: spError } = await supabase
            .from('sparring_videos')
            .select('*')
            .eq('id', sparringId)
            .maybeSingle();

        if (spError) console.error('Featured Fetch Error:', spError);
        selectedSparring = sparring;
    }

    // 2. Fallback
    if (!selectedSparring) {
        console.log('Using Fallback Logic...');
        const { data, error } = await supabase
            .from('sparring_videos')
            .select('*')
            .neq('video_url', '')
            .not('video_url', 'like', 'ERROR%')
            .order('id')
            .limit(50);

        if (error) {
            console.error('Fallback Fetch Error:', error);
            return;
        }

        console.log('Fallback pool size:', data ? data.length : 0);

        if (!data || data.length === 0) {
            console.log('No eligible sparring videos found!');
            return;
        }

        const todayObj = new Date();
        const seed = todayObj.getFullYear() * 10000 + (todayObj.getMonth() + 1) * 100 + todayObj.getDate();
        const x = Math.sin(seed + 123) * 10000;
        const index = Math.floor((x - Math.floor(x)) * data.length);
        console.log('Selected index:', index, 'from size:', data.length);
        selectedSparring = data[index];
    }

    if (!selectedSparring) {
        console.log('Total Failure: No sparring video selected.');
        return;
    }

    console.log('Selected Sparring:', {
        id: selectedSparring.id,
        title: selectedSparring.title,
        video_url: selectedSparring.video_url,
        creator_id: selectedSparring.creator_id,
        is_published: selectedSparring.is_published,
        preview_vimeo_id: selectedSparring.preview_vimeo_id
    });

    // 3. Creator
    if (selectedSparring.creator_id) {
        console.log('Fetching Creator:', selectedSparring.creator_id);
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', selectedSparring.creator_id)
            .maybeSingle();

        if (userError) console.error('User Fetch Error:', userError);
        console.log('Creator Data:', userData);
    } else {
        console.log('No creator_id on sparring video!');
    }
}

debugDailySparring();
