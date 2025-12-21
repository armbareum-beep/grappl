import React, { useState } from 'react';
import { Mail, MapPin, Send } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

import { createSupportTicket } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export const Contact: React.FC = () => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pre-fill user data when user loads
    React.useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || prev.name,
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

            success('문의가 성공적으로 접수되었습니다. 관리자 확인 후 답변드리겠습니다.');
            setFormData({
                name: user?.name || '',
                email: user?.email || '',
                subject: '',
                message: ''
            });
        } catch (err: any) {
            console.error('Contact submit error:', err);
            toastError('문의 전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">문의하기</h1>
                    <p className="text-slate-400 text-lg">
                        궁금하신 사항이 있으시면 언제든지 문의해주세요.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Contact Form */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                        <h2 className="text-2xl font-bold text-white mb-6">메시지 보내기</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                                    이름 <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="홍길동"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                    이메일 <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="example@email.com"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium text-slate-300 mb-2">
                                    제목
                                </label>
                                <input
                                    type="text"
                                    id="subject"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="문의 제목을 입력하세요"
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
                                    메시지 <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    id="message"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    rows={6}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="문의 내용을 상세히 작성해주세요"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        전송 중...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        문의 보내기
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                            <h2 className="text-2xl font-bold text-white mb-6">연락처 정보</h2>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold mb-1">이메일</h3>
                                        <p className="text-slate-400">coach0179@naver.com</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MapPin className="w-6 h-6 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold mb-1">주소</h3>
                                        <p className="text-slate-400">서울 동작대로29길 119, 102-1207</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-8">
                            <h3 className="text-xl font-bold text-white mb-3">운영 시간</h3>
                            <div className="space-y-2 text-slate-300">
                                <p>평일: 09:00 - 18:00</p>
                                <p>주말 및 공휴일: 휴무</p>
                            </div>
                            <p className="text-sm text-slate-400 mt-4">
                                * 문의 주신 내용은 영업일 기준 1-2일 내에 답변드립니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
