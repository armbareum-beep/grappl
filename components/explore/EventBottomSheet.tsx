import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Calendar, List, MapPin, Trophy, Users, ChevronRight } from 'lucide-react';
import { Event, EventType } from '../../types';
import { EventCalendarView } from './EventCalendarView';

const EVENT_TYPE_CONFIG = {
    competition: { label: '시합', color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500/30', icon: Trophy },
    seminar: { label: '세미나', color: 'bg-blue-500', textColor: 'text-blue-400', borderColor: 'border-blue-500/30', icon: Users },
    openmat: { label: '오픈매트', color: 'bg-green-500', textColor: 'text-green-400', borderColor: 'border-green-500/30', icon: MapPin },
};

const HANDLE_HEIGHT = 40; // px — drag pill area always visible at peek
const DRAG_THRESHOLD = 8;  // px movement before treating as drag (prevents accidental drag on tap)

interface EventBottomSheetProps {
    events: Event[];
    filteredEvents: Event[];
    selectedDate: string | null;
    onDateSelect: (date: string | null) => void;
    onMapEventSelect: (id: string | null) => void;
    collapseSignal: number;
    expandSignal: number;
}

export const EventBottomSheet: React.FC<EventBottomSheetProps> = ({
    events,
    filteredEvents,
    selectedDate,
    onDateSelect,
    onMapEventSelect,
    collapseSignal,
    expandSignal,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const y = useMotionValue(0);
    
    // y값(내려간 수치)만큼 스크롤 영역에 패딩을 줘서, 하프모드에서도 잘리는 콘텐츠 없이 끝까지 스크롤 가능하게 처리
    const contentPaddingBottom = useTransform(y, (currentY) => `${Math.max(120, currentY + 120)}px`);

    // Drag state — all in refs so handlers don't need re-creation
    const isTracking = useRef(false);  // pointer is down
    const isDragging = useRef(false);  // movement exceeded threshold
    const hasDragged = useRef(false);  // used to swallow click after drag
    const dragStartPointerY = useRef(0);
    const dragStartMotionY = useRef(0);

    const [snapPts, setSnapPts] = useState({ full: 0, half: 300, peek: 500, hidden: 600 });
    const [snapName, setSnapName] = useState<'peek' | 'half' | 'full' | 'hidden'>('peek');

    const getSnapPoints = useCallback(() => {
        const h = containerRef.current?.offsetHeight ?? 0;
        return { full: 0, half: h * 0.5, peek: h - HANDLE_HEIGHT, hidden: h + 10 };
    }, []);

    // Set initial position after mount
    useEffect(() => {
        const pts = getSnapPoints();
        setSnapPts(pts);
        y.set(pts.peek);
    }, []);

    // Collapse when signal increments (map marker/background tap) — hide fully
    useEffect(() => {
        if (collapseSignal === 0) return;
        const pts = getSnapPoints();
        animate(y, pts.hidden, { type: 'spring', stiffness: 400, damping: 35 });
        setSnapPts(pts);
        setSnapName('hidden');
    }, [collapseSignal]);

    // Expand when signal increments (map marker tap)
    useEffect(() => {
        if (expandSignal === 0) return;
        const pts = getSnapPoints();
        animate(y, pts.half, { type: 'spring', stiffness: 400, damping: 35 });
        setSnapPts(pts);
        setSnapName('half');
    }, [expandSignal]);

    const snapTo = useCallback((target: 'full' | 'half' | 'peek' | 'hidden') => {
        const pts = getSnapPoints();
        setSnapPts(pts);
        animate(y, pts[target], { type: 'spring', stiffness: 400, damping: 35 });
        setSnapName(target);
    }, [getSnapPoints]);

    const snapToNearest = useCallback(() => {
        const pts = getSnapPoints();
        const cur = y.get();
        const nearest = ([pts.full, pts.half, pts.peek, pts.hidden] as const).reduce(
            (a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a)
        );
        const name: 'full' | 'half' | 'peek' | 'hidden' =
            nearest === pts.full ? 'full' : nearest === pts.half ? 'half' : nearest === pts.peek ? 'peek' : 'hidden';
        animate(y, nearest, { type: 'spring', stiffness: 400, damping: 35 });
        setSnapPts(pts);
        setSnapName(name);
    }, [getSnapPoints]);

    // ── Pointer handlers ──────────────────────────────────────────────────────
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        isTracking.current = true;
        isDragging.current = false;
        hasDragged.current = false;
        dragStartPointerY.current = e.clientY;
        dragStartMotionY.current = y.get();
        e.currentTarget.setPointerCapture(e.pointerId);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isTracking.current) return;
        const delta = e.clientY - dragStartPointerY.current;
        if (!isDragging.current) {
            if (Math.abs(delta) < DRAG_THRESHOLD) return;
            isDragging.current = true;
            hasDragged.current = true;
        }
        const pts = getSnapPoints();
        const next = Math.max(0, Math.min(pts.hidden, dragStartMotionY.current + delta));
        y.set(next);
    }, [getSnapPoints]);

    const handlePointerUp = useCallback(() => {
        isTracking.current = false;
        if (isDragging.current) {
            isDragging.current = false;
            snapToNearest();
        }
    }, [snapToNearest]);

    const handleEventCardMapClick = useCallback((eventId: string) => {
        onMapEventSelect(eventId);
        snapTo('peek');
    }, [onMapEventSelect, snapTo]);

    return (
        // Outer wrapper: fills the relative container, clips the overflowing sheet
        <div
            ref={containerRef}
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ zIndex: 30 }}
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
                className="bg-zinc-900 rounded-t-3xl border-t border-zinc-700 shadow-[0_-4px_30px_rgba(0,0,0,0.5)] flex flex-col pointer-events-auto"
            >
                {/* ── Handle area — drag pill only ── */}
                <div
                    className="flex-shrink-0 px-4 pt-3 pb-2 flex flex-col gap-2 select-none"
                    style={{ touchAction: 'none', cursor: 'grab' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    <div className="w-12 h-1.5 bg-zinc-500 rounded-full mx-auto" />
                </div>

                {/* ── Content — 캘린더 + 리스트 통합 표시 ── */}
                <motion.div
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4"
                    style={{ touchAction: 'pan-y', paddingBottom: contentPaddingBottom }}
                >
                    {/* 상단: 캘린더 */}
                    <div className="pt-2 mb-4">
                        <EventCalendarView
                            events={events}
                            selectedDate={selectedDate}
                            onDateSelect={onDateSelect}
                        />
                    </div>

                    {/* 하단: 이벤트 리스트 */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <List className="w-4 h-4 text-amber-500" />
                            <h3 className="text-sm font-semibold text-zinc-300">
                                {selectedDate
                                    ? `${new Date(selectedDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 이벤트`
                                    : '예정된 이벤트'}
                            </h3>
                        </div>
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
                                    {selectedDate
                                        ? '이 날짜에 예정된 이벤트가 없습니다'
                                        : '예정된 이벤트가 없습니다'}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

// ── Event card for the bottom sheet list tab ─────────────────────────────────

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
