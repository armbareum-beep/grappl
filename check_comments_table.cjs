const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tqhqbqbsxqpjbdcbwqkc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaHFicWJzeHFwamJkY2J3cWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2MzM5NTgsImV4cCI6MjA1MTIwOTk1OH0.bvLWOZGGcjqGQrKmwKVqQJvKZNsWWJWpZdXmBPwpBCw';

const supabase = createClient(supabaseUrl, supabaseKey);

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

                const fs = require('fs');
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
