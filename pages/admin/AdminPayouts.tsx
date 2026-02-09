import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AdminPayoutsTab } from '../../components/admin/AdminPayoutsTab';

export const AdminPayouts: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center text-sm text-zinc-500 hover:text-white mb-10 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">뒤로가기</span>
                </button>

                <AdminPayoutsTab />
            </div>
        </div>
    );
};
