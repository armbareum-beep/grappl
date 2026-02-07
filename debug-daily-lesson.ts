
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vbfxwlhngyvafskyukxa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZnh3bGhuZ3l2YWZza3l1a3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NzkxNjAsImV4cCI6MjA3OTQ1NTE2MH0.khnDGS4WLs_hWxfT7FRoUlJnxsjCX4_yY9qA88i4gug';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDailyFreeLesson() {
    try {
        console.log('--- STARTING getDailyFreeLesson ---');
        // 1. Try to get featured lesson for today
        const kstDate = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
        console.log(`Checking featured content for date: ${kstDate}`);

        const { data: featured, error: featuredError } = await supabase
            .from('daily_featured_content')
            .select('featured_id')
            .eq('date', kstDate)
            .eq('featured_type', 'lesson')
            .maybeSingle();

        if (featuredError) console.error('Error fetching featured content:', featuredError);
        console.log('Featured content result:', featured);

        let lessonId = featured?.featured_id;
        let selectedLesson = null;

        if (lessonId) {
            console.log(`Found featured lesson ID: ${lessonId}. Fetching details...`);
            const { data: lesson, error } = await supabase
                .from('lessons')
                .select('*, courses!inner(*)')
                .eq('id', lessonId)
                .maybeSingle();

            if (error) console.error('Error fetching featured lesson:', error);
            selectedLesson = lesson;
        } else {
            console.log('No featured lesson found or ID is null.');
        }

        // 2. Fallback to deterministic random if no featured or not found
        if (!selectedLesson) {
            console.log('Falling back to deterministic random selection...');
            const { data: lessons, error } = await supabase
                .from('lessons')
                .select('*, courses!inner(*)')
                .eq('courses.published', true)
                .neq('vimeo_url', '')
                .not('vimeo_url', 'like', 'ERROR%')
                .limit(50);

            if (error) {
                console.error('Error fetching fallback lessons:', error);
                throw error;
            }

            if (!lessons || lessons.length === 0) {
                console.log('Measurements: 0 lessons found for fallback.');
                return { data: null, error: null };
            }

            console.log(`Found ${lessons.length} potential lessons for fallback.`);

            const today = new Date();
            const kstParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(today);
            const year = parseInt(kstParts.find(p => p.type === 'year')!.value);
            const month = parseInt(kstParts.find(p => p.type === 'month')!.value);
            const day = parseInt(kstParts.find(p => p.type === 'day')!.value);
            const seed = year * 10000 + month * 100 + day;
            const x = Math.sin(seed + 789) * 10000;
            const index = Math.floor((x - Math.floor(x)) * lessons.length);
            console.log(`Date seed: ${seed}, Index: ${index}`);

            selectedLesson = lessons[index];
            console.log(`Selected lesson ID: ${selectedLesson.id}, Title: ${selectedLesson.title}`);
        }

        if (!selectedLesson) {
            console.log('Still no selected lesson.');
            return { data: null, error: null };
        }

        // 3. Fetch creator info
        let creatorName = 'Grapplay Team';
        let creatorProfileImage = undefined;
        const creatorId = selectedLesson.courses?.creator_id || selectedLesson.creator_id;
        console.log(`Fetching creator info for ID: ${creatorId}`);

        if (creatorId) {
            const { data: creatorData } = await supabase
                .from('creators')
                .select('name, profile_image')
                .eq('id', creatorId)
                .maybeSingle();

            if (creatorData) {
                creatorName = creatorData.name || creatorName;
                creatorProfileImage = creatorData.profile_image || undefined;
            } else {
                const { data: userData } = await supabase
                    .from('users')
                    .select('name, avatar_url')
                    .eq('id', creatorId)
                    .maybeSingle();

                if (userData) {
                    creatorName = userData.name || creatorName;
                    creatorProfileImage = userData.avatar_url || undefined;
                }
            }
        }

        console.log('Final Creator:', { creatorName, creatorProfileImage });

        return {
            data: {
                ...selectedLesson,
                creatorName,
                creatorProfileImage
            },
            error: null
        };
    } catch (error) {
        console.error('Exception in getDailyFreeLesson:', error);
        return { data: null, error };
    }
}

getDailyFreeLesson().then(res => {
    console.log('\n--- FINAL RESULT ---');
    console.log(JSON.stringify(res, null, 2));
});
