
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const matches = line.match(/^\s*([^#\s][^=]*)\s*=\s*(.*)$/);
            if (matches) {
                const key = matches[1].trim();
                const value = matches[2].trim().replace(/^['"]|['"]$/g, '');
                process.env[key] = value;
            }
        });
    }
} catch (e) { }

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const tables = ['courses', 'lessons', 'drills', 'routines', 'sparring_videos'];

    for (const table of tables) {
        console.log(`--- Checking ${table} Table ---`);
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);

        if (error) {
            console.error(`Error fetching ${table}:`, error);
        } else {
            if (data && data.length > 0) {
                console.log(`Columns in ${table}:`, Object.keys(data[0]));
            } else {
                console.log(`${table} has no data, but table exists.`);
                // If no data, we can try to get column names from information_schema if we have access,
                // but usually, we have dummy data in dev.
            }
        }
    }
}

checkSchema();
