import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AdminPayoutsTab } from '../../components/admin/AdminPayoutsTab';

export const AdminPayouts: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <Link
                    to="/admin"
                    className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    관리자 대시보드로 돌아가기
                </Link>

                <AdminPayoutsTab />
            </div>
        </div>
    );
};
