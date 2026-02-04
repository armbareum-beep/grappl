import { supabase } from './supabase';

export type NotificationType =
    | 'support_ticket'
    | 'system_error'
    | 'payment_success'
    | 'payment_failed'
    | 'system_announcement'
    | 'creator_new_content'
    | 'course_new_lesson'
    | 'recommended_content'
    | 'new_subscriber'
    | 'content_approved'
    | 'content_rejected'
    | 'settlement_completed'
    | 'views_milestone'
    | 'subscribers_milestone'
    // Existing types fallback
    | 'info' | 'success' | 'warning' | 'error';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    is_read: boolean; // Changed from read to is_read
    created_at: string;
    metadata?: any;
}

/**
 * 알림 생성 (주로 서버 사이드나 관리자 기능에서 사용)
 */
export async function createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
    metadata?: any
) {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                title,
                message,
                link,
                metadata,
                is_read: false
            })
            .select()
            .single();

        if (error) throw error;
        return data as Notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

/**
 * 내 알림 가져오기
 */
export async function getMyNotifications(limit = 20) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data as Notification[];
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

/**
 * 읽지 않은 알림 개수 가져오기
 */
export async function getUnreadNotificationCount() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false); // Changed from read to is_read

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Error counting unread notifications:', error);
        return 0;
    }
}

/**
 * 알림 읽음 처리
 */
export async function markNotificationAsRead(notificationId: string) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true }) // Changed from read to is_read
            .eq('id', notificationId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return false;
    }
}

/**
 * 모든 알림 읽음 처리
 */
export async function markAllNotificationsAsRead() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true }) // Changed from read to is_read
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
    }
}

/**
 * 알림 삭제
 */
export async function deleteNotification(notificationId: string) {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting notification:', error);
        return false;
    }
}
