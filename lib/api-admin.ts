import { supabase } from './supabase';
import { withTimeout } from './api';
import { createNotification, createBulkNotifications } from './api-notifications';
export { createNotification, createBulkNotifications };
export * from './api-admin-logs';
import { AuditLog, SiteSettings, ActivityItem } from '../types';



export interface AdminStats {
    totalUsers: number;
    totalDrills: number;
    pendingCreators: number;
    totalCreators: number;
    totalCourses: number;
    totalSparring: number;
    totalRoutines: number;
    totalSubscribers: number;
}

export const getAdminStats = async (): Promise<AdminStats> => {
    try {
        const [rpcResult, routinesResult, subscribersResult] = await Promise.all([
            supabase.rpc('get_admin_dashboard_stats'),
            supabase.from('routines').select('id', { count: 'exact', head: true }),
            // 유료 구독자만: is_complimentary_subscription이 false이거나 null인 구독자
            supabase.from('users').select('id', { count: 'exact', head: true })
                .eq('is_subscriber', true)
                .or('is_complimentary_subscription.is.null,is_complimentary_subscription.eq.false')
        ]);

        if (rpcResult.error) {
            console.error('Error fetching admin stats:', rpcResult.error);
            throw rpcResult.error;
        }

        const baseStats = rpcResult.data;
        return {
            ...baseStats,
            totalRoutines: routinesResult.count || 0,
            totalSubscribers: subscribersResult.count || 0
        } as AdminStats;
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return { totalUsers: 0, totalDrills: 0, pendingCreators: 0, totalCreators: 0, totalCourses: 0, totalSparring: 0, totalRoutines: 0, totalSubscribers: 0 };
    }
};

// ==================== Content Approval ====================

export interface PendingContent {
    id: string;
    type: 'course' | 'drill' | 'sparring' | 'routine';
    title: string;
    creatorName: string;
    createdAt: string;
    thumbnailUrl?: string;
}

export async function getPendingContent(): Promise<PendingContent[]> {
    // Note: drills, sparring_videos, routines don't have FK relationship to creators, so we fetch creator_id and look up names separately
    const [courses, drills, sparring, routines] = await Promise.all([
        withTimeout(supabase.from('courses').select('id, title, creator:creators(name), created_at, thumbnail_url').eq('status', 'pending')),
        withTimeout(supabase.from('drills').select('id, title, creator_id, created_at, thumbnail_url').eq('status', 'pending')),
        withTimeout(supabase.from('sparring_videos').select('id, title, creator_id, created_at, thumbnail_url').eq('status', 'pending')),
        withTimeout(supabase.from('routines').select('id, title, creator_id, created_at, thumbnail_url').eq('status', 'pending'))
    ]);

    // Collect all creator_ids that need lookup
    const creatorIds = new Set<string>();
    drills.data?.forEach(d => d.creator_id && creatorIds.add(d.creator_id));
    sparring.data?.forEach(s => s.creator_id && creatorIds.add(s.creator_id));
    routines.data?.forEach(r => r.creator_id && creatorIds.add(r.creator_id));

    // Fetch creator names
    const creatorMap = new Map<string, string>();
    if (creatorIds.size > 0) {
        const { data: creators } = await supabase
            .from('creators')
            .select('id, name')
            .in('id', Array.from(creatorIds));
        creators?.forEach(c => creatorMap.set(c.id, c.name));
    }

    const results: PendingContent[] = [];

    courses.data?.forEach(c => results.push({ id: c.id, type: 'course', title: c.title, creatorName: (c.creator as any)?.name, createdAt: c.created_at, thumbnailUrl: c.thumbnail_url }));
    drills.data?.forEach(d => results.push({ id: d.id, type: 'drill', title: d.title, creatorName: creatorMap.get(d.creator_id) || 'Unknown', createdAt: d.created_at, thumbnailUrl: d.thumbnail_url }));
    sparring.data?.forEach(s => results.push({ id: s.id, type: 'sparring', title: s.title, creatorName: creatorMap.get(s.creator_id) || 'Unknown', createdAt: s.created_at, thumbnailUrl: s.thumbnail_url }));
    routines.data?.forEach(r => results.push({ id: r.id, type: 'routine', title: r.title, creatorName: creatorMap.get(r.creator_id) || 'Unknown', createdAt: r.created_at, thumbnailUrl: r.thumbnail_url }));

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateContentStatus(type: 'course' | 'drill' | 'sparring' | 'routine', id: string, status: 'approved' | 'rejected') {
    const tableMap = {
        'course': 'courses',
        'drill': 'drills',
        'sparring': 'sparring_videos',
        'routine': 'routines'
    };
    const { error } = await supabase
        .from(tableMap[type])
        .update({ status })
        .eq('id', id);
    return { error };
}

export interface SettlementStats {
    creator_id: string;
    creator_name: string;
    creator_email: string;
    settlement_month: string;
    total_sales_count: number;
    total_revenue: number;
    settlement_amount: number;
    platform_fee: number;
    payout_settings: any;
}

export const getAdminSettlements = async (): Promise<SettlementStats[]> => {
    // Attempt to fetch from the view 'creator_monthly_settlements'
    // Note: This relies on the SQL migration being applied.
    const { data, error } = await withTimeout(supabase
        .from('creator_monthly_settlements')
        .select('*')
        .order('total_revenue', { ascending: false }));

    if (error) {
        console.error('Error fetching settlements:', error);
        return [];
    }

    return data || [];
};


// ==================== Content Management ====================

export async function deleteDrill(drillId: string) {
    try {
        // Use backend API to delete drill and associated Mux videos
        const res = await fetch('/api/delete-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentType: 'drill', contentId: drillId })
        });

        if (!res.ok) {
            const data = await res.json();
            return { error: new Error(data.error || 'Failed to delete drill') };
        }

        return { error: null };
    } catch (err: any) {
        console.error('Delete drill error:', err);
        return { error: err };
    }
}

export async function getRoutines() {
    // First, get all routines
    const { data: routines, error } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching routines:', error);
        return [];
    }

    if (!routines || routines.length === 0) {
        return [];
    }

    // Get unique creator IDs
    const creatorIds = [...new Set(routines.map((r: any) => r.creator_id).filter(Boolean))];

    // Fetch creators info
    let creatorsMap: Record<string, { name: string, profile_image?: string }> = {};

    if (creatorIds.length > 0) {
        const { data: creators } = await supabase
            .from('creators')
            .select('id, name, profile_image')
            .in('id', creatorIds);

        if (creators) {
            creatorsMap = creators.reduce((acc: any, creator: any) => {
                acc[creator.id] = {
                    name: creator.name,
                    profile_image: creator.profile_image
                };
                return acc;
            }, {});
        }
    }

    // Combine data
    const enrichedRoutines = routines.map((routine: any) => {
        const creator = creatorsMap[routine.creator_id];
        return {
            ...routine,
            creatorName: creator?.name || 'Unknown',
            creatorProfileImage: creator?.profile_image
        };
    });

    return enrichedRoutines;
}

export async function deleteRoutine(routineId: string) {
    const { error } = await supabase
        .from('routines')
        .delete()
        .eq('id', routineId);
    return { error };
}

// ==================== Lesson & Sparring Management ====================

export async function getLessonsAdmin() {
    const { data, error } = await supabase
        .from('lessons')
        .select(`
            *,
            course:courses(
                title,
                creator:creators(name)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching lessons:', error);
        return [];
    }

    // Lessons table doesn't have FK to creators, so lookup separately
    const creatorIds = new Set<string>();
    data?.forEach(lesson => lesson.creator_id && creatorIds.add(lesson.creator_id));

    const creatorMap = new Map<string, string>();
    if (creatorIds.size > 0) {
        const { data: creators } = await supabase
            .from('creators')
            .select('id, name')
            .in('id', Array.from(creatorIds));
        creators?.forEach(c => creatorMap.set(c.id, c.name));
    }

    // Enrich lessons with creator name
    return (data || []).map(lesson => ({
        ...lesson,
        creator: lesson.creator_id ? { name: creatorMap.get(lesson.creator_id) } : null
    }));
}

export async function deleteLessonAdmin(lessonId: string) {
    const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);
    return { error };
}

export async function updateLessonAdmin(lessonId: string, updates: any) {
    const { error } = await supabase
        .from('lessons')
        .update(updates)
        .eq('id', lessonId);
    return { error };
}

export async function getSparringVideosAdmin(): Promise<any[]> {
    // Admin API: fetch ALL sparring videos regardless of is_published status
    const { data, error } = await supabase
        .from('sparring_videos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        if (error.code === '42P01') return [];
        console.error('Error fetching sparring videos:', error);
        return [];
    }

    // Fetch creator info separately
    const creatorIds = [...new Set((data || []).map(v => v.creator_id).filter(Boolean))];
    const { data: creators } = creatorIds.length > 0
        ? await supabase.from('creators').select('id, name, profile_image').in('id', creatorIds)
        : { data: [] };

    const creatorMap = new Map((creators || []).map(c => [c.id, c]));

    // Transform to frontend-friendly camelCase
    return (data || []).map(row => {
        const creator = creatorMap.get(row.creator_id);
        return {
            ...row,
            creatorId: row.creator_id,
            videoUrl: row.video_url,
            thumbnailUrl: row.thumbnail_url,
            uniformType: row.uniform_type,
            isPublished: row.is_published,
            previewVimeoId: row.preview_vimeo_id,
            createdAt: row.created_at,
            price: typeof row.price === 'string' ? parseInt(row.price) : (row.price || 0),
            creator: creator ? {
                id: creator.id,
                name: creator.name,
                profileImage: creator.profile_image
            } : null
        };
    });
}

export async function deleteSparringVideoAdmin(videoId: string) {
    try {
        // Use backend API to delete sparring video and associated Vimeo/Mux videos
        const res = await fetch('/api/delete-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentType: 'sparring', contentId: videoId })
        });

        if (!res.ok) {
            const data = await res.json();
            return { error: new Error(data.error || 'Failed to delete sparring video') };
        }

        return { error: null };
    } catch (err: any) {
        console.error('Delete sparring video error:', err);
        return { error: err };
    }
}

// ==================== Report Management ====================

export async function getReports() {
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01') return [];
        console.error('Error fetching reports:', error);
        return [];
    }
    return data || [];
}

export async function updateReportStatus(reportId: string, status: 'resolved' | 'dismissed') {
    const { error } = await supabase
        .from('reports')
        .update({ status, resolved_at: new Date().toISOString() })
        .eq('id', reportId);
    return { error };
}

// ==================== Tournament Management ====================

export async function getTournaments() {
    const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true });

    if (error) {
        if (error.code === '42P01') return [];
        console.error('Error fetching tournaments:', error);
        return [];
    }
    return data || [];
}

export async function deleteTournament(tournamentId: string) {
    const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);
    return { error };
}

// ==================== Support System ====================

export async function getSupportTickets() {
    const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        if (error.code === '42P01') return []; // Table doesn't exist yet
        console.error('Error fetching tickets:', error);
        return [];
    }

    const tickets = data || [];
    if (tickets.length === 0) return [];

    // Extract unique user IDs
    const userIds = Array.from(new Set(tickets.map((t: any) => t.user_id).filter(Boolean)));

    // Fetch user details
    let userMap: Record<string, any> = {};
    if (userIds.length > 0) {
        const { data: users } = await supabase
            .from('users')
            .select('id, name, email, avatar_url')
            .in('id', userIds);

        if (users) {
            users.forEach((u: any) => {
                userMap[u.id] = u;
            });
        }
    }

    return tickets.map((ticket: any) => {
        const user = ticket.user_id ? userMap[ticket.user_id] : null;
        return {
            ...ticket,
            name: ticket.user_name || user?.name || 'Unknown',
            email: ticket.user_email || user?.email || '',
            avatarUrl: user?.avatar_url
        };
    });
}

export async function respondToTicket(ticketId: string, response: string, status: 'resolved' | 'in_progress') {
    const { error } = await supabase
        .from('support_tickets')
        .update({
            admin_response: response,
            status: status,
            responded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);
    return { error };
}

export async function deleteCreator(creatorId: string) {
    try {
        // 1. Delete courses (and related lessons)
        const { data: courses } = await supabase.from('courses').select('id').eq('creator_id', creatorId);
        if (courses && courses.length > 0) {
            const courseIds = courses.map(c => c.id);
            // Delete lessons first
            await supabase.from('lessons').delete().in('course_id', courseIds);
            // Delete user_courses (purchases)
            await supabase.from('user_courses').delete().in('course_id', courseIds);
            // Delete courses
            await supabase.from('courses').delete().in('id', courseIds);
        }

        // 2. Delete videos (and purchases)
        const { data: videos } = await supabase.from('videos').select('id').eq('creator_id', creatorId);
        if (videos && videos.length > 0) {
            const videoIds = videos.map(v => v.id);
            await supabase.from('user_videos').delete().in('video_id', videoIds);
            await supabase.from('videos').delete().in('id', videoIds);
        }

        // 3. Delete drills
        const { data: drills } = await supabase.from('drills').select('id').eq('creator_id', creatorId);
        if (drills && drills.length > 0) {
            const drillIds = drills.map(d => d.id);
            // Remove from routines and user interactions first
            await supabase.from('routine_drills').delete().in('drill_id', drillIds);
            await supabase.from('user_drill_likes').delete().in('drill_id', drillIds);
            await supabase.from('user_saved_drills').delete().in('drill_id', drillIds);
            await supabase.from('drills').delete().in('id', drillIds);
        }

        // 4. Delete sparring videos
        const { data: sparring } = await supabase.from('sparring_videos').select('id').eq('creator_id', creatorId);
        if (sparring && sparring.length > 0) {
            const sparringIds = sparring.map(s => s.id);
            await supabase.from('sparring_videos').delete().in('id', sparringIds);
        }

        // 5. Finally delete creator
        const { error } = await supabase
            .from('creators')
            .delete()
            .eq('id', creatorId);

        if (error) throw error;

        // 6. Update user status
        await supabase.from('users').update({ is_creator: false }).eq('id', creatorId);

        return { error: null };
    } catch (error) {
        console.error('Error deleting creator cascade:', error);
        return { error };
    }
}

// ==================== Creator Management ====================

export interface CreatorProfileUpdate {
    name?: string;
    bio?: string;
    profileImage?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
}

export async function toggleCreatorHidden(creatorId: string, hidden: boolean) {
    const { error } = await supabase
        .from('creators')
        .update({ hidden })
        .eq('id', creatorId);
    return { error };
}

export async function updateCreatorProfileAdmin(creatorId: string, updates: CreatorProfileUpdate) {
    // 1. Build update object with only defined values
    const creatorUpdates: Record<string, any> = {};
    if (updates.name !== undefined) creatorUpdates.name = updates.name;
    if (updates.bio !== undefined) creatorUpdates.bio = updates.bio;
    if (updates.profileImage !== undefined) creatorUpdates.profile_image = updates.profileImage;

    // Skip if no updates
    if (Object.keys(creatorUpdates).length === 0) {
        return { error: null };
    }

    // 2. Update creators table
    const { data: updatedData, error: creatorError } = await supabase
        .from('creators')
        .update(creatorUpdates)
        .eq('id', creatorId)
        .select()
        .single();

    if (creatorError) {
        console.error('Error updating creators table:', creatorError);
        return { error: creatorError };
    }

    // 3. Update users table (name, avatar) if needed to keep sync
    const userUpdates: Record<string, any> = {};
    if (updates.name !== undefined) userUpdates.name = updates.name;
    if (updates.profileImage !== undefined) userUpdates.avatar_url = updates.profileImage;

    if (Object.keys(userUpdates).length > 0) {
        const { error: userError } = await supabase
            .from('users')
            .update(userUpdates)
            .eq('id', creatorId);

        if (userError) {
            console.error('Error updating users table:', userError);
            // Non-critical, but good to know
        }
    }

    return { error: null, data: updatedData };
}


// ==================== Site Settings ====================

export async function updateSiteSettings(settings: Omit<SiteSettings, 'id' | 'updatedAt'>) {
    const { error } = await supabase
        .from('site_settings')
        .upsert({
            id: 'default',
            logos: settings.logos,
            footer: settings.footer,
            hero: settings.hero,
            sections: settings.sections,
            section_content: settings.sectionContent,
            updated_at: new Date().toISOString()
        });

    return { error };
}

export async function getSiteSettings() {
    const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .single();

    if (error) {
        console.error('Error fetching site settings:', error);
        return { data: null, error };
    }

    const settings: SiteSettings = {
        id: data.id,
        logos: data.logos,
        footer: data.footer,
        hero: data.hero,
        sections: data.sections,
        sectionContent: data.section_content,
        updatedAt: data.updated_at
    };

    return { data: settings, error: null };
}

// ==================== Admin Dashboard Advanced Features ====================

export async function getAdminRecentActivity() {
    try {
        // 1. Fetch recent User Signups
        const { data: newUsers } = await withTimeout(supabase
            .from('users')
            .select('id, name, email, created_at')
            .order('created_at', { ascending: false })
            .limit(5));

        // 2. Fetch recent Sales (Revenue Ledger)
        // Note: subscriptions->users FK doesn't exist, so we fetch separately if needed
        const { data: newSales } = await withTimeout(supabase
            .from('revenue_ledger')
            .select(`
                id,
                amount,
                created_at,
                product_type,
                subscription_id
            `)
            .gt('amount', 0)
            .order('created_at', { ascending: false })
            .limit(5));

        // 3. Fetch recent Instructor Applications
        const { data: newCreators } = await supabase
            .from('creators')
            .select('id, name, email, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        // 4. Fetch recent Content Uploads (Courses)
        const { data: newCourses } = await supabase
            .from('courses')
            .select('id, title, created_at, creator:creators(name)')
            .order('created_at', { ascending: false })
            .limit(5);

        // Aggregate and Transform
        const activities: ActivityItem[] = [];

        newUsers?.forEach(user => {
            const displayName = user.name || user.email || '알 수 없는 사용자';
            activities.push({
                id: `signup_${user.id}`,
                type: 'user_signup',
                title: '신규 회원 가입',
                description: `${displayName}님이 가입했습니다.`,
                timestamp: user.created_at,
                user: { id: user.id, name: displayName }
            });
        });

        newSales?.forEach((sale: any) => {
            const productTypeKo: Record<string, string> = {
                'subscription': '구독',
                'subscription_upgrade': '구독 업그레이드',
                'course': '강좌',
                'drill': '드릴',
                'routine': '루틴',
                'sparring': '스파링',
                'feedback': '피드백',
                'bundle': '번들'
            };
            const typeLabel = productTypeKo[sale.product_type] || sale.product_type || '결제';
            activities.push({
                id: `sale_${sale.id}`,
                type: 'purchase',
                title: `${typeLabel} 결제`,
                description: `₩${sale.amount?.toLocaleString()} 결제가 처리되었습니다.`,
                amount: sale.amount,
                timestamp: sale.created_at,
                user: { id: 'system', name: typeLabel }
            });
        });

        newCreators?.forEach(creator => {
            // Prefer email over name, especially if name is "NEW creator"
            const displayName = creator.email || (creator.name && creator.name !== 'NEW creator' ? creator.name : '알 수 없는 인스트럭터');
            activities.push({
                id: `creator_${creator.id}`,
                type: 'creator_application',
                title: '인스트럭터 신청',
                description: `${displayName}님이 인스트럭터로 등록되었습니다.`,
                timestamp: creator.created_at,
                user: { id: creator.id, name: displayName }
            });
        });

        newCourses?.forEach((course: any) => {
            activities.push({
                id: `course_${course.id}`,
                type: 'report',
                title: '새 강좌 업로드',
                description: `${course.creator?.name}님이 "${course.title}" 강좌를 업로드했습니다.`,
                timestamp: course.created_at,
                status: 'pending'
            });
        });

        // Sort by timestamp descending
        return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20);

    } catch (error) {
        console.error('Error fetching admin recent activity:', error);
        return [];
    }
}

export async function getAdminTopPerformers() {
    try {
        // Fetch top courses by paid subscriber watch time
        const { data: watchData } = await supabase
            .from('video_watch_logs')
            .select(`
                watch_seconds,
                user_id,
                lesson:lessons(course_id)
            `)
            .not('lesson', 'is', null);

        // Get paid subscribers
        const { data: paidUsers } = await supabase
            .from('users')
            .select('id')
            .eq('is_subscriber', true)
            .or('is_complimentary_subscription.is.null,is_complimentary_subscription.eq.false');

        const paidUserIds = new Set(paidUsers?.map(u => u.id) || []);

        // Aggregate watch time by course (only paid subscribers)
        const courseWatchTime = new Map<string, number>();
        watchData?.forEach((log: any) => {
            if (paidUserIds.has(log.user_id) && log.lesson?.course_id) {
                const current = courseWatchTime.get(log.lesson.course_id) || 0;
                courseWatchTime.set(log.lesson.course_id, current + (log.watch_seconds || 0));
            }
        });

        // Get top 5 courses by watch time
        const topCourseIds = Array.from(courseWatchTime.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id]) => id);

        // Fetch course details
        const { data: topCoursesData } = topCourseIds.length > 0
            ? await supabase
                .from('courses')
                .select('id, title, creator:creators(name)')
                .in('id', topCourseIds)
            : { data: [] };

        // Build top courses array with watch time
        const topCourses = {
            data: topCourseIds.map(id => {
                const course = topCoursesData?.find((c: any) => c.id === id);
                const watchMinutes = Math.round((courseWatchTime.get(id) || 0) / 60);
                return {
                    id,
                    title: course?.title || 'Unknown',
                    views: watchMinutes, // Using views field for watch minutes
                    revenue: 0,
                    creator: course?.creator
                };
            })
        };

        // Fetch creators with their revenue from settlements
        const { data: settlements } = await supabase
            .from('creator_monthly_settlements')
            .select('creator_id, creator_name, total_revenue')
            .order('total_revenue', { ascending: false });

        // Aggregate revenue by creator
        const creatorRevenueMap = new Map<string, { name: string; revenue: number }>();
        settlements?.forEach(s => {
            const existing = creatorRevenueMap.get(s.creator_id);
            if (existing) {
                existing.revenue += s.total_revenue || 0;
            } else {
                creatorRevenueMap.set(s.creator_id, {
                    name: s.creator_name,
                    revenue: s.total_revenue || 0
                });
            }
        });

        // Get top 5 creators by revenue
        const topCreatorsByRevenue = Array.from(creatorRevenueMap.entries())
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .slice(0, 5);

        // Fetch subscriber counts for these creators
        const creatorIds = topCreatorsByRevenue.map(([id]) => id);
        const { data: creatorDetails } = await supabase
            .from('creators')
            .select('id, subscriber_count')
            .in('id', creatorIds.length > 0 ? creatorIds : ['']);

        const subscriberMap = new Map<string, number>();
        creatorDetails?.forEach(c => subscriberMap.set(c.id, c.subscriber_count || 0));

        return {
            courses: topCourses.data?.map(c => ({
                id: c.id,
                title: c.title,
                views: c.views || 0,
                salesCount: c.views || 0,
                revenue: 0,
                instructor: (c.creator as any)?.name
            })) || [],
            creators: topCreatorsByRevenue.map(([id, data]) => ({
                id,
                name: data.name,
                subscribers: subscriberMap.get(id) || 0,
                revenue: data.revenue
            }))
        };
    } catch (error) {
        console.error('Error fetching top performers:', error);
        return { courses: [], creators: [] };
    }
}

export async function getSystemHealth(): Promise<import('../types').SystemStatus[]> {
    return [
        { service: 'Database', status: 'operational' as const, lastChecked: new Date().toISOString() },
        { service: 'Video Provider (Vimeo)', status: 'operational' as const, latency: 120, lastChecked: new Date().toISOString() },
        { service: 'Auth Service', status: 'operational' as const, lastChecked: new Date().toISOString() },
        { service: 'Storage (S3)', status: 'operational' as const, lastChecked: new Date().toISOString() }
    ];
}

export async function exportSettlementsToCSV(settlements: any[]) {
    // Simple CSV conversion
    const headers = ['Creator', 'Email', 'Revenue', 'Settlement Amount', 'Month'];
    const rows = settlements.map(s => [
        s.creator_name,
        s.creator_email,
        s.total_revenue,
        s.settlement_amount,
        s.settlement_month
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => {
            const str = String(val ?? '');
            // Escape double quotes and wrap in quotes if it contains comma, newline or quote
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `settlement_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// ==================== Admin Dashboard Charts ====================

export async function getAdminChartData(days = 30) {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // 1. Fetch Sales Data (Revenue Ledger)
        // Use created_at for actual transaction date (matches 정산 모니터링)
        // Exclude subscription_distribution (크리에이터 정산 분배) - only actual revenue
        const { data: salesData } = await supabase
            .from('revenue_ledger')
            .select('amount, created_at')
            .neq('product_type', 'subscription_distribution')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });

        // 2. Fetch User Growth Data (Users)
        const { data: userData } = await supabase
            .from('users')
            .select('created_at')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });

        // Process Data into Daily Buckets
        const salesMap = new Map<string, number>();
        const usersMap = new Map<string, number>();

        // Initialize map with all dates (including today)
        for (let i = 0; i <= days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            salesMap.set(dateStr, 0);
            usersMap.set(dateStr, 0);
        }

        salesData?.forEach((item: any) => {
            const dateStr = new Date(item.created_at).toISOString().split('T')[0];
            if (salesMap.has(dateStr)) {
                salesMap.set(dateStr, (salesMap.get(dateStr) || 0) + (item.amount || 0));
            }
        });

        userData?.forEach((item: any) => {
            const dateStr = new Date(item.created_at).toISOString().split('T')[0];
            if (usersMap.has(dateStr)) {
                usersMap.set(dateStr, (usersMap.get(dateStr) || 0) + 1);
            }
        });

        // Convert Maps to Arrays
        const salesArray = Array.from(salesMap.entries()).map(([date, amount]) => ({ date, amount }));
        const userGrowthArray = Array.from(usersMap.entries()).map(([date, users]) => ({ date, users }));

        return {
            salesData: salesArray,
            userGrowthData: userGrowthArray
        };
    } catch (error) {
        console.error('Error fetching admin chart data:', error);
        return { salesData: [], userGrowthData: [] };
    }
}

// ==================== Audit Logs ====================

export async function getAuditLogs() {
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        // If table doesn't exist, return silent empty array
        if (error.code === '42P01') return [];
        console.error('Error fetching audit logs:', error);
        return [];
    }

    // Map snake_case to camelCase
    return data.map((log: any) => ({
        id: log.id,
        adminId: log.admin_id,
        action: log.action,
        targetType: log.target_type,
        targetId: log.target_id,
        details: log.details,
        createdAt: log.created_at
    })) as AuditLog[];
}

export async function logAdminAction(action: string, targetType: string, targetId: string, details: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // Use maybeSingle or ignore if table doesn't exist
    const { error } = await supabase.from('audit_logs').insert({
        admin_id: userData.user.id,
        action,
        target_type: targetType,
        target_id: targetId,
        details
    });
    // Silent fail if error (e.g. table missing)
    if (error && error.code !== '42P01') {
        console.warn('Failed to log admin action', error);
    }
}

// ==================== Notifications ====================

export interface AdminNotification {
    id: string;
    senderId: string;
    title: string;
    message: string;
    targetAudience: 'all' | 'creators' | 'users';
    createdAt: string;
}

export async function getAdminNotifications() {
    const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        if (error.code === '42P01') return [];
        console.error('Error fetching admin notifications:', error);
        return [];
    }

    return data.map((n: any) => ({
        id: n.id,
        senderId: n.sender_id,
        title: n.title,
        message: n.message,
        targetAudience: n.target_audience,
        createdAt: n.created_at
    })) as AdminNotification[];
}

export async function createAdminNotification(
    title: string,
    message: string,
    targetAudience: 'all' | 'creators' | 'users',
    sendEmail: boolean = false
) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { error: { message: 'Unauthorized' }, emailResult: null };

    const { error } = await supabase
        .from('admin_notifications')
        .insert({
            sender_id: userData.user.id,
            title,
            message,
            target_audience: targetAudience
        });

    let emailResult = null;

    if (!error) {
        // Also log this action
        await logAdminAction('CREATE_NOTIFICATION', 'notification', 'new', `Sent to ${targetAudience}: ${title}`);

        // Send email if requested
        if (sendEmail) {
            try {
                const { data: session } = await supabase.auth.getSession();
                const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.session?.access_token}`,
                        },
                        body: JSON.stringify({ title, message, targetAudience }),
                    }
                );

                if (response.ok) {
                    emailResult = await response.json();
                } else {
                    const errorText = await response.text();
                    console.error('Email sending failed:', errorText);
                    emailResult = { error: errorText };
                }
            } catch (emailError: any) {
                console.error('Email sending error:', emailError);
                emailResult = { error: emailError.message };
            }
        }
    }

    return { error, emailResult };
}

export async function getEmailListByAudience(targetAudience: 'all' | 'creators' | 'users'): Promise<{ name: string; email: string }[]> {
    try {
        if (targetAudience === 'creators') {
            // Get creators with emails from creators table + fallback to users table
            const { data: creators, error } = await supabase
                .from('creators')
                .select('name, email, user_id');

            if (error || !creators) return [];

            console.log('[getEmailListByAudience] Raw creators data:', creators.slice(0, 5));

            // Get ALL user_ids to fetch name from users table
            const allUserIds = creators.map(c => c.user_id).filter(Boolean);

            let userInfoMap = new Map<string, { email: string; name: string }>();
            if (allUserIds.length > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id, email, name')
                    .in('id', allUserIds);
                console.log('[getEmailListByAudience] Users data:', users?.slice(0, 5));
                userInfoMap = new Map(users?.map(u => [u.id, { email: u.email || '', name: u.name || '' }]) || []);
            }

            const result = creators
                .map(c => ({
                    // Prefer creators.name (admin-set) over users.name
                    name: c.name || userInfoMap.get(c.user_id)?.name || '',
                    email: c.email || userInfoMap.get(c.user_id)?.email || ''
                }))
                .filter(c => c.email);

            console.log('[getEmailListByAudience] Final result:', result.slice(0, 5));
            return result;
        } else if (targetAudience === 'users') {
            // Get users who are NOT creators
            const { data: creators } = await supabase
                .from('creators')
                .select('user_id');

            const creatorUserIds = creators?.map(c => c.user_id) || [];

            let query = supabase.from('users').select('name, email');
            if (creatorUserIds.length > 0) {
                query = query.not('id', 'in', `(${creatorUserIds.join(',')})`);
            }

            const { data: users, error } = await query;
            if (error || !users) return [];

            return users
                .filter(u => u.email)
                .map(u => ({ name: u.name || '', email: u.email }));
        } else {
            // All users
            const { data: users, error } = await supabase
                .from('users')
                .select('name, email');

            if (error || !users) return [];

            return users
                .filter(u => u.email)
                .map(u => ({ name: u.name || '', email: u.email }));
        }
    } catch (error) {
        console.error('getEmailListByAudience error:', error);
        return [];
    }
}

// ==================== Payout Management ====================

export interface PayoutRecord {
    id: string;
    creator_id: string;
    creator: {
        name: string;
        email?: string;
    };
    amount: number;
    payout_period_start: string;
    payout_period_end: string;
    status: 'draft' | 'processing' | 'paid';
    processed_at?: string;
    created_at: string;
}

export async function getAdminPayouts(year?: number, month?: number) {
    let query = supabase
        .from('creator_payouts')
        .select(`
            *,
            creator:creators(name)
        `)
        .order('payout_period_start', { ascending: false });

    if (year && month) {
        // Filter by start date falling within specific month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // last day of month
        query = query.gte('payout_period_start', startDate).lte('payout_period_start', endDate);
    }

    const { data, error } = await query;
    return { data, error };
}

export async function calculatePayouts(year: number, month: number) {
    // calculate_monthly_subscription_distribution 함수는 target_month를 DATE 형식으로 받음
    const targetMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const { data, error } = await supabase
        .rpc('calculate_monthly_subscription_distribution', {
            target_month: targetMonth
        });
    return { data, error };
}

export async function updatePayoutStatus(payoutId: string, status: 'processing' | 'paid') {
    const updates: any = { status };
    if (status === 'paid') {
        updates.processed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('creator_payouts')
        .update(updates)
        .eq('id', payoutId)
        .select()
        .single();

    return { data, error };
}

// ==================== Content Review ====================

export async function rejectContent(id: string, type: 'course' | 'drill' | 'sparring' | 'routine', reason: string) {
    const tableMap = {
        'course': 'courses',
        'drill': 'drills',
        'sparring': 'sparring_videos',
        'routine': 'routines'
    };

    // Different tables have different column structures
    // Note: rejection_reason is stored in notification, not all tables have this column
    const updateDataMap = {
        'course': { status: 'rejected', published: false },
        'drill': { status: 'rejected' },
        'sparring': { status: 'rejected', is_published: false },
        'routine': { status: 'rejected' }
    };

    const { data, error } = await supabase
        .from(tableMap[type])
        .update(updateDataMap[type])
        .eq('id', id)
        .select()
        .single();

    // Notify Creator
    const { data: content } = await supabase.from(tableMap[type]).select('title, creator_id').eq('id', id).single();
    if (content?.creator_id) {
        // Need to get user_id from creator_id if they are different, but assuming creator_id maps to user or creators table has user_id
        // In this system, creator_id usually refers to creators table. 
        // We need to fetch the creator record to get the linked user_id if needed, or if creators.id IS user_id.
        // Based on api.ts, creators table ID seems to be the user_id (linked 1:1). 
        // We will assume creator_id is the user_id or use it directly.
        await createNotification(
            content.creator_id,
            'content_rejected',
            '콘텐츠 승인 거절',
            `'${content.title}' 콘텐츠가 승인 거절되었습니다. 사유: ${reason}`,
            '/admin/dashboard', // Creator dashboard link
            { content_id: id, content_type: type, reason }
        );
    }

    return { data, error };
}

export async function approveContent(id: string, type: 'course' | 'drill' | 'sparring' | 'routine') {
    const tableMap = {
        'course': 'courses',
        'drill': 'drills',
        'sparring': 'sparring_videos',
        'routine': 'routines'
    };

    // Different tables have different column structures
    const updateDataMap = {
        'course': { status: 'approved', published: true },
        'drill': { status: 'approved' },
        'sparring': { status: 'approved', is_published: true },
        'routine': { status: 'approved' }
    };
    const updateData = updateDataMap[type];

    const { data, error } = await supabase
        .from(tableMap[type])
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    // Notify Creator
    if (data) {
        // Fetch content details for creator_id if not in response, 
        // but select() usually returns all. 
        // Assuming data has creator_id.
        const content = data;

        if (content?.creator_id) {
            // 1. Notify Creator
            await createNotification(
                content.creator_id,
                'content_approved',
                '콘텐츠 승인 완료',
                `'${content.title}' 콘텐츠가 승인되어 공개되었습니다.`,
                `/library/${type}/${id}`,
                { content_id: id, content_type: type }
            );

            // 2. Notify Subscribers
            // Fetch creator name for the message
            const { data: creator } = await supabase.from('creators').select('name').eq('id', content.creator_id).single();
            const creatorName = creator?.name || 'Unknown Creator';

            // Fetch followers
            const { data: followers } = await supabase
                .from('creator_follows')
                .select('follower_id')
                .eq('creator_id', content.creator_id);

            if (followers && followers.length > 0) {
                const notifications = followers.map(f => ({
                    userId: f.follower_id,
                    type: 'creator_new_content' as const,
                    title: '새로운 콘텐츠 알림',
                    message: `'${creatorName}'님이 새 ${type === 'course' ? '강좌' : type === 'drill' ? '드릴' : type === 'routine' ? '루틴' : '스파링'} '${content.title}'을(를) 업로드했습니다.`,
                    link: `/library/${type}/${id}`,
                    metadata: {
                        content_id: id,
                        content_type: type,
                        creator_id: content.creator_id
                    }
                }));

                await createBulkNotifications(notifications);
            }
        }
    }

    return { data, error };
}

// ==================== Content Publishing Request ====================

export async function requestContentPublishing(id: string, type: 'course' | 'drill' | 'sparring' | 'lesson') {
    const tableMap = {
        'course': 'courses',
        'drill': 'drills',
        'sparring': 'sparring_videos',
        'lesson': 'lessons'
    };

    const typeNameMap = {
        'course': '강좌',
        'drill': '드릴',
        'sparring': '스파링',
        'lesson': '레슨'
    };

    const { data, error } = await supabase
        .from(tableMap[type])
        .update({ status: 'pending' })
        .eq('id', id)
        .select()
        .single();

    // Notify Admins about new content pending approval
    if (!error && data) {
        try {
            const { data: admins } = await supabase
                .from('users')
                .select('id')
                .eq('is_admin', true);

            if (admins) {
                await Promise.all(admins.map(admin =>
                    createNotification(
                        admin.id,
                        'support_ticket', // Reuse support_ticket type for admin alerts
                        '새로운 콘텐츠 승인 요청',
                        `새로운 ${typeNameMap[type]} "${data.title || '제목 없음'}"이(가) 승인 대기 중입니다.`,
                        '/admin/content-approval'
                    )
                ));
            }
        } catch (notifyError) {
            console.error('Failed to notify admins about content approval:', notifyError);
        }
    }

    return { data, error };
}

// ==================== User Analytics ====================

export async function getUserActivityStats(userId: string) {
    const [
        logsRes,
        coursesRes,
        purchasesRes
    ] = await Promise.all([
        supabase.from('user_activity_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('user_courses').select('*, course:courses(title)').eq('user_id', userId),
        supabase.from('revenue_ledger').select('*').eq('user_id', userId)
    ]);

    return {
        recentActivity: logsRes.data || [],
        enrolledCourses: coursesRes.data || [],
        purchaseHistory: purchasesRes.data || []
    };
}

// ==================== User Watch History (For Refund Verification) ====================

export interface UserWatchHistoryItem {
    lessonId: string;
    lessonTitle: string;
    lessonNumber: number;
    courseId: string;
    courseTitle: string;
    creatorName: string;
    thumbnailUrl: string;
    progress: number;
    watchedSeconds: number;
    durationMinutes: number;
    lastWatched: string;
}

export interface UserWatchHistorySummary {
    userId: string;
    userName: string;
    userEmail: string;
    totalLessonsWatched: number;
    totalWatchTimeMinutes: number;
    watchHistory: UserWatchHistoryItem[];
}

export async function getUserWatchHistory(userId: string): Promise<UserWatchHistorySummary | null> {
    try {
        // 1. Fetch user info
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', userId)
            .single();

        if (userError || !userData) {
            console.error('Error fetching user:', userError);
            return null;
        }

        // 2. Fetch lesson progress with lesson and course details
        const { data: progressData, error: progressError } = await supabase
            .from('lesson_progress')
            .select(`
                *,
                lesson:lessons(
                    id,
                    title,
                    thumbnail_url,
                    duration_minutes,
                    lesson_number,
                    course_id,
                    course:courses(
                        id,
                        title,
                        creator:creators(name)
                    )
                )
            `)
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (progressError) {
            console.error('Error fetching watch history:', progressError);
            return null;
        }

        // 3. Transform data
        const watchHistory: UserWatchHistoryItem[] = (progressData || [])
            .filter((item: any) => item.lesson) // Filter out deleted lessons
            .map((item: any) => ({
                lessonId: item.lesson_id,
                lessonTitle: item.lesson?.title || 'Unknown',
                lessonNumber: item.lesson?.lesson_number || 0,
                courseId: item.lesson?.course_id || '',
                courseTitle: item.lesson?.course?.title || 'Unknown',
                creatorName: item.lesson?.course?.creator?.name || 'Unknown',
                thumbnailUrl: item.lesson?.thumbnail_url || '',
                progress: item.progress || 0,
                watchedSeconds: item.watched_seconds || 0,
                durationMinutes: item.lesson?.duration_minutes || 0,
                lastWatched: item.updated_at
            }));

        // 4. Calculate totals
        const totalWatchTimeMinutes = Math.round(
            watchHistory.reduce((acc, item) => acc + item.watchedSeconds, 0) / 60
        );

        return {
            userId: userData.id,
            userName: userData.name || 'Unknown',
            userEmail: userData.email || '',
            totalLessonsWatched: watchHistory.filter(h => h.progress > 0).length,
            totalWatchTimeMinutes,
            watchHistory
        };
    } catch (error) {
        console.error('Error in getUserWatchHistory:', error);
        return null;
    }
}


// ==================== Vimeo Management ====================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://grappl-video-backend.onrender.com';

export interface VimeoOrphan {
    id: string;
    name: string;
    link: string;
    createdAt: string;
    duration: number;
    thumbnail?: string;
}

export async function getVimeoOrphans(): Promise<{ count: number; total: number; orphans: VimeoOrphan[] }> {
    const response = await fetch(`${BACKEND_URL}/api/admin/vimeo/orphans`);
    if (!response.ok) throw new Error('Failed to fetch Vimeo orphans');
    return response.json();
}

export async function deleteVimeoVideo(videoId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${BACKEND_URL}/api/admin/vimeo/${videoId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete Vimeo video');
    return response.json();
}


// ==================== Vimeo Duration Sync ====================

export interface DurationSyncItem {
    id: string;
    title: string;
    vimeo_url?: string;
    video_url?: string;
    length: string | null;
    duration_minutes: number | null;
    thumbnail_url: string | null;
}

export interface DurationScanResult {
    lessons: DurationSyncItem[];
    drills: DurationSyncItem[];
    sparring: DurationSyncItem[];
}

export async function scanMissingDurations(): Promise<DurationScanResult> {
    const response = await fetch('/api/sync-vimeo-durations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' })
    });
    if (!response.ok) throw new Error('Failed to scan durations');
    return response.json();
}

export interface SyncResultItem {
    id: string;
    status: 'success' | 'failed' | 'skipped';
    updates?: Record<string, any>;
    error?: string;
}

export async function syncDurations(
    table: 'lessons' | 'drills' | 'sparring_videos',
    items: { id: string; vimeoUrl: string }[]
): Promise<{ results: SyncResultItem[] }> {
    const response = await fetch('/api/sync-vimeo-durations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', table, items })
    });
    if (!response.ok) throw new Error('Failed to sync durations');
    return response.json();
}

// ==================== Revenue Ledger Management ====================

export interface RevenueLedgerRecord {
    id: string;
    subscription_id?: string;
    amount: number;
    platform_fee: number;
    creator_revenue: number;
    product_type: string;
    status: string;
    recognition_date: string;
    created_at: string;
}

/**
 * Get revenue ledger records (for admin review)
 */
export async function getRevenueLedger(limit = 50): Promise<RevenueLedgerRecord[]> {
    const { data, error } = await supabase
        .from('revenue_ledger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching revenue ledger:', error);
        return [];
    }
    return data || [];
}

/**
 * Add a refund record to revenue_ledger (negative amount)
 * Use this for manual ledger adjustments when refund was already processed externally
 * Calls Edge Function to bypass RLS
 */
export async function addRefundRecord(
    subscriptionId: string | null,
    amount: number,
    reason: string = '관리자 환불 처리',
    creatorId?: string // 환불을 크리에이터에게 귀속시킬 때 필요
): Promise<{ error: any }> {
    try {
        const { data: session } = await supabase.auth.getSession();

        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-refund-record`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.session?.access_token}`,
                },
                body: JSON.stringify({ amount, reason, subscriptionId, creatorId }),
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            return { error: { message: result.error || '환불 기록 추가 실패' } };
        }

        return { error: null };
    } catch (error: any) {
        console.error('addRefundRecord error:', error);
        return { error: { message: error.message } };
    }
}

/**
 * Delete refund records from revenue_ledger
 */
export async function deleteRefundRecords(
    recordId?: string,
    deleteCount?: number
): Promise<{ success: boolean; deleted?: number; error?: string }> {
    try {
        const { data: session } = await supabase.auth.getSession();

        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-refund-record`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.session?.access_token}`,
                },
                body: JSON.stringify({ recordId, deleteCount }),
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            return { success: false, error: result.error || '삭제 실패' };
        }

        return { success: true, deleted: result.deleted };
    } catch (error: any) {
        console.error('deleteRefundRecords error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Refund a specific product
 */
export async function refundProduct(
    productType: 'course' | 'drill' | 'routine' | 'sparring' | 'feedback',
    productId: string,
    amount: number,
    reason: string = '상품 환불'
): Promise<{ error: any }> {
    return addRefundRecord(null, amount, `${productType}(${productId}) 환불: ${reason}`);
}

/**
 * Refund a bundle
 */
export async function refundBundle(
    bundleId: string,
    totalAmount: number,
    reason: string = '번들 환불'
): Promise<{ error: any }> {
    return addRefundRecord(null, totalAmount, `번들(${bundleId}) 환불: ${reason}`);
}

/**
 * Process actual refund via PortOne API + update revenue_ledger
 * This calls the Edge Function that handles the full refund flow
 */
export async function processRefund(
    paymentId: string,
    amount?: number,
    reason: string = '관리자 환불 처리'
): Promise<{ success: boolean; refundedAmount?: number; error?: string }> {
    try {
        const { data: session } = await supabase.auth.getSession();

        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-refund`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.session?.access_token}`,
                },
                body: JSON.stringify({ paymentId, amount, reason }),
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            return { success: false, error: result.error || '환불 처리 실패' };
        }

        return { success: true, refundedAmount: result.refundedAmount };
    } catch (error: any) {
        console.error('processRefund error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get recent payments for refund processing
 */
export async function getRecentPayments(limit = 50) {
    const { data, error } = await supabase
        .from('payments')
        .select(`
            id,
            portone_payment_id,
            amount,
            status,
            mode,
            created_at,
            user:users(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching payments:', error);
        return [];
    }
    return data || [];
}

// ==================== Settlement Tracking (정산 상태 추적) ====================

export interface CreatorSettlement {
    id: string;
    creator_id: string;
    settlement_month: string;
    gross_amount: number;
    settlement_amount: number;
    platform_fee: number;
    carried_over_from: number;
    total_payable: number;
    status: 'pending' | 'processing' | 'paid' | 'carried_over';
    paid_at?: string;
    payment_reference?: string;
    payment_method?: string;
    created_at: string;
    updated_at: string;
    creator?: {
        name: string;
        email?: string;
        payout_settings?: any;
    };
}

/**
 * 정산 목록 조회 (관리자용)
 */
export async function getCreatorSettlements(
    year?: number,
    month?: number,
    status?: string
): Promise<CreatorSettlement[]> {
    let query = supabase
        .from('creator_settlements')
        .select(`
            *,
            creator:creators(name, payout_settings)
        `)
        .order('settlement_month', { ascending: false })
        .order('total_payable', { ascending: false });

    if (year && month) {
        const targetMonth = `${year}-${String(month).padStart(2, '0')}-01`;
        query = query.eq('settlement_month', targetMonth);
    }

    if (status && status !== 'all') {
        query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
        if (error.code === '42P01') return []; // Table doesn't exist yet
        console.error('Error fetching settlements:', error);
        return [];
    }

    return data || [];
}

/**
 * 정산 상태 업데이트 (지급 완료 처리)
 */
export async function markSettlementPaid(
    settlementId: string,
    paymentReference?: string,
    paymentMethod: string = 'bank_transfer'
): Promise<{ error: any }> {
    const { error } = await supabase
        .from('creator_settlements')
        .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_reference: paymentReference,
            payment_method: paymentMethod,
            updated_at: new Date().toISOString()
        })
        .eq('id', settlementId);

    if (!error) {
        await logAdminAction('MARK_SETTLEMENT_PAID', 'creator_settlements', settlementId, `정산 지급 완료: ${paymentReference || 'N/A'}`);
    }

    return { error };
}

/**
 * 정산 상태 일괄 업데이트
 */
export async function markSettlementsPaidBulk(
    settlementIds: string[],
    paymentReference?: string,
    paymentMethod: string = 'bank_transfer'
): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of settlementIds) {
        const { error } = await markSettlementPaid(id, paymentReference, paymentMethod);
        if (error) {
            failed++;
        } else {
            success++;
        }
    }

    return { success, failed };
}

/**
 * 월별 정산 레코드 생성 (수동)
 */
export async function generateSettlementsForMonth(
    year: number,
    month: number
): Promise<{ error: any }> {
    const targetMonth = `${year}-${String(month).padStart(2, '0')}-01`;

    const { error } = await supabase.rpc('generate_monthly_settlements', {
        target_month: targetMonth
    });

    if (!error) {
        await logAdminAction('GENERATE_SETTLEMENTS', 'creator_settlements', targetMonth, `${targetMonth} 정산 레코드 생성`);
    }

    return { error };
}

/**
 * 정산 통계 조회
 */
export async function getSettlementStats(year?: number, month?: number): Promise<{
    total_pending: number;
    total_paid: number;
    total_carried_over: number;
    pending_count: number;
    paid_count: number;
    carried_over_count: number;
}> {
    let query = supabase.from('creator_settlements').select('status, total_payable');

    if (year && month) {
        const targetMonth = `${year}-${String(month).padStart(2, '0')}-01`;
        query = query.eq('settlement_month', targetMonth);
    }

    const { data, error } = await query;

    if (error || !data) {
        return {
            total_pending: 0,
            total_paid: 0,
            total_carried_over: 0,
            pending_count: 0,
            paid_count: 0,
            carried_over_count: 0
        };
    }

    const stats = {
        total_pending: 0,
        total_paid: 0,
        total_carried_over: 0,
        pending_count: 0,
        paid_count: 0,
        carried_over_count: 0
    };

    data.forEach(s => {
        if (s.status === 'pending' || s.status === 'processing') {
            stats.total_pending += s.total_payable || 0;
            stats.pending_count++;
        } else if (s.status === 'paid') {
            stats.total_paid += s.total_payable || 0;
            stats.paid_count++;
        } else if (s.status === 'carried_over') {
            stats.total_carried_over += s.total_payable || 0;
            stats.carried_over_count++;
        }
    });

    return stats;
}

// ==================== Platform Financials ====================

export interface PlatformFinancials {
    // 매출 (총 수입)
    totalRevenue: number;
    subscriptionRevenue: number;
    productRevenue: number; // courses, drills, sparring, etc.

    // 비용 (지출)
    totalCosts: number;
    creatorPayouts: number;
    refunds: number;

    // 수익 (순이익)
    netProfit: number;
    platformFees: number; // 20% from subscriptions + products

    // 월별 데이터
    monthlyData: {
        month: string;
        revenue: number;
        costs: number;
        profit: number;
    }[];
}

export async function getPlatformFinancials(year?: number, month?: number): Promise<PlatformFinancials> {
    try {
        let dateFilter = '';
        if (year && month) {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];
            dateFilter = `AND recognition_date >= '${startDate}' AND recognition_date <= '${endDate}'`;
        }

        // Get all revenue ledger data
        const { data: ledgerData, error } = await supabase
            .from('revenue_ledger')
            .select('*')
            .order('recognition_date', { ascending: false });

        if (error) {
            console.error('Error fetching platform financials:', error);
            return getEmptyFinancials();
        }

        // Filter by date if specified
        let filteredData = ledgerData || [];
        if (year && month) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            filteredData = filteredData.filter(r => {
                const date = new Date(r.recognition_date);
                return date >= startDate && date <= endDate;
            });
        }

        // Calculate totals
        let subscriptionRevenue = 0;
        let productRevenue = 0;
        let creatorPayouts = 0;
        let refunds = 0;
        let platformFees = 0;

        filteredData.forEach(record => {
            const amount = record.amount || 0;
            const platformFee = record.platform_fee || 0;

            switch (record.product_type) {
                case 'subscription':
                    subscriptionRevenue += amount;
                    platformFees += Math.floor(amount * 0.2); // 20% platform fee
                    break;
                case 'subscription_distribution':
                    creatorPayouts += amount;
                    break;
                case 'refund':
                    refunds += Math.abs(amount);
                    break;
                case 'course':
                case 'drill':
                case 'routine':
                case 'sparring':
                case 'feedback':
                case 'bundle':
                    productRevenue += amount;
                    platformFees += platformFee;
                    break;
            }
        });

        const totalRevenue = subscriptionRevenue + productRevenue;
        const totalCosts = creatorPayouts + refunds;
        const netProfit = platformFees - refunds;

        // Calculate monthly data (last 6 months)
        const monthlyData: { month: string; revenue: number; costs: number; profit: number }[] = [];
        const allData = ledgerData || [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthRecords = allData.filter(r => {
                const recDate = new Date(r.recognition_date);
                return recDate >= monthStart && recDate <= monthEnd;
            });

            let monthRevenue = 0;
            let monthCosts = 0;
            let monthPlatformFee = 0;

            monthRecords.forEach(r => {
                if (r.product_type === 'subscription') {
                    monthRevenue += r.amount || 0;
                    monthPlatformFee += Math.floor((r.amount || 0) * 0.2);
                } else if (r.product_type === 'subscription_distribution') {
                    monthCosts += r.amount || 0;
                } else if (r.product_type === 'refund') {
                    monthCosts += Math.abs(r.amount || 0);
                } else if (!['subscription_distribution', 'refund'].includes(r.product_type)) {
                    monthRevenue += r.amount || 0;
                    monthPlatformFee += r.platform_fee || 0;
                }
            });

            monthlyData.push({
                month: monthStr,
                revenue: monthRevenue,
                costs: monthCosts,
                profit: monthPlatformFee - monthRecords.filter(r => r.product_type === 'refund').reduce((sum, r) => sum + Math.abs(r.amount || 0), 0)
            });
        }

        return {
            totalRevenue,
            subscriptionRevenue,
            productRevenue,
            totalCosts,
            creatorPayouts,
            refunds,
            netProfit,
            platformFees,
            monthlyData
        };
    } catch (error) {
        console.error('Error in getPlatformFinancials:', error);
        return getEmptyFinancials();
    }
}

function getEmptyFinancials(): PlatformFinancials {
    return {
        totalRevenue: 0,
        subscriptionRevenue: 0,
        productRevenue: 0,
        totalCosts: 0,
        creatorPayouts: 0,
        refunds: 0,
        netProfit: 0,
        platformFees: 0,
        monthlyData: []
    };
}

// ==================== Creator Watch Time Stats ====================

export interface CreatorWatchTimeStats {
    creator_id: string;
    creator_name: string;
    total_watch_seconds: number;
    total_watch_minutes: number;
    paid_subscriber_watch_seconds: number;
}

/**
 * 크리에이터별 시청시간 통계 (월별)
 * 정산에 반영되는 유료 구독자 시청시간만 집계
 */
export async function getCreatorWatchTimeStats(year: number, month: number): Promise<CreatorWatchTimeStats[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // last day of month

    const { data, error } = await supabase.rpc('get_creator_watch_time_stats', {
        start_date: startDate,
        end_date: endDate
    });

    if (error) {
        console.error('Error fetching creator watch time stats:', error);
        // Fallback: 직접 쿼리
        return await getCreatorWatchTimeStatsFallback(startDate, endDate);
    }

    return data || [];
}

/**
 * RPC 함수가 없을 경우 직접 쿼리
 */
async function getCreatorWatchTimeStatsFallback(startDate: string, endDate: string): Promise<CreatorWatchTimeStats[]> {
    // video_watch_logs에서 크리에이터별 시청시간 집계
    const { data: watchLogs, error } = await supabase
        .from('video_watch_logs')
        .select(`
            watch_seconds,
            user_id,
            lesson_id,
            drill_id,
            sparring_video_id
        `)
        .gte('date', startDate)
        .lte('date', endDate);

    if (error || !watchLogs) {
        console.error('Fallback query error:', error);
        return [];
    }

    // 관련 ID 추출
    const lessonIds = [...new Set(watchLogs.map((l: any) => l.lesson_id).filter(Boolean))];
    const drillIds = [...new Set(watchLogs.map((l: any) => l.drill_id).filter(Boolean))];
    const sparringVideoIds = [...new Set(watchLogs.map((l: any) => l.sparring_video_id).filter(Boolean))];

    // 관련 데이터 조회 (creator_id 포함)
    const [lessonsRes, drillsRes, sparringRes, paidUsersRes, creatorsRes] = await Promise.all([
        lessonIds.length > 0
            ? supabase.from('lessons').select('id, course_id').in('id', lessonIds)
            : { data: [] },
        drillIds.length > 0
            ? supabase.from('drills').select('id, creator_id').in('id', drillIds)
            : { data: [] },
        sparringVideoIds.length > 0
            ? supabase.from('sparring_videos').select('id, creator_id').in('id', sparringVideoIds)
            : { data: [] },
        supabase.from('users').select('id')
            .eq('is_subscriber', true)
            .or('is_complimentary_subscription.is.null,is_complimentary_subscription.eq.false'),
        supabase.from('creators').select('id, name')
    ]);

    // 코스에서 creator_id 조회
    const courseIds = [...new Set((lessonsRes.data || []).map((l: any) => l.course_id).filter(Boolean))];
    const { data: coursesData } = courseIds.length > 0
        ? await supabase.from('courses').select('id, creator_id').in('id', courseIds)
        : { data: [] };

    // 맵 생성
    const lessonToCourseMap = new Map((lessonsRes.data || []).map((l: any) => [l.id, l.course_id]));
    const courseToCreatorMap = new Map((coursesData || []).map((c: any) => [c.id, c.creator_id]));
    const drillToCreatorMap = new Map((drillsRes.data || []).map((d: any) => [d.id, d.creator_id]));
    const sparringToCreatorMap = new Map((sparringRes.data || []).map((s: any) => [s.id, s.creator_id]));
    const paidUserIds = new Set((paidUsersRes.data || []).map((u: any) => u.id));
    const creatorMap = new Map((creatorsRes.data || []).map((c: any) => [c.id, c.name]));

    // 크리에이터별 집계
    const statsMap = new Map<string, { total: number; paid: number }>();

    watchLogs.forEach((log: any) => {
        let creatorId: string | undefined;

        if (log.lesson_id) {
            const courseId = lessonToCourseMap.get(log.lesson_id);
            creatorId = courseId ? courseToCreatorMap.get(courseId) : undefined;
        } else if (log.drill_id) {
            creatorId = drillToCreatorMap.get(log.drill_id);
        } else if (log.sparring_video_id) {
            creatorId = sparringToCreatorMap.get(log.sparring_video_id);
        }

        if (!creatorId) return;

        const current = statsMap.get(creatorId) || { total: 0, paid: 0 };
        current.total += log.watch_seconds || 0;

        if (paidUserIds.has(log.user_id)) {
            current.paid += log.watch_seconds || 0;
        }

        statsMap.set(creatorId, current);
    });

    // 결과 변환
    return Array.from(statsMap.entries()).map(([creatorId, stats]) => ({
        creator_id: creatorId,
        creator_name: creatorMap.get(creatorId) || 'Unknown',
        total_watch_seconds: stats.total,
        total_watch_minutes: Math.round(stats.total / 60),
        paid_subscriber_watch_seconds: stats.paid
    })).sort((a, b) => b.paid_subscriber_watch_seconds - a.paid_subscriber_watch_seconds);
}


// ==================== All Watch Logs (Admin Overview) ====================

export interface WatchLogItem {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    isSubscriber: boolean;
    isComplimentary: boolean;
    membershipType: 'paid' | 'free_trial' | 'free' | 'admin';
    contentType: 'lesson' | 'drill' | 'sparring';
    contentId: string;
    contentTitle: string;
    courseTitle?: string;
    creatorName: string;
    watchSeconds: number;
    date: string;
    updatedAt: string;
}

export interface AllWatchLogsResponse {
    logs: WatchLogItem[];
    totalCount: number;
    hasMore: boolean;
}

/**
 * Get all watch logs for admin dashboard (paginated)
 */
export async function getAllWatchLogs(
    page: number = 1,
    limit: number = 50,
    filters?: {
        userId?: string;
        contentType?: 'lesson' | 'drill' | 'sparring';
        dateFrom?: string;
        dateTo?: string;
    }
): Promise<AllWatchLogsResponse> {
    try {
        const offset = (page - 1) * limit;
        console.log('[getAllWatchLogs] Fetching page:', page, 'limit:', limit, 'filters:', filters);

        // Build query - simplified due to FK issues, fetch related data separately
        let query = supabase
            .from('video_watch_logs')
            .select(`
                id,
                user_id,
                lesson_id,
                drill_id,
                video_id,
                sparring_video_id,
                watch_seconds,
                date,
                updated_at
            `, { count: 'exact' })
            .order('updated_at', { ascending: false });

        // Apply filters
        if (filters?.userId) {
            query = query.eq('user_id', filters.userId);
        }
        if (filters?.dateFrom) {
            query = query.gte('date', filters.dateFrom);
        }
        if (filters?.dateTo) {
            query = query.lte('date', filters.dateTo);
        }

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        console.log('[getAllWatchLogs] Query result:', { dataCount: data?.length, count, error });

        if (error) {
            console.error('Error fetching watch logs:', error);
            return { logs: [], totalCount: 0, hasMore: false };
        }

        // Fetch related data separately (due to FK issues with PostgREST)
        const userIds = [...new Set((data || []).map((item: any) => item.user_id).filter(Boolean))];
        const lessonIds = [...new Set((data || []).map((item: any) => item.lesson_id).filter(Boolean))];
        const drillIds = [...new Set((data || []).map((item: any) => item.drill_id).filter(Boolean))];
        const sparringVideoIds = [...new Set((data || []).map((item: any) => item.sparring_video_id).filter(Boolean))];

        const [usersRes, lessonsRes, drillsRes, videosRes] = await Promise.all([
            userIds.length > 0
                ? supabase.from('users').select('id, name, email, is_subscriber, is_complimentary_subscription, is_admin').in('id', userIds)
                : { data: [] },
            lessonIds.length > 0
                ? supabase.from('lessons').select('id, title, course_id').in('id', lessonIds)
                : { data: [] },
            drillIds.length > 0
                ? supabase.from('drills').select('id, title, creator_id').in('id', drillIds)
                : { data: [] },
            sparringVideoIds.length > 0
                ? supabase.from('sparring_videos').select('id, title, creator_id').in('id', sparringVideoIds)
                : { data: [] }
        ]);

        // Fetch courses and creators for lessons
        const courseIds = [...new Set((lessonsRes.data || []).map((l: any) => l.course_id).filter(Boolean))];
        const creatorIdsFromDrills = [...new Set((drillsRes.data || []).map((d: any) => d.creator_id).filter(Boolean))];
        const creatorIdsFromVideos = [...new Set((videosRes.data || []).map((v: any) => v.creator_id).filter(Boolean))];

        const [coursesRes, creatorsRes] = await Promise.all([
            courseIds.length > 0
                ? supabase.from('courses').select('id, title, creator_id').in('id', courseIds)
                : { data: [] },
            [...new Set([...creatorIdsFromDrills, ...creatorIdsFromVideos])].length > 0
                ? supabase.from('creators').select('id, name').in('id', [...new Set([...creatorIdsFromDrills, ...creatorIdsFromVideos])])
                : { data: [] }
        ]);

        // Fetch creators for courses
        const creatorIdsFromCourses = [...new Set((coursesRes.data || []).map((c: any) => c.creator_id).filter(Boolean))];
        const { data: courseCreatorsData } = creatorIdsFromCourses.length > 0
            ? await supabase.from('creators').select('id, name').in('id', creatorIdsFromCourses)
            : { data: [] };

        // Build maps
        const usersMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]));
        const lessonsMap = new Map((lessonsRes.data || []).map((l: any) => [l.id, l]));
        const drillsMap = new Map((drillsRes.data || []).map((d: any) => [d.id, d]));
        const videosMap = new Map((videosRes.data || []).map((v: any) => [v.id, v]));
        const coursesMap = new Map((coursesRes.data || []).map((c: any) => [c.id, c]));
        const creatorsMap = new Map([
            ...(creatorsRes.data || []).map((c: any) => [c.id, c] as [string, any]),
            ...(courseCreatorsData || []).map((c: any) => [c.id, c] as [string, any])
        ]);

        // Log first few items for debugging
        if (data && data.length > 0) {
            console.log('[getAllWatchLogs] First item:', JSON.stringify(data[0], null, 2));
        }

        // Transform data
        const logs: WatchLogItem[] = (data || []).map((item: any) => {
            let contentType: 'lesson' | 'drill' | 'sparring' = 'lesson';
            let contentId = '';
            let contentTitle = '';
            let courseTitle = '';
            let creatorName = '';

            if (item.lesson_id) {
                const lesson = lessonsMap.get(item.lesson_id);
                const course = lesson?.course_id ? coursesMap.get(lesson.course_id) : null;
                const creator = course?.creator_id ? creatorsMap.get(course.creator_id) : null;
                contentType = 'lesson';
                contentId = item.lesson_id;
                contentTitle = lesson?.title || 'Unknown';
                courseTitle = course?.title || '';
                creatorName = creator?.name || 'Unknown';
            } else if (item.drill_id) {
                const drill = drillsMap.get(item.drill_id);
                const creator = drill?.creator_id ? creatorsMap.get(drill.creator_id) : null;
                contentType = 'drill';
                contentId = item.drill_id;
                contentTitle = drill?.title || 'Unknown';
                creatorName = creator?.name || 'Unknown';
            } else if (item.sparring_video_id) {
                const video = videosMap.get(item.sparring_video_id);
                const creator = video?.creator_id ? creatorsMap.get(video.creator_id) : null;
                contentType = 'sparring';
                contentId = item.sparring_video_id;
                contentTitle = video?.title || 'Unknown';
                creatorName = creator?.name || 'Unknown';
            }

            // Get user info from map (fetched separately)
            const user = usersMap.get(item.user_id);

            // Determine membership type
            const isAdmin = user?.is_admin === true;
            const isSubscriber = user?.is_subscriber === true;
            const isComplimentary = user?.is_complimentary_subscription === true;
            let membershipType: 'paid' | 'free_trial' | 'free' | 'admin' = 'free';
            if (isAdmin) {
                membershipType = 'admin';
            } else if (isSubscriber && !isComplimentary) {
                membershipType = 'paid';
            } else if (isSubscriber && isComplimentary) {
                membershipType = 'free_trial';
            }

            return {
                id: item.id,
                userId: item.user_id,
                userName: user?.name || user?.email?.split('@')[0] || 'Unknown',
                userEmail: user?.email || '',
                isSubscriber,
                isComplimentary,
                membershipType,
                contentType,
                contentId,
                contentTitle,
                courseTitle,
                creatorName,
                watchSeconds: item.watch_seconds || 0,
                date: item.date,
                updatedAt: item.updated_at
            };
        });

        // Filter by content type if specified
        const filteredLogs = filters?.contentType
            ? logs.filter(log => log.contentType === filters.contentType)
            : logs;

        return {
            logs: filteredLogs,
            totalCount: count || 0,
            hasMore: (count || 0) > offset + limit
        };
    } catch (error) {
        console.error('Error in getAllWatchLogs:', error);
        return { logs: [], totalCount: 0, hasMore: false };
    }
}

/**
 * Get watch stats summary for admin dashboard
 */
export async function getWatchStatsSummary(): Promise<{
    todayWatchMinutes: number;
    todayUniqueViewers: number;
    weekWatchMinutes: number;
    weekUniqueViewers: number;
    monthWatchMinutes: number;
    monthUniqueViewers: number;
}> {
    try {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Today's stats
        const { data: todayData } = await supabase
            .from('video_watch_logs')
            .select('user_id, watch_seconds')
            .eq('date', today);

        // Week stats
        const { data: weekData } = await supabase
            .from('video_watch_logs')
            .select('user_id, watch_seconds')
            .gte('date', weekAgo);

        // Month stats
        const { data: monthData } = await supabase
            .from('video_watch_logs')
            .select('user_id, watch_seconds')
            .gte('date', monthAgo);

        const calcStats = (data: any[] | null) => ({
            minutes: Math.round((data?.reduce((sum, d) => sum + (d.watch_seconds || 0), 0) || 0) / 60),
            viewers: new Set(data?.map(d => d.user_id) || []).size
        });

        const todayStats = calcStats(todayData);
        const weekStats = calcStats(weekData);
        const monthStats = calcStats(monthData);

        return {
            todayWatchMinutes: todayStats.minutes,
            todayUniqueViewers: todayStats.viewers,
            weekWatchMinutes: weekStats.minutes,
            weekUniqueViewers: weekStats.viewers,
            monthWatchMinutes: monthStats.minutes,
            monthUniqueViewers: monthStats.viewers
        };
    } catch (error) {
        console.error('Error in getWatchStatsSummary:', error);
        return {
            todayWatchMinutes: 0,
            todayUniqueViewers: 0,
            weekWatchMinutes: 0,
            weekUniqueViewers: 0,
            monthWatchMinutes: 0,
            monthUniqueViewers: 0
        };
    }
}

