const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
const envConfig = dotenv.config({ path: envPath });

console.log('='.repeat(50));
console.log('🛠️  DEV ENVIRONMENT CHECKER - DEEP DIVE');
console.log('='.repeat(50));

if (envConfig.error) {
    console.error('❌ Could not load .env.local file');
    process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Frontend now expects 3003
const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3003';

console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey ? 'Loaded (Hidden)' : 'MISSING ❌'}`);
console.log(`Backend URL (Frontend expectation): ${backendUrl}`);

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
    try {
        const { count, error } = await supabase.from(tableName).select('count', { count: 'exact', head: true });
        if (error) {
            console.error(`❌ Check '${tableName}': FAILED - ${error.message} (${error.code})`);
            return false;
        } else {
            console.log(`✅ Check '${tableName}': OK (Count: ${count})`);
            return true;
        }
    } catch (err) {
        console.error(`❌ Check '${tableName}': EXCEPTION - ${err.message}`);
        return false;
    }
}

async function runChecks() {
    console.log('\nChecking Critical Tables...');
    await checkTable('users');
    await checkTable('creators');
    await checkTable('drills');
    await checkTable('courses');
    await checkTable('lessons');
    await checkTable('routines');
    await checkTable('sparring_videos');
    await checkTable('training_logs');
    await checkTable('user_progress');

    // QUEST TABLES
    await checkTable('daily_quests');
    await checkTable('user_quests');
    await checkTable('quests'); // Check generic name too

    console.log('\nChecking Backend Connectivity (Optional)...');
    try {
        console.log(`ℹ️  Ensure your local backend (server.js) is running on port 3003.`);
    } catch (e) { }

}

runChecks();
