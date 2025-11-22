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
        if (!window.confirm('???¬ë¦¬?ì´?°ë? ?¹ì¸?˜ì‹œê² ìŠµ?ˆê¹Œ?')) return;

        const { error } = await approveCreator(creatorId);

        if (error) {
            alert('?¹ì¸ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤: ' + error.message);
            return;
        }

        alert('?¬ë¦¬?ì´?°ê? ?¹ì¸?˜ì—ˆ?µë‹ˆ?? ?‰');
        fetchPendingCreators(); // Refresh list
    };

    const handleReject = async (creatorId: string) => {
        if (!window.confirm('???¬ë¦¬?ì´??? ì²­??ê±°ë??˜ì‹œê² ìŠµ?ˆê¹Œ? ???‘ì—…?€ ?˜ëŒë¦????†ìŠµ?ˆë‹¤.')) return;

        const { error } = await rejectCreator(creatorId);

        if (error) {
            alert('ê±°ë? ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤: ' + error.message);
            return;
        }

        alert('?¬ë¦¬?ì´??? ì²­??ê±°ë??˜ì—ˆ?µë‹ˆ??');
        fetchPendingCreators(); // Refresh list
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-slate-600">ë¡œë”© ì¤?..</div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">?¬ë¦¬?ì´???¹ì¸ ê´€ë¦?/h1>
                <p className="text-slate-600">?¹ì¸ ?€ê¸?ì¤‘ì¸ ?¬ë¦¬?ì´??? ì²­??ê´€ë¦¬í•©?ˆë‹¤.</p>
            </div>

            {creators.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">?¹ì¸ ?€ê¸?ì¤‘ì¸ ? ì²­???†ìŠµ?ˆë‹¤</h3>
                    <p className="text-slate-600">?ˆë¡œ???¬ë¦¬?ì´??? ì²­???¤ì–´?¤ë©´ ?¬ê¸°???œì‹œ?©ë‹ˆ??</p>
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
                                        <h4 className="text-sm font-semibold text-slate-700 mb-1">?ê¸°?Œê°œ</h4>
                                        <p className="text-slate-600">{creator.bio}</p>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <UserIcon className="w-3 h-3" />
                                            <span>ID: {creator.id.substring(0, 8)}...</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>? ì²­?? {new Date(creator.created_at).toLocaleDateString('ko-KR')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 ml-4">
                                    <button
                                        onClick={() => handleApprove(creator.id)}
                                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        ?¹ì¸
                                    </button>
                                    <button
                                        onClick={() => handleReject(creator.id)}
                                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        ê±°ë?
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
