import React, { useEffect, useState } from 'react';
import { getPendingCreators, approveCreator, rejectCreator, getUserEmail } from '../../lib/api';
import { CheckCircle, XCircle, Clock, Mail, User as UserIcon } from 'lucide-react';

interface PendingCreator {
    id: string;
    name: string;
    bio: string;
    profile_image: string;
    created_at: string;
    approved: boolean;
}

export const CreatorApprovalList: React.FC = () => {
    const [creators, setCreators] = useState<PendingCreator[]>([]);
    const [loading, setLoading] = useState(true);
    const [emails, setEmails] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchPendingCreators();
    }, []);

    const fetchPendingCreators = async () => {
        setLoading(true);
        const { data, error } = await getPendingCreators();

        if (error) {
            console.error('Error fetching creators:', error);
            setLoading(false);
            return;
        }

        if (data) {
            setCreators(data);
            // Fetch emails for all creators
            data.forEach(async (creator) => {
                const { data: email } = await getUserEmail(creator.id);
                if (email) {
                    setEmails(prev => ({ ...prev, [creator.id]: email }));
                }
            });
        }

        setLoading(false);
    };

    const handleApprove = async (creatorId: string) => {
        if (!window.confirm('이 인스트럭터를 승인하시겠습니까?')) return;

        const { error } = await approveCreator(creatorId);

        if (error) {
            alert('승인 중 오류가 발생했습니다: ' + error.message);
            return;
        }

        alert('인스트럭터가 승인되었습니다! 🎉');
        fetchPendingCreators(); // Refresh list
    };

    const handleReject = async (creatorId: string) => {
        if (!window.confirm('이 인스트럭터 신청을 거부하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        const { error } = await rejectCreator(creatorId);

        if (error) {
            alert('거부 중 오류가 발생했습니다: ' + error.message);
            return;
        }

        alert('인스트럭터 신청이 거부되었습니다.');
        fetchPendingCreators(); // Refresh list
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-slate-600">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">인스트럭터 승인 관리</h1>
                <p className="text-slate-600">승인 대기 중인 인스트럭터 신청을 관리합니다.</p>
            </div>

            {creators.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">승인 대기 중인 신청이 없습니다</h3>
                    <p className="text-slate-600">새로운 인스트럭터 신청이 들어오면 여기에 표시됩니다.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {creators.map((creator) => (
                        <div key={creator.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3 mb-3">
                                        <img
                                            src={creator.profile_image}
                                            alt={creator.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">{creator.name}</h3>
                                            {emails[creator.id] && (
                                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                                    <Mail className="w-3 h-3" />
                                                    <span>{emails[creator.id]}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-1">자기소개</h4>
                                        <p className="text-slate-600">{creator.bio}</p>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <UserIcon className="w-3 h-3" />
                                            <span>ID: {creator.id.substring(0, 8)}...</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>신청일: {new Date(creator.created_at).toLocaleDateString('ko-KR')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={() => handleApprove(creator.id)}
                                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        승인
                                    </button>
                                    <button
                                        onClick={() => handleReject(creator.id)}
                                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        거부
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
