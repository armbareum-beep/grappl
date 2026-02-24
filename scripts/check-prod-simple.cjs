#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.production
const envPath = path.join(__dirname, '.env.production');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim();
    }
});

const supabase = createClient(env.PROD_SUPABASE_URL, env.PROD_SUPABASE_ANON_KEY);

console.log('\n=== PRODUCTION CHECK ===\n');

async function check() {
    // Check drills
    const { data: drills, count, error: drillError } = await supabase
        .from('drills')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5);

    if (drillError) {
        console.log('❌ Database Error:', drillError.message);
    } else {
        console.log(`✅ Total Drills: ${count}`);
        if (drills && drills.length > 0) {
            console.log('\nRecent drills:');
            drills.forEach((d, i) => {
                console.log(`  ${i + 1}. ${d.title || 'Untitled'} (${d.id.substring(0, 8)}...)`);
                console.log(`     Vimeo: ${d.vimeo_url || 'pending'}`);
            });
        }
    }

    console.log('\n---\n');

    // Check storage
    const { data: files, error: storageError } = await supabase.storage
        .from('raw_videos_v2')
        .list('', { limit: 10, sortBy: { column: 'created_at', order: 'desc' } });

    if (storageError) {
        console.log('❌ Storage Error:', storageError.message);
    } else {
        console.log(`✅ Files in raw_videos_v2: ${files.length}`);

        if (files.length === 0) {
            console.log('⚠️  No files in storage!');
        } else {
            console.log('\nRecent files:');
            files.slice(0, 3).forEach((f, i) => {
                const sizeMB = (f.metadata.size / 1024 / 1024).toFixed(2);
                console.log(`  ${i + 1}. ${f.name} (${sizeMB}MB)`);
            });

            // Test public URL
            const testFile = files[0].name;
            const { data: urlData } = supabase.storage
                .from('raw_videos_v2')
                .getPublicUrl(testFile);

            console.log('\nTesting public URL:');
            console.log(`URL: ${urlData.publicUrl}`);

            const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
            if (response.status === 200) {
                console.log('✅ Public access: WORKING');
            } else {
                console.log(`❌ Public access: FAILED (${response.status})`);
                console.log('⚠️  Bucket is NOT public!');
            }
        }
    }

    console.log('\n=== END ===\n');
}

check().catch(err => console.log('Error:', err.message));
