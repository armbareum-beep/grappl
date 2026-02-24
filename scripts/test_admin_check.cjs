
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'ae056ab7-d52d-46ca-9ce8-14ce6d901f4a';

async function testAdminCheck() {
    console.log(`Checking admin status for user: ${userId}`);
    const [creatorRes, userRes] = await Promise.all([
        supabase.from('creators').select('is_admin').eq('id', userId).maybeSingle(),
        supabase.from('users').select('is_admin').eq('id', userId).maybeSingle()
    ]);

    console.log('Creator check result:', creatorRes.data);
    console.log('User check result:', userRes.data);

    const isAdmin = creatorRes.data?.is_admin === true || userRes.data?.is_admin === true;
    console.log('Final isAdmin:', isAdmin);
}

testAdminCheck();
