import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Search, X, Check, Loader2 } from 'lucide-react';

declare global {
    interface Window {
        naver: typeof naver;
    }
}

interface SearchResult {
    title?: string;
    address: string;
    roadAddress: string;
    lat: number;
    lng: number;
    isPlace?: boolean;
}

interface LocationPickerProps {
    latitude?: number;
    longitude?: number;
    address?: string;
    onChange: (location: { latitude: number; longitude: number; address: string }) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
    latitude,
    longitude,
    address = '',
    onChange,
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<naver.maps.Map | null>(null);
    const markerRef = useRef<naver.maps.Marker | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [tempLocation, setTempLocation] = useState<{ lat: number; lng: number } | null>(
        latitude && longitude ? { lat: latitude, lng: longitude } : null
    );
    const [tempAddress, setTempAddress] = useState(address);
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);

    // Initialize map when modal opens
    useEffect(() => {
        if (!isOpen || !mapRef.current) return;

        if (!window.naver?.maps) {
            setMapError('네이버 지도 SDK가 로드되지 않았습니다. 페이지를 새로고침 해주세요.');
            return;
        }

        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            const defaultCenter = tempLocation
                ? new window.naver.maps.LatLng(tempLocation.lat, tempLocation.lng)
                : new window.naver.maps.LatLng(37.5665, 126.9780); // Seoul

            const mapOptions: naver.maps.MapOptions = {
                center: defaultCenter,
                zoom: tempLocation ? 16 : 12,
                zoomControl: true,
                zoomControlOptions: {
                    position: window.naver.maps.Position.TOP_RIGHT,
                },
            };

            mapInstanceRef.current = new window.naver.maps.Map(mapRef.current!, mapOptions);
            setMapReady(true);

            // Add marker if location exists
            if (tempLocation) {
                addMarker(tempLocation.lat, tempLocation.lng);
            }

            // Click handler to set location with reverse geocoding
            window.naver.maps.Event.addListener(mapInstanceRef.current, 'click', (e: naver.maps.PointerEvent) => {
                const lat = e.coord.y;
                const lng = e.coord.x;
                setTempLocation({ lat, lng });
                addMarker(lat, lng);

                // Reverse geocode to get address
                if (window.naver.maps.Service) {
                    window.naver.maps.Service.reverseGeocode(
                        {
                            coords: new window.naver.maps.LatLng(lat, lng),
                            orders: [
                                window.naver.maps.Service.OrderType.ROAD_ADDR,
                                window.naver.maps.Service.OrderType.ADDR,
                            ].join(','),
                        },
                        (status: naver.maps.Service.Status, response: naver.maps.Service.ReverseGeocodeResponse) => {
                            if (status === window.naver.maps.Service.Status.OK) {
                                const result = response.v2.address;
                                const roadAddr = result.roadAddress || '';
                                const jibunAddr = result.jibunAddress || '';
                                const finalAddr = roadAddr || jibunAddr || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                                setTempAddress(finalAddr);
                                setSearchQuery(finalAddr);
                            }
                        }
                    );
                }
            });
        }, 100);

        return () => {
            clearTimeout(timer);
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            if (markerRef.current) {
                markerRef.current.setMap(null);
                markerRef.current = null;
            }
            mapInstanceRef.current = null;
            setMapReady(false);
            setSearchResults([]);
            setShowDropdown(false);
        };
    }, [isOpen]);

    const addMarker = (lat: number, lng: number) => {
        if (!mapInstanceRef.current || !window.naver?.maps) return;

        // Remove existing marker
        if (markerRef.current) {
            markerRef.current.setMap(null);
        }

        const position = new window.naver.maps.LatLng(lat, lng);

        markerRef.current = new window.naver.maps.Marker({
            position,
            map: mapInstanceRef.current,
            icon: {
                content: `
                    <div style="
                        width: 40px;
                        height: 40px;
                        background-color: #F59E0B;
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <div style="transform: rotate(45deg); color: white; font-size: 20px;">📍</div>
                    </div>
                `,
                size: new window.naver.maps.Size(40, 40),
                anchor: new window.naver.maps.Point(20, 40),
            },
        });

        // Center map on marker
        mapInstanceRef.current.setCenter(position);
    };

    // Search for places via Naver Local Search API
    const searchPlaces = async (query: string): Promise<SearchResult[]> => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL || 'https://vbfxwlhngyvafskyukxa.supabase.co'}/functions/v1/naver-local-search?query=${encodeURIComponent(query)}`
            );
            if (!response.ok) return [];
            const data = await response.json();
            return (data.results || []).map((item: { title: string; roadAddress: string; address: string; lat: number; lng: number }) => ({
                title: item.title,
                address: item.address,
                roadAddress: item.roadAddress,
                lat: item.lat,
                lng: item.lng,
                isPlace: true,
            }));
        } catch (error) {
            console.error('Place search error:', error);
            return [];
        }
    };

    // Search for addresses via Naver Geocoding API
    const searchAddresses = (query: string): Promise<SearchResult[]> => {
        return new Promise((resolve) => {
            if (!window.naver?.maps?.Service) {
                resolve([]);
                return;
            }
            window.naver.maps.Service.geocode(
                { query },
                (status: naver.maps.Service.Status, response: naver.maps.Service.GeocodeResponse) => {
                    if (status !== window.naver.maps.Service.Status.OK) {
                        resolve([]);
                        return;
                    }
                    const results: SearchResult[] = response.v2.addresses.map((addr) => ({
                        address: addr.jibunAddress || addr.roadAddress || query,
                        roadAddress: addr.roadAddress || addr.jibunAddress || '',
                        lat: parseFloat(addr.y),
                        lng: parseFloat(addr.x),
                        isPlace: false,
                    }));
                    resolve(results);
                }
            );
        });
    };

    // Debounced search for autocomplete - searches both places and addresses
    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);

        try {
            // Search both places and addresses in parallel
            const [placeResults, addressResults] = await Promise.all([
                searchPlaces(query),
                searchAddresses(query),
            ]);

            // Combine results - places first, then addresses
            const combined = [...placeResults, ...addressResults].slice(0, 8);
            setSearchResults(combined);
            setShowDropdown(combined.length > 0);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Handle search input change with debounce
    const handleSearchInputChange = (value: string) => {
        setSearchQuery(value);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce search
        if (value.trim().length >= 2) {
            searchTimeoutRef.current = setTimeout(() => {
                performSearch(value);
            }, 300);
        } else {
            setSearchResults([]);
            setShowDropdown(false);
        }
    };

    // Select a search result
    const handleSelectResult = (result: SearchResult) => {
        setTempLocation({ lat: result.lat, lng: result.lng });
        // For places, combine title with address
        const displayAddress = result.title
            ? `${result.title} (${result.roadAddress || result.address})`
            : (result.roadAddress || result.address);
        setTempAddress(displayAddress);
        setSearchQuery(result.title || result.roadAddress || result.address);
        setShowDropdown(false);
        addMarker(result.lat, result.lng);

        if (mapInstanceRef.current) {
            mapInstanceRef.current.setZoom(16);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setShowDropdown(false);
        setIsSearching(true);

        try {
            // Search both places and addresses
            const [placeResults, addressResults] = await Promise.all([
                searchPlaces(searchQuery),
                searchAddresses(searchQuery),
            ]);

            const allResults = [...placeResults, ...addressResults];

            if (allResults.length > 0) {
                // Use the first result
                const firstResult = allResults[0];
                setTempLocation({ lat: firstResult.lat, lng: firstResult.lng });
                const displayAddress = firstResult.title
                    ? `${firstResult.title} (${firstResult.roadAddress || firstResult.address})`
                    : (firstResult.roadAddress || firstResult.address);
                setTempAddress(displayAddress);
                addMarker(firstResult.lat, firstResult.lng);
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setZoom(16);
                }
            } else {
                alert('검색 결과가 없습니다.');
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('검색 중 오류가 발생했습니다.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleConfirm = () => {
        if (tempLocation) {
            onChange({
                latitude: tempLocation.lat,
                longitude: tempLocation.lng,
                address: tempAddress || address,
            });
        }
        setIsOpen(false);
    };

    const handleClear = () => {
        setTempLocation(null);
        setTempAddress('');
        if (markerRef.current) {
            markerRef.current.setMap(null);
            markerRef.current = null;
        }
    };

    return (
        <>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`w-full px-4 py-3 border rounded-xl flex items-center gap-3 transition-colors text-left ${
                    latitude && longitude
                        ? 'bg-amber-600/10 border-amber-500/50'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
            >
                <MapPin className={`w-5 h-5 flex-shrink-0 ${latitude && longitude ? 'text-amber-500' : ''}`} />
                <div className="flex-1 min-w-0">
                    {latitude && longitude ? (
                        <>
                            <p className="text-white font-medium truncate">
                                {address || '위치가 설정됨'}
                            </p>
                            <p className="text-xs text-zinc-500">
                                {latitude.toFixed(6)}, {longitude.toFixed(6)}
                            </p>
                        </>
                    ) : (
                        <span>주소 검색 또는 지도에서 선택</span>
                    )}
                </div>
                <Search className="w-4 h-4 text-zinc-500" />
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="w-full max-w-2xl bg-zinc-900 rounded-2xl border border-zinc-700 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                            <h3 className="text-lg font-bold text-white">위치 선택</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-4 border-b border-zinc-800">
                            <div className="relative">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => handleSearchInputChange(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setShowDropdown(false);
                                                    handleSearch();
                                                }
                                                if (e.key === 'Escape') {
                                                    setShowDropdown(false);
                                                }
                                            }}
                                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                            placeholder="주소 검색 (예: 강남역, 서울시 강남구...)"
                                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                                        />
                                        {isSearching && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleSearch}
                                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-colors"
                                    >
                                        <Search className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Autocomplete Dropdown */}
                                {showDropdown && searchResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                                        {searchResults.map((result, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSelectResult(result)}
                                                className="w-full px-4 py-3 text-left hover:bg-zinc-700 transition-colors border-b border-zinc-700 last:border-b-0"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${result.isPlace ? 'text-green-500' : 'text-amber-500'}`} />
                                                    <div className="min-w-0">
                                                        {result.title && (
                                                            <p className="text-white text-sm font-medium truncate">
                                                                {result.title}
                                                            </p>
                                                        )}
                                                        <p className={`text-sm truncate ${result.title ? 'text-zinc-400' : 'text-white font-medium'}`}>
                                                            {result.roadAddress || result.address}
                                                        </p>
                                                        {!result.title && result.roadAddress && result.address !== result.roadAddress && (
                                                            <p className="text-xs text-zinc-500 truncate">
                                                                {result.address}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">
                                주소를 검색하거나 지도를 클릭하여 위치를 선택하세요
                            </p>
                        </div>

                        {/* Map */}
                        <div ref={mapRef} className="w-full h-80 relative">
                            {mapError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                                    <div className="text-center p-4">
                                        <MapPin className="w-10 h-10 text-red-400 mx-auto mb-2" />
                                        <p className="text-red-400 text-sm">{mapError}</p>
                                        <p className="text-xs text-zinc-500 mt-2">
                                            Naver Cloud Platform에서 API 설정을 확인해주세요
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Selected Location Info */}
                        {tempLocation && (
                            <div className="p-4 border-t border-zinc-800 bg-zinc-800/50">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {tempAddress && (
                                            <p className="text-white font-medium mb-1">
                                                {tempAddress}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                            <span className="text-zinc-400">
                                                {tempLocation.lat.toFixed(6)}, {tempLocation.lng.toFixed(6)}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClear}
                                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
                                    >
                                        초기화
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex gap-3 p-4 border-t border-zinc-800">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!tempLocation}
                                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Check className="w-5 h-5" />
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default LocationPicker;
