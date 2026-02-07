
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in .env.local');
    console.log('VITE_SUPABASE_URL:', supabaseUrl);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyDrills() {
    console.log('--- Verifying Drill Fetching ---');

    // 1. Fetch drills with routines
    const { data: drills, error } = await supabase
        .from('drills')
        .select(`
      id,
      title,
      creator_id,
      category,
      created_at,
      routine_drills (
         routines (
           id,
           title,
           price
         )
      )
    `)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching drills:', error);
        return;
    }

    console.log(`Fetched ${drills.length} drills.`);

    drills.forEach((drill, index) => {
        // Check if routine_drills is array or object (Supabase weirdness sometimes)
        const rawRoutines = drill.routine_drills;
        const routines = Array.isArray(rawRoutines)
            ? rawRoutines.map(rd => rd.routines).flat().filter(Boolean)
            : [];

        const routineNames = routines.map(r => `${r.title} (${r.price})`).join(', ');
        const isOrphan = routines.length === 0;
        const hasFree = routines.some(r => r.price === 0);
        const onlyPaid = !isOrphan && !hasFree;

        let visibility = 'UNKNOWN';
        if (isOrphan) visibility = 'VISIBLE (Orphan) -> OK';
        else if (hasFree) visibility = 'VISIBLE (Free Routine) -> OK';
        else if (onlyPaid) visibility = 'HIDDEN (Paid Only) -> SHOULD HIDE';

        console.log(`[${index + 1}] ${drill.title}`);
        console.log(`    - ID: ${drill.id}`);
        console.log(`    - Routines: ${routineNames || 'None'}`);
        console.log(`    - Result: ${visibility}`);
    });
}

verifyDrills();
