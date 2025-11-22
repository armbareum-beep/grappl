import React from 'react';
import { AdminMarketingTab } from '../../components/admin/AdminMarketingTab';

export const AdminMarketing: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-white">마케팅 관리</h1>
                    <p className="text-orange-100 mt-2">플랫폼 번들과 쿠폰을 생성하고 관리하세요</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <AdminMarketingTab />
            </div>
        </div>
    );
};
