#!/usr/bin/env node
/**
 * ⚠️ ENVIRONMENT CHECKER ⚠️
 * 
 * This script shows which environment you are currently configured for.
 * Run this FIRST before debugging to avoid confusion!
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const RESET = '\x1b[0m';
const BRIGHT = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

console.log('\n' + '='.repeat(60));
console.log(BRIGHT + CYAN + '🔍 ENVIRONMENT DETECTION REPORT' + RESET);
console.log('='.repeat(60) + '\n');

// Detect environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const isProduction = supabaseUrl && supabaseUrl.includes('vbfxwlhmgyvafskyukxa');
const isDev = supabaseUrl && supabaseUrl.includes('kclnrglcnfvfhkexizxl');

// Environment indicator
if (isProduction) {
    console.log(BRIGHT + GREEN + '🌍 PRODUCTION ENVIRONMENT' + RESET);
    console.log(GREEN + 'You are connected to the LIVE production system' + RESET);
} else if (isDev) {
    console.log(BRIGHT + YELLOW + '💻 DEVELOPMENT ENVIRONMENT' + RESET);
    console.log(YELLOW + 'You are connected to the LOCAL dev system' + RESET);
} else {
    console.log(BRIGHT + RED + '❌ UNKNOWN ENVIRONMENT' + RESET);
    console.log(RED + 'Cannot determine environment!' + RESET);
}

console.log('\n' + '-'.repeat(60) + '\n');

// Supabase Configuration
console.log(BRIGHT + '📊 Supabase Configuration:' + RESET);
console.log(`  URL: ${CYAN}${supabaseUrl || RED + 'NOT SET' + RESET}${RESET}`);
console.log(`  Anon Key: ${process.env.VITE_SUPABASE_ANON_KEY ? GREEN + 'SET ✓' : RED + 'MISSING ✗'}${RESET}`);

if (supabaseUrl) {
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    console.log(`  Project ID: ${BLUE}${projectId}${RESET}`);
}

console.log('\n' + '-'.repeat(60) + '\n');

// Backend Configuration
console.log(BRIGHT + '🖥️  Backend Configuration:' + RESET);
const backendUrl = process.env.VITE_BACKEND_URL;
console.log(`  URL: ${CYAN}${backendUrl || RED + 'NOT SET' + RESET}${RESET}`);

if (backendUrl) {
    if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
        console.log(`  Type: ${YELLOW}Local Development${RESET}`);
    } else if (backendUrl.includes('render.com')) {
        console.log(`  Type: ${GREEN}Production (Render)${RESET}`);
    }
}

console.log('\n' + '-'.repeat(60) + '\n');

// Test Connection
console.log(BRIGHT + '🔌 Connection Test:' + RESET);

if (supabaseUrl && process.env.VITE_SUPABASE_ANON_KEY) {
    const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

    supabase.from('drills').select('count', { count: 'exact', head: true })
        .then(({ count, error }) => {
            if (error) {
                console.log(`  Supabase: ${RED}FAILED ✗${RESET} (${error.message})`);
            } else {
                console.log(`  Supabase: ${GREEN}CONNECTED ✓${RESET} (${count} drills in database)`);
            }

            // Storage test
            return supabase.storage.from('raw_videos_v2').list('', { limit: 1 });
        })
        .then(({ data, error }) => {
            if (error) {
                console.log(`  Storage: ${RED}FAILED ✗${RESET} (${error.message})`);
            } else {
                console.log(`  Storage: ${GREEN}ACCESSIBLE ✓${RESET} (bucket exists)`);
            }

            console.log('\n' + '='.repeat(60));
            console.log(BRIGHT + '💡 TIP: ' + RESET + 'Always run this script before debugging!');
            console.log('='.repeat(60) + '\n');
        })
        .catch(err => {
            console.log(`  Error: ${RED}${err.message}${RESET}`);
            console.log('\n' + '='.repeat(60) + '\n');
        });
} else {
    console.log(`  ${RED}Cannot test - missing credentials${RESET}`);
    console.log('\n' + '='.repeat(60) + '\n');
}
