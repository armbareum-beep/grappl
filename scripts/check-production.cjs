#!/usr/bin/env node
/**
 * 🌍 PRODUCTION ENVIRONMENT CHECKER
 * 
 * This script checks the PRODUCTION Supabase environment.
 * It uses .env.production for credentials.
 * 
 * Setup:
 * 1. Copy .env.production.template to .env.production
 * 2. Fill in your production Supabase anon key
 * 3. Run: node check-production.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const RESET = '\x1b[0m';
const BRIGHT = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

// Load production environment
const envPath = path.join(__dirname, '.env.production');
if (!fs.existsSync(envPath)) {
    console.log(RED + '\n❌ ERROR: .env.production file not found!' + RESET);
    console.log(YELLOW + '\nSetup instructions:' + RESET);
    console.log('1. Copy .env.production.template to .env.production');
    console.log('2. Fill in your production Supabase credentials');
    console.log('3. Run this script again\n');
    process.exit(1);
}

// Parse .env.production manually
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        env[key] = value;
    }
});

const supabaseUrl = env.PROD_SUPABASE_URL;
const supabaseKey = env.PROD_SUPABASE_ANON_KEY;

console.log('\n' + '='.repeat(60));
console.log(BRIGHT + GREEN + '🌍 PRODUCTION ENVIRONMENT CHECK' + RESET);
console.log('='.repeat(60) + '\n');

if (!supabaseUrl || !supabaseKey || supabaseKey.includes('your_production')) {
    console.log(RED + '❌ Production credentials not configured!' + RESET);
    console.log(YELLOW + '\nPlease edit .env.production and add your credentials.\n' + RESET);
    process.exit(1);
}

console.log(BRIGHT + '📊 Configuration:' + RESET);
console.log(`  URL: ${CYAN}${supabaseUrl}${RESET}`);
console.log(`  Key: ${GREEN}SET ✓${RESET}`);
console.log(`  Backend: ${CYAN}${env.PROD_BACKEND_URL}${RESET}`);

console.log('\n' + '-'.repeat(60) + '\n');

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(BRIGHT + '🔍 Checking Production Database...' + RESET + '\n');

// Check drills
supabase.from('drills').select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5)
    .then(({ data, count, error }) => {
        if (error) {
            console.log(`  ${RED}❌ Database Error: ${error.message}${RESET}`);
            return;
        }

        console.log(`  ${GREEN}✓ Total Drills: ${count}${RESET}`);
        console.log(`\n  Recent drills:`);
        data.forEach((d, i) => {
            console.log(`    ${i + 1}. ${d.title || 'Untitled'} (${d.id.substring(0, 8)}...)`);
            console.log(`       Created: ${new Date(d.created_at).toLocaleString()}`);
            console.log(`       Action: ${d.action_video || 'N/A'}`);
            console.log(`       Vimeo: ${d.vimeo_url || 'pending'}`);
        });

        console.log('\n' + '-'.repeat(60) + '\n');
        console.log(BRIGHT + '📦 Checking Production Storage...' + RESET + '\n');

        return supabase.storage.from('raw_videos_v2').list('', {
            limit: 10,
            sortBy: { column: 'created_at', order: 'desc' }
        });
    })
    .then((result) => {
        if (!result) return Promise.resolve({ data: [], error: null });
        const { data, error } = result;
        if (error) {
            console.log(`  ${RED}❌ Storage Error: ${error.message}${RESET}`);
            return;
        }

        console.log(`  ${GREEN}✓ Files in raw_videos_v2: ${data.length}${RESET}`);

        if (data.length === 0) {
            console.log(`  ${YELLOW}⚠️  No files found in storage bucket!${RESET}`);
        } else {
            console.log(`\n  Recent files:`);
            data.slice(0, 5).forEach((f, i) => {
                const sizeMB = (f.metadata.size / 1024 / 1024).toFixed(2);
                console.log(`    ${i + 1}. ${f.name}`);
                console.log(`       Size: ${sizeMB}MB`);
                console.log(`       Created: ${new Date(f.created_at).toLocaleString()}`);
            });
        }

        // Test public URL access
        if (data.length > 0) {
            const testFile = data[0].name;
            const { data: urlData } = supabase.storage
                .from('raw_videos_v2')
                .getPublicUrl(testFile);

            console.log(`\n  Testing public URL access...`);
            console.log(`  URL: ${urlData.publicUrl}`);

            return fetch(urlData.publicUrl, { method: 'HEAD' })
                .then(r => {
                    if (r.status === 200) {
                        console.log(`  ${GREEN}✓ Public access: WORKING${RESET}`);
                    } else {
                        console.log(`  ${RED}✗ Public access: FAILED (${r.status} ${r.statusText})${RESET}`);
                        console.log(`  ${YELLOW}⚠️  Bucket may not be public!${RESET}`);
                    }
                });
        }
    })
    .then(() => {
        console.log('\n' + '='.repeat(60));
        console.log(GREEN + '✓ Production check complete!' + RESET);
        console.log('='.repeat(60) + '\n');
    })
    .catch(err => {
        console.log(`\n${RED}❌ Error: ${err.message}${RESET}\n`);
    });
