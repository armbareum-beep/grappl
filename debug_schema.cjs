
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Testing access to feedback_requests...');

    // Test ID
    const { data: idData, error: idError } = await supabase.from('feedback_requests').select('id').limit(1);
    if (idError) {
        console.log('Error selecting ID:', idError.message);
    } else {
        console.log('ID column exists. Table access OK.');
    }

    // Test Price
    const { data: priceData, error: priceError } = await supabase.from('feedback_requests').select('price').limit(1);
    if (priceError) {
        console.log('Prior column check: "price" access error:', priceError.message);
    } else {
        console.log('Price column exists!');
    }
}

checkSchema();
