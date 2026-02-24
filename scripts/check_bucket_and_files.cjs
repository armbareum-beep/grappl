const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log('Checking buckets and recent files...\n');

    // List all buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
        console.error('Error listing buckets:', bucketError);
    } else {
        console.log('=== Available Buckets ===');
        buckets.forEach(bucket => {
            console.log(`- ${bucket.name} (${bucket.public ? 'PUBLIC' : 'PRIVATE'})`);
        });
    }

    // Check files in raw_videos_v2 bucket (last 10 minutes)
    console.log('\n=== Files in raw_videos_v2 (Last 10 Minutes) ===');
    const { data: filesV2, error: errorV2 } = await supabase
        .storage
        .from('raw_videos_v2')
        .list('', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
        });

    if (errorV2) {
        console.error('Error listing raw_videos_v2:', errorV2);
    } else {
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recentFiles = filesV2.filter(f => new Date(f.created_at) > tenMinsAgo);

        if (recentFiles.length === 0) {
            console.log('❌ No files uploaded in last 10 minutes');
        } else {
            recentFiles.forEach(file => {
                console.log('\n---');
                console.log('Name:', file.name);
                console.log('Size:', (file.metadata.size / 1024 / 1024).toFixed(2), 'MB');
                console.log('Created:', new Date(file.created_at).toLocaleString());

                // Try to get public URL
                const { data: urlData } = supabase.storage
                    .from('raw_videos_v2')
                    .getPublicUrl(file.name);
                console.log('Public URL:', urlData.publicUrl);
            });
        }
    }

    // Check files in old 'videos' bucket (if exists)
    console.log('\n=== Files in videos bucket (Last 10 Minutes) ===');
    const { data: filesOld, error: errorOld } = await supabase
        .storage
        .from('videos')
        .list('', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
        });

    if (errorOld) {
        console.log('❌ videos bucket does not exist or error:', errorOld.message);
    } else {
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recentFiles = filesOld.filter(f => new Date(f.created_at) > tenMinsAgo);

        if (recentFiles.length === 0) {
            console.log('❌ No files uploaded in last 10 minutes');
        } else {
            recentFiles.forEach(file => {
                console.log('\n---');
                console.log('Name:', file.name);
                console.log('Size:', (file.metadata.size / 1024 / 1024).toFixed(2), 'MB');
                console.log('Created:', new Date(file.created_at).toLocaleString());
            });
        }
    }

    // Get latest drill
    console.log('\n=== Latest Drill ===');
    const { data: drill, error: drillError } = await supabase
        .from('drills')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (drillError) {
        console.error('Error fetching drill:', drillError);
    } else {
        console.log('ID:', drill.id);
        console.log('Title:', drill.title);
        console.log('Created:', new Date(drill.created_at).toLocaleString());
        console.log('Is Processing:', drill.is_processing);
        console.log('Vimeo URL:', drill.vimeo_url || '❌ NULL');
        console.log('Desc Video URL:', drill.description_video_url || '❌ NULL');
    }
})();
