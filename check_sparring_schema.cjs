
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase Config');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- Checking Sparring Videos Table ---');
    const { data, error } = await supabase
        .from('sparring_videos')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching sparring_videos:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Columns in sparring_videos:', Object.keys(data[0]));
        } else {
            console.log('No data found, but table exists.');
            // Try to get definition from error or just trust it exists.
        }
    }
}

checkSchema();
