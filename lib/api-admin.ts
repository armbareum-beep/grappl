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
            supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active')
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
    type: 'course' | 'drill' | 'sparring';
    title: string;
    creatorName: string;
    createdAt: string;
    thumbnailUrl?: string;
}

export async function getPendingContent(): Promise<PendingContent[]> {
    // Note: drills and sparring_videos don't have FK relationship to creators, so we fetch creator_id and look up names separately
    const [courses, drills, sparring] = await Promise.all([
        withTimeout(supabase.from('courses').select('id, title, creator:creators(name), created_at, thumbnail_url').eq('status', 'pending')),
        withTimeout(supabase.from('drills').select('id, title, creator_id, created_at, thumbnail_url').eq('status', 'pending')),
        withTimeout(supabase.from('sparring_videos').select('id, title, creator_id, created_at, thumbnail_url').eq('status', 'pending'))
    ]);

    // Collect all creator_ids that need lookup
    const creatorIds = new Set<string>();
    drills.data?.forEach(d => d.creator_id && creatorIds.add(d.creator_id));
    sparring.data?.forEach(s => s.creator_id && creatorIds.add(s.creator_id));

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

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateContentStatus(type: 'course' | 'drill' | 'sparring', id: string, status: 'approved' | 'rejected') {
    const table = type === 'course' ? 'courses' : type === 'drill' ? 'drills' : 'sparring_videos';
    const { error } = await supabase
        .from(table)
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
    // 1. Update creators table
    const { error: creatorError } = await supabase
        .from('creators')
        .update({
            name: updates.name,
            bio: updates.bio,
            profile_image: updates.profileImage,
            // Add other fields if they exist in DB schema
        })
        .eq('id', creatorId);

    if (creatorError) {
        // If 404/no rows (might be because record doesn't exist in creators table yet but user is creator?),
        // we might need to update users table too or handle it.
        // But assumed creator exists in 'creators' table.
        console.error('Error updating creators table:', creatorError);
        return { error: creatorError };
    }

    // 2. Update users table (name, avatar) if needed to keep sync
    const userUpdates: any = {};
    if (updates.name) userUpdates.name = updates.name;
    if (updates.profileImage) userUpdates.avatar_url = updates.profileImage;

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

    return { error: null };
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

        // 2. Fetch recent Sales (Revenue Ledger or User Courses)
        // Using revenue_ledger for monetary events
        const { data: newSales } = await withTimeout(supabase
            .from('revenue_ledger')
            .select(`
                id,
                amount,
                created_at,
                subscription:subscriptions(
                    user:users(name, email)
                )
            `)
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
            const userName = sale.subscription?.user?.name || sale.subscription?.user?.email || 'Unknown';
            activities.push({
                id: `sale_${sale.id}`,
                type: 'purchase',
                title: '결제 발생',
                description: `${userName}님의 결제가 처리되었습니다.`,
                amount: sale.amount,
                timestamp: sale.created_at,
                user: { id: 'system', name: userName }
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
        // Fetch top courses by views
        const topCourses = await supabase
            .from('courses')
            .select('id, title, views, creator:creators(name)')
            .order('views', { ascending: false })
            .limit(5);

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
        // Adjust query based on actual schema: 'created_at' and 'amount'
        const { data: salesData } = await supabase
            .from('revenue_ledger')
            .select('amount, created_at')
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

        // Initialize map with all dates
        for (let i = 0; i < days; i++) {
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

export async function createAdminNotification(title: string, message: string, targetAudience: 'all' | 'creators' | 'users') {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { error: { message: 'Unauthorized' } };

    const { error } = await supabase
        .from('admin_notifications')
        .insert({
            sender_id: userData.user.id,
            title,
            message,
            target_audience: targetAudience
        });

    if (!error) {
        // Also log this action
        await logAdminAction('CREATE_NOTIFICATION', 'notification', 'new', `Sent to ${targetAudience}: ${title}`);
    }

    return { error };
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
    const { data, error } = await supabase
        .rpc('calculate_monthly_payouts', {
            p_year: year,
            p_month: month
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

export async function rejectContent(id: string, type: 'course' | 'drill' | 'sparring', reason: string) {
    const tableMap = {
        'course': 'courses',
        'drill': 'drills',
        'sparring': 'sparring_videos'
    };

    // Different tables have different column structures
    // Note: rejection_reason is stored in notification, not all tables have this column
    const updateDataMap = {
        'course': { status: 'rejected', published: false },
        'drill': { status: 'rejected' },
        'sparring': { status: 'rejected', is_published: false }
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

export async function approveContent(id: string, type: 'course' | 'drill' | 'sparring') {
    const tableMap = {
        'course': 'courses',
        'drill': 'drills',
        'sparring': 'sparring_videos'
    };

    // Different tables have different column structures
    const updateDataMap = {
        'course': { status: 'approved', published: true },
        'drill': { status: 'approved' },
        'sparring': { status: 'approved', is_published: true }
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
                    message: `'${creatorName}'님이 새 ${type === 'course' ? '강좌' : type === 'drill' ? '드릴' : '스파링'} '${content.title}'을(를) 업로드했습니다.`,
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

    const { data, error } = await supabase
        .from(tableMap[type])
        .update({ status: 'pending' })
        .eq('id', id)
        .select()
        .single();

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

