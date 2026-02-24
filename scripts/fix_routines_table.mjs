
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixTable() {
    console.log('Attempting to add columns to routines table...');

    // Check if the columns exist first
    const { data: cols, error: checkError } = await supabase.rpc('get_table_columns', { table_name: 'routines' }).catch(e => ({ error: e }));

    // Since we don't have rpc 'get_table_columns' usually, we'll just try to add them
    // and handle the error if they already exist (though ADD COLUMN IF NOT EXISTS works in SQL)

    const sql = `
        ALTER TABLE routines ADD COLUMN IF NOT EXISTS related_items JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE routines ADD COLUMN IF NOT EXISTS uniform_type TEXT;
    `;

    // We can't run raw SQL via supabase-js unless we have an RPC function.
    // Let's check if there's any 'exec_sql' RPC we can use.
    // Usually, projecs have one if they've been doing migrations.

    const { error: sqlError } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (sqlError) {
        console.error('Error running SQL via RPC:', sqlError);
        console.log('Falling back to direct instruction...');
        console.log('Please run the following SQL in your Supabase SQL Editor:');
        console.log(sql);
    } else {
        console.log('Successfully updated routines table!');
    }
}

fixTable();
