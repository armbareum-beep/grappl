
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Target Project URL:', supabaseUrl);
console.log('Has Service Key:', !!serviceKey);
console.log('Using Key:', serviceKey ? 'Service Key (Admin)' : 'Anon Key (Public)');

const supabaseKey = serviceKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBucket() {
    console.log('Checking bucket configuration...');

    const { data, error } = await supabase
        .from('buckets')
        .select('*')
        .eq('id', 'raw_videos')
        .single();

    // Note: storage.buckets is not directly queryable via standard client unless we switch schema or use rpc?
    // Actually, the JS client usually queries the 'public' schema or uses the storage api.
    // The storage API 'getBucket' might work.

    const { data: buckets, error: bucketsError } = await supabase
        .storage
        .listBuckets();

    if (bucketsError) {
        console.error('Error fetching buckets:', bucketsError);
    } else {
        console.log('All Buckets:', buckets);
    }
}

checkBucket();
