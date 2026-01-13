import React, { useEffect, useState, useRef } from 'react';
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
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

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
            case 'success': return 'text-emerald-400 bg-emerald-500/10';
            case 'warning': return 'text-amber-400 bg-amber-500/10';
            case 'error': return 'text-rose-400 bg-rose-500/10';
            default: return 'text-violet-400 bg-violet-500/10';
        }
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) loadNotifications();
                }}
                className="relative p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
                <Bell className="w-5 h-5 flex-shrink-0" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.5)]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-[calc(100vw-32px)] sm:w-96 bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-800/50 z-[11002] max-h-[500px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-950/20">
                        <h3 className="font-bold text-zinc-100">알림</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-sm text-violet-400 hover:text-violet-300 font-bold"
                            >
                                모두 읽음
                            </button>
                        )}
                    </div>
                    -
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {loading ? (
                            <div className="p-8 text-center text-zinc-500">
                                <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-2" />
                                로딩 중...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-10 text-center text-zinc-500">
                                <Bell className="w-12 h-12 mx-auto mb-3 text-zinc-800" />
                                <p className="text-sm">새로운 알림이 없습니다</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800/50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 transition-colors cursor-pointer ${!notification.isRead ? 'bg-violet-500/5' : 'hover:bg-zinc-800/30'
                                            }`}
                                        onClick={() => {
                                            if (!notification.isRead) {
                                                handleMarkAsRead(notification.id);
                                            }
                                            setIsOpen(false);
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
            )}
        </div>
    );
};

const NotificationContent: React.FC<{ notification: AppNotification; getTypeColor: (type: string) => string }> = ({ notification, getTypeColor }) => (
    <div className="flex items-start gap-4">
        <div className={`p-2 rounded-full flex-shrink-0 ${getTypeColor(notification.type)}`}>
            <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
                <p className={`font-bold text-sm ${notification.isRead ? 'text-zinc-300' : 'text-zinc-100'}`}>{notification.title}</p>
                {!notification.isRead && (
                    <div className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0 mt-1.5 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                )}
            </div>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{notification.message}</p>
            <p className="text-[10px] text-zinc-600 mt-2 font-medium uppercase tracking-wider">
                {new Date(notification.createdAt).toLocaleString('ko-KR')}
            </p>
        </div>
    </div>
);
