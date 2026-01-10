const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    console.log('Checking recent uploads and drills...\n');

    // Get latest drills
    const { data: drills, error: drillError } = await supabase
        .from('drills')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (drillError) {
        console.error('Error fetching drills:', drillError);
    } else {
        console.log('=== Latest 10 Drills ===');
        drills.forEach(drill => {
            const createdTime = new Date(drill.created_at);
            const now = new Date();
            const minutesAgo = Math.floor((now - createdTime) / 1000 / 60);

            console.log('\n---');
            console.log('ID:', drill.id);
            console.log('Title:', drill.title);
            console.log('Created:', `${createdTime.toLocaleString()} (${minutesAgo} minutes ago)`);
            console.log('Creator ID:', drill.creator_id);
            console.log('Vimeo URL:', drill.vimeo_url || '❌ NULL');
            console.log('Desc Video URL:', drill.description_video_url || '❌ NULL');
            console.log('Thumbnail:', drill.thumbnail_url || '❌ NULL');
            console.log('Processing:', drill.is_processing ? '⏳ YES' : '✅ NO');
        });
    }

    // Get latest routines
    const { data: routines, error: routineError } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (routineError) {
        console.error('Error fetching routines:', routineError);
    } else {
        console.log('\n=== Latest 10 Routines ===');
        routines.forEach(routine => {
            console.log('\n---');
            console.log('ID:', routine.id);
            console.log('Title:', routine.title);
            console.log('Thumbnail:', routine.thumbnail_url || '❌ NULL');
            console.log('Created:', new Date(routine.created_at).toLocaleString());
        });
    }

    // Check Storage for recent uploads
    console.log('\n\n=== Recent Storage Files (Last Hour) ===');
    const { data: files, error: fileError } = await supabase
        .storage
        .from('videos')
        .list('', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
        });

    if (!fileError && files) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentFiles = files.filter(f => new Date(f.created_at) > oneHourAgo);

        if (recentFiles.length === 0) {
            console.log('❌ No files uploaded in the last hour');
        } else {
            recentFiles.forEach(file => {
                console.log('\n---');
                console.log('Name:', file.name);
                console.log('Size:', (file.metadata.size / 1024 / 1024).toFixed(2), 'MB');
                console.log('Created:', new Date(file.created_at).toLocaleString());
            });
        }
    }

    // Get ALL system logs from last 30 minutes
    console.log('\n\n=== System Logs (Last 30 Minutes) ===');
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: logs, error: logError } = await supabase
        .from('system_logs')
        .select('*')
        .gte('created_at', thirtyMinsAgo)
        .order('created_at', { ascending: false });

    if (!logError && logs) {
        if (logs.length === 0) {
            console.log('❌ No backend logs in last 30 minutes (backend may not have received requests)');
        } else {
            logs.forEach(log => {
                console.log('\n---');
                console.log('Time:', new Date(log.created_at).toLocaleString());
                console.log('Level:', log.level.toUpperCase());
                console.log('Message:', log.message);
                if (log.details) {
                    console.log('Details:', JSON.stringify(log.details, null, 2));
                }
            });
        }
    }
})();
