import { supabase } from './lib/supabase.ts';

async function testQuery() {
    const { data, error } = await supabase
        .from('creators')
        .select(`
            *,
            courses(count),
            routines(count),
            sparring_videos(count)
        `)
        .eq('approved', true);

    if (error) {
        console.error('ERROR:', error);
    } else {
        console.log('DATA COUNT:', data?.length);
        console.log('SAMPLE:', JSON.stringify(data?.[0], null, 2));
    }
}

testQuery();
