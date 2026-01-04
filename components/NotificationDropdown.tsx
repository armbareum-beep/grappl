import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead } from '../lib/api';
import { AppNotification } from '../types';

export const NotificationDropdown: React.FC = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            loadNotifications();
            loadUnreadCount();

            // Poll for new notifications every 30 seconds
            const interval = setInterval(() => {
                loadUnreadCount();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [user]);

    const loadNotifications = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await getNotifications(user.id);
        if (data) {
            setNotifications(data);
        }
        setLoading(false);
    };

    const loadUnreadCount = async () => {
        if (!user) return;
        const { count } = await getUnreadNotificationCount(user.id);
        setUnreadCount(count);
    };

    const handleMarkAsRead = async (notificationId: string) => {
        await markNotificationAsRead(notificationId);
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAllAsRead = async () => {
        if (!user) return;
        await markAllNotificationsAsRead(user.id);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'success': return 'text-violet-600 bg-violet-50';
            case 'warning': return 'text-amber-600 bg-amber-50';
            case 'error': return 'text-rose-600 bg-rose-50';
            default: return 'text-indigo-600 bg-indigo-50';
        }
    };

    if (!user) return null;

    return (
        <div className="relative">
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) loadNotifications();
                }}
                className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[11001]"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-[11002] max-h-[500px] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">알림</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-sm text-violet-600 hover:text-violet-700 font-bold"
                                >
                                    모두 읽음
                                </button>
                            )}
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {loading ? (
                                <div className="p-8 text-center text-slate-500">로딩 중...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                    <p>새로운 알림이 없습니다</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-violet-50/50' : ''
                                                }`}
                                            onClick={() => {
                                                if (!notification.isRead) {
                                                    handleMarkAsRead(notification.id);
                                                }
                                                if (notification.link) {
                                                    setIsOpen(false);
                                                }
                                            }}
                                        >
                                            {notification.link ? (
                                                <Link to={notification.link} className="block">
                                                    <NotificationContent notification={notification} getTypeColor={getTypeColor} />
                                                </Link>
                                            ) : (
                                                <NotificationContent notification={notification} getTypeColor={getTypeColor} />
                                            )}
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

const NotificationContent: React.FC<{ notification: AppNotification; getTypeColor: (type: string) => string }> = ({ notification, getTypeColor }) => (
    <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${getTypeColor(notification.type)}`}>
            <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm text-slate-900">{notification.title}</p>
                {!notification.isRead && (
                    <div className="w-2 h-2 bg-violet-600 rounded-full flex-shrink-0 mt-1" />
                )}
            </div>
            <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
            <p className="text-xs text-slate-400 mt-1">
                {new Date(notification.createdAt).toLocaleString('ko-KR')}
            </p>
        </div>
    </div>
);
