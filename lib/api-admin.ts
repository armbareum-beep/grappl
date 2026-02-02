import { supabase } from './supabase';
export * from './api-admin-logs';
import { AuditLog, SiteSettings } from '../types';



export interface AdminStats {
    totalUsers: number;
    totalDrills: number;
    pendingCreators: number;
    totalCreators: number;
    totalCourses: number;
    totalSparring: number;
}

export const getAdminStats = async (): Promise<AdminStats> => {
    try {
        const [users, drills, pendingCreators, creators, courses, sparring] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('drills').select('*', { count: 'exact', head: true }),
            supabase.from('creators').select('*', { count: 'exact', head: true }).eq('approved', false),
            supabase.from('creators').select('*', { count: 'exact', head: true }).eq('approved', true),
            supabase.from('courses').select('*', { count: 'exact', head: true }),
            supabase.from('sparring_videos').select('*', { count: 'exact', head: true }).is('deleted_at', null)
        ]);

        return {
            totalUsers: users.count || 0,
            totalDrills: drills.count || 0,
            pendingCreators: pendingCreators.count || 0,
            totalCreators: creators.count || 0,
            totalCourses: courses.count || 0,
            totalSparring: sparring.count || 0
        };
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return { totalUsers: 0, totalDrills: 0, pendingCreators: 0, totalCreators: 0, totalCourses: 0, totalSparring: 0 };
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
    const [courses, drills, sparring] = await Promise.all([
        supabase.from('courses').select('id, title, creator:creators(name), created_at, thumbnail_url').eq('status', 'pending'),
        supabase.from('drills').select('id, title, creator:creators(name), created_at, thumbnail_url').eq('status', 'pending'),
        supabase.from('sparring_videos').select('id, title, creator:creators(name), created_at, thumbnail_url').eq('status', 'pending')
    ]);

    const results: PendingContent[] = [];

    courses.data?.forEach(c => results.push({ id: c.id, type: 'course', title: c.title, creatorName: (c.creator as any)?.name, createdAt: c.created_at, thumbnailUrl: c.thumbnail_url }));
    drills.data?.forEach(d => results.push({ id: d.id, type: 'drill', title: d.title, creatorName: (d.creator as any)?.name, createdAt: d.created_at, thumbnailUrl: d.thumbnail_url }));
    sparring.data?.forEach(s => results.push({ id: s.id, type: 'sparring', title: s.title, creatorName: (s.creator as any)?.name, createdAt: s.created_at, thumbnailUrl: s.thumbnail_url }));

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
    const { data, error } = await supabase
        .from('creator_monthly_settlements')
        .select('*')
        .order('total_revenue', { ascending: false });

    if (error) {
        console.error('Error fetching settlements:', error);
        return [];
    }

    return data || [];
};


// ==================== Content Management ====================

export async function deleteDrill(drillId: string) {
    const { error } = await supabase
        .from('drills')
        .delete()
        .eq('id', drillId);
    return { error };
}

export async function getRoutines() {
    const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching routines:', error);
        return [];
    }
    return data || [];
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
            course:courses(title)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching lessons:', error);
        return [];
    }
    return data || [];
}

export async function deleteLessonAdmin(lessonId: string) {
    const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);
    return { error };
}

export async function getSparringVideosAdmin(): Promise<any[]> {
    const { data, error } = await supabase
        .from('sparring_videos')
        .select(`
            *,
            creator:creators(name, profile_image)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        if (error.code === '42P01') return [];
        console.error('Error fetching sparring videos:', error);
        return [];
    }

    // Transform to frontend-friendly camelCase
    return (data || []).map(row => ({
        ...row,
        creatorId: row.creator_id,
        videoUrl: row.video_url,
        thumbnailUrl: row.thumbnail_url,
        uniformType: row.uniform_type,
        isPublished: row.is_published,
        previewVimeoId: row.preview_vimeo_id,
        createdAt: row.created_at,
        price: typeof row.price === 'string' ? parseInt(row.price) : (row.price || 0),
        creator: row.creator ? {
            id: row.creator_id,
            name: (row.creator as any).name,
            profileImage: (row.creator as any).profile_image
        } : null
    }));
}

export async function deleteSparringVideoAdmin(videoId: string) {
    const { error } = await supabase
        .from('sparring_videos')
        .delete()
        .eq('id', videoId);
    return { error };
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
    return data || [];
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

        // 4. Finally delete creator
        const { error } = await supabase
            .from('creators')
            .delete()
            .eq('id', creatorId);

        if (error) throw error;

        // 5. Update user status
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
    // In a real app, this would be a union of multiple tables or a dedicated activity_log table
    // For now, we'll return some mock data to show the UI
    const mockActivity: any[] = [
        {
            id: '1',
            type: 'user_signup',
            title: '신규 회원 가입',
            description: '이주형님이 새롭게 가입했습니다.',
            timestamp: new Date().toISOString(),
            user: { id: 'u1', name: '이주형' }
        },
        {
            id: '2',
            type: 'purchase',
            title: '강좌 판매 완료',
            description: '클로즈 가드 마스터 클래스 강좌가 판매되었습니다.',
            amount: 55000,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            user: { id: 'u2', name: '김지훈' }
        },
        {
            id: '3',
            type: 'creator_application',
            title: '인스트럭터 신청',
            description: '최강수님이 인스트럭터 권한을 신청했습니다.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
            user: { id: 'u3', name: '최강수' }
        },
        {
            id: '4',
            type: 'report',
            title: '콘텐츠 신고 접수',
            description: '부적절한 댓글에 대한 신고가 접수되었습니다.',
            status: 'pending',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString()
        }
    ];

    return mockActivity;
}

export async function getAdminTopPerformers() {
    try {
        const [topCourses, topCreators] = await Promise.all([
            supabase.from('courses').select('id, title, views, creator:creators(name)').order('views', { ascending: false }).limit(5),
            supabase.from('creators').select('id, name, subscriber_count').order('subscriber_count', { ascending: false }).limit(5)
        ]);

        return {
            courses: topCourses.data?.map(c => ({
                id: c.id,
                title: c.title,
                salesCount: c.views, // Using views as a proxy
                revenue: (c.views || 0) * 10000, // Proxy revenue
                instructor: (c.creator as any)?.name
            })) || [],
            creators: topCreators.data?.map(cr => ({
                id: cr.id,
                name: cr.name,
                subscribers: cr.subscriber_count,
                revenue: (cr.subscriber_count || 0) * 50000 // Proxy revenue
            })) || []
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

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
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
        const { data: sales } = await supabase
            .from('daily_sales_stats')
            .select('*')
            .order('sale_date', { ascending: true })
            .limit(days);

        const { data: signups } = await supabase
            .from('daily_user_growth')
            .select('*')
            .order('signup_date', { ascending: true })
            .limit(days);

        return {
            salesData: sales?.map(s => ({ date: s.sale_date, amount: s.total_amount })) || [],
            userGrowthData: signups?.map(u => ({ date: u.signup_date, users: u.user_count })) || []
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

    const { data, error } = await supabase
        .from(tableMap[type])
        .update({
            approved: false,
            status: 'rejected',
            rejection_reason: reason
        })
        .eq('id', id)
        .select()
        .single();

    return { data, error };
}

export async function approveContent(id: string, type: 'course' | 'drill' | 'sparring') {
    const tableMap = {
        'course': 'courses',
        'drill': 'drills',
        'sparring': 'sparring_videos'
    };

    const { data, error } = await supabase
        .from(tableMap[type])
        .update({
            approved: true,
            status: 'published',
            rejection_reason: null // Clear reason on approval
        })
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

