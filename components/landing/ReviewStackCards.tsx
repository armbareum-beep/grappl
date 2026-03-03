import React, { useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Testimonial } from '../../types';
import { cn } from '../../lib/utils';

interface ReviewStackCardsProps {
    reviews: Testimonial[];
}

export const ReviewStackCards: React.FC<ReviewStackCardsProps> = ({ reviews }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState<'left' | 'right' | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleNext = () => {
        if (isAnimating || reviews.length <= 1) return;
        setDirection('left');
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % reviews.length);
            setIsAnimating(false);
            setDirection(null);
        }, 300);
    };

    const handlePrev = () => {
        if (isAnimating || reviews.length <= 1) return;
        setDirection('right');
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
            setIsAnimating(false);
            setDirection(null);
        }, 300);
    };

    // Touch handling
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNext();
        } else if (isRightSwipe) {
            handlePrev();
        }
    };

    if (reviews.length === 0) return null;

    const getCardStyle = (index: number) => {
        const diff = index - currentIndex;
        const normalizedDiff = ((diff % reviews.length) + reviews.length) % reviews.length;

        // Show only 3 cards in stack
        if (normalizedDiff === 0) {
            // Front card
            return {
                zIndex: 30,
                transform: isAnimating && direction === 'left'
                    ? 'translateX(-120%) rotate(-15deg)'
                    : isAnimating && direction === 'right'
                    ? 'translateX(120%) rotate(15deg)'
                    : 'translateX(0) rotate(0deg)',
                opacity: isAnimating ? 0 : 1,
            };
        } else if (normalizedDiff === 1 || normalizedDiff === reviews.length - 1) {
            // Second card (behind)
            const isRight = normalizedDiff === 1;
            return {
                zIndex: 20,
                transform: isAnimating && direction === 'left' && isRight
                    ? 'translateX(0) rotate(0deg) scale(1)'
                    : isAnimating && direction === 'right' && !isRight
                    ? 'translateX(0) rotate(0deg) scale(1)'
                    : `translateX(${isRight ? '8px' : '-8px'}) rotate(${isRight ? '3deg' : '-3deg'}) scale(0.95)`,
                opacity: 0.7,
            };
        } else if (normalizedDiff === 2 || normalizedDiff === reviews.length - 2) {
            // Third card (behind second)
            const isRight = normalizedDiff === 2;
            return {
                zIndex: 10,
                transform: `translateX(${isRight ? '16px' : '-16px'}) rotate(${isRight ? '6deg' : '-6deg'}) scale(0.9)`,
                opacity: 0.4,
            };
        }

        return {
            zIndex: 0,
            transform: 'scale(0.8)',
            opacity: 0,
        };
    };

    return (
        <div className="relative">
            {/* Stack Container */}
            <div
                className="relative h-[320px] flex items-center justify-center"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {reviews.map((review, index) => {
                    const style = getCardStyle(index);
                    const isVisible = style.opacity > 0;

                    if (!isVisible) return null;

                    return (
                        <div
                            key={review.id || index}
                            className={cn(
                                "absolute w-[calc(100%-2rem)] max-w-[340px] bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 transition-all duration-300 ease-out",
                                style.zIndex === 30 && "border-violet-500/30 shadow-xl shadow-violet-500/10"
                            )}
                            style={{
                                zIndex: style.zIndex,
                                transform: style.transform,
                                opacity: style.opacity,
                            }}
                        >
                            {/* Rating */}
                            <div className="flex gap-1 mb-4">
                                {[...Array(review.rating || 5)].map((_, j) => (
                                    <Star key={j} className="w-4 h-4 fill-violet-500 text-violet-500" />
                                ))}
                            </div>

                            {/* Comment */}
                            <p className="text-zinc-300 leading-relaxed text-base italic line-clamp-4 mb-6">
                                "{review.comment}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
                                    <span className="text-white font-bold">{review.name?.[0] || '?'}</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-zinc-100 text-sm">{review.name}</p>
                                    <p className="text-xs text-zinc-500 font-medium">{review.belt}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-6">
                <button
                    onClick={handlePrev}
                    className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-violet-500/50 transition-all active:scale-95"
                    disabled={isAnimating}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Dots */}
                <div className="flex gap-2">
                    {reviews.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                if (!isAnimating && index !== currentIndex) {
                                    setDirection(index > currentIndex ? 'left' : 'right');
                                    setIsAnimating(true);
                                    setTimeout(() => {
                                        setCurrentIndex(index);
                                        setIsAnimating(false);
                                        setDirection(null);
                                    }, 300);
                                }
                            }}
                            className={cn(
                                "w-2 h-2 rounded-full transition-all",
                                index === currentIndex
                                    ? "bg-violet-500 w-6"
                                    : "bg-zinc-700 hover:bg-zinc-600"
                            )}
                        />
                    ))}
                </div>

                <button
                    onClick={handleNext}
                    className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-violet-500/50 transition-all active:scale-95"
                    disabled={isAnimating}
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Swipe hint */}
            <p className="text-center text-zinc-600 text-xs mt-4">
                스와이프하여 더 보기
            </p>
        </div>
    );
};

export default ReviewStackCards;
