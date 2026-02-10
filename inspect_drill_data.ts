
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDrillData() {
    console.log('--- Inspecting Drill Data & Related Lessons ---');

    // 1. Fetch All Drills
    const { data: drills, error } = await supabase
        .from('drills')
        .select('id, title, related_lesson_id');

    if (error) {
        console.error('Error fetching drills:', error);
        return;
    }

    console.log(`Found ${drills?.length || 0} drills with related_lesson_id.`);

    if (!drills || drills.length === 0) return;

    // 2. Collect all related_lesson_ids
    const lessonIds = drills.map(d => d.related_lesson_id).filter(id => id);
    const uniqueLessonIds = [...new Set(lessonIds)];

    console.log(`Unique Lesson IDs to check: ${uniqueLessonIds.length}`);

    // 3. Fetch Lessons
    const { data: lessons, error: lessonError } = await supabase
        .from('lessons')
        .select('id, title, thumbnail_url, course_id')
        .in('id', uniqueLessonIds);

    if (lessonError) {
        console.error('Error fetching lessons:', lessonError);
        return;
    }

    const lessonMap = new Map(lessons?.map(l => [l.id, l]));

    // 4. Verify Integrity
    let missingCount = 0;
    let malformedCount = 0;

    console.log('\n--- Integrity Check ---');

    for (const drill of drills) {
        const lessonId = drill.related_lesson_id;
        const lesson = lessonMap.get(lessonId);

        if (!lesson) {
            console.warn(`[MISSING] Drill "${drill.title}" (${drill.id}) points to missing lesson ID: ${lessonId}`);
            missingCount++;
        } else {
            // Check if essential fields are present
            if (!lesson.title) {
                console.warn(`[MALFORMED] Lesson found for "${drill.title}" but TITLE is missing. ID: ${lessonId}`);
                malformedCount++;
            }
            if (!lesson.thumbnail_url) {
                console.warn(`[NO THUMBNAIL] Lesson found for "${drill.title}" but THUMBNAIL_URL is missing/null. ID: ${lessonId}`);
            }
        }
    }

    console.log('\n--- Summary ---');
    console.log(`Total Drills Checked: ${drills.length}`);
    console.log(`Missing Lessons: ${missingCount}`);
    console.log(`Malformed Lessons: ${malformedCount}`);

    if (drills.length > 0 && missingCount === 0 && malformedCount === 0) {
        console.log('✅ Data integrity looks good. No broken links found.');
    }
}

inspectDrillData();
