import { supabase } from './supabase';
import { withTimeout } from './api';
import { 
    calculateDailyIndex, 
    DAILY_QUERY_LIMITS, 
    DAILY_SEEDS,
    getKSTDateString
} from './daily-utils';
import { transformDrill, transformSparringVideo } from './api';
import { transformLesson } from './api-lessons';

const API_TIMEOUT = 10000;

/**
 * Common logic to fetch daily content candidates and select one
 */
async function getDailyContent(type: 'drill' | 'lesson' | 'sparring') {
    const kstDate = getKSTDateString();
    
    // 1. Try to get featured content
    // NOTE: DB uses 'course' for lessons in featured_type
    const dbType = type === 'lesson' ? 'course' : type;
    
    const { data: featured } = await withTimeout(
        supabase
            .from('daily_featured_content')
            .select('featured_id')
            .eq('date', kstDate)
            .eq('featured_type', dbType)
            .maybeSingle(),
        3000
    );

    if (featured?.featured_id) {
        console.log(`[api-daily] Found featured ${type} (DB type: ${dbType}) for ${kstDate}: ${featured.featured_id}`);
        let result;
        if (type === 'drill') {
            result = await withTimeout(
                supabase.from('drills').select('*').eq('id', featured.featured_id).maybeSingle(),
                3000
            );
        } else if (type === 'lesson') {
            result = await withTimeout(
                supabase.from('lessons').select('*, courses!inner(id, title, creator_id, published, price)').eq('id', featured.featured_id).maybeSingle(),
                3000
            );
        } else {
            result = await withTimeout(
                supabase.from('sparring_videos').select('*').eq('id', featured.featured_id).maybeSingle(),
                3000
            );
        }
        
        if (result?.data) return result.data;
    }

    // 2. Fallback to deterministic random selection
    let candidatesData;
    if (type === 'drill') {
        const { data } = await withTimeout(
            supabase
                .from('routine_drills')
                .select('drills!inner(*), routines!inner(price, status)')
                .eq('routines.status', 'approved')
                .gt('routines.price', 0)
                .neq('drills.vimeo_url', '')
                .not('drills.vimeo_url', 'like', 'ERROR%')
                .order('drill_id') // Ensure stable order
                .limit(DAILY_QUERY_LIMITS.DRILLS),
            API_TIMEOUT
        );
        
        const uniqueDrillsMap = new Map();
        (data || []).forEach((rd: any) => {
            if (rd.drills && !uniqueDrillsMap.has(rd.drills.id)) {
                uniqueDrillsMap.set(rd.drills.id, rd.drills);
            }
        });
        candidatesData = Array.from(uniqueDrillsMap.values());
        console.log(`[api-daily] Drill candidates count: ${candidatesData.length}`);
    } else if (type === 'lesson') {
        const { data } = await withTimeout(
            supabase
                .from('lessons')
                .select('*, courses!inner(id, title, creator_id, published, price)')
                .not('course_id', 'is', null)
                .eq('courses.published', true)
                .gt('courses.price', 0)
                .neq('vimeo_url', '')
                .not('vimeo_url', 'like', 'ERROR%')
                .order('id')
                .limit(DAILY_QUERY_LIMITS.LESSONS),
            API_TIMEOUT
        );
        candidatesData = data || [];
        console.log(`[api-daily] Lesson candidates count: ${candidatesData.length}`);
    } else {
        const { data } = await withTimeout(
            supabase
                .from('sparring_videos')
                .select('*')
                .eq('is_published', true)
                .is('deleted_at', null)
                .gt('price', 0)
                .neq('video_url', '')
                .not('video_url', 'like', 'ERROR%')
                .order('id')
                .limit(DAILY_QUERY_LIMITS.SPARRING),
            API_TIMEOUT
        );
        candidatesData = data || [];
        console.log(`[api-daily] Sparring candidates count: ${candidatesData.length}`);
    }

    if (!candidatesData || candidatesData.length === 0) return null;

    const seed = type === 'drill' ? DAILY_SEEDS.DRILL : (type === 'lesson' ? DAILY_SEEDS.LESSON : DAILY_SEEDS.SPARRING);
    const index = calculateDailyIndex(candidatesData.length, seed);
    return candidatesData[index];
}

export async function fetchDailyDrill() {
    return getDailyContent('drill');
}

export async function fetchDailyLesson() {
    return getDailyContent('lesson');
}

export async function fetchDailySparring() {
    return getDailyContent('sparring');
}

/**
 * Unified transformation for Daily Content
 */
export function transformToDailyDrill(drill: any, creator: any) {
    const transformed = transformDrill(drill);
    return {
        ...transformed,
        creatorName: creator?.name || 'Grapplay Team',
        creatorProfileImage: creator?.profileImage || creator?.avatar_url
    };
}

export function transformToDailyLesson(lesson: any, creator: any) {
    const transformed = transformLesson({
        ...lesson,
        course: lesson.courses
    });
    return {
        ...transformed,
        courseTitle: lesson.courses?.title,
        creatorName: creator?.name || 'Grapplay Team',
        creatorProfileImage: creator?.profileImage || creator?.avatar_url,
        creator: creator ? {
            id: creator.id,
            name: creator.name || '알 수 없음',
            profileImage: creator.profileImage || creator.avatar_url || '',
            bio: '',
            subscriberCount: 0
        } : undefined
    };
}

export function transformToDailySparring(sparring: any, creator: any) {
    const transformed = transformSparringVideo(sparring);
    return {
        ...transformed,
        previewVimeoId: sparring.preview_vimeo_id,
        creator: creator ? {
            id: creator.id,
            name: creator.name || '알 수 없음',
            profileImage: creator.profileImage || creator.avatar_url || '',
            bio: '',
            subscriberCount: 0
        } : undefined
    };
}
