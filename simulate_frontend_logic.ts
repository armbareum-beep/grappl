
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function simulateFrontendLogic() {
    console.log('--- Simulating Frontend Data Fetch & Mapping ---');

    // 1. Fetch Drills (simulating useDrillsFeed)
    const { data: routineDrills, error: drillError } = await supabase
        .from('routine_drills')
        .select(`
            drill:drills!inner (*),
            routines!inner (
                id,
                price,
                title
            )
        `)
        .limit(10); // Check a few

    if (drillError) {
        console.error('Error fetching drills:', drillError);
        return;
    }

    if (!routineDrills || routineDrills.length === 0) {
        console.log('No routine drills found.');
        return;
    }

    // Flatten logic
    const drillsWithRelated = routineDrills.map((rd: any) => ({
        ...rd.drill,
        routines: rd.routines
    }));

    console.log(`Fetched ${drillsWithRelated.length} drills.`);

    // 2. Fetch Related Lessons
    // STRICT UUID REGEX from my previous fix
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const lessonIds = drillsWithRelated
        .map((d: any) => d.related_lesson_id)
        .filter((id: any) => id && uuidRegex.test(id));

    console.log(`Found ${lessonIds.length} valid lesson IDs to fetch.`);

    let lessons: any[] = [];
    if (lessonIds.length > 0) {
        const { data, error: lessonError } = await supabase
            .from('lessons')
            .select('id, title, thumbnail_url, course_id')
            .in('id', lessonIds);

        if (lessonError) {
            console.error('Error fetching lessons:', lessonError);
        } else {
            lessons = data || [];
        }
    }

    // 3. Map Lessons to Drills
    const mappedDrills = drillsWithRelated.map((drill: any) => {
        const relatedLesson = lessons.find((l: any) => l.id === drill.related_lesson_id);

        // Construct the object exactly as the component expects
        const finalDrill = {
            ...drill,
            // Map snake_case to camelCase if needed? 
            // The codebase uses `drill.thumbnailUrl` (camel) but DB has `thumbnail_url`.
            // Let's check how `Drill` type is defined vs raw DB response.
            thumbnailUrl: drill.thumbnail_url,
            videoUrl: drill.video_url,
            vimeoUrl: drill.vimeo_url,
            descriptionVideoUrl: drill.description_video_url,

            relatedLesson: relatedLesson ? {
                id: relatedLesson.id,
                title: relatedLesson.title,
                thumbnailUrl: relatedLesson.thumbnail_url, // MAPPING CHECK
                courseId: relatedLesson.course_id
            } : undefined
        };
        return finalDrill;
    });

    // 4. Inspect the Result
    console.log('\n--- Final Object Inspection ---');
    const linkedDrill = mappedDrills.find((d: any) => d.relatedLesson);

    if (linkedDrill) {
        console.log('✅ Found drill with related lesson:');
        console.log('Drill Title:', linkedDrill.title);
        console.log('Related Lesson Object:', JSON.stringify(linkedDrill.relatedLesson, null, 2));

        // Validation against Component Logic
        if (!linkedDrill.relatedLesson.thumbnailUrl) {
            console.warn('⚠️ WARNING: relatedLesson.thumbnailUrl is MISSING or NULL. Component might render empty image or crash if not handled.');
        } else {
            console.log('Thumbnail URL:', linkedDrill.relatedLesson.thumbnailUrl);
        }
    } else {
        console.log('❌ No drills with related lessons found in this batch.');
    }
}

simulateFrontendLogic();
