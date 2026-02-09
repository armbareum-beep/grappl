import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import Player from '@vimeo/player';
import { extractVimeoId } from '../lib/api';

interface PreloadState {
    status: 'idle' | 'loading' | 'ready' | 'error';
    drillId: string | null;
    vimeoUrl: string | null;
    playerRef: Player | null;
    iframeRef: HTMLIFrameElement | null;
}

interface VideoPreloadContextType {
    preloadState: PreloadState;
    startPreload: (drill: { id: string; vimeoUrl?: string; videoUrl?: string }) => void;
    consumePreloadedPlayer: () => { player: Player; iframe: HTMLIFrameElement } | null;
    isPreloadedFor: (drillId: string) => boolean;
    preloadContainerRef: React.RefObject<HTMLDivElement>;
}

const initialState: PreloadState = {
    status: 'idle',
    drillId: null,
    vimeoUrl: null,
    playerRef: null,
    iframeRef: null,
};

const VideoPreloadContext = createContext<VideoPreloadContextType | null>(null);

export const useVideoPreload = () => {
    const context = useContext(VideoPreloadContext);
    if (!context) {
        throw new Error('useVideoPreload must be used within VideoPreloadProvider');
    }
    return context;
};

// Safe hook that returns null if not in provider (for optional use)
export const useVideoPreloadSafe = () => {
    return useContext(VideoPreloadContext);
};

interface VideoPreloadProviderProps {
    children: React.ReactNode;
}

export const VideoPreloadProvider: React.FC<VideoPreloadProviderProps> = ({ children }) => {
    const [preloadState, setPreloadState] = useState<PreloadState>(initialState);
    const preloadContainerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isPreloadingRef = useRef(false);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // 5분 타임아웃으로 미사용 플레이어 정리
    useEffect(() => {
        if (preloadState.status === 'ready') {
            timeoutRef.current = setTimeout(() => {
                console.log('[VideoPreload] Cleanup unused preloaded player after 5min timeout');
                cleanupPreload();
            }, 5 * 60 * 1000);

            return () => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
            };
        }
    }, [preloadState.status]);

    const cleanupPreload = useCallback(() => {
        if (preloadState.playerRef) {
            preloadState.playerRef.destroy().catch(() => { });
        }
        if (preloadContainerRef.current) {
            preloadContainerRef.current.innerHTML = '';
        }
        setPreloadState(initialState);
        isPreloadingRef.current = false;
    }, [preloadState.playerRef]);

    const startPreload = useCallback((drill: { id: string; vimeoUrl?: string; videoUrl?: string }) => {
        // 이미 프리로딩 중이거나, 같은 영상이 로드되어 있으면 스킵
        if (isPreloadingRef.current) {
            console.log('[VideoPreload] Already preloading, skip');
            return;
        }
        if (preloadState.drillId === drill.id && preloadState.status === 'ready') {
            console.log('[VideoPreload] Already preloaded for this drill');
            return;
        }

        const url = drill.vimeoUrl || drill.videoUrl;
        if (!url) {
            console.log('[VideoPreload] No video URL available');
            return;
        }

        const vimeoId = extractVimeoId(url);
        if (!vimeoId) {
            console.log('[VideoPreload] Not a Vimeo video, skip preload');
            return;
        }

        // 기존 프리로드 정리
        if (preloadState.playerRef) {
            preloadState.playerRef.destroy().catch(() => { });
        }
        if (preloadContainerRef.current) {
            preloadContainerRef.current.innerHTML = '';
        }

        isPreloadingRef.current = true;
        setPreloadState({
            status: 'loading',
            drillId: drill.id,
            vimeoUrl: url,
            playerRef: null,
            iframeRef: null,
        });

        console.log('[VideoPreload] Starting preload for drill:', drill.id);

        try {
            const [baseId, hash] = vimeoId.includes(':') ? vimeoId.split(':') : [vimeoId, null];

            // iframe 생성
            const iframe = document.createElement('iframe');
            const params = new URLSearchParams({
                autoplay: '1',
                loop: '1',
                muted: '1',
                autopause: '0',
                controls: '0',
                playsinline: '1',
                dnt: '1',
                title: '0',
                byline: '0',
                portrait: '0',
                quality: 'sd',
                ...(hash ? { h: hash } : {}),
            });

            iframe.src = `https://player.vimeo.com/video/${baseId}?${params.toString()}`;
            iframe.className = 'w-full h-full border-0';
            iframe.allow = 'autoplay; fullscreen; picture-in-picture';
            iframe.style.width = '100%';
            iframe.style.height = '100%';

            if (preloadContainerRef.current) {
                preloadContainerRef.current.appendChild(iframe);
            }

            const player = new Player(iframe);

            player.ready().then(async () => {
                console.log('[VideoPreload] Player ready for drill:', drill.id);

                // 음소거 및 음량 0으로 설정 (iOS 요구사항)
                await player.setVolume(0).catch(() => { });
                await player.setMuted(true).catch(() => { });

                // 버퍼링 완료 상태로 준비 (pause는 하지 않음, DrillReelItem에서 play() 호출 시 즉시 재생)
                console.log('[VideoPreload] Player prepared for instant playback:', drill.id);

                setPreloadState({
                    status: 'ready',
                    drillId: drill.id,
                    vimeoUrl: url,
                    playerRef: player,
                    iframeRef: iframe,
                });
                isPreloadingRef.current = false;

                // Adaptive Quality: 1초 후 HD로 업그레이드 (사용자가 이미 보고 있을 때)
                setTimeout(async () => {
                    try {
                        await player.setQuality('hd');
                        console.log('[VideoPreload] Upgraded to HD for drill:', drill.id);
                    } catch (err) {
                        console.log('[VideoPreload] HD upgrade not available, staying with sd quality');
                    }
                }, 1000);
            }).catch((err) => {
                console.error('[VideoPreload] Player ready failed:', err);
                setPreloadState({
                    status: 'error',
                    drillId: drill.id,
                    vimeoUrl: url,
                    playerRef: null,
                    iframeRef: null,
                });
                isPreloadingRef.current = false;
            });
        } catch (err) {
            console.error('[VideoPreload] Failed to create player:', err);
            setPreloadState({
                status: 'error',
                drillId: drill.id,
                vimeoUrl: url,
                playerRef: null,
                iframeRef: null,
            });
            isPreloadingRef.current = false;
        }
    }, [preloadState.drillId, preloadState.status, preloadState.playerRef]);

    const consumePreloadedPlayer = useCallback(() => {
        if (preloadState.status !== 'ready' || !preloadState.playerRef || !preloadState.iframeRef) {
            return null;
        }

        console.log('[VideoPreload] Consuming preloaded player for drill:', preloadState.drillId);

        const result = {
            player: preloadState.playerRef,
            iframe: preloadState.iframeRef,
        };

        // 타임아웃 클리어
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // 상태 초기화 (플레이어는 소비자에게 넘김)
        setPreloadState(initialState);
        isPreloadingRef.current = false;

        return result;
    }, [preloadState]);

    const isPreloadedFor = useCallback((drillId: string) => {
        return preloadState.status === 'ready' && preloadState.drillId === drillId;
    }, [preloadState.status, preloadState.drillId]);

    return (
        <VideoPreloadContext.Provider
            value={{
                preloadState,
                startPreload,
                consumePreloadedPlayer,
                isPreloadedFor,
                preloadContainerRef,
            }}
        >
            {children}

            {/* Hidden preload container */}
            <div
                ref={preloadContainerRef}
                id="video-preload-container"
                className="fixed pointer-events-none"
                style={{
                    left: '0',
                    top: '0',
                    width: '200px',
                    height: '200px',
                    overflow: 'hidden',
                    opacity: 0,
                }}
                aria-hidden="true"
            />
        </VideoPreloadContext.Provider>
    );
};
