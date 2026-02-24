import { supabase } from './lib/supabase.js';

async function checkAndCreateCommentsTable() {
    try {
        console.log('Checking if training_log_comments table exists...');

        // Try to query the table
        const { data, error } = await supabase
            .from('training_log_comments')
            .select('id')
            .limit(1);

        if (error) {
            if (error.code === '42P01') {
                console.log('❌ Table does not exist. Please run the SQL script in Supabase SQL Editor:');
                console.log('File: create_comments_table.sql');
                console.log('\nOr run this SQL directly:\n');

                const fs = await import('fs');
                const sql = fs.readFileSync('./create_comments_table.sql', 'utf-8');
                console.log(sql);
            } else {
                console.error('Error checking table:', error);
            }
        } else {
            console.log('✅ Table exists and is accessible');
            console.log(`Current comment count: ${data?.length || 0}`);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

checkAndCreateCommentsTable();
