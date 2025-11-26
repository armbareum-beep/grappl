import React from 'react';
import { AdminMarketingTab } from '../../components/admin/AdminMarketingTab';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminMarketing: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 border-b border-red-900/30 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <button
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-2 text-orange-200 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>대시보드로 돌아가기</span>
                    </button>
                    <h1 className="text-3xl font-bold text-white">마케팅 관리</h1>
                    <p className="text-orange-200 mt-2">플랫폼 번들과 쿠폰을 생성하고 관리하세요</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <AdminMarketingTab />
            </div>
        </div>
    );
};
