import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Users, Trophy, MapPin, ArrowRight, Instagram, Youtube, Globe, CheckCircle, Star } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { fetchBrandById, fetchBrandBySlug, fetchEventsByBrand, getBrandStats } from '../lib/api-organizers';
import { EventBrand, Event } from '../types';

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

export const BrandProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [brand, setBrand] = useState<EventBrand | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [stats, setStats] = useState<{ totalEvents: number; totalParticipants: number; upcomingEvents: number; completedEvents: number } | null>(null);

    useEffect(() => {
        async function fetchData() {
            if (!id) return;

            try {
                // Try to fetch by slug first, then by ID
                let brandData: EventBrand;
                try {
                    brandData = await fetchBrandBySlug(id);
                } catch {
                    brandData = await fetchBrandById(id);
                }

                setBrand(brandData);

                // Fetch events and stats
                const [eventsData, statsData] = await Promise.all([
                    fetchEventsByBrand(brandData.id),
                    getBrandStats(brandData.id),
                ]);

                setEvents(eventsData);
                setStats(statsData);
            } catch (error) {
                console.error('Error loading brand:', error);
                navigate('/events');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id, navigate]);

    if (loading) {
        return <LoadingScreen message="이벤트 팀 정보 불러오는 중..." />;
    }

    if (!brand) {
        return null;
    }

    const now = new Date();
    const upcomingEvents = events
        .filter(e => new Date(e.eventDate) >= now && e.status === 'published')
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    const pastEvents = events
        .filter(e => new Date(e.eventDate) < now)
        .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Cover Image */}
            <div className="h-48 md:h-64 bg-gradient-to-br from-amber-900/30 to-zinc-900 relative">
                {brand.coverImage && (
                    <img
                        src={brand.coverImage}
                        alt={brand.name}
                        className="w-full h-full object-cover"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
            </div>

            {/* Brand Info */}
            <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
                    {/* Logo */}
                    <div className="w-32 h-32 bg-zinc-800 border-4 border-zinc-950 rounded-2xl overflow-hidden flex-shrink-0">
                        {brand.logo ? (
                            <img
                                src={brand.logo}
                                alt={brand.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-5xl font-black text-amber-500">
                                {brand.name.charAt(0)}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-black">{brand.name}</h1>
                            {brand.verified && (
                                <CheckCircle className="w-6 h-6 text-amber-500" />
                            )}
                        </div>
                        {brand.description && (
                            <p className="text-zinc-400 mb-4 line-clamp-2">{brand.description}</p>
                        )}

                        {/* Social Links */}
                        <div className="flex gap-3">
                            {brand.instagram && (
                                <a
                                    href={brand.instagram.startsWith('http') ? brand.instagram : `https://instagram.com/${brand.instagram.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                                >
                                    <Instagram className="w-5 h-5 text-pink-400" />
                                </a>
                            )}
                            {brand.youtube && (
                                <a
                                    href={brand.youtube}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                                >
                                    <Youtube className="w-5 h-5 text-red-500" />
                                </a>
                            )}
                            {brand.website && (
                                <a
                                    href={brand.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                                >
                                    <Globe className="w-5 h-5 text-blue-400" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                        <div className="text-2xl font-black">{stats?.totalEvents || 0}</div>
                        <div className="text-sm text-zinc-500">총 이벤트</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <Users className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                        <div className="text-2xl font-black">{stats?.totalParticipants || 0}</div>
                        <div className="text-sm text-zinc-500">총 참가자</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <Calendar className="w-6 h-6 text-green-500 mx-auto mb-2" />
                        <div className="text-2xl font-black">{stats?.upcomingEvents || 0}</div>
                        <div className="text-sm text-zinc-500">예정된 이벤트</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <Star className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                        <div className="text-2xl font-black">{stats?.completedEvents || 0}</div>
                        <div className="text-sm text-zinc-500">완료된 이벤트</div>
                    </div>
                </div>

                {/* Upcoming Events */}
                {upcomingEvents.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-500" />
                            다가오는 이벤트
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {upcomingEvents.slice(0, 4).map((event) => (
                                <Link
                                    key={event.id}
                                    to={`/event/${event.id}`}
                                    className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all group"
                                >
                                    <div className="h-32 bg-gradient-to-br from-zinc-800 to-zinc-900 relative">
                                        {event.coverImage && (
                                            <img
                                                src={event.coverImage}
                                                alt={event.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        )}
                                        <div className="absolute top-3 left-3">
                                            <EventTypeLabel type={event.type} />
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-lg mb-2 group-hover:text-amber-400 transition-colors">
                                            {event.title}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-zinc-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(event.eventDate).toLocaleDateString('ko-KR')}
                                            </span>
                                            {event.venueName && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {event.venueName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Past Events */}
                {pastEvents.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-zinc-500" />
                            지난 이벤트
                        </h2>
                        <div className="space-y-3">
                            {pastEvents.slice(0, 10).map((event) => (
                                <Link
                                    key={event.id}
                                    to={`/event/${event.id}`}
                                    className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all group"
                                >
                                    <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                                        {event.coverImage ? (
                                            <img
                                                src={event.coverImage}
                                                alt={event.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Trophy className="w-6 h-6 text-zinc-600" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <EventTypeLabel type={event.type} />
                                            <span className="text-xs text-zinc-500">
                                                {new Date(event.eventDate).toLocaleDateString('ko-KR')}
                                            </span>
                                        </div>
                                        <h3 className="font-bold truncate group-hover:text-amber-400 transition-colors">
                                            {event.title}
                                        </h3>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-400 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* No Events */}
                {events.length === 0 && (
                    <div className="mt-12 text-center py-12 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl">
                        <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-zinc-400 mb-2">아직 이벤트가 없습니다</h3>
                        <p className="text-zinc-500">곧 새로운 이벤트가 등록될 예정입니다.</p>
                    </div>
                )}

            </div>
        </div>
    );
};
