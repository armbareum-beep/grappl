import React, { useEffect, useState, useRef } from 'react';
import { MasteryLevel, MASTERY_XP_THRESHOLDS } from '../../types';

interface MasteryRingProps {
    level: MasteryLevel;
    currentXp: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showLevel?: boolean;
    animateOnChange?: boolean;
    breathingAnimation?: boolean;
    onLevelUp?: (newLevel: MasteryLevel) => void;
    className?: string;
}

const SIZE_CONFIG = {
    sm: { ring: 60, stroke: 5, text: 'text-xs', level: 'text-[10px]', particle: 3 },
    md: { ring: 100, stroke: 7, text: 'text-base', level: 'text-xs', particle: 4 },
    lg: { ring: 140, stroke: 9, text: 'text-xl', level: 'text-sm', particle: 5 },
    xl: { ring: 180, stroke: 11, text: 'text-3xl', level: 'text-base', particle: 6 }
};

const LEVEL_COLORS: Record<MasteryLevel, {
    primary: string;
    secondary: string;
    glow: string;
    gradient: string;
}> = {
    1: {
        primary: '#64748b',
        secondary: '#94a3b8',
        glow: 'rgba(100, 116, 139, 0.4)',
        gradient: 'from-slate-500 to-slate-400'
    },
    2: {
        primary: '#3b82f6',
        secondary: '#60a5fa',
        glow: 'rgba(59, 130, 246, 0.5)',
        gradient: 'from-blue-500 to-blue-400'
    },
    3: {
        primary: '#8b5cf6',
        secondary: '#a78bfa',
        glow: 'rgba(139, 92, 246, 0.5)',
        gradient: 'from-purple-500 to-purple-400'
    },
    4: {
        primary: '#f59e0b',
        secondary: '#fbbf24',
        glow: 'rgba(245, 158, 11, 0.5)',
        gradient: 'from-amber-500 to-amber-400'
    },
    5: {
        primary: '#ef4444',
        secondary: '#f87171',
        glow: 'rgba(239, 68, 68, 0.5)',
        gradient: 'from-red-500 to-red-400'
    },
    6: {
        primary: '#eab308',
        secondary: '#fde047',
        glow: 'rgba(234, 179, 8, 0.6)',
        gradient: 'from-yellow-500 to-yellow-300'
    }
};

interface Particle {
    id: number;
    angle: number;
    distance: number;
    opacity: number;
}

export const MasteryRing: React.FC<MasteryRingProps> = ({
    level,
    currentXp,
    size = 'md',
    showLevel = true,
    animateOnChange = true,
    breathingAnimation = false,
    onLevelUp,
    className = ''
}) => {
    const config = SIZE_CONFIG[size];
    const colors = LEVEL_COLORS[level];

    const [displayXp, setDisplayXp] = useState(currentXp);
    const [isLevelingUp, setIsLevelingUp] = useState(false);
    const [showLevelUpText, setShowLevelUpText] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);
    const prevLevelRef = useRef(level);
    const prevXpRef = useRef(currentXp);

    // Calculate progress
    const currentLevelXp = MASTERY_XP_THRESHOLDS[level];
    const nextLevelXp = level < 6 ? MASTERY_XP_THRESHOLDS[(level + 1) as MasteryLevel] : currentLevelXp;
    const xpInLevel = displayXp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    const progressPercent = level >= 6 ? 100 : Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));

    const radius = (config.ring - config.stroke * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    // XP Change Animation
    useEffect(() => {
        if (!animateOnChange) {
            setDisplayXp(currentXp);
            return;
        }

        const xpDiff = currentXp - prevXpRef.current;
        if (xpDiff === 0) return;

        // Animate XP increase
        const duration = 600;
        const steps = 30;
        const stepDuration = duration / steps;
        const stepXp = xpDiff / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            setDisplayXp(prev => {
                const newXp = prev + stepXp;
                return currentStep >= steps ? currentXp : newXp;
            });

            if (currentStep >= steps) {
                clearInterval(interval);
            }
        }, stepDuration);

        prevXpRef.current = currentXp;

        return () => clearInterval(interval);
    }, [currentXp, animateOnChange]);

    // Level Up Animation
    useEffect(() => {
        if (level > prevLevelRef.current && animateOnChange) {
            triggerLevelUpAnimation();
            onLevelUp?.(level);
        }
        prevLevelRef.current = level;
    }, [level, animateOnChange, onLevelUp]);

    const triggerLevelUpAnimation = () => {
        setIsLevelingUp(true);
        setShowLevelUpText(true);

        // Generate particles
        const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
            id: i,
            angle: (i * 360) / 12,
            distance: 0,
            opacity: 1
        }));
        setParticles(newParticles);

        // Animate particles
        setTimeout(() => {
            setParticles(prev => prev.map(p => ({
                ...p,
                distance: config.ring * 0.6,
                opacity: 0
            })));
        }, 50);

        // Hide level up text
        setTimeout(() => {
            setShowLevelUpText(false);
        }, 1000);

        // End animation
        setTimeout(() => {
            setIsLevelingUp(false);
            setParticles([]);
        }, 1200);
    };

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            {/* Breathing glow effect */}
            {breathingAnimation && !isLevelingUp && (
                <div
                    className="absolute inset-0 rounded-full animate-pulse"
                    style={{
                        background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
                        filter: 'blur(8px)'
                    }}
                />
            )}

            {/* Level up burst effect */}
            {isLevelingUp && (
                <>
                    <div
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{
                            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
                            animationDuration: '0.6s'
                        }}
                    />
                    <div
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: `radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)`,
                            animation: 'pulse 0.6s ease-out'
                        }}
                    />
                </>
            )}

            {/* Particles */}
            {particles.map(particle => (
                <div
                    key={particle.id}
                    className="absolute w-2 h-2 rounded-full bg-yellow-400 transition-all duration-700 ease-out"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) rotate(${particle.angle}deg) translateY(-${particle.distance}px)`,
                        opacity: particle.opacity,
                        boxShadow: '0 0 8px rgba(234, 179, 8, 0.8)'
                    }}
                />
            ))}

            {/* SVG Ring */}
            <svg
                width={config.ring}
                height={config.ring}
                className={`transform transition-all duration-300 ${isLevelingUp ? 'scale-110' : 'scale-100'
                    } ${breathingAnimation ? 'animate-sway' : ''}`}
            >
                {/* Background circle */}
                <circle
                    cx={config.ring / 2}
                    cy={config.ring / 2}
                    r={radius}
                    fill="none"
                    stroke={colors.secondary}
                    strokeWidth={config.stroke}
                    opacity={0.2}
                />

                {/* Progress circle */}
                <circle
                    cx={config.ring / 2}
                    cy={config.ring / 2}
                    r={radius}
                    fill="none"
                    stroke={`url(#gradient-${level}-${size})`}
                    strokeWidth={config.stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    transform={`rotate(-90 ${config.ring / 2} ${config.ring / 2})`}
                    className={`transition-all duration-700 ease-out ${isLevelingUp ? 'animate-pulse-ring' : ''
                        }`}
                    style={{
                        filter: `drop-shadow(0 0 ${config.stroke * 1.5}px ${colors.glow})`
                    }}
                />

                {/* Gradient definitions */}
                <defs>
                    <linearGradient
                        id={`gradient-${level}-${size}`}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                    >
                        <stop offset="0%" stopColor={colors.primary} />
                        <stop offset="100%" stopColor={colors.secondary} />
                    </linearGradient>
                </defs>
            </svg>

            {/* Center content */}
            <div
                className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 ${isLevelingUp ? 'scale-125' : 'scale-100'
                    }`}
            >
                {showLevel && (
                    <>
                        <div
                            className={`font-black ${config.text} transition-colors duration-300`}
                            style={{
                                color: isLevelingUp ? '#eab308' : colors.primary,
                                textShadow: isLevelingUp ? '0 0 10px rgba(234, 179, 8, 0.8)' : 'none'
                            }}
                        >
                            Lv.{level}
                        </div>
                        <div className={`font-medium text-slate-400 ${config.level}`}>
                            {Math.round(progressPercent)}%
                        </div>
                    </>
                )}
            </div>

            {/* Level up floating text */}
            {showLevelUpText && (
                <div
                    className="absolute -top-12 left-1/2 transform -translate-x-1/2 animate-float-up"
                    style={{
                        animation: 'floatUp 1s ease-out forwards'
                    }}
                >
                    <div className="text-yellow-400 font-black text-lg whitespace-nowrap"
                        style={{
                            textShadow: '0 0 10px rgba(234, 179, 8, 0.8), 0 2px 4px rgba(0,0,0,0.5)'
                        }}
                    >
                        Lv.{level} 달성!
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes sway {
                    0%, 100% { transform: rotate(-1deg); }
                    50% { transform: rotate(1deg); }
                }
                
                @keyframes floatUp {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, 0) scale(0.8);
                    }
                    20% {
                        opacity: 1;
                        transform: translate(-50%, -10px) scale(1.1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -40px) scale(1);
                    }
                }
                
                @keyframes pulse-ring {
                    0%, 100% {
                        filter: drop-shadow(0 0 ${config.stroke * 1.5}px ${colors.glow});
                    }
                    50% {
                        filter: drop-shadow(0 0 ${config.stroke * 3}px ${colors.glow});
                    }
                }
                
                .animate-sway {
                    animation: sway 3s ease-in-out infinite;
                }
                
                .animate-pulse-ring {
                    animation: pulse-ring 0.6s ease-out;
                }
            `}</style>
        </div>
    );
};

// Simplified version for level-up modals
export const MasteryRingLevelUp: React.FC<{
    oldLevel: MasteryLevel;
    newLevel: MasteryLevel;
    onComplete?: () => void;
}> = ({ oldLevel, newLevel, onComplete }) => {
    const [currentLevel, setCurrentLevel] = useState(oldLevel);
    const [currentXp, setCurrentXp] = useState(MASTERY_XP_THRESHOLDS[oldLevel]);

    useEffect(() => {
        // Animate XP to threshold
        setTimeout(() => {
            setCurrentXp(MASTERY_XP_THRESHOLDS[newLevel]);
        }, 300);

        // Level up
        setTimeout(() => {
            setCurrentLevel(newLevel);
        }, 600);

        // Complete
        setTimeout(() => {
            onComplete?.();
        }, 1800);
    }, [newLevel, onComplete]);

    return (
        <MasteryRing
            level={currentLevel}
            currentXp={currentXp}
            size="xl"
            animateOnChange={true}
            breathingAnimation={false}
        />
    );
};
