import React from 'react';
import { AdminMarketingTab } from '../../components/admin/AdminMarketingTab';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminMarketing: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-violet-600/10 blur-[100px] -z-10" />
                <div className="absolute top-0 left-0 w-[300px] h-[200px] bg-emerald-600/5 blur-[100px] -z-10" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-all group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">뒤로가기</span>
                    </button>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black tracking-tighter text-white">마케팅 관리</h1>
                        <p className="text-zinc-400 max-w-2xl text-lg leading-relaxed">
                            플랫폼 전용 번들 상품과 할인 쿠폰을 설계하여 사용자 경험을 고도화하고 매출을 극대화합니다.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <AdminMarketingTab />
            </div>
        </div>
    );
};
