import React, { useState } from 'react';
import { Mail, MapPin, Send, Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

import { createSupportTicket } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export const Contact: React.FC = () => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [formData, setFormData] = useState({
        name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
        email: user?.email || '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Pre-fill user data when user loads
    React.useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user?.user_metadata?.full_name || user?.user_metadata?.name || prev.name,
                email: user.email || prev.email
            }));
        }
    }, [user]);

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
                category: 'general'
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
                    message: ''
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

    return (
        <div className="min-h-screen bg-zinc-950 pt-20">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-950/0 to-zinc-950/0 pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-black text-zinc-50 mb-6">문의하기</h1>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                        궁금하신 사항이 있으시면 언제든지 문의해주세요.
                        <br className="hidden sm:block" />
                        빠르게 확인 후 답변 드리겠습니다.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                    {/* Contact Form */}
                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <h2 className="text-2xl font-bold text-zinc-50 mb-8 relative z-10">메시지 보내기</h2>

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
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
                                    placeholder="문의 제목을 입력하세요"
                                />
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
            </div>
        </div>
    );
};
