import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Map, Trophy, Users, MapPin, ChevronRight, Clock } from 'lucide-react';
import { fetchEvents } from '../lib/api-events';
import { Event, EventType } from '../types';
import { LoadingScreen } from '../components/LoadingScreen';
import { EventCalendarView } from '../components/explore/EventCalendarView';
import { EventMapView } from '../components/explore/EventMapView';
import { EventBottomSheet } from '../components/explore/EventBottomSheet';

const EVENT_TYPE_CONFIG = {
    competition: { label: '시합', color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500/30', icon: Trophy },
    seminar: { label: '세미나', color: 'bg-blue-500', textColor: 'text-blue-400', borderColor: 'border-blue-500/30', icon: Users },
    openmat: { label: '오픈매트', color: 'bg-green-500', textColor: 'text-green-400', borderColor: 'border-green-500/30', icon: MapPin },
};

export const EventExplore: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTypes, setSelectedTypes] = useState<EventType[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedMapEventId, setSelectedMapEventId] = useState<string | null>(null);
    const [collapseSignal, setCollapseSignal] = useState(0);
    const [expandSignal, setExpandSignal] = useState(0);
    const [mapMode, setMapMode] = useState<'normal' | 'expanded' | 'fullscreen'>('normal');

    const navigate = useNavigate();
    const location = useLocation();

    const handleCollapseSheet = useCallback(() => setCollapseSignal(v => v + 1), []);
    const handleExpandSheet = useCallback(() => setExpandSignal(v => v + 1), []);

    const handleMapBackgroundClick = useCallback(() => {
        setMapMode(prev => {
            if (prev === 'normal') {
                handleCollapseSheet();
                return 'expanded';
            } else if (prev === 'expanded') {
                return 'fullscreen';
            } else {
                handleExpandSheet();
                return 'normal';
            }
        });
    }, [handleCollapseSheet, handleExpandSheet]);

    // Layout(App Navbar/BottomNav) 숨김 컨트롤을 위해 URL fullscreen 쿼리 파라미터 동기화
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (mapMode === 'fullscreen') {
            if (params.get('fullscreen') !== 'true') {
                navigate(`${location.pathname}?fullscreen=true`, { replace: true });
            }
        } else {
            if (params.has('fullscreen')) {
                params.delete('fullscreen');
                const newSearch = params.toString();
                navigate(newSearch ? `${location.pathname}?${newSearch}` : location.pathname, { replace: true });
            }
        }
    }, [mapMode, navigate, location.pathname, location.search]);

    useEffect(() => {
        const loadEvents = async () => {
            try {
                setLoading(true);
                const data = await fetchEvents({
                    status: 'published',
                });
                const now = new Date().toISOString().split('T')[0];
                const futureEvents = data.filter(e => e.eventDate >= now);

                // Client-side filtering if types are selected
                const typeFilteredEvents = selectedTypes.length > 0 
                    ? futureEvents.filter(e => selectedTypes.includes(e.type as EventType))
                    : futureEvents;

                setEvents(typeFilteredEvents);
            } catch (error) {
                console.error('Failed to load events:', error);
            } finally {
                setLoading(false);
            }
        };
        loadEvents();
    }, [selectedTypes]);

    const filteredEvents = selectedDate
        ? events.filter(e => e.eventDate === selectedDate)
        : events;

    if (loading) {
        return <LoadingScreen message="이벤트 불러오는 중..." />;
    }

    // Shared type filter UI
    const TypeFilterTabs = (
        <div className="flex gap-2 overflow-x-auto pb-2 pr-12 scrollbar-hide">
            {(Object.keys(EVENT_TYPE_CONFIG) as EventType[]).map(type => {
                const config = EVENT_TYPE_CONFIG[type];
                const Icon = config.icon;
                const isSelected = selectedTypes.includes(type);
                return (
                    <button
                        key={type}
                        onClick={() => {
                            setSelectedTypes(prev => 
                                prev.includes(type) 
                                    ? prev.filter(t => t !== type)
                                    : [...prev, type]
                            );
                        }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                            isSelected
                                ? `${config.color} text-white`
                                : `bg-zinc-800 ${config.textColor} hover:bg-zinc-700 border ${config.borderColor}`
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {config.label}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="bg-zinc-950 text-white">

            {/* ── MOBILE LAYOUT (< lg) ── */}
            <div
                className={`lg:hidden flex flex-col ${mapMode === 'fullscreen' ? 'fixed inset-0 z-50 bg-zinc-950' : ''}`}
                style={{ height: mapMode === 'fullscreen' ? '100dvh' : 'calc(100dvh - 144px)' }}
            >
                {/* Map + Bottom Sheet */}
                <div className="relative flex-1 overflow-hidden">
                    {/* Header Overlay — UI is always shown, even in fullscreen */}
                    <div className="absolute top-0 w-full pl-4 pt-4 pb-2 z-20 pointer-events-none">
                        <div className="pointer-events-auto">
                            {TypeFilterTabs}
                        </div>
                    </div>
                    
                    <EventMapView
                        events={filteredEvents}
                        selectedEventId={selectedMapEventId}
                        onEventSelect={(id) => {
                            setSelectedMapEventId(id);
                            // Do not exit fullscreen on marker click
                            if (mapMode === 'normal') {
                                handleExpandSheet();
                            }
                        }}
                        onMapBackgroundClick={handleMapBackgroundClick}
                        className="absolute inset-0 rounded-none border-0 z-0"
                    />

                    {/* Bottom Sheet — hidden in expanded/fullscreen mode */}
                    {mapMode === 'normal' && (
                        <EventBottomSheet
                            events={events}
                            filteredEvents={filteredEvents}
                            selectedDate={selectedDate}
                            onDateSelect={setSelectedDate}
                            onMapEventSelect={setSelectedMapEventId}
                            collapseSignal={collapseSignal}
                            expandSignal={expandSignal}
                        />
                    )}
                </div>
            </div>

            {/* ── DESKTOP LAYOUT (≥ lg) — unchanged ── */}
            <div className="hidden lg:block min-h-screen pb-24">
                {/* Sticky header */}
                <div className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl font-bold">이벤트</h1>
                        </div>
                        {TypeFilterTabs}
                    </div>
                </div>

                {/* Main content */}
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="space-y-6">
                        {/* Calendar + Map side by side */}
                        <div className="grid lg:grid-cols-[2fr_3fr] gap-6 items-start">
                            <EventCalendarView
                                events={events}
                                selectedDate={selectedDate}
                                onDateSelect={setSelectedDate}
                            />
                            <EventMapView
                                events={filteredEvents}
                                selectedEventId={selectedMapEventId}
                                onEventSelect={setSelectedMapEventId}
                                className="relative w-full h-[480px] rounded-2xl overflow-hidden border border-zinc-800"
                            />
                        </div>

                        {/* Event List */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    {selectedDate ? (
                                        <Calendar className="w-5 h-5 text-amber-500" />
                                    ) : (
                                        <Clock className="w-5 h-5 text-amber-500" />
                                    )}
                                    {selectedDate
                                        ? `${new Date(selectedDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 이벤트`
                                        : '다가오는 이벤트'}
                                    <span className="text-sm text-zinc-500">({filteredEvents.length})</span>
                                </h2>
                                {!selectedDate && events.length > 5 && (
                                    <Link
                                        to="/events"
                                        className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                                    >
                                        전체 보기 <ChevronRight className="w-4 h-4" />
                                    </Link>
                                )}
                            </div>

                            {filteredEvents.length > 0 ? (
                                <div className="grid gap-4">
                                    {(selectedDate ? filteredEvents : filteredEvents.slice(0, 5)).map(event => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            onMapClick={(eventId) => {
                                                setSelectedMapEventId(eventId);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
                                    <Calendar className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-zinc-400 mb-2">
                                        {selectedDate ? '이 날짜에 예정된 이벤트가 없습니다' : '예정된 이벤트가 없습니다'}
                                    </h3>
                                    <p className="text-zinc-500">새로운 이벤트가 등록되면 여기에 표시됩니다</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Event Card Component (desktop only)
interface EventCardProps {
    event: Event;
    onMapClick?: (eventId: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onMapClick }) => {
    const config = EVENT_TYPE_CONFIG[event.type as EventType] || EVENT_TYPE_CONFIG.openmat;
    const Icon = config.icon;

    if (onMapClick) {
        const hasLocation = event.latitude && event.longitude;
        return (
            <button
                onClick={() => hasLocation && onMapClick(event.id)}
                disabled={!hasLocation}
                className={`flex gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl transition-all group text-left w-full ${
                    hasLocation ? 'hover:border-amber-500/50 cursor-pointer' : 'opacity-60 cursor-not-allowed'
                }`}
            >
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                    {event.coverImage ? (
                        <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Icon className={`w-8 h-8 ${config.textColor}`} />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${config.color}/20 ${config.textColor} border ${config.borderColor}`}>
                            {config.label}
                        </span>
                        {!hasLocation && (
                            <span className="text-xs text-zinc-500">(위치 없음)</span>
                        )}
                    </div>
                    <h3 className={`font-bold text-white truncate ${hasLocation ? 'group-hover:text-amber-400' : ''} transition-colors`}>
                        {event.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                            {new Date(event.eventDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            {event.startTime && ` ${event.startTime}`}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{event.venueName || event.address || event.region || '장소 미정'}</span>
                    </div>
                </div>
                <Map className={`w-5 h-5 self-center transition-colors ${hasLocation ? 'text-amber-400' : 'text-zinc-600'}`} />
            </button>
        );
    }

    return (
        <Link
            to={`/event/${event.id}`}
            className="flex gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-amber-500/50 transition-all group"
        >
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                {event.coverImage ? (
                    <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Icon className={`w-8 h-8 ${config.textColor}`} />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${config.color}/20 ${config.textColor} border ${config.borderColor}`}>
                        {config.label}
                    </span>
                </div>
                <h3 className="font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                    {event.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                        {new Date(event.eventDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        {event.startTime && ` ${event.startTime}`}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{event.venueName || event.address || event.region || '장소 미정'}</span>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-400 self-center transition-colors" />
        </Link>
    );
};

export default EventExplore;
