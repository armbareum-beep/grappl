const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkStorage() {
    console.log('=== Checking Supabase Storage ===\n');

    // List recent files
    const { data: files, error } = await supabase.storage
        .from('raw_videos_v2')
        .list('', { limit: 10, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
        console.log('Error listing files:', error.message);
        return;
    }

    console.log(`Found ${files.length} recent files:\n`);
    files.forEach(f => {
        const sizeMB = (f.metadata.size / 1024 / 1024).toFixed(2);
        console.log(`- ${f.name}`);
        console.log(`  Size: ${sizeMB}MB`);
        console.log(`  Created: ${f.created_at}`);
        console.log('');
    });

    // Test specific file
    if (files.length > 0) {
        const testFile = files[0].name;
        console.log(`\nTesting access to: ${testFile}`);

        const { data: urlData } = supabase.storage
            .from('raw_videos_v2')
            .getPublicUrl(testFile);

        console.log(`Public URL: ${urlData.publicUrl}`);

        try {
            const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
            console.log(`Status: ${response.status} ${response.statusText}`);
            console.log(`Content-Type: ${response.headers.get('content-type')}`);
            console.log(`Content-Length: ${response.headers.get('content-length')}`);
        } catch (e) {
            console.log(`Fetch error: ${e.message}`);
        }
    }
}

checkStorage();
