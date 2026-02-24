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
    console.log('Checking recent drills...\n');

    // Get latest drills
    const { data: drills, error: drillError } = await supabase
        .from('drills')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (drillError) {
        console.error('Error fetching drills:', drillError);
        return;
    }

    console.log('=== Latest 5 Drills ===');
    drills.forEach(drill => {
        console.log('\n---');
        console.log('ID:', drill.id);
        console.log('Title:', drill.title);
        console.log('Created:', drill.created_at);
        console.log('Vimeo URL:', drill.vimeo_url || 'NULL');
        console.log('Desc Video URL:', drill.description_video_url || 'NULL');
        console.log('Thumbnail:', drill.thumbnail_url || 'NULL');
        console.log('Processing:', drill.is_processing ? 'YES' : 'NO');
    });

    // Get recent system logs with errors
    console.log('\n\n=== Recent Error Logs ===');
    const { data: logs, error: logError } = await supabase
        .from('system_logs')
        .select('*')
        .or('level.eq.error,level.eq.warn')
        .order('created_at', { ascending: false })
        .limit(20);

    if (!logError && logs) {
        logs.forEach(log => {
            console.log('\n---');
            console.log('Time:', log.created_at);
            console.log('Level:', log.level.toUpperCase());
            console.log('Message:', log.message);
            if (log.details) {
                console.log('Details:', JSON.stringify(log.details, null, 2));
            }
        });
    }
})();
