import React from 'react';
import { AdminTestimonialsTab } from '../../components/admin/AdminTestimonialsTab';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminTestimonials: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-violet-600/10 blur-[100px] -z-10" />
                <div className="absolute top-0 left-0 w-[300px] h-[200px] bg-amber-600/5 blur-[100px] -z-10" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <button
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-all group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">대시보드로 돌아가기</span>
                    </button>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black tracking-tighter text-white">고객 후기 관리</h1>
                        <p className="text-zinc-400 max-w-2xl text-lg leading-relaxed">
                            사용자들의 진솔한 피드백을 관리하여 플랫폼의 신뢰도를 높이고 커뮤니티 성장을 도모합니다.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <AdminTestimonialsTab />
            </div>
        </div>
    );
};
