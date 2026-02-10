
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function debugFeedFetch() {
    console.log('--- Debugging useDrillsFeed Logic ---');

    try {
        // 1. Fetch Routine Drills (simulating the first part of the hook)
        console.log('Fetching routine_drills...');
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
            .limit(200);

        if (drillError) {
            console.error('Error fetching routine drills:', drillError);
            return;
        }

        console.log(`Fetched ${routineDrills?.length || 0} routine drills.`);

        // 2. Simulate Related Lesson Fetch Logic (EXACT COPY from hook)
        let relatedLessonsMap: Record<string, any> = {};
        const drillIds = routineDrills?.map((rd: any) => rd.drill.id) || [];

        if (drillIds.length > 0) {
            console.log('Fetching drillsWithRelated...');
            const { data: drillsWithRelated, error: relatedError } = await supabase
                .from('drills')
                .select('id, related_lesson_id')
                .in('id', drillIds)
                .not('related_lesson_id', 'is', null);

            if (relatedError) {
                console.error('Error fetching drillsWithRelated:', relatedError);
            } else {
                console.log(`Fetched ${drillsWithRelated?.length || 0} drills with non-null related_lesson_id.`);

                if (drillsWithRelated && drillsWithRelated.length > 0) {
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

                    // LOGGING THE IDS BEFORE FILTER
                    console.log('Raw related_lesson_ids:', drillsWithRelated.map((d: any) => d.related_lesson_id));

                    const lessonIds = drillsWithRelated
                        .map((d: any) => d.related_lesson_id)
                        .filter((id: any) => {
                            const valid = id && uuidRegex.test(id);
                            if (!valid) console.warn(`Invalid UUID filtered out: ${id}`);
                            return valid;
                        });

                    console.log(`Valid Lesson IDs to fetch: ${lessonIds.length}`);

                    if (lessonIds.length > 0) {
                        const { data: lessons, error: lessonError } = await supabase
                            .from('lessons')
                            .select('id, title, thumbnail_url, course_id')
                            .in('id', lessonIds);

                        if (lessonError) {
                            console.error('Error fetching lessons:', lessonError);
                        } else {
                            console.log(`Fetched ${lessons?.length || 0} lessons.`);
                        }
                    }
                }
            }
        }

    } catch (e) {
        console.error('CRASHED:', e);
    }
}

debugFeedFetch();
