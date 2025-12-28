
import { supabase } from './lib/supabase';

async function check() {
    console.log('--- Checking Database Tables ---');

    const tables = ['training_log_likes', 'post_comments', 'training_logs'];

    for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error) {
            console.log(`❌ Table '${table}': ${error.message} (${error.code})`);
        } else {
            console.log(`✅ Table '${table}': Exists`);
        }
    }

    process.exit(0);
}

check();
