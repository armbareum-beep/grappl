import React, { useEffect, useState } from 'react';
import { getPendingCreators, approveCreator, rejectCreator } from '../../lib/api';
import { Creator } from '../../types';
import { Button } from '../../components/Button';
import { Check, X, User, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CreatorApprovalList: React.FC = () => {
    const navigate = useNavigate();
    const [creators, setCreators] = useState<Creator[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPendingCreators();
    }, []);

    async function fetchPendingCreators() {
        try {
            const { data } = await getPendingCreators();
            if (data) {
                const mappedCreators: Creator[] = data.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    bio: item.bio,
                    profileImage: item.profile_image,
                    subscriberCount: 0, // Default value as it's not in the pending list query
                    isCreator: false // Pending creators are not yet creators
                }));
                setCreators(mappedCreators);
            }
        } catch (error) {
            console.error('Error fetching pending creators:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleApprove = async (creatorId: string) => {
        if (!window.confirm('이 인스트럭터를 승인하시겠습니까?')) return;

        try {
            const { error } = await approveCreator(creatorId);
            if (error) throw error;

            setCreators(creators.filter(c => c.id !== creatorId));
            alert('인스트럭터가 승인되었습니다! 🎉');
        } catch (error) {
            console.error('Error approving creator:', error);
            alert('승인 중 오류가 발생했습니다.');
        }
    };

    const handleReject = async (creatorId: string) => {
        if (!window.confirm('이 인스트럭터 신청을 거부하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            const { error } = await rejectCreator(creatorId);
            if (error) throw error;

            setCreators(creators.filter(c => c.id !== creatorId));
            alert('인스트럭터 신청이 거부되었습니다.');
        } catch (error) {
            console.error('Error rejecting creator:', error);
            alert('거부 중 오류가 발생했습니다.');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white mb-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>대시보드로 돌아가기</span>
                    </button>
                    <h1 className="text-3xl font-bold text-white mb-2">인스트럭터 승인 관리</h1>
                    <p className="text-slate-400">승인 대기 중인 인스트럭터 신청을 관리합니다.</p>
                </div>

                {creators.length === 0 ? (
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
                        <User className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white">대기 중인 신청이 없습니다</h3>
                        <p className="text-slate-500">새로운 인스트럭터 신청이 들어오면 여기에 표시됩니다.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {creators.map((creator) => (
                            <div key={creator.id} className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
                                <img
                                    src={creator.profileImage}
                                    alt={creator.name}
                                    className="w-16 h-16 rounded-full object-cover bg-slate-800"
                                />

                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white mb-1">{creator.name}</h3>
                                    <p className="text-slate-400 mb-2">{creator.bio}</p>
                                    <div className="text-sm text-slate-500">
                                        신청일: {new Date().toLocaleDateString()}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <Button
                                        onClick={() => handleApprove(creator.id)}
                                        className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white border-none"
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        승인
                                    </Button>
                                    <Button
                                        onClick={() => handleReject(creator.id)}
                                        variant="outline"
                                        className="flex-1 md:flex-none border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        거부
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
