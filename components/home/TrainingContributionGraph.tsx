import React, { useEffect, useState } from 'react';
import { getTrainingHistory } from '../../lib/api-training-xp';

interface ContributionDay {
    date: string;
    minutes: number;
    count: number;
    intensity: number; // 0-4
}

interface TrainingContributionGraphProps {
    userId: string;
}

// Configuration
const DAYS_TO_SHOW = 182; // Approx 6 months (26 weeks)
const INTENSITY_THRESHOLDS = {
    Lv1: 0,   // Started ( > 0 min)
    Lv2: 10,  // > 10 mins
    Lv3: 20,  // > 20 mins
};

export const TrainingContributionGraph: React.FC<TrainingContributionGraphProps> = ({ userId }) => {
    const [loading, setLoading] = useState(true);
    const [weeks, setWeeks] = useState<{ days: (ContributionDay | null)[] }[]>([]);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch enough history
                const data = await getTrainingHistory(userId, DAYS_TO_SHOW + 30);
                // Process data into a map for O(1) lookup
                const dataMap = new Map(data.map(d => [d.date, d]));

                // Generate calendar grid
                const today = new Date();
                // Use DAYS_TO_SHOW constant
                const daysToGenerate = DAYS_TO_SHOW;

                // Calculate start date
                // We want to align weeks so the last column is the current week.
                // The grid is usually 7 rows (Sun-Sat).

                // Let's generate a flat list of days first
                const generatedDays: ContributionDay[] = [];
                for (let i = daysToGenerate; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(today.getDate() - i);
                    const dateStr = d.toISOString().split('T')[0];
                    const entry = dataMap.get(dateStr);

                    let intensity = 0;
                    if (entry) {
                        const mins = entry.minutes;
                        if (mins > INTENSITY_THRESHOLDS.Lv3) intensity = 3;
                        else if (mins > INTENSITY_THRESHOLDS.Lv2) intensity = 2;
                        else if (mins > INTENSITY_THRESHOLDS.Lv1) intensity = 1;
                    }

                    generatedDays.push({
                        date: dateStr,
                        minutes: entry?.minutes || 0,
                        count: entry?.count || 0,
                        intensity
                    });
                }

                // Group by weeks for vertical rendering (GitHub style)
                // Grid: Columns are Weeks, Rows are Days (Sun-Sat or Mon-Sun)
                // We need to pad the beginning to align with the correct day of week
                const weekGroups: { days: (ContributionDay | null)[] }[] = [];
                let currentWeek: (ContributionDay | null)[] = [];

                // Assuming Sunday start (0)
                const firstDay = new Date(generatedDays[0].date);
                const startDayOfWeek = firstDay.getDay(); // 0 is Sun

                // Pad first week
                for (let i = 0; i < startDayOfWeek; i++) {
                    currentWeek.push(null);
                }

                generatedDays.forEach(day => {
                    currentWeek.push(day);
                    if (currentWeek.length === 7) {
                        weekGroups.push({ days: currentWeek });
                        currentWeek = [];
                    }
                });

                // Push remaining partial week
                if (currentWeek.length > 0) {
                    // Pad end if needed? Not strictly necessary for rendering unless we want full grid
                    // But usually we just let it be.
                    weekGroups.push({ days: currentWeek });
                }

                setWeeks(weekGroups);

            } catch (e) {
                console.error('Error loading graph:', e);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchData();
    }, [userId]);

    const getIntensityColor = (intensity: number) => {
        switch (intensity) {
            case 0: return 'bg-zinc-800/50';
            case 1: return 'bg-violet-900/40';
            case 2: return 'bg-violet-600';
            case 3: return 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]';
            default: return 'bg-zinc-800/50';
        }
    };

    if (loading) {
        return <div className="h-24 w-full bg-zinc-900/30 animate-pulse rounded-xl" />;
    }

    // Determine how many weeks to show based on logic or leave it to CSS overflow (scroll)
    // We'll make it scrollable horizontally
    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">최근 6개월 활동</span>
                <div className="flex items-center gap-1.5 text-[9px] text-zinc-600">
                    <span>Less</span>
                    <div className="w-2 h-2 rounded-[2px] bg-zinc-800/50" />
                    <div className="w-2 h-2 rounded-[2px] bg-violet-900/40" />
                    <div className="w-2 h-2 rounded-[2px] bg-violet-600" />
                    <div className="w-2 h-2 rounded-[2px] bg-white" />
                    <span>More</span>
                </div>
            </div>

            <div className="w-full overflow-x-auto no-scrollbar pb-2">
                <div className="flex gap-[3px] min-w-max">
                    {weeks.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-[3px]">
                            {week.days.map((day, dIndex) => (
                                <div
                                    key={dIndex}
                                    className={`w-2.5 h-2.5 rounded-[2px] transition-colors ${day ? getIntensityColor(day.intensity) : 'bg-transparent'}`}
                                    title={day ? `${day.date}: ${day.minutes}분` : ''}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
