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

console.log('\n=== DETAILED PRODUCTION CHECK ===\n');
console.log('Supabase URL:', env.PROD_SUPABASE_URL);
console.log('Anon Key:', env.PROD_SUPABASE_ANON_KEY ? `${env.PROD_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'MISSING');
console.log('\n---\n');

const supabase = createClient(env.PROD_SUPABASE_URL, env.PROD_SUPABASE_ANON_KEY);

async function check() {
    try {
        // Test 1: Database access
        console.log('Test 1: Database Access');
        const { data: drills, count, error: drillError } = await supabase
            .from('drills')
            .select('*', { count: 'exact' })
            .limit(1);

        if (drillError) {
            console.log('❌ Database Error:', drillError.message);
            console.log('   Code:', drillError.code);
            console.log('   Details:', drillError.details);
        } else {
            console.log('✅ Database: Connected');
            console.log('   Total drills:', count);
        }

        console.log('\n---\n');

        // Test 2: Storage bucket list
        console.log('Test 2: Storage Bucket List');
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

        if (bucketsError) {
            console.log('❌ Buckets Error:', bucketsError.message);
        } else {
            console.log('✅ Buckets accessible');
            console.log('   Available buckets:');
            buckets.forEach(b => {
                console.log(`   - ${b.name} (public: ${b.public})`);
            });
        }

        console.log('\n---\n');

        // Test 3: raw_videos_v2 bucket
        console.log('Test 3: raw_videos_v2 Bucket Files');
        const { data: files, error: filesError } = await supabase.storage
            .from('raw_videos_v2')
            .list('', { limit: 5 });

        if (filesError) {
            console.log('❌ Files Error:', filesError.message);
            console.log('   Code:', filesError.statusCode);
            console.log('   Full error:', JSON.stringify(filesError, null, 2));
        } else {
            console.log('✅ Files accessible');
            console.log(`   Total files: ${files.length}`);
            if (files.length > 0) {
                console.log('   Recent files:');
                files.forEach((f, i) => {
                    console.log(`   ${i + 1}. ${f.name}`);
                });
            }
        }

        console.log('\n---\n');

        // Test 4: Public URL (if files exist)
        if (files && files.length > 0) {
            console.log('Test 4: Public URL Access');
            const testFile = files[0].name;
            const { data: urlData } = supabase.storage
                .from('raw_videos_v2')
                .getPublicUrl(testFile);

            console.log('   File:', testFile);
            console.log('   URL:', urlData.publicUrl);

            try {
                const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
                console.log('   Status:', response.status, response.statusText);

                if (response.status === 200) {
                    console.log('✅ Public access: WORKING');
                } else {
                    console.log('❌ Public access: FAILED');
                }
            } catch (fetchError) {
                console.log('❌ Fetch error:', fetchError.message);
            }
        }

    } catch (err) {
        console.log('\n❌ Unexpected error:', err.message);
        console.log('   Stack:', err.stack);
    }

    console.log('\n=== END ===\n');
}

check();
