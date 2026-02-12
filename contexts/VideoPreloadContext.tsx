import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import Player from '@vimeo/player';
import { extractVimeoId, isMuxPlaybackId } from '../lib/api';
import '@mux/mux-video';

interface PreloadState {
    status: 'idle' | 'loading' | 'ready' | 'error';
    drillId: string | null;
    vimeoUrl: string | null;
    playerRef: Player | null;
    iframeRef: HTMLIFrameElement | null;
    // Mux video preload support
    muxVideoRef: HTMLVideoElement | null;
    isMux: boolean;
}

interface VideoPreloadContextType {
    preloadState: PreloadState;
    startPreload: (drill: { id: string; vimeoUrl?: string; videoUrl?: string }) => void;
    consumePreloadedPlayer: () => { player: Player; iframe: HTMLIFrameElement } | { muxVideo: HTMLVideoElement } | null;
    isPreloadedFor: (drillId: string) => boolean;
    preloadContainerRef: React.RefObject<HTMLDivElement>;
    // Global muted state for reels-like experience (unmute once, stay unmuted)
    globalMuted: boolean;
    setGlobalMuted: (muted: boolean) => void;
}

const initialState: PreloadState = {
    status: 'idle',
    drillId: null,
    vimeoUrl: null,
    playerRef: null,
    iframeRef: null,
    muxVideoRef: null,
    isMux: false,
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

    // Global muted state - starts muted, stays unmuted once user unmutes (like Reels/Shorts)
    const [globalMuted, setGlobalMuted] = useState(true);

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
        if (preloadState.muxVideoRef) {
            try {
                preloadState.muxVideoRef.pause();
                preloadState.muxVideoRef.src = '';
                preloadState.muxVideoRef.load();
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        if (preloadContainerRef.current) {
            preloadContainerRef.current.innerHTML = '';
        }
        setPreloadState(initialState);
        isPreloadingRef.current = false;
    }, [preloadState.playerRef, preloadState.muxVideoRef]);

    const startPreload = useCallback((drill: { id: string; vimeoUrl?: string; videoUrl?: string }) => {
        // 이미 프리로딩 중이거나, 같은 영상이 로드되어 있으면 스킵
        if (isPreloadingRef.current) return;
        if (preloadState.drillId === drill.id && preloadState.status === 'ready') return;

        const url = drill.vimeoUrl || drill.videoUrl;
        if (!url) return;

        // Check if it's a Mux playback ID
        const isMux = isMuxPlaybackId(url);
        const vimeoId = !isMux ? extractVimeoId(url) : null;

        // Must be either Mux or valid Vimeo ID
        if (!isMux && !vimeoId) return;

        // 기존 프리로드 정리
        if (preloadState.playerRef) {
            preloadState.playerRef.destroy().catch(() => { });
        }
        if (preloadState.muxVideoRef) {
            try {
                preloadState.muxVideoRef.pause();
                preloadState.muxVideoRef.src = '';
                preloadState.muxVideoRef.load();
            } catch (e) {
                // Ignore cleanup errors
            }
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
            muxVideoRef: null,
            isMux,
        });

        // Handle Mux video preload
        if (isMux) {
            try {
                console.log('[VideoPreload] Creating Mux video element for:', drill.id);
                const muxVideo = document.createElement('mux-video') as any;
                muxVideo.setAttribute('playback-id', url);
                muxVideo.setAttribute('preload', 'auto');
                muxVideo.setAttribute('muted', 'true');
                muxVideo.setAttribute('playsinline', 'true');
                muxVideo.className = 'w-full h-full object-cover';
                muxVideo.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';

                if (preloadContainerRef.current) {
                    preloadContainerRef.current.appendChild(muxVideo);
                }

                const videoElement = muxVideo as HTMLVideoElement;

                const handleCanPlay = () => {
                    console.log('[VideoPreload] Mux video ready for:', drill.id);
                    setPreloadState({
                        status: 'ready',
                        drillId: drill.id,
                        vimeoUrl: url,
                        playerRef: null,
                        iframeRef: null,
                        muxVideoRef: videoElement,
                        isMux: true,
                    });
                    isPreloadingRef.current = false;
                };

                const handleError = () => {
                    console.error('[VideoPreload] Mux video error for:', drill.id);
                    setPreloadState({
                        status: 'error',
                        drillId: drill.id,
                        vimeoUrl: url,
                        playerRef: null,
                        iframeRef: null,
                        muxVideoRef: null,
                        isMux: true,
                    });
                    isPreloadingRef.current = false;
                };

                // Listen for loadeddata instead of canplay for faster readiness
                videoElement.addEventListener('loadeddata', handleCanPlay, { once: true });
                videoElement.addEventListener('error', handleError, { once: true });

                // Fallback timeout - mark as ready after 3 seconds even if not fully loaded
                setTimeout(() => {
                    if (isPreloadingRef.current && preloadState.drillId === drill.id) {
                        console.log('[VideoPreload] Mux video timeout, marking ready:', drill.id);
                        setPreloadState({
                            status: 'ready',
                            drillId: drill.id,
                            vimeoUrl: url,
                            playerRef: null,
                            iframeRef: null,
                            muxVideoRef: videoElement,
                            isMux: true,
                        });
                        isPreloadingRef.current = false;
                    }
                }, 3000);

            } catch (err) {
                console.error('[VideoPreload] Failed to create Mux video:', err);
                setPreloadState({
                    status: 'error',
                    drillId: drill.id,
                    vimeoUrl: url,
                    playerRef: null,
                    iframeRef: null,
                    muxVideoRef: null,
                    isMux: true,
                });
                isPreloadingRef.current = false;
            }
            return;
        }

        // Handle Vimeo video preload (existing logic)
        try {
            const [baseId, hash] = vimeoId!.includes(':') ? vimeoId!.split(':') : [vimeoId, null];

            // iframe 생성
            const iframe = document.createElement('iframe');
            const params = new URLSearchParams({
                autoplay: '0',
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
                // 음소거 및 음량 0으로 설정 (iOS 요구사항)
                await player.setVolume(0).catch(() => { });
                await player.setMuted(true).catch(() => { });
                // 프리로드 완료 후 일시정지 - 홈화면에서 소리 방지
                await player.pause().catch(() => { });

                setPreloadState({
                    status: 'ready',
                    drillId: drill.id,
                    vimeoUrl: url,
                    playerRef: player,
                    iframeRef: iframe,
                    muxVideoRef: null,
                    isMux: false,
                });
                isPreloadingRef.current = false;

                // Adaptive Quality: 1초 후 HD로 업그레이드 (사용자가 이미 보고 있을 때)
                setTimeout(async () => {
                    try {
                        await player.setQuality('hd');
                    } catch { }
                }, 1000);
            }).catch((err) => {
                console.error('[VideoPreload] Player ready failed:', err);
                setPreloadState({
                    status: 'error',
                    drillId: drill.id,
                    vimeoUrl: url,
                    playerRef: null,
                    iframeRef: null,
                    muxVideoRef: null,
                    isMux: false,
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
                muxVideoRef: null,
                isMux: false,
            });
            isPreloadingRef.current = false;
        }
    }, [preloadState.drillId, preloadState.status, preloadState.playerRef, preloadState.muxVideoRef]);

    const consumePreloadedPlayer = useCallback(() => {
        if (preloadState.status !== 'ready') {
            return null;
        }

        // Handle Mux video
        if (preloadState.isMux && preloadState.muxVideoRef) {
            const result = {
                muxVideo: preloadState.muxVideoRef,
            };

            // 타임아웃 클리어
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // 상태 초기화 (비디오 요소는 소비자에게 넘김)
            setPreloadState(initialState);
            isPreloadingRef.current = false;

            return result;
        }

        // Handle Vimeo player
        if (!preloadState.playerRef || !preloadState.iframeRef) {
            return null;
        }

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
                globalMuted,
                setGlobalMuted,
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
