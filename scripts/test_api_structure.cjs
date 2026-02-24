
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log('Fetching routines with joined creators...');
    const { data, error } = await supabase
        .from('routines')
        .select(`
            *,
            creators (
                id,
                name,
                profile_image
            )
        `)
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Result structure:');
    console.log(JSON.stringify(data?.[0], null, 2));

    if (data?.[0] && data[0].creators) {
        console.log('creators type:', Array.isArray(data[0].creators) ? 'array' : typeof data[0].creators);
    }
}

testFetch();
