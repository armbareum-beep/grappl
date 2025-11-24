import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserStats, getLeaderboard, getUserSkillCourses, addXP, updateQuestProgress, recordMatch, checkAndAwardTitles, getMatchHistory, getUserTitles } from '../../lib/api';
import { Trophy, Swords, Zap, Crown, Medal, BookOpen } from 'lucide-react';
import { BeltUpModal } from '../BeltUpModal';
import { MatchHistoryPanel } from './MatchHistoryPanel';

interface Stats {
    Standing: number;
    Guard: number;
    'Guard Pass': number;
    Side: number;
    Mount: number;
    Back: number;
    logCount: number;
    total: number;
}

interface LeaderboardEntry {
    userId: string;
    userName: string;
    score: number;
    stats: Stats;
}

interface SkillCourse {
    id: string;
    course_id: string;
    slot_type: string;
    courses: {
        id: string;
        title: string;
        category: string;
    };
}

export const TournamentTab: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [matchLog, setMatchLog] = useState<string[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [tournamentResult, setTournamentResult] = useState<'win' | 'loss' | null>(null);
    const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);
    const [skillCourses, setSkillCourses] = useState<SkillCourse[]>([]);
    const [mySkills, setMySkills] = useState<SkillCourse[]>([]);
    const [showBeltUp, setShowBeltUp] = useState(false);
    const [beltUpData, setBeltUpData] = useState<{ old: number; new: number } | null>(null);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const [statsRes, leaderboardRes] = await Promise.all([
            getUserStats(user.id),
            getLeaderboard()
        ]);

        if (statsRes.data) setStats(statsRes.data);
        if (leaderboardRes.data) {
            setLeaderboard(leaderboardRes.data.slice(0, 10)); // Top 10
            const myRank = leaderboardRes.data.findIndex(entry => entry.userId === user.id);
            if (myRank !== -1) setUserRank(myRank + 1);
        }

        setLoading(false);
    };

    // Fetch skill courses when a user is selected
    useEffect(() => {
        const fetchSkills = async () => {
            if (!selectedUser) {
                setSkillCourses([]);
                return;
            }

            const { data } = await getUserSkillCourses(selectedUser.userId);
            if (data) {
                setSkillCourses(data as any);
            }
        };

        fetchSkills();
    }, [selectedUser]);

    // Fetch my skills for match simulation
    useEffect(() => {
        const fetchMySkills = async () => {
            if (!user) return;
            const { data } = await getUserSkillCourses(user.id);
            if (data) {
                setMySkills(data as any);
            }
        };
        fetchMySkills();
    }, [user]);

    // BJJ-style match commentary
    const BJJ_ACTIONS = {
        offensive: [
            "가드를 잡았다!",
            "패스를 시도한다!",
            "스윕에 성공했다!",
            "백을 잡았다!",
            "마운트 포지션!",
            "사이드 컨트롤!",
            "암바를 걸었다!",
            "초크를 조른다!",
            "기로틴 찬스!",
            "트라이앵글 세팅!",
        ],
        defensive: [
            "가드를 유지한다",
            "탈출 시도...",
            "포지션을 방어한다",
            "프레임을 만든다",
            "거리를 확보한다",
        ],
        submissions: [
            "암바", "RNC", "기로틴", "트라이앵글", "힐훅", "키무라", "오모플라타"
        ]
    };

    const getRandomAction = (isOffensive: boolean) => {
        const actions = isOffensive ? BJJ_ACTIONS.offensive : BJJ_ACTIONS.defensive;
        return actions[Math.floor(Math.random() * actions.length)];
    };

    const getRandomSubmission = () => {
        const subs = BJJ_ACTIONS.submissions;
        return subs[Math.floor(Math.random() * subs.length)];
    };

    const calculateWinRate = (myLevel: number, opponentLevel: number): number => {
        const baseRate = 50;
        const levelDiff = myLevel - opponentLevel;
        const beltBonus = levelDiff * 2; // 2% per level difference

        const winRate = baseRate + beltBonus;

        // Clamp between 20% and 80%
        return Math.max(20, Math.min(80, winRate));
    };

    const simulateMatch = async () => {
        if (!stats || !user) return;
        setIsPlaying(true);
        setMatchLog([]);
        setTournamentResult(null);

        // Get user's current level
        const { data: userStatsData } = await getUserStats(user.id);
        const myLevel = userStatsData?.level || 1;

        // Generate random opponent
        const opponentLevel = Math.max(1, myLevel + Math.floor(Math.random() * 11) - 5); // ±5 levels
        const opponentName = `상대 ${Math.floor(Math.random() * 1000)}`;

        const winRate = calculateWinRate(myLevel, opponentLevel);

        const logs: string[] = [];
        logs.push(`🥋 ${opponentName} (레벨 ${opponentLevel})와 대결!`);
        logs.push(`승률: ${winRate.toFixed(0)}%`);
        setMatchLog([...logs]);

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate 5 rounds
        let playerPoints = 0;
        let opponentPoints = 0;

        for (let i = 1; i <= 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 800));

            const roundWin = Math.random() * 100 < winRate;

            if (roundWin) {
                const action = getRandomAction(true);
                logs.push(`Round ${i}: ${action}`);
                playerPoints += 2;
            } else {
                const action = getRandomAction(false);
                logs.push(`Round ${i}: ${action}`);
                opponentPoints += 2;
            }
            setMatchLog([...logs]);
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Determine result
        let result: 'win' | 'loss';
        let winType: 'submission' | 'points' | undefined;
        let submissionType: string | undefined;

        if (playerPoints > opponentPoints) {
            result = 'win';
            // 30% chance of submission win
            if (Math.random() < 0.3) {
                winType = 'submission';
                submissionType = getRandomSubmission();
                logs.push(`🏆 서브미션 승리! (${submissionType})`);
            } else {
                winType = 'points';
                logs.push(`🏆 포인트 승리! (${playerPoints}-${opponentPoints})`);
            }
            setTournamentResult('win');
        } else if (playerPoints < opponentPoints) {
            result = 'loss';
            logs.push(`❌ 포인트 패배... (${playerPoints}-${opponentPoints})`);
            setTournamentResult('loss');
        } else {
            // Draw - decide by submission attempt
            if (Math.random() < winRate / 100) {
                result = 'win';
                winType = 'submission';
                submissionType = getRandomSubmission();
                logs.push(`🏆 서브미션 승리! (${submissionType})`);
                setTournamentResult('win');
            } else {
                result = 'loss';
                logs.push(`❌ 탭아웃...`);
                setTournamentResult('loss');
            }
        }

        setMatchLog([...logs]);
        setIsPlaying(false);

        // Award XP based on result
        const xpAmount = result === 'win' ? 10 : 5;
        const { xpEarned, leveledUp, newLevel } = await addXP(user.id, xpAmount, 'tournament');

        if (leveledUp && newLevel) {
            setBeltUpData({ old: newLevel - 1, new: newLevel });
            setShowBeltUp(true);
        }

        // Record match history
        await recordMatch({
            userId: user.id,
            opponentName,
            opponentLevel,
            userLevel: myLevel,
            result,
            winType,
            submissionType,
            pointsUser: playerPoints,
            pointsOpponent: opponentPoints,
            xpEarned
        });

        // Check for new titles
        const { data: newTitles } = await checkAndAwardTitles(user.id);
        if (newTitles && newTitles.length > 0) {
            newTitles.forEach(title => {
                logs.push(`🎖️ 새로운 칭호 획득: ${title.name}`);
            });
            setMatchLog([...logs]);
        }

        // Update quest progress
        await updateQuestProgress(user.id, 'tournament_match');
    };

    if (loading) return <div className="p-8 text-center">로딩 중...</div>;

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-12 text-center">
                <h2 className="text-5xl font-black text-slate-900 mb-4 flex items-center justify-center gap-4 tracking-tight">
                    <Trophy className="w-12 h-12 text-yellow-500" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                        시합장
                    </span>
                    <span className="text-2xl text-slate-400 font-medium self-end mb-2">Competition Arena</span>
                </h2>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                    수련일지와 스킬 트리로 강해지세요! 실제 상황과 같은 치열한 승부!
                </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Stats & Leaderboard (5 cols) */}
                <div className="lg:col-span-5 space-y-8">
                    {/* Stats Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/50">
                        <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-slate-900">
                            <div className="p-2 bg-blue-50 rounded-xl">
                                <Zap className="w-6 h-6 text-blue-600" />
                            </div>
                            나의 전투력
                        </h3>

                        <div className="space-y-6">
                            {stats && Object.entries(stats).map(([key, value]) => {
                                if (key === 'total' || key === 'logCount') return null;
                                const max = 50;
                                const percentage = Math.min((value / max) * 100, 100);

                                return (
                                    <div key={key}>
                                        <div className="flex justify-between text-base mb-2">
                                            <span className="font-semibold text-slate-700">{key}</span>
                                            <span className="font-bold text-slate-900">{value}</span>
                                        </div>
                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="pt-8 border-t border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-slate-400" /> 수련 일지 보너스
                                    </span>
                                    <span className="font-bold text-blue-600 text-lg">+{((stats?.logCount || 0) * 0.5).toFixed(1)}</span>
                                </div>
                                <p className="text-sm text-slate-400 text-right">일지당 0.5점</p>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 bg-slate-50 -mx-8 -mb-8 p-8 rounded-b-3xl">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-bold text-lg">총 전투력</span>
                                <span className="text-5xl font-black text-slate-900 tracking-tight">{stats?.total}</span>
                            </div>
                            {userRank && (
                                <div className="mt-4 text-center bg-white text-yellow-600 py-3 rounded-xl font-bold border border-yellow-100 shadow-sm">
                                    🏆 현재 랭킹: <span className="text-xl">{userRank}위</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Leaderboard Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/50">
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-slate-900">
                            <div className="p-2 bg-yellow-50 rounded-xl">
                                <Medal className="w-6 h-6 text-yellow-500" />
                            </div>
                            랭킹 (TOP 10)
                        </h3>

                        <div className="space-y-3">
                            {leaderboard.map((entry, index) => (
                                <div
                                    key={entry.userId}
                                    onClick={() => setSelectedUser(entry)}
                                    className={`flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer ${entry.userId === user?.id
                                        ? 'bg-blue-50 border-2 border-blue-200 shadow-md transform scale-[1.02]'
                                        : selectedUser?.userId === entry.userId
                                            ? 'bg-purple-50 border-2 border-purple-200 shadow-md'
                                            : 'bg-white border border-slate-100 hover:border-slate-300 hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full font-black text-lg ${index === 0 ? 'bg-yellow-100 text-yellow-700 ring-4 ring-yellow-50' :
                                            index === 1 ? 'bg-slate-200 text-slate-700' :
                                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-slate-50 text-slate-400'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <span className={`font-bold truncate text-lg ${entry.userId === user?.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                            {entry.userName}
                                        </span>
                                    </div>
                                    <span className="font-black text-slate-900 text-lg">{entry.score}</span>
                                </div>
                            ))}

                            {leaderboard.length === 0 && (
                                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p>랭킹 데이터가 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Match History */}
                    {user && <MatchHistoryPanel userId={user.id} />}

                    {/* Selected User Skill Tree */}
                    {selectedUser && (
                        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/50">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
                                    <div className="p-2 bg-purple-50 rounded-xl">
                                        <Zap className="w-6 h-6 text-purple-600" />
                                    </div>
                                    {selectedUser.userName}의 스킬
                                </h3>
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="text-slate-400 hover:text-slate-600 text-sm"
                                >
                                    닫기
                                </button>
                            </div>

                            <div className="space-y-4">
                                {Object.entries(selectedUser.stats).map(([key, value]) => {
                                    if (key === 'total' || key === 'logCount') return null;
                                    const max = 50;
                                    const percentage = Math.min((value / max) * 100, 100);

                                    return (
                                        <div key={key}>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="font-semibold text-slate-700">{key}</span>
                                                <span className="font-bold text-slate-900">{value}</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="pt-6 border-t border-slate-100 bg-slate-50 -mx-8 -mb-8 p-8 rounded-b-3xl">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-slate-500 font-bold">총 전투력</span>
                                        <span className="text-4xl font-black text-slate-900">{selectedUser.score}</span>
                                    </div>

                                    {/* Skill Tree */}
                                    {skillCourses.length > 0 ? (
                                        <div className="pt-6 border-t border-slate-200">
                                            <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                                <Zap className="w-4 h-4" />
                                                장착된 스킬 ({skillCourses.length})
                                            </h4>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {skillCourses.map((skill) => (
                                                    <div
                                                        key={skill.id}
                                                        className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-100"
                                                    >
                                                        <div className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded uppercase w-20 text-center">
                                                            {skill.slot_type}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-slate-900 truncate">{skill.courses.title}</div>
                                                            <div className="text-xs text-slate-500">{skill.courses.category}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pt-6 border-t border-slate-200 text-center text-slate-400 text-sm">
                                            장착된 스킬이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Arena (7 cols) */}
                <div className={`lg:col-span-7 bg-white rounded-3xl border p-10 shadow-2xl transition-all duration-500 min-h-[800px] flex flex-col relative overflow-hidden ${tournamentResult === 'win' ? 'border-yellow-400 ring-8 ring-yellow-100' :
                    tournamentResult === 'loss' ? 'border-red-400 ring-8 ring-red-100' :
                        'border-slate-200 shadow-slate-200/50'
                    }`}>

                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="text-center mb-10">
                            <h3 className="text-4xl font-black mb-2 flex items-center justify-center gap-4 text-slate-900">
                                <Swords className="w-12 h-12 text-red-500" />
                                토너먼트 매치
                            </h3>
                            <p className="text-slate-500 font-medium">상대방과 기술을 겨루어 승리하세요!</p>
                        </div>

                        <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-200 p-8 mb-8 overflow-y-auto shadow-inner custom-scrollbar relative min-h-[500px]">
                            {matchLog.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                                        <Crown className="w-16 h-16 text-slate-300" />
                                    </div>
                                    <p className="text-center text-2xl font-bold text-slate-500 mb-2">
                                        도전할 준비가 되셨나요?
                                    </p>
                                    <p className="text-center text-slate-400 max-w-md">
                                        참가 버튼을 누르면 당신의 능력치를 기반으로<br />
                                        가상의 상대와 3라운드 대결을 펼칩니다.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {matchLog.map((log, index) => (
                                        <div key={index} className={`p-6 rounded-2xl border text-lg font-bold animate-fade-in shadow-sm flex items-center gap-4 ${log.includes('승리') ? 'bg-blue-50 border-blue-200 text-blue-900' :
                                            log.includes('패배') ? 'bg-red-50 border-red-200 text-red-900' :
                                                log.includes('Round') ? 'bg-slate-800 text-white border-transparent justify-center py-3' :
                                                    'bg-white border-slate-200 text-slate-800'
                                            }`}>
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={simulateMatch}
                            disabled={isPlaying}
                            className={`w-full py-8 rounded-3xl font-black text-3xl transition-all transform active:scale-[0.98] shadow-xl relative overflow-hidden group ${isPlaying
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:shadow-2xl hover:shadow-orange-500/30 hover:-translate-y-1'
                                }`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {isPlaying ? (
                                    <>
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-white"></div>
                                        시합 진행 중...
                                    </>
                                ) : (
                                    <>
                                        토너먼트 참가하기
                                        <Swords className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                                    </>
                                )}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {showBeltUp && beltUpData && (
                <BeltUpModal
                    oldLevel={beltUpData.old}
                    newLevel={beltUpData.new}
                    onClose={() => setShowBeltUp(false)}
                />
            )}
        </div>
    );
};
