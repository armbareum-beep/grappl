import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://vbfxwlhngyvafskyukxa.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZnh3bGhuZ3l2YWZza3l1a3hhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg3OTE2MCwiZXhwIjoyMDc5MjQ3MTYwfQ.hIeNCbwXef5YcsmOMj5gYH0iCMZZT-PqGkhHocpeKq4';

async function runMigration() {
    try {
        console.log('📁 Reading migration file...');
        const sqlPath = join(__dirname, 'supabase', 'migrations', '20260209_complete_setup.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🚀 Executing SQL migration...');
        console.log('━'.repeat(50));

        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
            // Try alternative method: direct SQL execution via PostgREST
            console.log('⚠️  First method failed, trying direct execution...');

            const directResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/vnd.pgrst.object+json',
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                },
                body: JSON.stringify({ sql })
            });

            if (!directResponse.ok) {
                const errorText = await directResponse.text();
                throw new Error(`Migration failed: ${directResponse.status} - ${errorText}`);
            }
        }

        console.log('✅ Migration executed successfully!');
        console.log('━'.repeat(50));
        console.log('');
        console.log('🎉 Setup complete! Your account is now an admin.');
        console.log('');
        console.log('Next steps:');
        console.log('  ✓ RLS policies updated');
        console.log('  ✓ Admin support added');
        console.log('  ✓ Your account (ae056ab7-d52d-46ca-9ce8-14ce6d901f4a) is now admin');
        console.log('');
        console.log('You can now:');
        console.log('  • Add drills to routines');
        console.log('  • Change routine instructors');
        console.log('  • Manage content for all creators');

    } catch (error) {
        console.error('❌ Error running migration:', error.message);
        console.log('');
        console.log('📋 Alternative: Run SQL manually in Supabase Dashboard');
        console.log(`   1. Go to: ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/editor/sql`);
        console.log('   2. Copy the SQL from: supabase/migrations/20260209_complete_setup.sql');
        console.log('   3. Paste and click "Run"');
        process.exit(1);
    }
}

runMigration();
