
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);

async function seedLink() {
    console.log('--- Seeding Drill-Lesson Link ---');

    // 1. Get a drill
    const { data: drills, error: drillError } = await supabase.from('drills').select('id, title').limit(1);
    if (drillError) {
        console.error('Error fetching drills:', drillError);
        return;
    }
    if (!drills || drills.length === 0) {
        console.error('No drills found!');
        return;
    }
    const drill = drills[0];

    // 2. Get a lesson
    const { data: lessons } = await supabase.from('lessons').select('id, title').limit(1);
    if (!lessons || lessons.length === 0) {
        console.error('No lessons found!');
        return;
    }
    const lesson = lessons[0];

    console.log(`Linking Drill "${drill.title}" (${drill.id}) -> Lesson "${lesson.title}" (${lesson.id})`);

    // 3. Update Link
    const { error } = await supabase
        .from('drills')
        .update({ related_lesson_id: lesson.id })
        .eq('id', drill.id)
        .select();

    if (error) {
        console.error('Update failed:', error);
    } else {
        console.log('✅ Specific drill updated successfully.');
        // Verify immediately
        const { data: verify } = await supabase.from('drills').select('related_lesson_id').eq('id', drill.id).single();
        console.log('Verification Read:', verify);
    }
}

seedLink();
