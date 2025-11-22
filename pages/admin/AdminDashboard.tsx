import React from 'react';
import { Link } from 'react-router-dom';
import { Star, BookOpen, Users, Home, Package } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">관리자 대시보드</h1>
                    <p className="text-lg text-slate-600">플랫폼 관리 기능을 선택하세요</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Featured Content Management */}
                    <Link to="/admin/featured">
                        <div className="bg-white rounded-xl border border-slate-200 p-8 hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                <Star className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">홈 화면 관리</h2>
                            <p className="text-slate-600 text-sm">
                                인기 강좌와 대표 인스트럭터를 선택하여 홈 화면을 구성하세요
                            </p>
                        </div>
                    </Link>

                    {/* Course Management */}
                    <Link to="/admin/courses">
                        <div className="bg-white rounded-xl border border-slate-200 p-8 hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">강좌 관리</h2>
                            <p className="text-slate-600 text-sm">
                                모든 강좌를 조회하고 수정 또는 삭제할 수 있습니다
                            </p>
                        </div>
                    </Link>

                    {/* Creator Approval */}
                    <Link to="/admin/creators">
                        <div className="bg-white rounded-xl border border-slate-200 p-8 hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                                <Users className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">인스트럭터 승인</h2>
                            <p className="text-slate-600 text-sm">
                                인스트럭터 신청을 검토하고 승인 또는 거부하세요
                            </p>
                        </div>
                    </Link>

                    {/* Marketing Management */}
                    <Link to="/admin/marketing">
                        <div className="bg-white rounded-xl border border-slate-200 p-8 hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
                                <Package className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">마케팅 관리</h2>
                            <p className="text-slate-600 text-sm">
                                플랫폼 번들과 쿠폰을 생성하고 관리하세요
                            </p>
                        </div>
                    </Link>

                    {/* Back to Home */}
                    <Link to="/">
                        <div className="bg-white rounded-xl border border-slate-200 p-8 hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mb-4">
                                <Home className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">홈으로 돌아가기</h2>
                            <p className="text-slate-600 text-sm">
                                메인 페이지로 이동합니다
                            </p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};
