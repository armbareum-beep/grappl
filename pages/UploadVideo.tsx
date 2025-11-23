import React from 'react';
import { VideoUploader } from '../components/VideoUploader';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export const UploadVideo: React.FC = () => {
    const { user, isCreator } = useAuth();

    // 크리에이터만 접근 가능
    if (!user) {
        return <Navigate to="/login" />;
    }

    if (!isCreator) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">
                        크리에이터 전용
                    </h2>
                    <p className="text-slate-600 mb-6">
                        영상을 업로드하려면 크리에이터 승인이 필요합니다.
                    </p>
                    <a
                        href="/become-creator"
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        크리에이터 신청하기
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <VideoUploader />
        </div>
    );
};
