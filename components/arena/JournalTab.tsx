import React, { useEffect, useState, useRef } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getTrainingLogs, getSparringReviews, createTrainingLog, deleteTrainingLog, createFeedPost, awardTrainingXP, createSparringReview } from '../../lib/api';
import { TrainingLog, SparringReview } from '../../types';
import { Button } from '../Button';
import { Plus, Calendar, Clock, Swords, Trash2, X, User, Trophy, Activity, TrendingUp, TrendingDown, Minus, LogIn, Sparkles, Share2, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { QuestCompleteModal } from '../QuestCompleteModal';
import { format, subDays, eachDayOfInterval, isSameDay, parseISO, startOfYear, endOfYear, subMonths, getYear, addYears, subYears } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { TechniqueTagModal } from '../social/TechniqueTagModal';
import { TrainingTrendsChart } from './TrainingTrendsChart';
import { toPng } from 'html-to-image';
import { ShareToFeedModal } from '../social/ShareToFeedModal';
import { ShareModal } from '../social/ShareModal';

type TimelineItem =
    | { type: 'log'; data: TrainingLog }
    | { type: 'sparring'; data: SparringReview };

type SparringEntry = {
    opponentName: string;
    opponentBelt: string;
    result: 'win' | 'loss' | 'draw';
    rounds: number;
    videoUrl: string;
    notes: string;
};

type GraphRange = '1M' | '3M' | '6M' | '1Y';

export const JournalTab: React.FC = () => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();

    const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [isCreating, setIsCreating] = useState(false);
    const [saveToLog, setSaveToLog] = useState(true);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        durationMinutes: 90,
        notes: '',
        techniques: [] as string[],
        isPublic: true,
        location: '',
        sparringEntries: [] as SparringEntry[]
    });

    // Temp state for adding a sparring entry
    const [isAddingSparring, setIsAddingSparring] = useState(false);
    const [tempSparring, setTempSparring] = useState<SparringEntry>({
        opponentName: '',
        opponentBelt: 'white',
        result: 'draw',
        rounds: 1,
        videoUrl: '',
        notes: ''
    });

    // Tech Tag Modal State
    const [showTechModal, setShowTechModal] = useState(false);

    // Filter & UI State
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showAllLogs] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Graph Range & Year State
    const [graphRange, setGraphRange] = useState<GraphRange>('1Y');
    const [selectedYear, setSelectedYear] = useState(2026);

    // Reward State
    const [showQuestComplete, setShowQuestComplete] = useState(false);
    const [questCompleteData, setQuestCompleteData] = useState<any>(null);

    // Chart Metric State
    const [selectedMetric, setSelectedMetric] = useState<'count' | 'duration' | 'rounds'>('count');

    // Share Modal State
    const [showShareModal, setShowShareModal] = useState(false); // Used for Preview (ShareToFeedModal)
    const [showDestinationModal, setShowDestinationModal] = useState(false); // Used for Final Destination (ShareModal)
    const [shareImage, setShareImage] = useState<string | null>(null);
    const [stagingComment, setStagingComment] = useState('');
    const [isCapturing, setIsCapturing] = useState(false);

    // Refs for capture
    const grassGraphRef = useRef<HTMLDivElement>(null);
    const statsGraphRef = useRef<HTMLDivElement>(null);

    // Delete Confirmation
    const [itemToDelete, setItemToDelete] = useState<TimelineItem | null>(null);

    useEffect(() => {
        if (user) loadData();
        else setLoading(false);
    }, [user]);

    useEffect(() => {
        // Scroll to end when date range or items change
        if (scrollRef.current) {
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
                }
            }, 100);
        }
    }, [timelineItems, loading, graphRange, selectedYear]);

    const loadData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [logsResult, sparringResult] = await Promise.all([
                getTrainingLogs(user.id),
                getSparringReviews(user.id)
            ]);

            if (logsResult.error) throw logsResult.error;

            let items: TimelineItem[] = [];
            if (logsResult.data) {
                const validLogs = logsResult.data.filter(log =>
                    log.durationMinutes !== -1 &&
                    (!log.location || !log.location.startsWith('__FEED__')) &&
                    !['routine', 'mastery'].includes((log as any).type)
                );
                items.push(...validLogs.map(log => ({ type: 'log' as const, data: log })));
            }
            if (sparringResult.data) {
                items.push(...sparringResult.data.map(review => ({ type: 'sparring' as const, data: review })));
            }
            items.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());
            setTimelineItems(items);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStartCreate = () => {
        if (!user) {
            window.location.href = '/login';
            return;
        }
        setFormData({
            date: new Date().toISOString().split('T')[0],
            durationMinutes: 90,
            notes: '',
            techniques: [],
            isPublic: true,
            location: '',
            sparringEntries: []
        });
        setIsCreating(true);
    };

    const handleAddSparringEntry = () => {
        setFormData(prev => ({
            ...prev,
            sparringEntries: [...prev.sparringEntries, tempSparring]
        }));
        setTempSparring({
            opponentName: '',
            opponentBelt: 'white',
            result: 'draw',
            rounds: 1,
            videoUrl: '',
            notes: ''
        });
        setIsAddingSparring(false);
    };

    const handleRemoveSparringEntry = (index: number) => {
        setFormData(prev => ({
            ...prev,
            sparringEntries: prev.sparringEntries.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            let newLog: TrainingLog | null = null;
            let logXp = 0;
            let streak = 0;
            let sparringXp = 0;

            if (saveToLog) {
                const logResult = await createTrainingLog({
                    userId: user.id,
                    date: formData.date,
                    durationMinutes: formData.durationMinutes,
                    notes: formData.notes,
                    techniques: formData.techniques,
                    isPublic: true,
                    location: formData.location,
                    sparringRounds: formData.sparringEntries.reduce((acc, curr) => acc + curr.rounds, 0)
                });

                if (logResult.error || !logResult.data) throw logResult.error || new Error('Failed to create log');
                newLog = logResult.data;

                const logXpRes = await awardTrainingXP(user.id, 'training_log', 20);
                if (logXpRes.data) {
                    logXp = logXpRes.data.xpEarned;
                    streak = logXpRes.data.streak;
                }
            }

            const newSparringItems: TimelineItem[] = [];
            for (const entry of formData.sparringEntries) {
                const spResult = await createSparringReview({
                    userId: user.id,
                    date: formData.date,
                    opponentName: entry.opponentName,
                    opponentBelt: entry.opponentBelt,
                    result: entry.result,
                    rounds: entry.rounds,
                    notes: entry.notes,
                    videoUrl: entry.videoUrl,
                    whatWorked: '',
                    whatToImprove: '',
                    techniques: []
                });
                if (spResult.data) {
                    newSparringItems.push({ type: 'sparring', data: spResult.data });
                    const xpRes = await awardTrainingXP(user.id, 'sparring_review', 20);
                    if (xpRes.data?.xpEarned) sparringXp += xpRes.data.xpEarned;
                }
            }

            const newItems: TimelineItem[] = [];
            if (newLog) newItems.push({ type: 'log', data: newLog });
            newItems.push(...newSparringItems);

            setTimelineItems(prev => [...newItems, ...prev].sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()));
            setIsCreating(false);

            if (formData.isPublic) {
                let shareContent = `📝 수련 일지\n\n날짜: ${formData.date}\n시간: ${formData.durationMinutes}분\n`;
                if (formData.sparringEntries.length > 0) {
                    const wins = formData.sparringEntries.filter(s => s.result === 'win').length;
                    const loss = formData.sparringEntries.filter(s => s.result === 'loss').length;
                    const draws = formData.sparringEntries.filter(s => s.result === 'draw').length;
                    shareContent += `스파링: ${formData.sparringEntries.length}전 ${wins}승 ${loss}패 ${draws}무\n`;
                }
                shareContent += `\n${formData.notes}`;

                await createFeedPost({
                    userId: user.id,
                    content: shareContent,
                    type: 'general',
                    metadata: { logId: newLog?.id },
                    mediaUrl: undefined,
                    youtubeUrl: formData.sparringEntries[0]?.videoUrl ? getYouTubeEmbedUrl(formData.sparringEntries[0].videoUrl) : undefined
                });
            }

            setQuestCompleteData({
                questName: formData.isPublic ? '수련 일지 게시' : '수련 기록 완료',
                xpEarned: logXp + sparringXp,
                streak: streak || 0
            });
            setShowQuestComplete(true);

        } catch (err) {
            console.error(err);
            toastError('저장 실패');
        }
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            if (itemToDelete.type === 'log') await deleteTrainingLog(itemToDelete.data.id);
            else await supabase.from('sparring_reviews').delete().eq('id', itemToDelete.data.id);

            setTimelineItems(prev => prev.filter(i => i.data.id !== itemToDelete.data.id));
            success('삭제되었습니다.');
            setItemToDelete(null);
        } catch (err) {
            console.error(err);
            toastError('삭제 실패');
        }
    };

    // Capture Logic
    const captureGraph = async (ref: React.RefObject<HTMLDivElement>) => {
        if (!ref.current) return;
        setIsCapturing(true);

        try {
            // skipFonts: true to avoid CORS errors with Google Fonts/External CSS
            const dataUrl = await toPng(ref.current, {
                cacheBust: true,
                backgroundColor: '#09090b',
                pixelRatio: 2,
                skipFonts: true
            });
            setShareImage(dataUrl);
            setShowShareModal(true);
        } catch (err) {
            console.error('Capture failed', err);
            toastError('이미지 저장에 실패했습니다.');
        } finally {
            setIsCapturing(false);
        }
    };

    // Helper functions
    const getIntensity = (date: Date) => {
        const count = timelineItems.filter(item => isSameDay(parseISO(item.data.date), date)).length;
        if (count >= 3) return 3;
        if (count >= 2) return 2;
        if (count >= 1) return 1;
        return 0;
    };

    const getYouTubeEmbedUrl = (url?: string) => {
        if (!url) return undefined;
        if (url.includes('embed')) return url;
        const v = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return v ? `https://www.youtube.com/embed/${v[1]}` : url;
    };

    const filteredItems = selectedDate
        ? timelineItems.filter(item => isSameDay(parseISO(item.data.date), selectedDate))
        : timelineItems;
    const displayedItems = showAllLogs ? filteredItems : filteredItems.slice(0, 10);

    const safeItems = timelineItems || [];
    const now = new Date();
    const thisMonth = now.getMonth();
    const lastMonth = subDays(new Date(now.getFullYear(), now.getMonth(), 1), 1).getMonth();

    const thisMonthItems = safeItems.filter(item => new Date(item.data.date).getMonth() === thisMonth);
    const thisMonthDuration = thisMonthItems.reduce((acc, item) => acc + (item.type === 'log' ? (item.data.durationMinutes || 0) : 0), 0);
    const thisMonthRounds = thisMonthItems.reduce((acc, item) => acc + (item.type === 'log' ? (item.data.sparringRounds || 0) : (item.data.rounds || 0)), 0);

    const lastMonthItems = safeItems.filter(item => new Date(item.data.date).getMonth() === lastMonth);
    const lastMonthDuration = lastMonthItems.reduce((acc, item) => acc + (item.type === 'log' ? (item.data.durationMinutes || 0) : 0), 0);
    const lastMonthRounds = lastMonthItems.reduce((acc, item) => acc + (item.type === 'log' ? (item.data.sparringRounds || 0) : (item.data.rounds || 0)), 0);

    const getTrend = (current: number, previous: number) => {
        if (previous === 0) return { value: current > 0 ? 100 : 0, direction: 'up' };
        const percent = ((current - previous) / previous) * 100;
        return {
            value: Math.abs(Math.round(percent)),
            direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'neutral'
        };
    };

    const countTrend = getTrend(thisMonthItems.length, lastMonthItems.length);
    const durationTrend = getTrend(thisMonthDuration, lastMonthDuration);
    const roundsTrend = getTrend(thisMonthRounds, lastMonthRounds);

    const TrendBadge = ({ trend }: { trend: { value: number, direction: string } }) => {
        const isUp = trend.direction === 'up';
        const isNeutral = trend.direction === 'neutral';
        return (
            <div className={`absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${isNeutral ? 'bg-slate-800 text-slate-400 border-slate-700' :
                isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                {isNeutral ? <Minus className="w-3 h-3" /> : isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {trend.value}%
            </div>
        );
    };

    // Calculate dates for Grass Graph
    const getGrassDates = () => {
        const today = new Date(); // Or maybe selected year end? No, assume '2026' means full year view context

        let start, end;

        // Year Logic - if selectedYear is not current year, show full year
        if (selectedYear !== getYear(today)) {
            start = startOfYear(new Date(selectedYear, 0, 1));
            end = endOfYear(new Date(selectedYear, 0, 1));
        } else {
            // Range Logic (relative to today)
            end = today;
            switch (graphRange) {
                case '1M': start = subMonths(today, 1); break;
                case '3M': start = subMonths(today, 3); break;
                case '6M': start = subMonths(today, 6); break;
                case '1Y': start = subDays(today, 364); break; // roughly 1 year back
                default: start = subDays(today, 364);
            }
        }

        return eachDayOfInterval({ start, end });
    };

    const grassDates = getGrassDates();
    const weeks = Math.ceil(grassDates.length / 7);

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20 relative">

            {/* Training Trends Chart & Share Button */}
            <div className="relative group" ref={statsGraphRef}>
                <TrainingTrendsChart items={timelineItems} metric={selectedMetric} />
                <button
                    onClick={() => captureGraph(statsGraphRef)}
                    className="absolute top-6 right-6 p-2 rounded-xl bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-all border border-zinc-700 backdrop-blur-sm shadow-xl"
                    title="그래프 공유하기"
                >
                    <Share2 className="w-4 h-4" />
                </button>
            </div>

            {/* Stats - Interactive Tabs */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div
                    onClick={() => setSelectedMetric('count')}
                    className={`bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between relative overflow-hidden group transition-all cursor-pointer hover:border-violet-500/50 ${selectedMetric === 'count' ? 'ring-1 ring-violet-500/50' : ''}`}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <TrendBadge trend={countTrend} />
                    <div className="w-10 h-10 rounded-full bg-zinc-950/50 flex items-center justify-center mb-4 ring-1 ring-white/5">
                        <Trophy className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                        <div className="text-4xl font-black text-white leading-none mb-2 transition-colors">
                            {thisMonthItems.length}
                        </div>
                        <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">이번 달 수련</div>
                    </div>
                </div>
                <div
                    onClick={() => setSelectedMetric('duration')}
                    className={`bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between relative overflow-hidden group transition-all cursor-pointer hover:border-violet-500/50 ${selectedMetric === 'duration' ? 'ring-1 ring-violet-500/50' : ''}`}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <TrendBadge trend={durationTrend} />
                    <div className="w-10 h-10 rounded-full bg-zinc-950/50 flex items-center justify-center mb-4 ring-1 ring-white/5">
                        <Clock className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                        <div className="text-4xl font-black text-white leading-none mb-2 transition-colors">
                            {Math.round(thisMonthDuration / 60)}
                        </div>
                        <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">이번 달 시간(hr)</div>
                    </div>
                </div>
                <div
                    onClick={() => setSelectedMetric('rounds')}
                    className={`bg-zinc-900/80 p-6 rounded-2xl border border-zinc-800 flex flex-col justify-between relative overflow-hidden group transition-all cursor-pointer hover:border-violet-500/50 ${selectedMetric === 'rounds' ? 'ring-1 ring-violet-500/50' : ''}`}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <TrendBadge trend={roundsTrend} />
                    <div className="w-10 h-10 rounded-full bg-zinc-950/50 flex items-center justify-center mb-4 ring-1 ring-white/5">
                        <Activity className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                        <div className="text-4xl font-black text-white leading-none mb-2 transition-colors">
                            {thisMonthRounds}
                        </div>
                        <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">이번 달 라운드</div>
                    </div>
                </div>
            </div>

            {/* Heatmap */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 relative group" ref={grassGraphRef}>
                {/* Graph Capture Button */}
                <button
                    onClick={() => captureGraph(grassGraphRef)}
                    className="absolute top-6 right-6 p-2 rounded-xl bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-all border border-zinc-700 backdrop-blur-sm shadow-xl z-20"
                    title="잔디 공유하기"
                >
                    <Share2 className="w-4 h-4" />
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-zinc-400" />
                        수련 잔디
                    </h3>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Year Selector */}
                        <div className="flex items-center bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                            <button onClick={() => setSelectedYear(prev => prev - 1)} className="p-1 hover:text-white text-zinc-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                            <span className="text-xs font-bold px-2 text-zinc-300">{selectedYear}</span>
                            <button onClick={() => setSelectedYear(prev => prev + 1)} className="p-1 hover:text-white text-zinc-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                        </div>

                        {/* Range Selector */}
                        <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                            {(['1M', '3M', '6M', '1Y'] as GraphRange[]).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setGraphRange(range)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${graphRange === range
                                        ? 'bg-violet-600 text-white shadow-lg'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div ref={scrollRef} className="overflow-x-auto pb-4 scrollbar-hide px-4 -mx-4">
                    <div className="min-w-max flex gap-1.5 pl-2">
                        {/* Render columns based on calculated weeks */}
                        {Array.from({ length: weeks }).map((_, w) => (
                            <div key={w} className="flex flex-col gap-1.5">
                                {Array.from({ length: 7 }).map((_, d) => {
                                    const idx = w * 7 + d;
                                    if (idx >= grassDates.length) return <div key={d} className="w-3.5 h-3.5" />; // maintain grid

                                    const currentDate = grassDates[idx];
                                    const intensity = getIntensity(currentDate);
                                    const isSel = selectedDate && isSameDay(selectedDate, currentDate);

                                    // Visual logic
                                    let bg = 'bg-zinc-800/50';
                                    if (intensity === 1) bg = 'bg-violet-900/60 border border-violet-800/50';
                                    if (intensity === 2) bg = 'bg-violet-600 border border-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]';
                                    if (intensity >= 3) bg = 'bg-violet-400 border border-violet-300 shadow-[0_0_8px_rgba(167,139,250,0.5)]';

                                    return (
                                        <div
                                            key={d}
                                            onClick={() => setSelectedDate(isSel ? null : currentDate)}
                                            title={format(currentDate, 'yyyy-MM-dd')}
                                            className={`w-3.5 h-3.5 rounded-sm cursor-pointer transition-all ${bg} ${isSel ? 'ring-2 ring-white scale-125 z-10' : 'hover:scale-110'}`}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* List Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                    {selectedDate ? format(selectedDate, 'M월 d일의 기록') : '최근 활동'}
                </h3>
                <Button
                    onClick={handleStartCreate}
                    className="rounded-full px-8 py-3 bg-violet-600 hover:bg-violet-500 text-zinc-50 shadow-lg shadow-violet-900/40 transform transition-all hover:scale-105 active:scale-95 font-bold text-base"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    기록하기
                </Button>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
                {displayedItems.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
                        <p className="text-zinc-600 mb-4 text-sm">{user ? '기록이 없습니다.' : '로그인하여 수련 기록을 시작하세요.'}</p>
                        <Button onClick={handleStartCreate} variant="outline" size="sm">{user ? '첫 기록 남기기' : '로그인하기'}</Button>
                    </div>
                ) : (
                    displayedItems.map((item) => {
                        const isSparring = item.type === 'sparring';
                        const date = parseISO(item.data.date);
                        return (
                            <div key={`${item.type}-${item.data.id}`} className="bg-zinc-900/80 rounded-2xl border border-zinc-800 overflow-hidden hover:border-violet-500/50 transition-all shadow-lg group">
                                <div className="p-5 flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg ${isSparring
                                            ? item.data.result === 'win' ? 'bg-emerald-500' : item.data.result === 'loss' ? 'bg-zinc-700 text-zinc-400' : 'bg-violet-600'
                                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                                            }`}>
                                            {isSparring ? (item.data.result === 'win' ? 'W' : item.data.result === 'loss' ? 'L' : 'D') : format(date, 'd')}
                                        </div>
                                        <div>
                                            <div className="font-bold text-zinc-50 text-lg flex items-center gap-2">
                                                {isSparring ? `vs ${item.data.opponentName}` : format(date, 'M월 d일 EEEE', { locale: ko })}
                                                {isSparring && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold uppercase tracking-wider">SPARRING</span>}
                                            </div>
                                            <div className="text-sm text-zinc-500 flex items-center gap-3 mt-0.5 font-medium">
                                                {isSparring ? (
                                                    <>{item.data.rounds}R • {item.data.opponentBelt}벨트</>
                                                ) : (
                                                    <>{item.data.durationMinutes}분 수련 • 스파링 {item.data.sparringRounds}R</>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setItemToDelete(item)} className="p-2 text-slate-500 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {(isSparring || item.data.notes) && (
                                    <div className="px-5 pb-5">
                                        {isSparring && item.data.videoUrl && (
                                            <div className="mb-4 rounded-xl overflow-hidden bg-black aspect-video border border-zinc-800">
                                                <iframe src={getYouTubeEmbedUrl(item.data.videoUrl)} className="w-full h-full" frameBorder="0" allowFullScreen />
                                            </div>
                                        )}
                                        {item.data.notes && (
                                            <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
                                                <p className="text-zinc-400 text-sm whitespace-pre-wrap leading-relaxed">{item.data.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create Modal - New Post Style */}
            {
                isCreating && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsCreating(false)}>
                        <div className="bg-zinc-900/90 backdrop-blur-2xl rounded-3xl w-full max-w-lg flex flex-col max-h-[90vh] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex justify-between items-center p-6 border-b border-white/5">
                                <h2 className="text-lg font-bold text-white">새 게시물</h2>
                                <button onClick={() => setIsCreating(false)} className="p-2 rounded-full hover:bg-white/5 transition-colors"><X className="w-5 h-5 text-zinc-400 hover:text-white" /></button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700">
                                {/* User Profile */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                        {user?.user_metadata?.avatar_url ? (
                                            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-sm">{user?.email?.split('@')[0] || 'User'}</div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                                            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border w-fit mt-0.5 transition-colors ${formData.isPublic ? 'text-violet-400 bg-violet-500/10 border-violet-500/20' : 'text-gray-400 bg-gray-800 border-gray-700'}`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${formData.isPublic ? 'bg-violet-400 animate-pulse' : 'bg-gray-500'}`}></span>
                                            {formData.isPublic ? '전체 공개' : '나만 보기'}
                                        </button>
                                    </div>
                                </div>

                                <form id="postForm" onSubmit={handleSave} className="space-y-4">
                                    <textarea
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full bg-transparent text-white placeholder-gray-500 text-base resize-none outline-none min-h-[120px]"
                                        placeholder="오늘 수련은 어떠셨나요? 자유롭게 기록해보세요."
                                    />

                                    {/* Added Items Display (Sparring, Tags, etc) */}
                                    <div className="space-y-2">
                                        {formData.techniques.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {formData.techniques.map(tech => (
                                                    <span key={tech} className="px-2 py-1 rounded bg-violet-500/20 text-violet-300 text-xs border border-violet-500/30 flex items-center gap-1">
                                                        #{tech} <button type="button" onClick={() => setFormData({ ...formData, techniques: formData.techniques.filter(t => t !== tech) })}>&times;</button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {formData.sparringEntries.map((entry, idx) => (
                                            <div key={idx} className="bg-[#252525] p-3 rounded-lg border border-[#333] flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${entry.result === 'win' ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                                                        {entry.result === 'win' ? 'W' : entry.result === 'loss' ? 'L' : 'D'}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm text-gray-200 font-medium">{entry.opponentName} <span className="text-gray-500 text-xs">({entry.opponentBelt})</span></div>
                                                        <div className="text-xs text-gray-500">{entry.rounds}라운드 {entry.notes && `• ${entry.notes}`}</div>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveSparringEntry(idx)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Tools Section */}
                                    <div className="pt-2 flex flex-col gap-2">
                                        {/* Inline Tools: Date, Sparring Mode, Link */}
                                        {isAddingSparring ? (
                                            <div className="bg-[#252525] p-3 rounded-xl border border-[#333] animate-in slide-in-from-top-2">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs text-gray-400 font-bold">스파링 추가</span>
                                                    <button type="button" onClick={() => setIsAddingSparring(false)}><X className="w-3 h-3 text-gray-500" /></button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mb-2">
                                                    <input type="text" placeholder="상대 이름" value={tempSparring.opponentName} onChange={e => setTempSparring({ ...tempSparring, opponentName: e.target.value })} className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-sm text-white focus:border-violet-500 outline-none" />
                                                    <select value={tempSparring.opponentBelt} onChange={e => setTempSparring({ ...tempSparring, opponentBelt: e.target.value })} className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-sm text-white outline-none">
                                                        <option value="white">White</option>
                                                        <option value="blue">Blue</option>
                                                        <option value="purple">Purple</option>
                                                        <option value="brown">Brown</option>
                                                        <option value="black">Black</option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mb-2">
                                                    <select value={tempSparring.result} onChange={e => setTempSparring({ ...tempSparring, result: e.target.value as any })} className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-sm text-white outline-none">
                                                        <option value="draw">무승부</option>
                                                        <option value="win">승리</option>
                                                        <option value="loss">패배</option>
                                                    </select>
                                                    <div className="flex items-center gap-2">
                                                        <input type="number" value={tempSparring.rounds} onChange={e => setTempSparring({ ...tempSparring, rounds: Number(e.target.value) })} className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-sm text-white w-full outline-none" />
                                                        <span className="text-xs text-gray-500 whitespace-nowrap">R</span>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={handleAddSparringEntry} disabled={!tempSparring.opponentName} className="w-full bg-violet-600 hover:bg-violet-500 text-white py-1.5 rounded text-sm font-medium transition-colors">추가완료</button>
                                            </div>
                                        ) : (
                                            null
                                        )}

                                        <div className="flex items-center gap-4 py-2">
                                            {/* Tool Icons */}
                                            <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => setIsAddingSparring(!isAddingSparring)} className={`p-2 rounded-full hover:bg-gray-800 transition-colors ${isAddingSparring ? 'text-violet-400 bg-violet-500/10' : 'text-gray-400'}`} title="스파링 추가">
                                                    <Swords className="w-5 h-5" />
                                                </button>
                                                <div className="h-4 w-[1px] bg-gray-700 mx-1"></div>

                                                {/* Date Picker (Small) */}
                                                <div className="relative group">
                                                    <label htmlFor="date-input" className="p-2 rounded-full hover:bg-gray-800 cursor-pointer block text-gray-400 group-hover:text-white transition-colors">
                                                        <Calendar className="w-5 h-5" />
                                                    </label>
                                                    <input id="date-input" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                                                </div>

                                                <button type="button" onClick={() => setShowTechModal(true)} className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors" title="기술 태그">
                                                    <span className="font-serif italic font-bold text-lg">#</span>
                                                </button>

                                                {/* Duration (Quick Input) */}
                                                <div className="relative group flex items-center">
                                                    <Clock className="w-5 h-5 text-gray-400 ml-2" />
                                                    <input type="number" value={formData.durationMinutes} onChange={e => setFormData({ ...formData, durationMinutes: Number(e.target.value) })} className="w-12 bg-transparent text-sm text-gray-300 text-center outline-none border-b border-transparent focus:border-violet-500 transition-colors" title="수련 시간(분)" />
                                                    <span className="text-xs text-gray-600">분</span>
                                                </div>
                                            </div>

                                            <div className="flex-1"></div>

                                            {/* Journal Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => setSaveToLog(!saveToLog)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${saveToLog ? 'bg-violet-500 text-white shadow-lg shadow-violet-900/20' : 'bg-gray-800 text-gray-500'}`}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${saveToLog ? 'bg-white' : 'bg-gray-600'}`}></div>
                                                수련 일지에 기록 {saveToLog && 'ON'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* Footer Action */}
                            <div className="p-6 border-t border-white/5 bg-zinc-900/50 backdrop-blur-md">
                                <Button type="submit" form="postForm" className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white text-base font-bold rounded-2xl shadow-lg shadow-violet-900/20 hover:shadow-violet-500/40 flex items-center justify-center gap-2 transform transition-all active:scale-[0.98]">
                                    {formData.isPublic ? '게시하기' : '저장하기'}
                                    <Sparkles className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {itemToDelete && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-white mb-2">기록을 삭제하시겠습니까?</h3>
                        <p className="text-zinc-500 text-sm mb-6">삭제된 기록은 복구할 수 없습니다.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setItemToDelete(null)}
                                className="flex-1 py-3 rounded-xl bg-zinc-900 text-zinc-400 hover:bg-zinc-800 font-bold text-sm transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-colors shadow-lg shadow-rose-900/20"
                            >
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shared To Feed Modal (Image Capture) - PREVIEW STEP */}
            {showShareModal && (
                <ShareToFeedModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    onShare={async (comment) => {
                        setStagingComment(comment);
                        setShowShareModal(false);
                        setShowDestinationModal(true);
                    }}
                    activityType="general"
                    defaultContent="오늘의 수련 현황입니다! 🥋🔥"
                    metadata={{
                        userName: user?.user_metadata?.name || 'User',
                        userAvatar: user?.user_metadata?.avatar_url,
                        images: shareImage ? [shareImage] : [],
                        notes: "그래프 공유"
                    }}
                />
            )}

            {/* Destination Share Modal - FINAL STEP */}
            <ShareModal
                isOpen={showDestinationModal}
                onClose={() => setShowDestinationModal(false)}
                title="수련 통계 공유"
                text={stagingComment || "오늘의 수련 현황입니다! 🥋🔥"}
                imageUrl={shareImage || undefined}
                onFeedShare={async () => {
                    if (!user) {
                        toastError('로그인이 필요합니다.');
                        return;
                    }
                    if (!shareImage) {
                        toastError('이미지가 없습니다. 다시 시도해주세요.');
                        return;
                    }

                    // Upload Image first
                    let imageUrl = '';
                    try {
                        const blob = await (await fetch(shareImage)).blob();
                        const fileName = `share-graph-${Date.now()}.png`;
                        const { data, error } = await supabase.storage.from('hero-images').upload(fileName, blob);
                        if (error) {
                            console.error('Image upload failed:', error);
                            // Continue without image or stop? Let's continue but warn
                        }
                        if (!error && data) {
                            const { data: publicUrl } = supabase.storage.from('hero-images').getPublicUrl(fileName);
                            imageUrl = publicUrl.publicUrl;
                        }
                    } catch (e) {
                        console.error('Upload failed', e);
                    }

                    const { error } = await createFeedPost({
                        userId: user.id,
                        content: stagingComment,
                        type: 'general',
                        // We use general type but include visual metadata
                        metadata: {
                            type: 'stats_share',
                            images: imageUrl ? [imageUrl] : []
                        },
                        mediaUrl: imageUrl
                    });

                    if (error) {
                        console.error('Create feed post failed:', error);
                        toastError('피드 공유에 실패했습니다.');
                        return;
                    }

                    success('피드에 공유되었습니다!');
                    setShowDestinationModal(false);
                }}
            />
            {
                showQuestComplete && questCompleteData && (
                    <QuestCompleteModal
                        isOpen={showQuestComplete}
                        onClose={() => setShowQuestComplete(false)}
                        onContinue={() => setShowQuestComplete(false)}
                        {...questCompleteData}
                    />
                )
            }

            {
                showTechModal && (
                    <TechniqueTagModal
                        selectedTechniques={formData.techniques}
                        onSelect={(techs) => setFormData({ ...formData, techniques: techs })}
                        onClose={() => setShowTechModal(false)}
                    />
                )
            }
        </div >
    );
};
