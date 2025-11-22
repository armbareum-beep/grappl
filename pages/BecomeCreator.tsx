import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Upload, Award, TrendingUp, Users } from 'lucide-react';

export const BecomeCreator: React.FC = () => {
    const { user, becomeCreator } = useAuth();
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
            alert('인스트럭터 신청이 완료되었습니다! 관리자 승인 후 이용 가능합니다. 🎉');
            navigate('/');
        } catch (err: any) {
            alert(err.message || '오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">인스트럭터 되기</h1>
                <p className="text-slate-600 mb-8">당신의 지식과 경험을 공유하세요</p>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">신청 정보</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    인스트럭터 이름 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="프로필에 표시될 이름"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    자기소개 <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    required
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="당신의 경력과 전문성을 소개해주세요"
                                />
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-bold text-blue-900 mb-2">✨ 인스트럭터 혜택</h3>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• 강좌 판매 수익의 80% 지급</li>
                                    <li>• 구독 수익 배분</li>
                                    <li>• 전문 인스트럭터 프로필</li>
                                    <li>• 수강생 관리 도구</li>
                                </ul>
                            </div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? '등록 중...' : '인스트럭터 시작하기'}
                            </Button>
                        </form>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Upload className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900">콘텐츠 업로드</h3>
                            </div>
                            <p className="text-slate-600 text-sm">
                                고화질 영상을 업로드하고 체계적인 강좌를 만들어보세요.
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-green-600" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900">수익 창출</h3>
                            </div>
                            <p className="text-slate-600 text-sm">
                                강좌 판매와 구독 수익으로 안정적인 수입을 만드세요.
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                    <Users className="w-6 h-6 text-purple-600" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900">커뮤니티 구축</h3>
                            </div>
                            <p className="text-slate-600 text-sm">
                                열정적인 수강생들과 함께 성장하는 커뮤니티를 만드세요.
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                    <Award className="w-6 h-6 text-orange-600" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900">전문성 인정</h3>
                            </div>
                            <p className="text-slate-600 text-sm">
                                검증된 인스트럭터로서 업계에서 인정받으세요.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
