import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy, Users, ChevronRight, X } from 'lucide-react';
import { Event, EventType } from '../../types';

declare global {
    interface Window {
        naver: typeof naver;
    }
}

interface EventMapViewProps {
    events: Event[];
    selectedEventId?: string | null;
    onEventSelect?: (eventId: string | null) => void;
}

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; markerColor: string; icon: React.ElementType }> = {
    competition: { label: '시합', color: 'bg-red-500', markerColor: '#EF4444', icon: Trophy },
    seminar: { label: '세미나', color: 'bg-blue-500', markerColor: '#3B82F6', icon: Users },
    openmat: { label: '오픈매트', color: 'bg-green-500', markerColor: '#22C55E', icon: MapPin },
};

export const EventMapView: React.FC<EventMapViewProps> = ({ events, selectedEventId, onEventSelect }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<naver.maps.Map | null>(null);
    const markersRef = useRef<naver.maps.Marker[]>([]);
    const [internalSelectedEvent, setInternalSelectedEvent] = useState<Event | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);

    // Determine the selected event (external prop takes precedence)
    const selectedEvent = selectedEventId
        ? events.find(e => e.id === selectedEventId) || null
        : internalSelectedEvent;

    const setSelectedEvent = (event: Event | null) => {
        if (onEventSelect) {
            onEventSelect(event?.id || null);
        } else {
            setInternalSelectedEvent(event);
        }
    };

    // Initialize map
    useEffect(() => {
        if (!mapRef.current) return;

        if (!window.naver?.maps) {
            setMapError('네이버 지도 SDK가 로드되지 않았습니다. 페이지를 새로고침 해주세요.');
            console.error('Naver Maps SDK not loaded');
            return;
        }

        // Default center: Seoul
        const defaultCenter = new window.naver.maps.LatLng(37.5665, 126.9780);

        const mapOptions: naver.maps.MapOptions = {
            center: defaultCenter,
            zoom: 11,
            minZoom: 7,
            maxZoom: 19,
            zoomControl: true,
            zoomControlOptions: {
                position: window.naver.maps.Position.TOP_RIGHT,
            },
        };

        mapInstanceRef.current = new window.naver.maps.Map(mapRef.current, mapOptions);
        setMapReady(true);

        return () => {
            // Cleanup markers
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];
        };
    }, []);

    // Add markers when events change
    useEffect(() => {
        if (!mapReady || !mapInstanceRef.current || !window.naver?.maps) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Filter events with valid coordinates
        const eventsWithLocation = events.filter(e => e.latitude && e.longitude);

        if (eventsWithLocation.length === 0) return;

        // Create bounds
        const bounds = new window.naver.maps.LatLngBounds(
            new window.naver.maps.LatLng(eventsWithLocation[0].latitude!, eventsWithLocation[0].longitude!),
            new window.naver.maps.LatLng(eventsWithLocation[0].latitude!, eventsWithLocation[0].longitude!)
        );

        // Create markers
        eventsWithLocation.forEach(event => {
            const position = new window.naver.maps.LatLng(event.latitude!, event.longitude!);
            const config = EVENT_TYPE_CONFIG[event.type as EventType] || EVENT_TYPE_CONFIG.openmat;

            // Create custom marker icon
            const markerHtml = `
                <div style="
                    width: 32px;
                    height: 32px;
                    background-color: ${config.markerColor};
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                        ${event.type === 'competition'
                            ? '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>'
                            : event.type === 'seminar'
                            ? '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>'
                            : '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>'
                        }
                    </svg>
                </div>
            `;

            const marker = new window.naver.maps.Marker({
                position,
                map: mapInstanceRef.current!,
                icon: {
                    content: markerHtml,
                    size: new window.naver.maps.Size(32, 32),
                    anchor: new window.naver.maps.Point(16, 16),
                },
            });

            // Click handler
            window.naver.maps.Event.addListener(marker, 'click', () => {
                setSelectedEvent(event);
            });

            markersRef.current.push(marker);
            bounds.extend(position);
        });

        // Fit bounds if multiple events
        if (eventsWithLocation.length > 1) {
            mapInstanceRef.current.fitBounds(bounds, { padding: 50 });
        } else if (eventsWithLocation.length === 1) {
            mapInstanceRef.current.setCenter(
                new window.naver.maps.LatLng(eventsWithLocation[0].latitude!, eventsWithLocation[0].longitude!)
            );
            mapInstanceRef.current.setZoom(15);
        }
    }, [events, mapReady]);

    // Center map on externally selected event
    useEffect(() => {
        if (!mapReady || !mapInstanceRef.current || !selectedEventId || !window.naver?.maps) return;

        const event = events.find(e => e.id === selectedEventId);
        if (event?.latitude && event?.longitude) {
            const position = new window.naver.maps.LatLng(event.latitude, event.longitude);
            mapInstanceRef.current.setCenter(position);
            mapInstanceRef.current.setZoom(16);
        }
    }, [selectedEventId, events, mapReady]);

    const config = selectedEvent ? EVENT_TYPE_CONFIG[selectedEvent.type as EventType] || EVENT_TYPE_CONFIG.openmat : null;
    const Icon = config?.icon || MapPin;

    return (
        <div className="relative w-full h-[60vh] sm:h-[70vh] rounded-2xl overflow-hidden border border-zinc-800">
            {/* Map Container */}
            <div ref={mapRef} className="w-full h-full" />

            {/* Map Error */}
            {mapError && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                    <div className="text-center p-4">
                        <MapPin className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <p className="text-red-400 font-medium mb-2">{mapError}</p>
                        <p className="text-xs text-zinc-500">
                            Naver Cloud Platform에서 API 설정을 확인해주세요
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg transition-colors"
                        >
                            새로고침
                        </button>
                    </div>
                </div>
            )}

            {/* No Events with Location */}
            {!mapError && events.filter(e => e.latitude && e.longitude).length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
                    <div className="text-center">
                        <MapPin className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-400">위치 정보가 있는 이벤트가 없습니다</p>
                    </div>
                </div>
            )}

            {/* Selected Event Card */}
            {selectedEvent && config && (
                <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
                    {/* Close Button */}
                    <button
                        onClick={() => setSelectedEvent(null)}
                        className="absolute top-2 right-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full z-10 transition-colors"
                    >
                        <X className="w-4 h-4 text-zinc-400" />
                    </button>

                    <div className="p-4">
                        {/* Type Badge */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${config.color}/20 text-white border border-${config.color.replace('bg-', '')}/30`}>
                                <Icon className="w-3 h-3 inline-block mr-1" />
                                {config.label}
                            </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-white text-lg mb-2 pr-8">
                            {selectedEvent.title}
                        </h3>

                        {/* Date & Time */}
                        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                                {new Date(selectedEvent.eventDate).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    weekday: 'short'
                                })}
                                {selectedEvent.startTime && ` ${selectedEvent.startTime}`}
                            </span>
                        </div>

                        {/* Venue */}
                        {selectedEvent.venueName && (
                            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
                                <MapPin className="w-4 h-4" />
                                <span>{selectedEvent.venueName}</span>
                            </div>
                        )}

                        {/* Detail Link */}
                        <Link
                            to={`/event/${selectedEvent.id}`}
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-colors"
                        >
                            자세히 보기
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="absolute top-4 left-4 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-xl p-3">
                <div className="flex flex-col gap-2 text-xs">
                    {Object.entries(EVENT_TYPE_CONFIG).map(([type, cfg]) => (
                        <div key={type} className="flex items-center gap-2">
                            <span
                                className="w-3 h-3 rounded-full border-2 border-white"
                                style={{ backgroundColor: cfg.markerColor }}
                            />
                            <span className="text-zinc-300">{cfg.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EventMapView;
