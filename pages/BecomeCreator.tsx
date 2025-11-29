import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/Button';
import { Upload, DollarSign, TrendingUp, Users } from 'lucide-react';

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
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">인스트럭터 되기</h1>
                <p className="text-slate-600 mb-8">당신의 지식과 경험을 공유하고 수익을 창출하세요.</p>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">신청 정보</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    인스트럭터 이름 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="예: 김기철"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    소개 <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    required
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="자신의 경력과 전문 분야를 소개해주세요."
                                />
                            </div>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? '등록 중...' : '인스트럭터 시작하기'}
                            </Button>
                        </form>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                            <h3 className="font-bold text-blue-900 mb-2">✨ 인스트럭터 혜택</h3>
                            <ul className="space-y-2 text-sm text-blue-800">
                                <li className="flex items-start">
                                    <DollarSign className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                    <span>직접 판매 수익의 80% 지급</span>
                                </li>
                                <li className="flex items-start">
                                    <TrendingUp className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                    <span>구독 수익 배분 (시청 시간 기반)</span>
                                </li>
                                <li className="flex items-start">
                                    <Users className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                    <span>전용 대시보드 및 분석 도구</span>
                                </li>
                                <li className="flex items-start">
                                    <Upload className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                    <span>무제한 강좌 업로드</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-900 mb-2">📋 승인 절차</h3>
                            <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
                                <li>신청서 제출</li>
                                <li>관리자 검토 (1-2일 소요)</li>
                                <li>승인 완료 시 이메일 알림</li>
                                <li>인스트럭터 대시보드 이용 시작</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
