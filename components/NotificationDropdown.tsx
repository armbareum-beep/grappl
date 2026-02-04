import React, { useEffect, useState } from 'react';
import { Bell, Loader2, Trash2, Info, CheckCircle, AlertTriangle, PlayCircle, Video, BookOpen, UserPlus, DollarSign, Award, TrendingUp } from 'lucide-react';
import { getMyNotifications, getUnreadNotificationCount, markAllNotificationsAsRead, markNotificationAsRead, Notification as NotificationItem, deleteNotification } from '../lib/api-notifications';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const NotificationDropdown: React.FC = () => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // 초기 데이터 로드 및 실시간 구독
    useEffect(() => {
        loadNotifications();

        // 1분마다 폴링 (백그라운드 업데이트)
        const pollingInterval = setInterval(loadNotifications, 60000);

        // Supabase Realtime 구독
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    // 새 알림 도착 시 리스트 업데이트
                    setNotifications(prev => [payload.new as NotificationItem, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // 간단한 브라우저 알림 (권한 있을 시)
                    if (Notification.permission === 'granted') {
                        new Notification(payload.new.title, { body: payload.new.message });
                    }
                }
            )
            .subscribe();

        return () => {
            clearInterval(pollingInterval);
            supabase.removeChannel(channel);
        };
    }, []);

    const loadNotifications = async () => {
        const [data, count] = await Promise.all([
            getMyNotifications(10),
            getUnreadNotificationCount()
        ]);
        setNotifications(data);
        setUnreadCount(count);
    };

    const handleMarkAsRead = async (id: string, link?: string) => {
        await markNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        if (link) {
            setIsOpen(false);
            navigate(link);
        }
    };

    const handleMarkAllAsRead = async () => {
        setLoading(true);
        await markAllNotificationsAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        setLoading(false);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // 알림 타입별 아이콘 매핑
    const getIcon = (type: string) => {
        switch (type) {
            case 'payment_success': return <DollarSign className="w-4 h-4 text-emerald-500" />;
            case 'payment_failed': return <AlertTriangle className="w-4 h-4 text-rose-500" />;
            case 'course_new_lesson': return <BookOpen className="w-4 h-4 text-violet-500" />;
            case 'creator_new_content': return <Video className="w-4 h-4 text-blue-500" />;
            case 'recommended_content': return <PlayCircle className="w-4 h-4 text-pink-500" />;
            case 'new_subscriber': return <UserPlus className="w-4 h-4 text-indigo-500" />;
            case 'content_approved': return <Award className="w-4 h-4 text-green-500" />;
            case 'settlement_completed': return <DollarSign className="w-4 h-4 text-yellow-500" />;
            case 'views_milestone': return <TrendingUp className="w-4 h-4 text-orange-500" />;
            default: return <Info className="w-4 h-4 text-zinc-500" />;
        }
    };

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full animate-pulse border border-zinc-950" />
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl">
                            <h3 className="font-bold text-white text-sm">알림 ({unreadCount})</h3>
                            <button
                                onClick={handleMarkAllAsRead}
                                disabled={loading || unreadCount === 0}
                                className="text-xs text-zinc-500 hover:text-violet-400 disabled:opacity-50 flex items-center gap-1 transition-colors"
                            >
                                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                모두 읽음
                            </button>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500">
                                    <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm font-medium">새로운 알림이 없습니다</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800/50">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`group p-4 hover:bg-zinc-800/50 transition-all cursor-pointer ${!notification.is_read ? 'bg-violet-500/5' : ''}`}
                                            onClick={() => handleMarkAsRead(notification.id, notification.link)}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${!notification.is_read ? 'bg-zinc-800 border-zinc-700' : 'bg-transparent border-zinc-800'}`}>
                                                    {getIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2 mb-1">
                                                        <h4 className={`text-xs font-bold ${!notification.is_read ? 'text-zinc-100' : 'text-zinc-400'}`}>
                                                            {notification.title}
                                                        </h4>
                                                        <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                                                            {new Date(notification.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs leading-relaxed line-clamp-2 ${!notification.is_read ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                                        {notification.message}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => handleDelete(e, notification.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
