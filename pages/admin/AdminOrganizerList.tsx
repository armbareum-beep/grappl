import React, { useEffect, useState } from 'react';
import { getAdminOrganizers, revokeOrganizerStatus } from '../../lib/api-organizers';
import { Creator } from '../../types';
import { User, ArrowLeft, Flag, Users, Eye, EyeOff, Calendar, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { supabase } from '../../lib/supabase';

interface OrganizerWithEvents extends Creator {
    eventsCount?: number;
    upcomingEventsCount?: number;
}

export const AdminOrganizerList: React.FC = () => {
    const navigate = useNavigate();
    const { success, error: toastError } = useToast();
    const [organizers, setOrganizers] = useState<OrganizerWithEvents[]>([]);
    const [loading, setLoading] = useState(true);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        organizerId: string | null;
        organizerName: string;
    }>({ isOpen: false, organizerId: null, organizerName: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getAdminOrganizers();

            // Fetch event counts for each organizer
            const organizersWithCounts = await Promise.all(
                data.map(async (org) => {
                    const { count: totalCount } = await supabase
                        .from('events')
                        .select('*', { count: 'exact', head: true })
                        .eq('organizer_id', org.id);

                    const { count: upcomingCount } = await supabase
                        .from('events')
                        .select('*', { count: 'exact', head: true })
                        .eq('organizer_id', org.id)
                        .gte('event_date', new Date().toISOString().split('T')[0]);

                    return {
                        ...org,
                        eventsCount: totalCount || 0,
                        upcomingEventsCount: upcomingCount || 0,
                    };
                })
            );

            setOrganizers(organizersWithCounts);
        } catch (error) {
            console.error('Error fetching organizers:', error);
            toastError('주최자 목록 조회 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeOrganizer = async () => {
        if (!confirmModal.organizerId) return;

        try {
            const { error } = await revokeOrganizerStatus(confirmModal.organizerId);
            if (error) throw error;

            // Remove from list or update
            setOrganizers(organizers.filter(o => o.id !== confirmModal.organizerId));
            success('주최자 권한이 해제되었습니다.');
        } catch (error) {
            console.error('Error revoking organizer:', error);
            toastError('권한 해제 중 오류가 발생했습니다.');
        } finally {
            setConfirmModal({ isOpen: false, organizerId: null, organizerName: '' });
        }
    };

    const getCreatorTypeBadge = (type: string | undefined) => {
        switch (type) {
            case 'both':
                return (
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase rounded border border-purple-500/20">
                        인스트럭터 + 주최자
                    </span>
                );
            case 'organizer':
                return (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase rounded border border-amber-500/20">
                        주최자 전용
                    </span>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-950">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-amber-600/10 blur-[100px] -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">
                                주최자 관리
                            </h1>
                            <p className="text-zinc-400 mt-1">행사를 개최할 수 있는 주최자 목록을 관리합니다.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                        <Flag className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-bold">{organizers.length}명</span>
                    </div>
                </div>

                {/* Organizers List */}
                {organizers.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                        <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Flag className="w-8 h-8 text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">등록된 주최자가 없습니다.</h3>
                        <p className="text-zinc-500">사용자 관리에서 주최자로 등업할 수 있습니다.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {organizers.map((organizer) => (
                            <div key={organizer.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 backdrop-blur-sm group hover:border-amber-500/20 transition-all">
                                <div className="relative w-24 h-24 flex-shrink-0">
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-xl">
                                        {organizer.profileImage ? (
                                            <img
                                                src={organizer.profileImage}
                                                alt={organizer.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                                <User className="w-8 h-8 text-zinc-600" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black rounded-full flex items-center justify-center border border-zinc-800">
                                        <Flag className="w-4 h-4 text-amber-400" />
                                    </div>
                                </div>

                                <div className="flex-1 text-center md:text-left space-y-2 w-full">
                                    <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                        <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                                            {organizer.name === 'Organizer' && organizer.email ? organizer.email.split('@')[0] : organizer.name}
                                        </h3>
                                        {getCreatorTypeBadge(organizer.creatorType)}
                                        {organizer.verifiedOrganizer && (
                                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase rounded border border-emerald-500/20">
                                                인증됨
                                            </span>
                                        )}
                                    </div>
                                    {organizer.email && (
                                        <p className="text-xs text-zinc-500 font-mono">
                                            {organizer.email}
                                        </p>
                                    )}
                                    <p className="text-zinc-400 text-sm line-clamp-2 max-w-2xl">
                                        {organizer.bio || '소개글이 없습니다.'}
                                    </p>

                                    {/* Stats */}
                                    <div className="flex items-center justify-center md:justify-start gap-6 text-xs font-mono text-zinc-500 pt-2">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3 text-amber-500" />
                                            <span>총 {organizer.eventsCount || 0}개 행사</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3 text-emerald-500" />
                                            <span>예정 {organizer.upcomingEventsCount || 0}개</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                                    <button
                                        onClick={() => navigate(`/organizer/${organizer.id}`)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium transition-all"
                                    >
                                        <Eye className="w-4 h-4" />
                                        프로필 보기
                                    </button>
                                    <button
                                        onClick={() => setConfirmModal({
                                            isOpen: true,
                                            organizerId: organizer.id,
                                            organizerName: organizer.name
                                        })}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl text-sm font-medium transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                        권한 해제
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, organizerId: null, organizerName: '' })}
                onConfirm={handleRevokeOrganizer}
                title="주최자 권한 해제"
                message={`'${confirmModal.organizerName}'의 주최자 권한을 해제하시겠습니까? 더 이상 행사를 개최할 수 없게 됩니다.`}
                confirmText="권한 해제"
                cancelText="취소"
                variant="danger"
            />
        </div>
    );
};
