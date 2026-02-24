
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser(email) {
    console.log(`Checking user: ${email}`);

    // Get User ID from email (Admin/Service Role can do this from auth or users table)
    // We'll query public.users directly as we suspect the row exists there
    const { data: user, error } = await supabase
        .from('users')
        .select('id, email, is_admin, is_subscriber, is_complimentary_subscription, subscription_tier')
        .eq('email', email)
        .single();

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    if (!user) {
        console.error('User not found');
        return;
    }

    console.log('User Data from DB:', user);

    // Replicate AuthContext Logic
    const userData = user;
    const isSubscribed = !!(
        userData?.is_admin === true ||
        userData?.email === 'armbareum@gmail.com' ||
        userData?.is_admin === 1 ||
        userData?.is_subscriber === true ||
        userData?.is_subscriber === 1 ||
        userData?.is_complimentary_subscription === true
    );

    console.log('Calculated isSubscribed:', isSubscribed);

    if (isSubscribed) {
        console.log('RESULT: SUCCESS - User HAS ACCESS.');
    } else {
        console.log('RESULT: FAIL - User lacks access.');
    }
}


// Test with the reported failing user
checkUser('hyunu03@naver.com');
