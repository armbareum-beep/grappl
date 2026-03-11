import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Trophy, Users } from 'lucide-react';
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
    onMapBackgroundClick?: () => void;
    className?: string;
}

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; textColor: string; borderColor: string; markerColor: string; icon: React.ElementType }> = {
    competition: { label: '시합', color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500/30', markerColor: '#EF4444', icon: Trophy },
    seminar: { label: '세미나', color: 'bg-blue-500', textColor: 'text-blue-400', borderColor: 'border-blue-500/30', markerColor: '#3B82F6', icon: Users },
    openmat: { label: '오픈매트', color: 'bg-green-500', textColor: 'text-green-400', borderColor: 'border-green-500/30', markerColor: '#22C55E', icon: MapPin },
};

export const EventMapView: React.FC<EventMapViewProps> = ({ events, selectedEventId, onEventSelect, onMapBackgroundClick, className }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<naver.maps.Map | null>(null);
    const markersRef = useRef<naver.maps.Marker[]>([]);
    const clickHandlerRef = useRef(onMapBackgroundClick);

    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);

    useEffect(() => {
        clickHandlerRef.current = onMapBackgroundClick;
    }, [onMapBackgroundClick]);


    const setSelectedEvent = (event: Event | null) => {
        if (onEventSelect) {
            onEventSelect(event?.id || null);
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

        window.naver.maps.Event.addListener(mapInstanceRef.current, 'click', () => {
            if (clickHandlerRef.current) clickHandlerRef.current();
        });

        return () => {
            // Cleanup markers
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];
        };
    }, []);

    // Trigger map resize when container class changes (e.g., switching to fullscreen on mobile)
    useEffect(() => {
        if (mapInstanceRef.current && window.naver?.maps) {
            window.naver.maps.Event.trigger(mapInstanceRef.current, 'resize');
        }
    }, [className]);

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


    return (
        <div className={className ?? 'relative w-full h-[60vh] sm:h-[70vh] rounded-2xl overflow-hidden border border-zinc-800'}>
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


            {/* Legend (Removed per user request) */}
        </div>
    );
};

export default EventMapView;
