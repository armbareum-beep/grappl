import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Trophy, Users, MapPin, Star, CheckCircle, ExternalLink, Video, Play } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { fetchOrganizerById, getOrganizerStats, fetchOrganizerReviews, fetchCreatorVideos } from '../lib/api-organizers';
import { fetchEvents } from '../lib/api-events';
import { Creator, Event, OrganizerReview } from '../types';

const OrganizerAvatar: React.FC<{ src: string; name: string }> = ({ src, name }) => {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <Calendar className="w-16 h-16 text-zinc-600" />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setError(true)}
        />
    );
};

const EventTypeLabel: React.FC<{ type: string }> = ({ type }) => {
    const config = {
        competition: { label: '시합', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
        seminar: { label: '세미나', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        openmat: { label: '오픈매트', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    }[type] || { label: type, color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' };

    return (
        <span className={`px-2 py-1 text-xs font-bold rounded-full border ${config.color}`}>
            {config.label}
        </span>
    );
};

interface CreatorVideos {
    drills: any[];
    lessons: any[];
    sparring: any[];
}

export const OrganizerProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [organizer, setOrganizer] = useState<Creator | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [reviews, setReviews] = useState<OrganizerReview[]>([]);
    const [videos, setVideos] = useState<CreatorVideos | null>(null);
    const [stats, setStats] = useState<{ totalEvents: number; avgRating: number; reviewCount: number; totalParticipants: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'videos'>('upcoming');

    useEffect(() => {
        async function fetchData() {
            if (!id) return;

            try {
                const [organizerData, eventsData, reviewsData, statsData] = await Promise.all([
                    fetchOrganizerById(id),
                    fetchEvents({ organizerId: id }),
                    fetchOrganizerReviews(id),
                    getOrganizerStats(id),
                ]);

                setOrganizer(organizerData);
                setEvents(eventsData);
                setReviews(reviewsData);
                setStats(statsData);

                // Fetch videos if organizer can upload content
                if (organizerData.creatorType === 'both') {
                    const videosData = await fetchCreatorVideos(id);
                    setVideos(videosData);
                }
            } catch (error) {
                console.error('Error fetching organizer data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id]);

    const hasVideos = videos && (videos.drills.length > 0 || videos.lessons.length > 0 || videos.sparring.length > 0);
    const totalVideos = videos ? videos.drills.length + videos.lessons.length + videos.sparring.length : 0;

    if (loading) {
        return <LoadingScreen message="주최자 정보 불러오는 중..." />;
    }

    if (!organizer) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-zinc-300 mb-4">주최자를 찾을 수 없습니다</h2>
                    <button
                        onClick={() => navigate('/organizers')}
                        className="text-amber-500 hover:text-amber-400"
                    >
                        주최자 목록으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    const now = new Date();
    const upcomingEvents = events.filter(e => new Date(e.eventDate) >= now && e.status === 'published');
    const pastEvents = events.filter(e => new Date(e.eventDate) < now || e.status === 'completed');
    const displayedEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="relative bg-zinc-900 border-b border-zinc-800">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 via-transparent to-transparent opacity-50"></div>

                <div className="max-w-5xl mx-auto px-4 pt-8 pb-12 relative z-10">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>뒤로가기</span>
                    </button>

                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Avatar */}
                        <div className="w-40 h-40 rounded-2xl overflow-hidden ring-4 ring-amber-500/20 shadow-xl flex-shrink-0">
                            <OrganizerAvatar src={organizer.profileImage || ''} name={organizer.name} />
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <h1 className="text-3xl md:text-4xl font-black">{organizer.name}</h1>
                                {organizer.verifiedOrganizer && (
                                    <CheckCircle className="w-6 h-6 text-amber-500 fill-amber-500/10" />
                                )}
                            </div>

                            <p className="text-zinc-400 mb-6 max-w-2xl">
                                {organizer.bio || 'Grappl 인증 이벤트 주최자입니다.'}
                            </p>

                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                                    <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                    <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
                                    <div className="text-xs text-zinc-500">이벤트</div>
                                </div>
                                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                                    <Users className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                    <div className="text-2xl font-bold">{stats?.totalParticipants || 0}</div>
                                    <div className="text-xs text-zinc-500">총 참가자</div>
                                </div>
                                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                                    <Star className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                    <div className="text-2xl font-bold">{stats?.avgRating || '-'}</div>
                                    <div className="text-xs text-zinc-500">평점</div>
                                </div>
                                <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                                    <MapPin className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                    <div className="text-2xl font-bold">{stats?.reviewCount || 0}</div>
                                    <div className="text-xs text-zinc-500">리뷰</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                            activeTab === 'upcoming'
                                ? 'bg-amber-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                    >
                        예정된 이벤트 ({upcomingEvents.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                            activeTab === 'past'
                                ? 'bg-amber-600 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                    >
                        지난 이벤트 ({pastEvents.length})
                    </button>
                    {organizer?.creatorType === 'both' && (
                        <button
                            onClick={() => setActiveTab('videos')}
                            className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                                activeTab === 'videos'
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                        >
                            <Video className="w-4 h-4" />
                            영상 ({totalVideos})
                        </button>
                    )}
                </div>

                {/* Events Grid */}
                {activeTab !== 'videos' && (
                    displayedEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {displayedEvents.map((event) => (
                                <div
                                    key={event.id}
                                    onClick={() => navigate(`/event/${event.id}`)}
                                    className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all cursor-pointer group"
                                >
                                    {/* Cover Image */}
                                    <div className="h-40 bg-gradient-to-br from-zinc-800 to-zinc-900 relative">
                                        {event.coverImage && (
                                            <img
                                                src={event.coverImage}
                                                alt={event.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        )}
                                        <div className="absolute top-4 left-4">
                                            <EventTypeLabel type={event.type} />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold mb-2 group-hover:text-amber-400 transition-colors">
                                            {event.title}
                                        </h3>

                                        <div className="space-y-2 text-sm text-zinc-400">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                <span>{new Date(event.eventDate).toLocaleDateString('ko-KR', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}</span>
                                            </div>
                                            {event.venueName && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{event.venueName}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                <span>
                                                    {event.currentParticipants || 0}
                                                    {event.maxParticipants ? ` / ${event.maxParticipants}명` : '명 참가'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center">
                                            <span className={`font-bold ${event.price === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                                                {event.price === 0 ? '무료' : `₩${event.price.toLocaleString()}`}
                                            </span>
                                            <span className="text-amber-500 flex items-center gap-1 text-sm">
                                                자세히 보기 <ExternalLink className="w-4 h-4" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 border-dashed">
                            <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-zinc-300 mb-2">
                                {activeTab === 'upcoming' ? '예정된 이벤트가 없습니다' : '지난 이벤트가 없습니다'}
                            </h3>
                            <p className="text-zinc-500">새로운 이벤트를 기다려주세요!</p>
                        </div>
                    )
                )}

                {/* Videos Grid */}
                {activeTab === 'videos' && (
                    hasVideos ? (
                        <div className="space-y-8">
                            {/* Drills */}
                            {videos.drills.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold mb-4 text-violet-400">드릴 ({videos.drills.length})</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {videos.drills.map((drill: any) => (
                                            <div
                                                key={drill.id}
                                                onClick={() => navigate(`/drill/${drill.id}`)}
                                                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all cursor-pointer group"
                                            >
                                                <div className="aspect-[9/16] bg-zinc-800 relative">
                                                    {drill.thumbnail_url && (
                                                        <img
                                                            src={drill.thumbnail_url}
                                                            alt={drill.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Play className="w-12 h-12 text-white" />
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <h4 className="font-bold text-sm truncate">{drill.title}</h4>
                                                    <p className="text-xs text-zinc-500">{drill.category}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lessons */}
                            {videos.lessons.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold mb-4 text-blue-400">레슨 ({videos.lessons.length})</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {videos.lessons.map((lesson: any) => (
                                            <div
                                                key={lesson.id}
                                                onClick={() => navigate(`/lessons/${lesson.id}`)}
                                                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer group"
                                            >
                                                <div className="aspect-video bg-zinc-800 relative">
                                                    {lesson.thumbnail_url && (
                                                        <img
                                                            src={lesson.thumbnail_url}
                                                            alt={lesson.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Play className="w-12 h-12 text-white" />
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <h4 className="font-bold truncate">{lesson.title}</h4>
                                                    <p className="text-sm text-zinc-500">{lesson.duration_minutes}분</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Sparring */}
                            {videos.sparring.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold mb-4 text-red-400">스파링 ({videos.sparring.length})</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {videos.sparring.map((sparring: any) => (
                                            <div
                                                key={sparring.id}
                                                onClick={() => navigate(`/sparring/${sparring.id}`)}
                                                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-red-500/50 transition-all cursor-pointer group"
                                            >
                                                <div className="aspect-video bg-zinc-800 relative">
                                                    {sparring.thumbnail_url && (
                                                        <img
                                                            src={sparring.thumbnail_url}
                                                            alt={sparring.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Play className="w-12 h-12 text-white" />
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <h4 className="font-bold truncate">{sparring.title}</h4>
                                                    <p className="text-sm text-zinc-500">{sparring.category}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 border-dashed">
                            <Video className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-zinc-300 mb-2">아직 영상이 없습니다</h3>
                            <p className="text-zinc-500">새로운 영상을 기다려주세요!</p>
                        </div>
                    )
                )}

                {/* Reviews Section */}
                {reviews.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold mb-6">참가자 리뷰</h2>
                        <div className="space-y-4">
                            {reviews.slice(0, 5).map((review) => (
                                <div key={review.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                            {review.userAvatar ? (
                                                <img src={review.userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                <Users className="w-5 h-5 text-zinc-500" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold">{review.userName || '익명'}</div>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-4 h-4 ${
                                                            i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {review.content && (
                                        <p className="text-zinc-400">{review.content}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
