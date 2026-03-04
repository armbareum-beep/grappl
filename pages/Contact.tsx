import React, { useState, useEffect } from 'react';
import { Mail, MapPin, Send, Check, MessageSquare, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { createSupportTicket, getUserSupportTickets, UserSupportTicket } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'form' | 'history';

export const Contact: React.FC = () => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('form');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
        category: 'general'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [tickets, setTickets] = useState<UserSupportTicket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<UserSupportTicket | null>(null);

    // Pre-fill user data when user loads
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user?.user_metadata?.full_name || user?.user_metadata?.name || prev.name,
                email: user.email || prev.email
            }));
        }
    }, [user?.id]);

    // Fetch tickets when switching to history tab
    useEffect(() => {
        if (activeTab === 'history' && user?.id) {
            fetchTickets();
        }
    }, [activeTab, user?.id]);

    const fetchTickets = async () => {
        if (!user?.id) return;
        setLoadingTickets(true);
        try {
            const data = await getUserSupportTickets(user.id);
            setTickets(data);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoadingTickets(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.message) {
            toastError('모든 필수 항목을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await createSupportTicket({
                userId: user?.id,
                name: formData.name,
                email: formData.email,
                subject: formData.subject || '일반 문의',
                message: formData.message,
                category: formData.category
            });

            if (error) throw error;

            setIsSuccess(true);
            success('문의가 성공적으로 접수되었습니다.');

            // Reset form after delay
            setTimeout(() => {
                setFormData({
                    name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
                    email: user?.email || '',
                    subject: '',
                    message: '',
                    category: 'general'
                });
                setIsSuccess(false);
            }, 3000);

        } catch (err: any) {
            console.error('Contact submit error:', err);
            toastError('문의 전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'resolved':
                return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400">답변완료</span>;
            case 'in_progress':
                return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400">처리중</span>;
            default:
                return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400">대기중</span>;
        }
    };

    const getCategoryLabel = (category: string) => {
        const labels: { [key: string]: string } = {
            general: '일반',
            technical: '기술지원',
            billing: '결제/환불',
            account: '계정',
            content: '콘텐츠',
            other: '기타'
        };
        return labels[category] || category;
    };

    return (
        <div className="min-h-screen bg-zinc-950 pt-20 pb-24">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-950/0 to-zinc-950/0 pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-zinc-50 mb-6">문의하기</h1>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                        궁금하신 사항이 있으시면 언제든지 문의해주세요.
                    </p>
                </div>

                {/* Tabs - Only show if logged in */}
                {user && (
                    <div className="flex justify-center mb-10">
                        <div className="inline-flex bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
                            <button
                                onClick={() => setActiveTab('form')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                    activeTab === 'form'
                                        ? 'bg-violet-600 text-white'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                문의하기
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                                    activeTab === 'history'
                                        ? 'bg-violet-600 text-white'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                내 문의 내역
                                {tickets.filter(t => t.status === 'resolved' && !t.admin_response).length > 0 && (
                                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Form Tab */}
                {activeTab === 'form' && (
                    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                        {/* Contact Form */}
                        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <h2 className="text-2xl font-bold text-zinc-50 mb-8 relative z-10">메시지 보내기</h2>

                            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-zinc-400 mb-2">
                                            이름 <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/30 transition-colors"
                                            placeholder="홍길동"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-2">
                                            이메일 <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/30 transition-colors"
                                            placeholder="example@email.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="category" className="block text-sm font-medium text-zinc-400 mb-2">
                                            카테고리
                                        </label>
                                        <select
                                            id="category"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-violet-500/30 transition-colors"
                                        >
                                            <option value="general">일반</option>
                                            <option value="technical">기술지원</option>
                                            <option value="billing">결제/환불</option>
                                            <option value="account">계정</option>
                                            <option value="content">콘텐츠</option>
                                            <option value="other">기타</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="subject" className="block text-sm font-medium text-zinc-400 mb-2">
                                            제목
                                        </label>
                                        <input
                                            type="text"
                                            id="subject"
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/30 transition-colors"
                                            placeholder="문의 제목"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-zinc-400 mb-2">
                                        메시지 <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        id="message"
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        rows={6}
                                        className="w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/30 resize-none transition-colors"
                                        placeholder="문의 내용을 상세히 작성해주세요"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || isSuccess}
                                    className={`
                                        w-full py-4 font-bold rounded-lg flex items-center justify-center gap-2 transition-all duration-300
                                        ${isSuccess
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                            : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40'
                                        }
                                        disabled:opacity-70 disabled:cursor-not-allowed
                                    `}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                                            <span>전송 중...</span>
                                        </>
                                    ) : isSuccess ? (
                                        <>
                                            <Check className="w-5 h-5 animate-in zoom-in duration-300" />
                                            <span>전송 완료!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            <span>문의 보내기</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-6">
                            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl h-fit">
                                <h2 className="text-2xl font-bold text-zinc-50 mb-8">연락처 정보</h2>

                                <div className="space-y-8">
                                    <div className="flex items-start gap-4 group">
                                        <div className="w-12 h-12 bg-violet-500/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 border border-violet-500/20">
                                            <Mail className="w-5 h-5 text-violet-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-zinc-100 font-semibold mb-1">이메일</h3>
                                            <p className="text-zinc-400 group-hover:text-violet-400 transition-colors">coach0179@naver.com</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 group">
                                        <div className="w-12 h-12 bg-violet-500/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 border border-violet-500/20">
                                            <MapPin className="w-5 h-5 text-violet-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-zinc-100 font-semibold mb-1">주소</h3>
                                            <p className="text-zinc-400 group-hover:text-violet-400 transition-colors">서울 동작대로29길 119, 102-1207</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-xl">
                                <h3 className="text-xl font-bold text-zinc-50 mb-4">운영 시간</h3>
                                <div className="space-y-2 text-zinc-400">
                                    <div className="flex justify-between">
                                        <span>평일</span>
                                        <span className="text-zinc-200">09:00 - 18:00</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>주말 및 공휴일</span>
                                        <span className="text-zinc-500">휴무</span>
                                    </div>
                                </div>
                                <p className="text-sm text-zinc-500 mt-6 pt-6 border-t border-white/5">
                                    * 문의 주신 내용은 영업일 기준 1-2일 내에 답변드립니다.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="max-w-4xl mx-auto">
                        {loadingTickets ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center text-zinc-600">
                                <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                                <p className="font-bold mb-2">문의 내역이 없습니다.</p>
                                <p className="text-sm text-zinc-500 mb-6">궁금한 점이 있으시면 문의해주세요.</p>
                                <button
                                    onClick={() => setActiveTab('form')}
                                    className="px-6 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl text-white font-bold text-sm transition-all"
                                >
                                    문의하기
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tickets.map(ticket => (
                                    <div
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                                        className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                                            selectedTicket?.id === ticket.id
                                                ? 'bg-violet-500/10 border-violet-500/50'
                                                : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                                        }`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    {getStatusBadge(ticket.status)}
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">
                                                        {getCategoryLabel(ticket.category)}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-lg mb-1 truncate">{ticket.subject}</h3>
                                                <p className="text-sm text-zinc-500 truncate">{ticket.message}</p>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                <span className="font-mono">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                                <ChevronRight className={`w-5 h-5 transition-transform ${selectedTicket?.id === ticket.id ? 'rotate-90' : ''}`} />
                                            </div>
                                        </div>

                                        {/* Expanded Content */}
                                        {selectedTicket?.id === ticket.id && (
                                            <div className="mt-6 pt-6 border-t border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="mb-6">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                                                        <MessageSquare className="w-4 h-4" />
                                                        문의 내용
                                                    </h4>
                                                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                                        {ticket.message}
                                                    </div>
                                                </div>

                                                {ticket.admin_response ? (
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-violet-400 mb-3 flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            관리자 답변
                                                            {ticket.responded_at && (
                                                                <span className="text-zinc-500 font-normal normal-case">
                                                                    ({new Date(ticket.responded_at).toLocaleString()})
                                                                </span>
                                                            )}
                                                        </h4>
                                                        <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                                            {ticket.admin_response}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 text-amber-400/80 text-sm">
                                                        <Clock className="w-4 h-4" />
                                                        <span>답변 대기중입니다. 빠른 시일 내에 답변 드리겠습니다.</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
