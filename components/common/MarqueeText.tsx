import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';


interface MarqueeTextProps {
    items: { id: string; text: string; onClick?: () => void }[];
    icon?: React.ReactNode;
    className?: string;
    speed?: number; // pixels per second
    forceAnimation?: boolean; // Force marquee even if text fits
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
    items,
    icon,
    className,
    speed = 30,
    forceAnimation = false
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [duration, setDuration] = useState(0);

    // Calculate total text width for overflow check
    // We render a hidden version to measure or estimate based on char count?
    // Better to use ref measurement as before.

    // Construct the content to be rendered
    const renderContent = () => (
        <>
            {items.map((item, index) => (
                <React.Fragment key={item.id}>
                    {index > 0 && <span className="mx-2 opacity-50">•</span>}
                    {item.onClick ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                item.onClick?.();
                            }}
                            className="hover:underline hover:text-white transition-colors cursor-pointer text-left"
                        >
                            {item.text}
                        </button>
                    ) : (
                        <span>{item.text}</span>
                    )}
                </React.Fragment>
            ))}
        </>
    );

    useEffect(() => {
        const checkOverflow = () => {
            if (containerRef.current && textRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                const textWidth = textRef.current.scrollWidth;

                const overflowing = forceAnimation || textWidth > containerWidth;
                setIsOverflowing(overflowing);

                if (overflowing) {
                    // For forced animation with short text, use minimum duration
                    const effectiveWidth = forceAnimation ? Math.max(textWidth, 200) : textWidth;
                    setDuration(effectiveWidth / speed);
                }
            }
        };

        checkOverflow();
        // Check again after a short delay to ensure fonts loaded/layout settled
        const timer = setTimeout(checkOverflow, 100);

        window.addEventListener('resize', checkOverflow);
        return () => {
            window.removeEventListener('resize', checkOverflow);
            clearTimeout(timer);
        };
    }, [items, speed, forceAnimation]);

    return (
        <div
            ref={containerRef}
            className={cn("relative overflow-hidden mask-linear-fade group", className)}
            style={{
                maskImage: isOverflowing ? 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' : 'none',
                WebkitMaskImage: isOverflowing ? 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' : 'none'
            }}
        >
            <div
                className={cn(
                    "flex items-center gap-4 will-change-transform",
                    isOverflowing && "animate-marquee w-max group-hover:[animation-play-state:paused]"
                )}
                style={isOverflowing ? {
                    animationDuration: `${duration}s`,
                } : { width: '100%' }}
            >
                <div className="flex items-center gap-2 flex-shrink-0">
                    {icon && <span className="flex-shrink-0">{icon}</span>}
                    <span ref={textRef} className="whitespace-nowrap flex items-center">
                        {renderContent()}
                    </span>
                </div>

                {isOverflowing && (
                    <div className="flex items-center gap-2 flex-shrink-0" aria-hidden="true">
                        {icon && <span className="flex-shrink-0">{icon}</span>}
                        <span className="whitespace-nowrap flex items-center">
                            {renderContent()}
                        </span>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation-name: marquee;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }
            `}</style>
        </div>
    );
};
