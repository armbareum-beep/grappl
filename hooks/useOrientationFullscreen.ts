import { useEffect, RefObject } from 'react';

export const useOrientationFullscreen = (elementRef: RefObject<HTMLElement>, isActive: boolean) => {
    useEffect(() => {
        if (!isActive) return;

        const handleOrientationChange = () => {
            // Check if screen orientation API is available
            const orientationType = screen.orientation ? screen.orientation.type : null;

            // Fallback check for window.orientation (older mobile browsers/iOS)
            // window.orientation: 90 or -90 is landscape
            const isLandscape = orientationType
                ? orientationType.includes('landscape')
                : (typeof window.orientation === 'number' && Math.abs(window.orientation as number) === 90);

            try {
                if (isLandscape) {
                    if (elementRef.current && !document.fullscreenElement) {
                        // Request fullscreen
                        const req = elementRef.current.requestFullscreen ||
                            (elementRef.current as any).webkitRequestFullscreen ||
                            (elementRef.current as any).mozRequestFullScreen ||
                            (elementRef.current as any).msRequestFullscreen;

                        if (req) {
                            req.call(elementRef.current).catch((err: any) => {
                                console.log('Fullscreen request failed (likely needs user gesture):', err);
                            });
                        }
                    }
                } else {
                    if (document.fullscreenElement) {
                        const exit = document.exitFullscreen ||
                            (document as any).webkitExitFullscreen ||
                            (document as any).mozCancelFullScreen ||
                            (document as any).msExitFullscreen;
                        if (exit) {
                            exit.call(document).catch((err: any) => console.log('Exit fullscreen failed:', err));
                        }
                    }
                }
            } catch (error) {
                console.warn('Orientation fullscreen transition error:', error);
            }
        };

        // Add listener
        if (screen.orientation) {
            screen.orientation.addEventListener('change', handleOrientationChange);
        } else {
            window.addEventListener('orientationchange', handleOrientationChange);
        }

        // Initial check? No, only on change to avoid jarring transitions on load

        return () => {
            if (screen.orientation) {
                screen.orientation.removeEventListener('change', handleOrientationChange);
            } else {
                window.removeEventListener('orientationchange', handleOrientationChange);
            }
        };
    }, [isActive, elementRef]);
};
