import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Users, Trophy, Clock, ArrowRight, Settings, BarChart3, Video, CheckCircle, Tag, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingScreen } from '../../components/LoadingScreen';
import { fetchEvents } from '../../lib/api-events';
import { getOrganizerStats, enableContentCreation, fetchOrganizerById, fetchBrandsByCreator } from '../../lib/api-organizers';
import { Event, Creator, EventBrand } from '../../types';

const EventTypeLabel: React.FC<{ type: string }> = ({ type }) => {
    const config = {
        competition: { label: '시합', color: 'bg-red-500/20 text-red-400' },
        seminar: { label: '세미나', color: 'bg-blue-500/20 text-blue-400' },
        openmat: { label: '오픈매트', color: 'bg-green-500/20 text-green-400' },
    }[type] || { label: type, color: 'bg-zinc-500/20 text-zinc-400' };

    return (
        <span className={`px-2 py-1 text-xs font-bold rounded-full ${config.color}`}>
            {config.label}
        </span>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config = {
        draft: { label: '임시저장', color: 'bg-zinc-500/20 text-zinc-400' },
        published: { label: '공개', color: 'bg-green-500/20 text-green-400' },
        cancelled: { label: '취소됨', color: 'bg-red-500/20 text-red-400' },
        completed: { label: '종료', color: 'bg-blue-500/20 text-blue-400' },
    }[status] || { label: status, color: 'bg-zinc-500/20 text-zinc-400' };

    return (
        <span className={`px-2 py-1 text-xs font-bold rounded-full ${config.color}`}>
            {config.label}
        </span>
    );
};

export const OrganizerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, isOrganizer, loading: authLoading } = useAuth();
    const { success, error: toastError } = useToast();
    const [events, setEvents] = useState<Event[]>([]);
    const [brands, setBrands] = useState<EventBrand[]>([]);
    const [organizer, setOrganizer] = useState<Creator | null>(null);
    const [stats, setStats] = useState<{ totalEvents: number; avgRating: number; reviewCount: number; totalParticipants: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [enablingContent, setEnablingContent] = useState(false);

    const organizerId = user?.id;
    const defaultBrand = brands.find(b => b.isDefault) || brands[0];

    useEffect(() => {
        async function fetchData() {
            if (!organizerId) return;

            // 개별적으로 불러와서 하나가 실패해도 다른 것들은 표시
            try {
                const eventsData = await fetchEvents({ organizerId });
                setEvents(eventsData);
            } catch (error) {
                console.error('Error fetching events:', error);
            }

            try {
                const statsData = await getOrganizerStats(organizerId);
                setStats(statsData);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }

            try {
                const organizerData = await fetchOrganizerById(organizerId);
                setOrganizer(organizerData);
            } catch (error) {
                console.error('Error fetching organizer:', error);
            }

            try {
                const brandsData = await fetchBrandsByCreator(organizerId);
                setBrands(brandsData);
            } catch (error) {
                console.error('Error fetching brands:', error);
            }

            setLoading(false);
        }

        if (!authLoading && isOrganizer && organizerId) {
            fetchData();
        } else if (!authLoading && !isOrganizer) {
            setLoading(false);
        }
    }, [organizerId, isOrganizer, authLoading]);

    const handleEnableContentCreation = async () => {
        if (!organizerId) return;

        setEnablingContent(true);
        try {
            const updated = await enableContentCreation(organizerId);
            setOrganizer(updated);
            success('영상 업로드 기능이 활성화되었습니다!');
        } catch (err: any) {
            toastError(err.message || '활성화 중 오류가 발생했습니다.');
        } finally {
            setEnablingContent(false);
        }
    };

    const canUploadVideos = organizer?.creatorType === 'both';

    if (authLoading || loading) {
        return <LoadingScreen message="대시보드 불러오는 중..." />;
    }

    if (!user) {
        navigate('/login');
        return null;
    }

    if (!isOrganizer) {
        navigate('/home');
        return null;
    }

    const now = new Date();
    const upcomingEvents = events
        .filter(e => new Date(e.eventDate) >= now && e.status === 'published')
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    const draftEvents = events.filter(e => e.status === 'draft');

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 py-8 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-black">주최자 대시보드</h1>
                            <p className="text-zinc-400 mt-1">이벤트를 관리하고 참가자를 확인하세요</p>
                        </div>
                        <button
                            onClick={() => navigate('/organizer/create-event')}
                            className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            <span>이벤트 만들기</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Trophy className="w-8 h-8 text-amber-500" />
                            <BarChart3 className="w-5 h-5 text-zinc-600" />
                        </div>
                        <div className="text-3xl font-black">{stats?.totalEvents || 0}</div>
                        <div className="text-sm text-zinc-500">총 이벤트</div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Users className="w-8 h-8 text-amber-500" />
                            <BarChart3 className="w-5 h-5 text-zinc-600" />
                        </div>
                        <div className="text-3xl font-black">{stats?.totalParticipants || 0}</div>
                        <div className="text-sm text-zinc-500">총 참가자</div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Calendar className="w-8 h-8 text-amber-500" />
                            <BarChart3 className="w-5 h-5 text-zinc-600" />
                        </div>
                        <div className="text-3xl font-black">{upcomingEvents.length}</div>
                        <div className="text-sm text-zinc-500">예정된 이벤트</div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Clock className="w-8 h-8 text-amber-500" />
                            <BarChart3 className="w-5 h-5 text-zinc-600" />
                        </div>
                        <div className="text-3xl font-black">{stats?.avgRating || '-'}</div>
                        <div className="text-sm text-zinc-500">평균 평점</div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <button
                        onClick={() => navigate('/organizer/create-event')}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-6 text-left hover:from-amber-500 hover:to-orange-500 transition-all group"
                    >
                        <Trophy className="w-10 h-10 mb-4" />
                        <h3 className="text-xl font-bold mb-1">시합 만들기</h3>
                        <p className="text-white/70 text-sm">대진표와 타이머로 시합 운영</p>
                        <ArrowRight className="w-5 h-5 mt-4 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                        onClick={() => navigate('/organizer/create-event?type=seminar')}
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left hover:border-amber-500/50 transition-all group"
                    >
                        <Users className="w-10 h-10 mb-4 text-blue-400" />
                        <h3 className="text-xl font-bold mb-1">세미나 만들기</h3>
                        <p className="text-zinc-400 text-sm">지도자 초청 세미나 개최</p>
                        <ArrowRight className="w-5 h-5 mt-4 text-zinc-600 group-hover:translate-x-1 group-hover:text-amber-400 transition-all" />
                    </button>

                    <button
                        onClick={() => navigate('/organizer/create-event?type=openmat')}
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left hover:border-amber-500/50 transition-all group"
                    >
                        <Calendar className="w-10 h-10 mb-4 text-green-400" />
                        <h3 className="text-xl font-bold mb-1">오픈매트 만들기</h3>
                        <p className="text-zinc-400 text-sm">자유롭게 스파링하는 시간</p>
                        <ArrowRight className="w-5 h-5 mt-4 text-zinc-600 group-hover:translate-x-1 group-hover:text-amber-400 transition-all" />
                    </button>

                    {/* Video Upload Card */}
                    {canUploadVideos ? (
                        <button
                            onClick={() => navigate('/creator/dashboard')}
                            className="bg-zinc-900 border border-violet-500/30 rounded-2xl p-6 text-left hover:border-violet-500/50 transition-all group"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Video className="w-10 h-10 text-violet-400" />
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-1">영상 관리</h3>
                            <p className="text-zinc-400 text-sm">크리에이터 대시보드로 이동</p>
                            <ArrowRight className="w-5 h-5 mt-4 text-zinc-600 group-hover:translate-x-1 group-hover:text-violet-400 transition-all" />
                        </button>
                    ) : (
                        <button
                            onClick={handleEnableContentCreation}
                            disabled={enablingContent}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left hover:border-violet-500/50 transition-all group disabled:opacity-50"
                        >
                            <Video className="w-10 h-10 mb-4 text-violet-400" />
                            <h3 className="text-xl font-bold mb-1">
                                {enablingContent ? '활성화 중...' : '영상 업로드 활성화'}
                            </h3>
                            <p className="text-zinc-400 text-sm">행사 영상을 올려 라이브러리에 공개</p>
                            <ArrowRight className="w-5 h-5 mt-4 text-zinc-600 group-hover:translate-x-1 group-hover:text-violet-400 transition-all" />
                        </button>
                    )}
                </div>

                {/* Brands Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Tag className="w-5 h-5 text-amber-500" />
                            내 이벤트 팀
                            <span className="text-zinc-500 text-base font-normal">({brands.length})</span>
                        </h2>
                        <button
                            onClick={() => navigate('/organizer/event-team/new')}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-bold transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            새 이벤트 팀
                        </button>
                    </div>

                    {brands.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {brands.map((brand) => (
                                <div
                                    key={brand.id}
                                    className={`bg-zinc-900 border rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all cursor-pointer ${brand.isDefault ? 'border-amber-500/30' : 'border-zinc-800'
                                        }`}
                                    onClick={() => navigate(`/organizer/event-team/${brand.id}`)}
                                >
                                    {/* Cover */}
                                    <div className="h-24 bg-gradient-to-br from-amber-900/30 to-zinc-900 relative">
                                        {brand.coverImage && (
                                            <img
                                                src={brand.coverImage}
                                                alt={brand.name}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        {brand.isDefault && (
                                            <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full flex items-center gap-1">
                                                <Star className="w-3 h-3" />
                                                기본
                                            </div>
                                        )}
                                    </div>

                                    {/* Logo & Info */}
                                    <div className="p-4 -mt-8 relative">
                                        <div className="w-16 h-16 bg-zinc-800 border-4 border-zinc-900 rounded-xl overflow-hidden mb-3">
                                            {brand.logo ? (
                                                <img
                                                    src={brand.logo}
                                                    alt={brand.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-amber-500">
                                                    {brand.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="font-bold text-lg mb-1">{brand.name}</h3>
                                        {brand.description && (
                                            <p className="text-sm text-zinc-500 line-clamp-1 mb-3">{brand.description}</p>
                                        )}

                                        <div className="flex items-center gap-4 text-sm text-zinc-400">
                                            <span className="flex items-center gap-1">
                                                <Trophy className="w-4 h-4" />
                                                이벤트 {brand.totalEvents}개
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                참가자 {brand.totalParticipants}명
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-zinc-900/50 border border-zinc-800/50 border-dashed rounded-2xl p-8 text-center">
                            <Tag className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-zinc-400 mb-2">이벤트 팀을 만들어보세요</h3>
                            <p className="text-zinc-500 text-sm mb-4">
                                하나의 계정으로 여러 이벤트 팀을 운영할 수 있습니다
                            </p>
                            <button
                                onClick={() => navigate('/organizer/event-team/new')}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold text-sm transition-colors"
                            >
                                첫 번째 이벤트 팀 만들기
                            </button>
                        </div>
                    )}
                </div>

                {/* Draft Events */}
                {draftEvents.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-zinc-500" />
                            임시저장된 이벤트
                        </h2>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
                            {draftEvents.map((event) => (
                                <div
                                    key={event.id}
                                    onClick={() => navigate(`/organizer/event/${event.id}/edit`)}
                                    className="p-4 flex items-center justify-between hover:bg-zinc-800/50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <EventTypeLabel type={event.type} />
                                        <div>
                                            <h3 className="font-bold">{event.title || '제목 없음'}</h3>
                                            <p className="text-sm text-zinc-500">
                                                {event.eventDate ? new Date(event.eventDate).toLocaleDateString('ko-KR') : '날짜 미정'}
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-zinc-600" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upcoming Events */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-500" />
                        예정된 이벤트
                    </h2>

                    {upcomingEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {upcomingEvents.map((event) => (
                                <div
                                    key={event.id}
                                    className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all"
                                >
                                    {/* Cover */}
                                    <div className="h-32 bg-gradient-to-br from-zinc-800 to-zinc-900 relative">
                                        {event.coverImage && (
                                            <img
                                                src={event.coverImage}
                                                alt={event.title}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        <div className="absolute top-3 left-3 flex gap-2">
                                            <EventTypeLabel type={event.type} />
                                            <StatusBadge status={event.status} />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                                        <div className="flex items-center gap-4 text-sm text-zinc-400 mb-4">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(event.eventDate).toLocaleDateString('ko-KR')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {event.currentParticipants || 0}명
                                            </span>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => navigate(`/organizer/event/${event.id}/participants`)}
                                                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                참가자 관리
                                            </button>
                                            <button
                                                onClick={() => navigate(`/organizer/event/${event.id}/edit`)}
                                                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                                            >
                                                <Settings className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-zinc-900/50 border border-zinc-800/50 border-dashed rounded-2xl p-12 text-center">
                            <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-zinc-400 mb-2">예정된 이벤트가 없습니다</h3>
                            <p className="text-zinc-500 mb-6">첫 번째 이벤트를 만들어보세요!</p>
                            <button
                                onClick={() => navigate('/organizer/create-event')}
                                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-colors"
                            >
                                이벤트 만들기
                            </button>
                        </div>
                    )}
                </div>

                {/* All Events Link */}
                {events.length > 0 && defaultBrand && (
                    <div className="text-center">
                        <button
                            onClick={() => navigate(`/event-team/${defaultBrand.id}`)}
                            className="text-amber-500 hover:text-amber-400 font-bold flex items-center gap-2 mx-auto"
                        >
                            공개 페이지 보기
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
