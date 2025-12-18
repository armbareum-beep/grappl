import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/Button';
import { Upload, DollarSign, TrendingUp, Users, Award, Video, BarChart3, Sparkles } from 'lucide-react';

export const BecomeCreator: React.FC = () => {
    const { user, becomeCreator } = useAuth();
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
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">크리에이터 프로그램</span>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-4">
                        당신의 기술을 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">수익</span>으로
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        전 세계 주짓수 수련자들과 당신의 노하우를 공유하고,<br />
                        지속 가능한 수익을 창출하세요.
                    </p>
                </div>

                {/* Benefits Grid */}
                <div className="grid md:grid-cols-4 gap-6 mb-16">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-blue-500/50 transition-colors">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                            <DollarSign className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-white font-bold mb-2">높은 수익 분배</h3>
                        <p className="text-slate-400 text-sm">판매 수익의 80%를 크리에이터에게 지급</p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-purple-500/50 transition-colors">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                            <TrendingUp className="w-6 h-6 text-purple-400" />
                        </div>
                        <h3 className="text-white font-bold mb-2">구독 수익 배분</h3>
                        <p className="text-slate-400 text-sm">시청 시간 기반 공정한 수익 분배</p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-green-500/50 transition-colors">
                        <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                            <BarChart3 className="w-6 h-6 text-green-400" />
                        </div>
                        <h3 className="text-white font-bold mb-2">전문 분석 도구</h3>
                        <p className="text-slate-400 text-sm">실시간 수익 및 성과 대시보드</p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-yellow-500/50 transition-colors">
                        <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center mb-4">
                            <Video className="w-6 h-6 text-yellow-400" />
                        </div>
                        <h3 className="text-white font-bold mb-2">무제한 업로드</h3>
                        <p className="text-slate-400 text-sm">강좌, 드릴, 루틴 제한 없이 업로드</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Application Form */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                        <h2 className="text-2xl font-bold text-white mb-2">지금 시작하세요</h2>
                        <p className="text-slate-400 mb-6">간단한 정보 입력으로 크리에이터 신청이 완료됩니다.</p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    크리에이터 이름 <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="예: 김기철"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    자기소개 <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    required
                                    rows={5}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="경력, 전문 분야, 수상 경력 등을 자유롭게 작성해주세요."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
                            >
                                {loading ? '신청 중...' : '크리에이터 신청하기'}
                            </button>
                        </form>
                    </div>

                    {/* Info Sections */}
                    <div className="space-y-6">
                        {/* Benefits */}
                        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Award className="w-6 h-6 text-blue-400" />
                                <h3 className="text-xl font-bold text-white">크리에이터 혜택</h3>
                            </div>
                            <ul className="space-y-3 text-slate-300">
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                                    <span><strong className="text-white">직접 판매 수익의 80%</strong> 지급 (시장 최고 수준)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                                    <span><strong className="text-white">구독 수익 배분</strong> (시청 시간 기반)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                                    <span><strong className="text-white">전용 대시보드</strong> 및 분석 도구</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></div>
                                    <span><strong className="text-white">무제한 강좌 업로드</strong></span>
                                </li>
                            </ul>
                        </div>

                        {/* Process */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                            <h3 className="text-xl font-bold text-white mb-4">승인 절차</h3>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center font-bold text-sm">
                                        1
                                    </div>
                                    <div>
                                        <h4 className="text-white font-semibold mb-1">신청서 제출</h4>
                                        <p className="text-sm text-slate-400">기본 정보 입력 및 제출</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center font-bold text-sm">
                                        2
                                    </div>
                                    <div>
                                        <h4 className="text-white font-semibold mb-1">관리자 검토</h4>
                                        <p className="text-sm text-slate-400">1-2일 소요 (영업일 기준)</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center font-bold text-sm">
                                        3
                                    </div>
                                    <div>
                                        <h4 className="text-white font-semibold mb-1">승인 완료</h4>
                                        <p className="text-sm text-slate-400">이메일 알림 및 대시보드 접근</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center font-bold text-sm">
                                        4
                                    </div>
                                    <div>
                                        <h4 className="text-white font-semibold mb-1">활동 시작</h4>
                                        <p className="text-sm text-slate-400">강좌 업로드 및 수익 창출</p>
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
