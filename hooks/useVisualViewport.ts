import { useEffect, useState } from 'react';

/**
 * Hook to handle iOS Safari keyboard viewport issues.
 * When the keyboard opens on iOS, the visual viewport shrinks but the layout viewport doesn't.
 * This causes position: fixed elements to appear in wrong positions.
 *
 * This hook:
 * 1. Detects keyboard height using visualViewport API
 * 2. Sets CSS custom property --keyboard-height for use in styles
 * 3. Returns current keyboard height for programmatic use
 */
export function useVisualViewport() {
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(
        typeof window !== 'undefined' ? window.innerHeight : 0
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const visualViewport = window.visualViewport;
        if (!visualViewport) {
            // Fallback for browsers without visualViewport API
            return;
        }

        const handleResize = () => {
            // Calculate keyboard height as difference between window height and visual viewport height
            const currentKeyboardHeight = Math.max(0, window.innerHeight - visualViewport.height);

            setKeyboardHeight(currentKeyboardHeight);
            setViewportHeight(visualViewport.height);

            // Set CSS custom property for use in styles
            document.documentElement.style.setProperty(
                '--keyboard-height',
                `${currentKeyboardHeight}px`
            );
            document.documentElement.style.setProperty(
                '--visual-viewport-height',
                `${visualViewport.height}px`
            );
        };

        // Initial setup
        handleResize();

        // Listen for viewport changes (keyboard open/close, orientation change)
        visualViewport.addEventListener('resize', handleResize);
        visualViewport.addEventListener('scroll', handleResize);

        return () => {
            visualViewport.removeEventListener('resize', handleResize);
            visualViewport.removeEventListener('scroll', handleResize);
            // Reset CSS properties
            document.documentElement.style.removeProperty('--keyboard-height');
            document.documentElement.style.removeProperty('--visual-viewport-height');
        };
    }, []);

    return {
        keyboardHeight,
        viewportHeight,
        isKeyboardOpen: keyboardHeight > 100, // Threshold to avoid false positives
    };
}
