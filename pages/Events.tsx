import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Calendar, Search, Trophy, Users, MapPin, Filter, X, Ticket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { fetchEvents } from '../lib/api-events';
import { Event, EventType } from '../types';

const EventTypeTab: React.FC<{
    type: EventType | 'all';
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
}> = ({ label, icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            active
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
        }`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

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

export const Events: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<EventType | 'all'>(
        (searchParams.get('type') as EventType) || 'all'
    );
    const [selectedRegion, setSelectedRegion] = useState(searchParams.get('region') || '');

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const data = await fetchEvents({
                    type: selectedType === 'all' ? undefined : selectedType,
                    region: selectedRegion || undefined,
                    status: 'published',
                });
                setEvents(data);
            } catch (error) {
                console.error('Failed to load events:', error);
            } finally {
                setLoading(false);
            }
        };
        loadEvents();
    }, [selectedType, selectedRegion]);

    const handleTypeChange = (type: EventType | 'all') => {
        setSelectedType(type);
        const params = new URLSearchParams(searchParams);
        if (type === 'all') {
            params.delete('type');
        } else {
            params.set('type', type);
        }
        setSearchParams(params);
    };

    const filteredEvents = useMemo(() => {
        return events.filter(event =>
            event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.venueName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.region?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [events, searchTerm]);

    const now = new Date();
    const upcomingEvents = filteredEvents
        .filter(e => new Date(e.eventDate) >= now)
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

    if (loading) {
        return <LoadingScreen message="이벤트 불러오는 중..." />;
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="relative bg-zinc-900 border-b border-zinc-800 py-12 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-amber-600/5 blur-[100px] pointer-events-none"></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-center">
                        BJJ <span className="text-amber-500">Events</span>
                    </h1>
                    <p className="text-zinc-400 text-lg text-center max-w-2xl mx-auto mb-8">
                        시합, 세미나, 오픈매트 일정을 확인하세요
                    </p>

                    {/* Type Tabs */}
                    <div className="flex justify-center gap-2 mb-6">
                        <EventTypeTab
                            type="all"
                            label="전체"
                            icon={<Calendar className="w-4 h-4" />}
                            active={selectedType === 'all'}
                            onClick={() => handleTypeChange('all')}
                        />
                        <EventTypeTab
                            type="competition"
                            label="시합"
                            icon={<Trophy className="w-4 h-4" />}
                            active={selectedType === 'competition'}
                            onClick={() => handleTypeChange('competition')}
                        />
                        <EventTypeTab
                            type="seminar"
                            label="세미나"
                            icon={<Users className="w-4 h-4" />}
                            active={selectedType === 'seminar'}
                            onClick={() => handleTypeChange('seminar')}
                        />
                        <EventTypeTab
                            type="openmat"
                            label="오픈매트"
                            icon={<MapPin className="w-4 h-4" />}
                            active={selectedType === 'openmat'}
                            onClick={() => handleTypeChange('openmat')}
                        />
                    </div>

                    {/* Search */}
                    <div className="max-w-md mx-auto relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="이벤트 검색..."
                            aria-label="이벤트 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all backdrop-blur-sm"
                        />
                    </div>

                    {/* My Events Button */}
                    {user && (
                        <div className="flex justify-center mt-6">
                            <Link
                                to="/my-events"
                                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl font-medium text-sm transition-colors"
                            >
                                <Ticket className="w-4 h-4 text-amber-500" />
                                내 참가 내역
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Events Grid */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {selectedRegion && (
                    <div className="flex items-center gap-2 mb-6">
                        <Filter className="w-4 h-4 text-zinc-500" />
                        <span className="text-zinc-400">지역: {selectedRegion}</span>
                        <button
                            onClick={() => {
                                setSelectedRegion('');
                                const params = new URLSearchParams(searchParams);
                                params.delete('region');
                                setSearchParams(params);
                            }}
                            className="p-1 hover:bg-zinc-800 rounded-full"
                        >
                            <X className="w-4 h-4 text-zinc-500" />
                        </button>
                    </div>
                )}

                {upcomingEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {upcomingEvents.map((event) => (
                            <div
                                key={event.id}
                                onClick={() => navigate(`/event/${event.id}`)}
                                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] transition-all cursor-pointer group"
                            >
                                {/* Cover Image */}
                                <div className="h-48 bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden">
                                    {event.coverImage ? (
                                        <img
                                            src={event.coverImage}
                                            alt={event.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {event.type === 'competition' && <Trophy className="w-16 h-16 text-zinc-700" />}
                                            {event.type === 'seminar' && <Users className="w-16 h-16 text-zinc-700" />}
                                            {event.type === 'openmat' && <Calendar className="w-16 h-16 text-zinc-700" />}
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                        <EventTypeLabel type={event.type} />
                                    </div>
                                    {event.maxParticipants && event.currentParticipants !== undefined && (
                                        <div className="absolute top-4 right-4">
                                            {event.currentParticipants >= event.maxParticipants ? (
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                                    마감
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                    {event.maxParticipants - event.currentParticipants}자리 남음
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <h3 className="text-xl font-bold mb-3 group-hover:text-amber-400 transition-colors line-clamp-2">
                                        {event.title}
                                    </h3>

                                    <div className="space-y-2 text-sm text-zinc-400 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 flex-shrink-0" />
                                            <span>
                                                {new Date(event.eventDate).toLocaleDateString('ko-KR', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    weekday: 'short',
                                                })}
                                                {event.startTime && ` ${event.startTime}`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 flex-shrink-0" />
                                            <span className="line-clamp-1">{event.venueName || event.address || event.region || '장소 미정'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 flex-shrink-0" />
                                            <span>
                                                {event.currentParticipants || 0}명 참가
                                                {event.maxParticipants && ` / ${event.maxParticipants}명`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                                        <span className={`text-lg font-bold ${event.price === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                                            {event.price === 0 ? '무료' : `₩${event.price.toLocaleString()}`}
                                        </span>
                                        <span className="text-amber-500 text-sm font-medium">
                                            자세히 보기 →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-zinc-900/30 rounded-[2rem] border border-zinc-800/50 border-dashed">
                        <Calendar className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-zinc-300 mb-2">
                            {searchTerm ? '검색 결과가 없습니다' : '예정된 이벤트가 없습니다'}
                        </h3>
                        <p className="text-zinc-500">
                            {searchTerm ? '다른 키워드로 검색해보세요' : '새로운 이벤트를 기다려주세요!'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
