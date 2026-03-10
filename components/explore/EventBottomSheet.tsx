import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useDragControls, useMotionValue } from 'framer-motion';
import { Calendar, List, MapPin, Trophy, Users, ChevronRight } from 'lucide-react';
import { Event, EventType } from '../../types';
import { EventCalendarView } from './EventCalendarView';

const EVENT_TYPE_CONFIG = {
    competition: { label: '시합', color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500/30', icon: Trophy },
    seminar: { label: '세미나', color: 'bg-blue-500', textColor: 'text-blue-400', borderColor: 'border-blue-500/30', icon: Users },
    openmat: { label: '오픈매트', color: 'bg-green-500', textColor: 'text-green-400', borderColor: 'border-green-500/30', icon: MapPin },
};

const HANDLE_HEIGHT = 64; // px — always visible portion of the sheet

interface EventBottomSheetProps {
    events: Event[];
    filteredEvents: Event[];
    selectedDate: string | null;
    onDateSelect: (date: string | null) => void;
    onMapEventSelect: (id: string | null) => void;
    collapseSignal: number;
}

export const EventBottomSheet: React.FC<EventBottomSheetProps> = ({
    events,
    filteredEvents,
    selectedDate,
    onDateSelect,
    onMapEventSelect,
    collapseSignal,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();
    const y = useMotionValue(0);
    const [snapPts, setSnapPts] = useState({ full: 0, half: 300, peek: 500 });
    const [snapName, setSnapName] = useState<'peek' | 'half' | 'full'>('peek');
    const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');

    const getSnapPoints = useCallback(() => {
        const h = containerRef.current?.offsetHeight ?? 0;
        return {
            full: 0,
            half: h * 0.5,
            peek: h - HANDLE_HEIGHT,
        };
    }, []);

    // Set initial snap after mount
    useEffect(() => {
        const pts = getSnapPoints();
        setSnapPts(pts);
        y.set(pts.peek);
    }, []);

    // Collapse when signal increments (map marker/background tap)
    useEffect(() => {
        if (collapseSignal === 0) return;
        const pts = getSnapPoints();
        animate(y, pts.peek, { type: 'spring', stiffness: 400, damping: 35 });
        setSnapPts(pts);
        setSnapName('peek');
    }, [collapseSignal]);

    const snapTo = useCallback((target: 'full' | 'half' | 'peek') => {
        const pts = getSnapPoints();
        setSnapPts(pts);
        animate(y, pts[target], { type: 'spring', stiffness: 400, damping: 35 });
        setSnapName(target);
    }, [getSnapPoints]);

    const handleDragEnd = useCallback(() => {
        const pts = getSnapPoints();
        const cur = y.get();
        const candidates = [pts.full, pts.half, pts.peek] as const;
        const nearest = candidates.reduce((a, b) => Math.abs(b - cur) < Math.abs(a - cur) ? b : a);
        const name: 'full' | 'half' | 'peek' =
            nearest === pts.full ? 'full' : nearest === pts.half ? 'half' : 'peek';
        animate(y, nearest, { type: 'spring', stiffness: 400, damping: 35 });
        setSnapPts(pts);
        setSnapName(name);
    }, [getSnapPoints]);

    const handleTabClick = useCallback((tab: 'calendar' | 'list') => {
        setActiveTab(tab);
        if (snapName === 'peek') {
            snapTo('half');
        }
    }, [snapName, snapTo]);

    const handleEventCardMapClick = useCallback((eventId: string) => {
        onMapEventSelect(eventId);
        snapTo('peek');
    }, [onMapEventSelect, snapTo]);

    return (
        // Outer wrapper: fills the relative container, clips the overflowing sheet
        <div
            ref={containerRef}
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ zIndex: 10 }}
        >
            <motion.div
                style={{
                    y,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '100%',
                }}
                drag="y"
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: snapPts.peek }}
                dragElastic={{ top: 0.05, bottom: 0.1 }}
                onDragEnd={handleDragEnd}
                className="bg-zinc-900 rounded-t-3xl border-t border-zinc-700 shadow-[0_-4px_30px_rgba(0,0,0,0.5)] flex flex-col pointer-events-auto"
            >
                {/* Handle area — always 64px, initiates drag */}
                <div
                    onPointerDown={(e) => { e.preventDefault(); dragControls.start(e); }}
                    style={{ touchAction: 'none', cursor: 'grab' }}
                    className="flex-shrink-0 px-4 pt-2 pb-2 flex flex-col gap-2"
                >
                    {/* Drag pill */}
                    <div className="w-10 h-1 bg-zinc-600 rounded-full mx-auto mt-1" />

                    {/* Tab buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleTabClick('calendar')}
                            onPointerDown={(e) => e.stopPropagation()}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                                activeTab === 'calendar'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                        >
                            <Calendar className="w-4 h-4" />
                            캘린더
                        </button>
                        <button
                            onClick={() => handleTabClick('list')}
                            onPointerDown={(e) => e.stopPropagation()}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                                activeTab === 'list'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                        >
                            <List className="w-4 h-4" />
                            이벤트
                        </button>
                    </div>
                </div>

                {/* Content area — scrollable, drag does NOT interfere */}
                <div
                    className="flex-1 overflow-y-auto overscroll-contain px-4 pb-20"
                    style={{ touchAction: 'pan-y' }}
                >
                    {activeTab === 'calendar' ? (
                        <div className="pt-2">
                            <EventCalendarView
                                events={events}
                                selectedDate={selectedDate}
                                onDateSelect={onDateSelect}
                            />
                        </div>
                    ) : (
                        <div className="space-y-3 pt-2">
                            {filteredEvents.length > 0 ? (
                                filteredEvents.map(event => (
                                    <SheetEventCard
                                        key={event.id}
                                        event={event}
                                        onMapClick={handleEventCardMapClick}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                                    <p className="text-zinc-500 text-sm">
                                        {selectedDate ? '이 날짜에 예정된 이벤트가 없습니다' : '예정된 이벤트가 없습니다'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// Event card for the bottom sheet list tab
interface SheetEventCardProps {
    event: Event;
    onMapClick: (eventId: string) => void;
}

const SheetEventCard: React.FC<SheetEventCardProps> = ({ event, onMapClick }) => {
    const config = EVENT_TYPE_CONFIG[event.type as EventType] || EVENT_TYPE_CONFIG.openmat;
    const Icon = config.icon;
    const hasLocation = !!(event.latitude && event.longitude);

    return (
        <div className="flex gap-3 p-3 bg-zinc-800/60 border border-zinc-700/50 rounded-2xl">
            {/* Cover image / icon */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-700 flex-shrink-0">
                {event.coverImage ? (
                    <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Icon className={`w-6 h-6 ${config.textColor}`} />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full mb-1 ${config.color}/20 ${config.textColor} border ${config.borderColor}`}>
                    {config.label}
                </span>
                <p className="font-semibold text-white text-sm leading-tight truncate">{event.title}</p>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>
                        {new Date(event.eventDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        {event.startTime && ` ${event.startTime}`}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{event.venueName || event.address || event.region || '장소 미정'}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 justify-center flex-shrink-0">
                {hasLocation && (
                    <button
                        onClick={() => onMapClick(event.id)}
                        className="p-1.5 bg-zinc-700 hover:bg-amber-600/30 rounded-lg transition-colors"
                        title="지도에서 보기"
                    >
                        <MapPin className="w-4 h-4 text-amber-400" />
                    </button>
                )}
                <Link
                    to={`/event/${event.id}`}
                    className="p-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                    title="상세 보기"
                >
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                </Link>
            </div>
        </div>
    );
};

export default EventBottomSheet;
