import React, { useEffect, useState } from 'react';
import { getAdminNotifications, createAdminNotification, AdminNotification } from '../../lib/api-admin';
import { ArrowLeft, Bell, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminNotifications: React.FC = () => {
    const navigate = useNavigate();


    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetAudience, setTargetAudience] = useState<'all' | 'creators' | 'users'>('all');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        const data = await getAdminNotifications();
        setNotifications(data);
        setLoading(false);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;

        if (!window.confirm(`정말 "${targetAudience}" 그룹에게 알림을 발송하시겠습니까?`)) return;

        setSending(true);
        try {
            const { error } = await createAdminNotification(title, message, targetAudience);
            if (error) throw error;

            alert('알림이 발송되었습니다.');
            setTitle('');
            setMessage('');
            fetchNotifications();
        } catch (error) {
            console.error('Failed to send notification:', error);
            alert('알림 발송에 실패했습니다.');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-zinc-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">뒤로가기</span>
                </button>

                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                        <Bell className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">알림 센터</h1>
                        <p className="text-zinc-400">사용자들에게 공지사항이나 중요 알림을 발송합니다.</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Send Form - Full Width */}
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-8 backdrop-blur-xl">
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Send className="w-4 h-4 text-violet-400" />
                            새 알림 발송
                        </h2>
                        <form onSubmit={handleSend} className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                <div className="lg:col-span-1">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                                        수신 대상
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'all', label: '전체' },
                                            { value: 'users', label: '일반 유저' },
                                            { value: 'creators', label: '인스트럭터' }
                                        ].map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setTargetAudience(option.value as any)}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${targetAudience === option.value
                                                    ? 'bg-violet-600 text-white border-violet-500'
                                                    : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:bg-zinc-900'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="lg:col-span-3">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                                        제목
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="공지사항 제목"
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                                    내용
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="전달할 내용을 입력하세요..."
                                    rows={8}
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-y min-h-[200px]"
                                    required
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {sending ? '발송 중...' : '알림 발송하기'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* History List - Full Width */}
                    <div>
                        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-xl">
                            <div className="px-6 py-4 border-b border-zinc-800/50 bg-zinc-900/50">
                                <h3 className="font-bold text-zinc-300">발송 이력</h3>
                            </div>
                            <div className="divide-y divide-zinc-800/50">
                                {notifications.length === 0 ? (
                                    <div className="p-12 text-center text-zinc-600">
                                        발송된 알림이 없습니다.
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div key={notif.id} className="p-6 hover:bg-zinc-800/30 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${notif.targetAudience === 'all' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        notif.targetAudience === 'creators' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        }`}>
                                                        수신: {notif.targetAudience === 'all' ? '전체' : notif.targetAudience === 'creators' ? '인스트럭터' : '일반 유저'}
                                                    </span>
                                                    <h4 className="font-bold text-white">{notif.title}</h4>
                                                </div>
                                                <span className="text-xs text-zinc-500 font-medium">
                                                    {new Date(notif.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                                                {notif.message}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
