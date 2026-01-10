
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
    const { error } = await supabase
        .from('routines')
        .select('related_items')
        .limit(1);

    if (error) {
        console.log('❌ related_items column is MISSING:', error.message);
    } else {
        console.log('✅ related_items column EXISTS');
    }

    const { error: error2 } = await supabase
        .from('routines')
        .select('uniform_type')
        .limit(1);

    if (error2) {
        console.log('❌ uniform_type column is MISSING:', error2.message);
    } else {
        console.log('✅ uniform_type column EXISTS');
    }
    const { error: error3 } = await supabase
        .from('routines')
        .select('total_duration_minutes')
        .limit(1);

    if (error3) {
        console.log('❌ total_duration_minutes column is MISSING:', error3.message);
    } else {
        console.log('✅ total_duration_minutes column EXISTS');
    }
}

checkColumn();
