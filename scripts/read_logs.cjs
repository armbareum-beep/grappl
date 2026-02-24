const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use environment variables or hardcoded fallback (User should have .env)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchLogs() {
    console.log('Fetching recent system logs...');

    const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Failed to fetch logs. Did you run the SQL script?');
        console.error(error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No logs found yet.');
        return;
    }

    console.log('\n--- System Logs (Latest 20) ---');
    data.forEach(log => {
        const time = new Date(log.created_at).toLocaleTimeString();
        const levelIcon = log.level === 'error' ? '❌' : (log.level === 'warn' ? '⚠️' : 'ℹ️');
        console.log(`[${time}] ${levelIcon} [${log.level.toUpperCase()}] ${log.message}`);
        if (log.details && Object.keys(log.details).length > 0) {
            console.log('   Details:', JSON.stringify(log.details));
        }
        console.log('---------------------------------------------------');
    });
}

// Poll every 5 seconds
(async () => {
    console.log('Testing connection to system_logs table...');
    const { error } = await supabase.from('system_logs').insert({
        process_id: 'debug-client',
        level: 'info',
        message: 'Log Reader Connected (Verification Check)'
    });

    if (error) {
        console.error('❌ CONNECTION ERROR: Could not write to system_logs.');
        console.error('Reason:', error.message);
        console.error('👉 Tip: Did you run the "create_system_logs.sql" script in Supabase?');
        process.exit(1);
    } else {
        console.log('✅ Connection Successful! "system_logs" table exists.');
        console.log('Waiting for Server Logs... (If nothing appears, Server might still be deploying)');
        fetchLogs();
        setInterval(fetchLogs, 5000);
    }
})();
