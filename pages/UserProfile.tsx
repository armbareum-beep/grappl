import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Swords, Calendar, Medal, Activity, Dumbbell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getBeltInfo } from '../lib/belt-system';
import { TrainingLog, UserProgress } from '../types';
import { SocialPost } from '../components/social/SocialPost';

export default function UserProfile() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [logs, setLogs] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            loadUserProfile();
        }
    }, [userId]);

    const loadUserProfile = async () => {
        try {
            setLoading(true);

            // 1. Load User Basic Info
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (userError) throw userError;
            setUser(userData);

            // 2. Load User Progress (Belt, etc.)
            const { data: progressData } = await supabase
                .from('user_progress')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (progressData) {
                const progressFormatted: UserProgress = {
                    userId: progressData.user_id,
                    beltLevel: progressData.belt_level,
                    currentXp: progressData.current_xp || 0,
                    totalXp: progressData.total_xp || 0,
                    lastQuestReset: progressData.last_quest_reset,
                    createdAt: progressData.created_at,
                    updatedAt: progressData.updated_at
                };
                setProgress(progressFormatted);
            }

            // 3. Load Stats (Sparring Records)
            const { data: logsData } = await supabase
                .from('training_logs')
                .select('*')
                .eq('user_id', userId)
                .eq('is_public', true)
                .order('date', { ascending: false });

            if (logsData) {
                // Calculate Stats
                const sparringLogs = logsData.filter(l => l.type === 'sparring' && l.metadata?.result);
                const wins = sparringLogs.filter(l => l.metadata.result === 'win').length;
                const losses = sparringLogs.filter(l => l.metadata.result === 'loss').length;
                const draws = sparringLogs.filter(l => l.metadata.result === 'draw').length;
                const totalSparring = sparringLogs.length;

                // Most used techniques
                const techniques: Record<string, number> = {};
                logsData.forEach(log => {
                    if (log.techniques) {
                        log.techniques.forEach((t: string) => {
                            techniques[t] = (techniques[t] || 0) + 1;
                        });
                    }
                });
                const topTechniques = Object.entries(techniques)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5);

                setStats({
                    wins, losses, draws, totalSparring,
                    topTechniques,
                    totalLogs: logsData.length,
                    totalTime: logsData.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0)
                });

                // 4. Check if user is a creator
                const { data: creatorData } = await supabase
                    .from('creators')
                    .select('id')
                    .eq('id', userId)
                    .single();

                if (creatorData) {
                    // Redirect to creator profile if they are an instructor
                    navigate(`/creator/${userId}`, { replace: true });
                    return;
                }

                // Format logs for display
                const formattedLogs = logsData.map(log => ({
                    id: log.id,
                    userId: log.user_id,
                    userName: userData.name,
                    userAvatar: userData.profile_image_url || userData.avatar_url,
                    userBelt: progressData ? getBeltInfo(progressData.belt_level).name : 'White',
                    user: {
                        name: userData.name,
                        email: userData.email,
                        belt: progressData ? getBeltInfo(progressData.belt_level).name : 'White',
                        profileImage: userData.profile_image_url || userData.avatar_url,
                        isInstructor: !!creatorData
                    },
                    date: log.date,
                    createdAt: log.created_at || new Date().toISOString(),
                    notes: log.notes,
                    techniques: log.techniques,
                    location: log.location,
                    metadata: log.metadata,
                    type: log.type || (log.location?.startsWith('__FEED__') ? log.location.replace('__FEED__', '') : 'training'),
                    videoUrl: log.video_url,
                    youtubeUrl: log.youtube_url,
                    mediaUrl: log.media_url,
                    durationMinutes: log.duration_minutes || 0,
                    sparringRounds: log.sparring_rounds || 0,
                    isPublic: log.is_public || false,
                    likes: 0,
                    comments: 0
                }));
                setLogs(formattedLogs);
            }

        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">로딩 중...</div>;
    }

    if (!user) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">사용자를 찾을 수 없습니다.</div>;
    }

    const beltInfo = progress ? getBeltInfo(progress.beltLevel) : getBeltInfo(0);

    return (
        <div className="min-h-screen bg-slate-950 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-bold text-white">프로필</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Profile Card */}
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 mb-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-slate-800">
                                {user.profile_image_url || user.avatar_url ? (
                                    <img src={user.profile_image_url || user.avatar_url} alt={user.name} loading="lazy" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-700 flex items-center justify-center text-3xl font-bold text-white">
                                        {user.name?.[0]}
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-slate-800 rounded-full p-2 border border-slate-700">
                                <div className={`w-6 h-6 rounded-full ${beltInfo.color}`} />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-bold text-white mb-2">{user.name}</h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                    <Medal className="w-4 h-4 text-yellow-500" />
                                    {beltInfo.name} 벨트
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    {new Date(user.created_at).toLocaleDateString()} 가입
                                </span>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex gap-4">
                            <div className="text-center px-4 py-2 bg-slate-800/50 rounded-lg">
                                <div className="text-2xl font-bold text-white">{stats?.totalLogs || 0}</div>
                                <div className="text-xs text-slate-400">일지</div>
                            </div>
                            <div className="text-center px-4 py-2 bg-slate-800/50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-400">{progress?.currentXp || 0}</div>
                                <div className="text-xs text-slate-400">XP</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Battle Stats (Combat Power) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Win/Loss Record */}
                    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                        <div className="flex items-center gap-2 mb-4">
                            <Swords className="w-5 h-5 text-red-500" />
                            <h3 className="font-bold text-white">전투력 (스파링 전적)</h3>
                        </div>
                        {stats?.totalSparring > 0 ? (
                            <div className="space-y-4">
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-3xl font-bold text-white">
                                        {((stats.wins / stats.totalSparring) * 100).toFixed(0)}%
                                    </span>
                                    <span className="text-sm text-slate-400 mb-1">승률</span>
                                </div>
                                <div className="flex h-4 rounded-full overflow-hidden bg-slate-800">
                                    <div style={{ width: `${(stats.wins / stats.totalSparring) * 100}%` }} className="bg-green-500" />
                                    <div style={{ width: `${(stats.draws / stats.totalSparring) * 100}%` }} className="bg-yellow-500" />
                                    <div style={{ width: `${(stats.losses / stats.totalSparring) * 100}%` }} className="bg-red-500" />
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span className="text-green-400">{stats.wins} 승</span>
                                    <span className="text-yellow-400">{stats.draws} 무</span>
                                    <span className="text-red-400">{stats.losses} 패</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                아직 스파링 기록이 없습니다.
                            </div>
                        )}
                    </div>

                    {/* Skill Tree (Top Techniques) */}
                    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5 text-blue-500" />
                            <h3 className="font-bold text-white">주특기 (Top 5)</h3>
                        </div>
                        {stats?.topTechniques?.length > 0 ? (
                            <div className="space-y-3">
                                {stats.topTechniques.map(([tech, count]: [string, number], idx: number) => (
                                    <div key={tech} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                                idx === 1 ? 'bg-slate-300/20 text-slate-300' :
                                                    idx === 2 ? 'bg-orange-500/20 text-orange-500' :
                                                        'bg-slate-800 text-slate-500'
                                                }`}>
                                                {idx + 1}
                                            </span>
                                            <span className="text-slate-200 text-sm">{tech}</span>
                                        </div>
                                        <span className="text-slate-500 text-xs">{count}회</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                아직 사용한 기술이 없습니다.
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Logs Checklist */}
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-blue-500" />
                    피드
                </h3>
                <div className="space-y-4">
                    {logs.length > 0 ? (
                        logs.map(log => (
                            <SocialPost key={log.id} post={log} />
                        ))
                    ) : (
                        <div className="text-center py-10 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                            <p className="text-slate-500">작성한 공개 일지가 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
