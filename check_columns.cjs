const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
} catch (e) { }

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('user_skill_trees')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching user_skill_trees:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Columns in user_skill_trees:', Object.keys(data[0]));
        } else {
            console.log('No data found, but table exists.');
            // Try to fetch column names from postgrest if possible, but simpler is just checking for error.
        }
    }
}

checkSchema();
