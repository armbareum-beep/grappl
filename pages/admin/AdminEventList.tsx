import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Calendar, Trophy, Users, MapPin, Search,
    ChevronRight, ArrowRightLeft, Eye, Trash2, X, Check
} from 'lucide-react';
import { fetchEvents, updateEvent } from '../../lib/api-events';
import { getAdminOrganizers } from '../../lib/api-organizers';
import { Event, EventType, Creator } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { supabase } from '../../lib/supabase';

type TabType = 'all' | EventType;

const TABS: { key: TabType; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'all', label: '전체', icon: Calendar, color: 'amber' },
    { key: 'competition', label: '시합', icon: Trophy, color: 'red' },
    { key: 'seminar', label: '세미나', icon: Users, color: 'blue' },
    { key: 'openmat', label: '오픈매트', icon: MapPin, color: 'green' },
];

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; bgColor: string }> = {
    competition: { label: '시합', color: 'text-red-400', bgColor: 'bg-red-500/10' },
    seminar: { label: '세미나', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    openmat: { label: '오픈매트', color: 'text-green-400', bgColor: 'bg-green-500/10' },
};

export const AdminEventList: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { success, error: toastError } = useToast();

    const [events, setEvents] = useState<Event[]>([]);
    const [organizers, setOrganizers] = useState<Creator[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const currentTab = (searchParams.get('type') as TabType) || 'all';

    // Transfer Modal State
    const [transferModal, setTransferModal] = useState<{
        isOpen: boolean;
        event: Event | null;
    }>({ isOpen: false, event: null });
    const [selectedOrganizerId, setSelectedOrganizerId] = useState<string>('');
    const [transferring, setTransferring] = useState(false);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        eventId: string | null;
        eventTitle: string;
    }>({ isOpen: false, eventId: null, eventTitle: '' });

    useEffect(() => {
        loadData();
    }, [currentTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [eventsData, organizersData] = await Promise.all([
                fetchEvents({
                    type: currentTab === 'all' ? undefined : currentTab,
                }),
                getAdminOrganizers(),
            ]);
            setEvents(eventsData);
            setOrganizers(organizersData);
        } catch (error) {
            console.error('Error loading data:', error);
            toastError('데이터 로딩 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab: TabType) => {
        if (tab === 'all') {
            searchParams.delete('type');
        } else {
            searchParams.set('type', tab);
        }
        setSearchParams(searchParams);
    };

    const handleTransfer = async () => {
        if (!transferModal.event || !selectedOrganizerId) return;

        try {
            setTransferring(true);

            const { error } = await supabase
                .from('events')
                .update({ organizer_id: selectedOrganizerId })
                .eq('id', transferModal.event.id);

            if (error) throw error;

            success('이벤트가 성공적으로 이전되었습니다.');
            setTransferModal({ isOpen: false, event: null });
            setSelectedOrganizerId('');
            loadData();
        } catch (error) {
            console.error('Error transferring event:', error);
            toastError('이벤트 이전 중 오류가 발생했습니다.');
        } finally {
            setTransferring(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.eventId) return;

        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', deleteModal.eventId);

            if (error) throw error;

            success('이벤트가 삭제되었습니다.');
            setDeleteModal({ isOpen: false, eventId: null, eventTitle: '' });
            loadData();
        } catch (error) {
            console.error('Error deleting event:', error);
            toastError('이벤트 삭제 중 오류가 발생했습니다.');
        }
    };

    const filteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizerName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'published':
                return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20">공개</span>;
            case 'draft':
                return <span className="px-2 py-0.5 bg-zinc-500/10 text-zinc-400 text-[10px] font-bold rounded border border-zinc-500/20">임시저장</span>;
            case 'cancelled':
                return <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded border border-red-500/20">취소됨</span>;
            case 'completed':
                return <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded border border-blue-500/20">완료</span>;
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
                                이벤트 관리
                            </h1>
                            <p className="text-zinc-400 mt-1">전체 이벤트를 관리하고 주최자에게 이전할 수 있습니다.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-bold">{filteredEvents.length}개</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = currentTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                                    isActive
                                        ? `bg-${tab.color}-500 text-white`
                                        : `bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700`
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="이벤트명 또는 주최자 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                    />
                </div>

                {/* Events List */}
                {filteredEvents.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                        <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-zinc-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">이벤트가 없습니다</h3>
                        <p className="text-zinc-500">해당 조건에 맞는 이벤트가 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredEvents.map((event) => {
                            const typeConfig = EVENT_TYPE_CONFIG[event.type];
                            return (
                                <div
                                    key={event.id}
                                    className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4 backdrop-blur-sm group hover:border-amber-500/20 transition-all"
                                >
                                    {/* Cover Image */}
                                    <div className="w-full md:w-32 h-24 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                                        {event.coverImage ? (
                                            <img
                                                src={event.coverImage}
                                                alt={event.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                {event.type === 'competition' && <Trophy className="w-8 h-8 text-red-400" />}
                                                {event.type === 'seminar' && <Users className="w-8 h-8 text-blue-400" />}
                                                {event.type === 'openmat' && <MapPin className="w-8 h-8 text-green-400" />}
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${typeConfig.bgColor} ${typeConfig.color} border border-current/20`}>
                                                {typeConfig.label}
                                            </span>
                                            {getStatusBadge(event.status)}
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                                            {event.title}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-zinc-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(event.eventDate).toLocaleDateString('ko-KR', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                            {event.organizerName && (
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {event.organizerName}
                                                </span>
                                            )}
                                            {event.venueName && (
                                                <span className="flex items-center gap-1 truncate">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    {event.venueName}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <button
                                            onClick={() => navigate(`/event/${event.id}`)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-all"
                                        >
                                            <Eye className="w-4 h-4" />
                                            <span className="hidden md:inline">보기</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTransferModal({ isOpen: true, event });
                                                setSelectedOrganizerId('');
                                            }}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-sm font-medium transition-all"
                                        >
                                            <ArrowRightLeft className="w-4 h-4" />
                                            <span className="hidden md:inline">이전</span>
                                        </button>
                                        <button
                                            onClick={() => setDeleteModal({
                                                isOpen: true,
                                                eventId: event.id,
                                                eventTitle: event.title
                                            })}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="hidden md:inline">삭제</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Transfer Modal */}
            {transferModal.isOpen && transferModal.event && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-zinc-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">이벤트 이전</h3>
                                <button
                                    onClick={() => setTransferModal({ isOpen: false, event: null })}
                                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-sm text-zinc-500 mt-2">
                                "{transferModal.event.title}"을(를) 다른 주최자에게 이전합니다.
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    새 주최자 선택
                                </label>
                                <select
                                    value={selectedOrganizerId}
                                    onChange={(e) => setSelectedOrganizerId(e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                                >
                                    <option value="">주최자를 선택하세요</option>
                                    {organizers
                                        .filter(org => org.id !== transferModal.event?.organizerId)
                                        .map(org => (
                                            <option key={org.id} value={org.id}>
                                                {org.name} {org.email ? `(${org.email})` : ''}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            {selectedOrganizerId && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <p className="text-sm text-amber-400">
                                        선택한 주최자에게 이 이벤트의 모든 권한이 이전됩니다.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-zinc-800 flex gap-3">
                            <button
                                onClick={() => setTransferModal({ isOpen: false, event: null })}
                                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-all"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleTransfer}
                                disabled={!selectedOrganizerId || transferring}
                                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {transferring ? (
                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        이전하기
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, eventId: null, eventTitle: '' })}
                onConfirm={handleDelete}
                title="이벤트 삭제"
                message={`'${deleteModal.eventTitle}'을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
                confirmText="삭제"
                cancelText="취소"
                variant="danger"
            />
        </div>
    );
};

export default AdminEventList;
