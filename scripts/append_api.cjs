const fs = require('fs');
const path = require('path');

const apiPath = 'c:/Users/armba/Documents/grapplay/grapplay-vercel/lib/api.ts';
const contentToAppend = `
/**
 * Get recent activity (continue watching)
 * Aggregates from video_watch_logs
 */
export async function getRecentActivity(userId: string) {
    try {
        const { data, error } = await supabase
            .from('video_watch_logs')
            .select(\`
                *,
                lesson:lessons!lesson_id (
                    id, title, thumbnail_url, lesson_number, duration_minutes,
                    course:courses!course_id (
                        id, title, category,
                        creator:creators!creator_id ( name, profile_image )
                    )
                ),
                drill:drills!drill_id (
                    id, title, thumbnail_url, duration_minutes, difficulty, category,
                    creator:creators!creator_id ( name, profile_image )
                ),
                video:sparring_videos!video_id (
                    id, title, thumbnail_url, duration_minutes, category,
                    creator:users!creator_id ( name, avatar_url )
                )
            \`)
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Error fetching recent activity:', error);
            // Fallback to empty array to prevent crash
            return [];
        }

        return (data || []).map((log: any) => {
            if (log.lesson) {
                return {
                    id: log.lesson.id,
                    type: 'lesson',
                    courseId: log.lesson.course?.id,
                    title: log.lesson.title,
                    courseTitle: log.lesson.course?.title,
                    thumbnail: log.lesson.thumbnail_url,
                    progress: 0, // Calculate % based on watched_seconds / duration
                    creatorName: log.lesson.course?.creator?.name || 'Grapplay Team',
                    creatorProfileImage: log.lesson.course?.creator?.profile_image,
                    watchedSeconds: log.watch_seconds,
                    lastWatched: log.updated_at,
                    lessonNumber: log.lesson.lesson_number,
                    durationMinutes: log.lesson.duration_minutes
                };
            } else if (log.drill) {
                return {
                    id: log.drill.id,
                    type: 'drill',
                    title: log.drill.title,
                    thumbnail: log.drill.thumbnail_url,
                    progress: 0,
                    creatorName: log.drill.creator?.name || 'Grapplay Team',
                    creatorProfileImage: log.drill.creator?.profile_image,
                    watchedSeconds: log.watch_seconds,
                    lastWatched: log.updated_at,
                    durationMinutes: log.drill.duration_minutes
                };
            } else if (log.video) {
                return {
                    id: log.video.id,
                    type: 'sparring',
                    title: log.video.title,
                    thumbnail: log.video.thumbnail_url,
                    progress: 0,
                    creatorName: log.video.creator?.name || 'Unknown',
                    creatorProfileImage: log.video.creator?.avatar_url,
                    watchedSeconds: log.watch_seconds,
                    lastWatched: log.updated_at,
                    durationMinutes: log.video.duration_minutes
                };
            }
            return null;
        }).filter(Boolean);
    } catch (error) {
        console.error('Exception in getRecentActivity:', error);
        return [];
    }
}
`;

fs.appendFileSync(apiPath, contentToAppend);
console.log('Successfully appended getRecentActivity to api.ts');
