import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { DollarSign, TrendingUp, Award, Video, BarChart3, Sparkles } from 'lucide-react';

export const BecomeCreator: React.FC = () => {
    const { becomeCreator } = useAuth();
    const { success, error: toastError } = useToast();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await becomeCreator(name, bio);
            const errorMessage = typeof error === 'string' ? error : error.message || '인스트럭터 등록 중 오류가 발생했습니다.';

            if (error) throw new Error(errorMessage);
            success('인스트럭터 신청이 완료되었습니다! 관리자 승인 후 이용 가능합니다. 🎉');
            navigate('/');
        } catch (err: any) {
            toastError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden pt-20">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-6 backdrop-blur-sm">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-medium text-violet-300">크리에이터 프로그램</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-zinc-50 mb-6 tracking-tight">
                        당신의 기술을 <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">수익</span>으로
                    </h1>
                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
                        전 세계 주짓수 수련자들과 당신의 노하우를 공유하고,<br />
                        지속 가능한 수익을 창출하세요.
                    </p>
                </div>

                {/* Benefits Grid */}
                <div className="grid md:grid-cols-4 gap-6 mb-16">
                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] hover:border-violet-500/30 transition-all duration-300 group">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-white/5">
                            <DollarSign className="w-6 h-6 text-violet-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.5)]" />
                        </div>
                        <h3 className="text-zinc-100 font-bold mb-2 text-lg">높은 수익 분배</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">판매 수익의 80%를 크리에이터에게 지급</p>
                    </div>

                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] hover:border-violet-500/30 transition-all duration-300 group">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-white/5">
                            <TrendingUp className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.5)]" />
                        </div>
                        <h3 className="text-zinc-100 font-bold mb-2 text-lg">구독 수익 배분</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">시청 시간 기반 공정한 수익 분배</p>
                    </div>

                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] hover:border-violet-500/30 transition-all duration-300 group">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-white/5">
                            <BarChart3 className="w-6 h-6 text-violet-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.5)]" />
                        </div>
                        <h3 className="text-zinc-100 font-bold mb-2 text-lg">전문 분석 도구</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">실시간 수익 및 성과 대시보드</p>
                    </div>

                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)] hover:border-violet-500/30 transition-all duration-300 group">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-white/5">
                            <Video className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.5)]" />
                        </div>
                        <h3 className="text-zinc-100 font-bold mb-2 text-lg">무제한 업로드</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">강좌, 드릴, 루틴 제한 없이 업로드</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Application Form */}
                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-[80px] rounded-full pointer-events-none" />

                        <h2 className="text-2xl font-bold text-zinc-50 mb-2 relative z-10">지금 시작하세요</h2>
                        <p className="text-zinc-400 mb-8 relative z-10">간단한 정보 입력으로 크리에이터 신청이 완료됩니다.</p>

                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    크리에이터 이름 <span className="text-violet-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                    placeholder="예: 김기철"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    자기소개 <span className="text-violet-500">*</span>
                                </label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    required
                                    rows={5}
                                    className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none transition-all"
                                    placeholder="경력, 전문 분야, 수상 경력 등을 자유롭게 작성해주세요."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-black tracking-widest rounded-xl transition-all shadow-lg shadow-violet-900/20 hover:shadow-violet-900/40"
                            >
                                {loading ? '신청 중...' : '크리에이터 신청하기'}
                            </button>
                        </form>
                    </div>

                    {/* Info Sections */}
                    <div className="space-y-6">
                        {/* Benefits */}
                        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Award className="w-6 h-6 text-violet-400" />
                                <h3 className="text-xl font-bold text-zinc-50">크리에이터 혜택</h3>
                            </div>
                            <ul className="space-y-4 text-zinc-400">
                                <li className="flex items-start gap-3 group">
                                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full mt-2 group-hover:bg-fuchsia-500 transition-colors"></div>
                                    <span><strong className="text-zinc-200">직접 판매 수익의 80%</strong> 지급 (시장 최고 수준)</span>
                                </li>
                                <li className="flex items-start gap-3 group">
                                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full mt-2 group-hover:bg-fuchsia-500 transition-colors"></div>
                                    <span><strong className="text-zinc-200">구독 수익 배분</strong> (시청 시간 기반)</span>
                                </li>
                                <li className="flex items-start gap-3 group">
                                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full mt-2 group-hover:bg-fuchsia-500 transition-colors"></div>
                                    <span><strong className="text-zinc-200">전용 대시보드</strong> 및 분석 도구</span>
                                </li>
                                <li className="flex items-start gap-3 group">
                                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full mt-2 group-hover:bg-fuchsia-500 transition-colors"></div>
                                    <span><strong className="text-zinc-200">무제한 강좌 업로드</strong></span>
                                </li>
                            </ul>
                        </div>

                        {/* Process */}
                        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-8">
                            <h3 className="text-xl font-bold text-zinc-50 mb-6">승인 절차</h3>
                            <div className="space-y-6">
                                <div className="flex gap-4 group">
                                    <div className="flex-shrink-0 w-8 h-8 bg-zinc-800 text-violet-400 rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-violet-500/10 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-all">
                                        1
                                    </div>
                                    <div>
                                        <h4 className="text-zinc-200 font-semibold mb-1 group-hover:text-violet-300 transition-colors">신청서 제출</h4>
                                        <p className="text-sm text-zinc-500">기본 정보 입력 및 제출</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 group">
                                    <div className="flex-shrink-0 w-8 h-8 bg-zinc-800 text-violet-400 rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-violet-500/10 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-all">
                                        2
                                    </div>
                                    <div>
                                        <h4 className="text-zinc-200 font-semibold mb-1 group-hover:text-violet-300 transition-colors">관리자 검토</h4>
                                        <p className="text-sm text-zinc-500">1-2일 소요 (영업일 기준)</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 group">
                                    <div className="flex-shrink-0 w-8 h-8 bg-zinc-800 text-violet-400 rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-violet-500/10 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-all">
                                        3
                                    </div>
                                    <div>
                                        <h4 className="text-zinc-200 font-semibold mb-1 group-hover:text-violet-300 transition-colors">승인 완료</h4>
                                        <p className="text-sm text-zinc-500">이메일 알림 및 대시보드 접근</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 group">
                                    <div className="flex-shrink-0 w-8 h-8 bg-zinc-800 text-violet-400 rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-violet-500/10 group-hover:bg-violet-500/20 group-hover:text-violet-300 transition-all">
                                        4
                                    </div>
                                    <div>
                                        <h4 className="text-zinc-200 font-semibold mb-1 group-hover:text-violet-300 transition-colors">활동 시작</h4>
                                        <p className="text-sm text-zinc-500">강좌 업로드 및 수익 창출</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
