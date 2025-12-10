import React from 'react';
import { AdminTestimonialsTab } from '../../components/admin/AdminTestimonialsTab';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminTestimonials: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">고객 후기 관리</h1>
                </div>
                <AdminTestimonialsTab />
            </div>
        </div>
    );
};
