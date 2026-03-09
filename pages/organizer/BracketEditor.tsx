import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, RefreshCw, Shuffle, Users, Play, Trophy, ChevronRight,
    AlertCircle, Loader2, Check, X, Zap, Grid
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingScreen } from '../../components/LoadingScreen';
import {
    fetchEventById,
    fetchCategories,
    fetchMatches,
    createMatch,
    updateMatch,
    fetchRegistrations
} from '../../lib/api-events';
import { Event, CompetitionCategory, CompetitionMatch, EventRegistration } from '../../types';

interface BracketMatch {
    id?: string;
    round: number;
    matchNumber: number;
    player1?: EventRegistration;
    player2?: EventRegistration;
    player1Bye?: boolean;
    player2Bye?: boolean;
    winnerId?: string;
    status: string;
    nextMatchNumber?: number;
    nextMatchSlot?: number;
}

export const BracketEditor: React.FC = () => {
    const { eventId, categoryId } = useParams<{ eventId: string; categoryId: string }>();
    const navigate = useNavigate();
    const { user, isOrganizer, loading: authLoading } = useAuth();
    const { success, error: toastError } = useToast();

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [event, setEvent] = useState<Event | null>(null);
    const [category, setCategory] = useState<CompetitionCategory | null>(null);
    const [matches, setMatches] = useState<CompetitionMatch[]>([]);
    const [participants, setParticipants] = useState<EventRegistration[]>([]);
    const [bracketRounds, setBracketRounds] = useState<BracketMatch[][]>([]);

    useEffect(() => {
        const loadData = async () => {
            if (!eventId || !categoryId) return;

            try {
                const [eventData, categoriesData, matchesData, registrationsData] = await Promise.all([
                    fetchEventById(eventId),
                    fetchCategories(eventId),
                    fetchMatches(categoryId),
                    fetchRegistrations(eventId, { status: 'confirmed' }),
                ]);

                const categoryData = categoriesData.find(c => c.id === categoryId);
                if (!categoryData) {
                    toastError('카테고리를 찾을 수 없습니다.');
                    navigate(-1);
                    return;
                }

                setEvent(eventData);
                setCategory(categoryData);
                setMatches(matchesData);

                // Filter participants by category criteria
                const filteredParticipants = registrationsData.filter(r => {
                    if (categoryData.beltLevel && r.beltLevel !== categoryData.beltLevel) return false;
                    if (categoryData.weightClass && r.weightClass !== categoryData.weightClass) return false;
                    if (categoryData.gender && categoryData.gender !== 'mixed' && r.gender !== categoryData.gender) return false;
                    return true;
                });
                setParticipants(filteredParticipants);

                // Organize matches into rounds
                if (matchesData.length > 0) {
                    organizeBracket(matchesData);
                }
            } catch (error) {
                console.error('Failed to load data:', error);
                toastError('데이터를 불러올 수 없습니다.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [eventId, categoryId]);

    const organizeBracket = useCallback((matchList: CompetitionMatch[]) => {
        const roundMap = new Map<number, BracketMatch[]>();

        matchList.forEach(match => {
            const round = match.round;
            if (!roundMap.has(round)) {
                roundMap.set(round, []);
            }
            roundMap.get(round)!.push({
                id: match.id,
                round: match.round,
                matchNumber: match.matchNumber,
                player1: match.player1,
                player2: match.player2,
                player1Bye: match.player1Bye,
                player2Bye: match.player2Bye,
                winnerId: match.winnerId,
                status: match.status,
            });
        });

        // Sort rounds and matches
        const rounds = Array.from(roundMap.keys()).sort((a, b) => a - b);
        const organized = rounds.map(round => {
            const roundMatches = roundMap.get(round) || [];
            return roundMatches.sort((a, b) => a.matchNumber - b.matchNumber);
        });

        setBracketRounds(organized);
    }, []);

    const generateSingleEliminationBracket = async () => {
        if (!categoryId || participants.length < 2) {
            toastError('최소 2명의 참가자가 필요합니다.');
            return;
        }

        setGenerating(true);
        try {
            // Shuffle participants
            const shuffled = [...participants].sort(() => Math.random() - 0.5);
            const playerCount = shuffled.length;

            // Calculate bracket size (power of 2)
            const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
            const totalRounds = Math.ceil(Math.log2(bracketSize));
            const byeCount = bracketSize - playerCount;

            // Create first round matches
            const firstRoundMatches: any[] = [];
            let matchNumber = 1;
            let playerIndex = 0;
            let byesAssigned = 0;

            for (let i = 0; i < bracketSize / 2; i++) {
                const player1 = shuffled[playerIndex++];
                let player2 = null;
                let player2Bye = false;

                if (byesAssigned < byeCount) {
                    player2Bye = true;
                    byesAssigned++;
                } else {
                    player2 = shuffled[playerIndex++];
                }

                const matchData = {
                    categoryId,
                    round: 1,
                    matchNumber: matchNumber++,
                    player1Id: player1?.id,
                    player2Id: player2?.id || undefined,
                    player1Bye: false,
                    player2Bye,
                };

                const created = await createMatch(matchData);
                firstRoundMatches.push(created);

                // If there's a bye, auto-advance the player
                if (player2Bye && created.id) {
                    await updateMatch(created.id, {
                        winnerId: player1.id,
                        winMethod: 'BYE',
                        status: 'completed',
                    });
                }
            }

            // Create subsequent rounds
            let previousRound = firstRoundMatches;
            for (let round = 2; round <= totalRounds; round++) {
                const currentRound: any[] = [];
                matchNumber = 1;

                for (let i = 0; i < previousRound.length; i += 2) {
                    const matchData = {
                        categoryId,
                        round,
                        matchNumber: matchNumber++,
                    };

                    const created = await createMatch(matchData);
                    currentRound.push(created);

                    // Link previous round matches to this one
                    if (previousRound[i] && created.id) {
                        await updateMatch(previousRound[i].id, {
                            nextMatchId: created.id,
                            nextMatchSlot: 1,
                        });
                    }
                    if (previousRound[i + 1] && created.id) {
                        await updateMatch(previousRound[i + 1].id, {
                            nextMatchId: created.id,
                            nextMatchSlot: 2,
                        });
                    }
                }

                previousRound = currentRound;
            }

            // Reload matches
            const updatedMatches = await fetchMatches(categoryId);
            setMatches(updatedMatches);
            organizeBracket(updatedMatches);

            success('대진표가 생성되었습니다!');
        } catch (error: any) {
            console.error('Failed to generate bracket:', error);
            toastError(error.message || '대진표 생성 중 오류가 발생했습니다.');
        } finally {
            setGenerating(false);
        }
    };

    const getRoundName = (round: number, totalRounds: number) => {
        const remaining = totalRounds - round + 1;
        if (remaining === 1) return '결승';
        if (remaining === 2) return '준결승';
        if (remaining === 3) return '8강';
        if (remaining === 4) return '16강';
        if (remaining === 5) return '32강';
        return `${Math.pow(2, remaining)}강`;
    };

    if (authLoading || loading) {
        return <LoadingScreen message="대진표 불러오는 중..." />;
    }

    if (!user || !isOrganizer) {
        navigate('/login');
        return null;
    }

    if (!event || !category) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">카테고리를 찾을 수 없습니다</h2>
                </div>
            </div>
        );
    }

    const totalRounds = bracketRounds.length;

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 py-6 px-4 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">대진표 편집</h1>
                            <p className="text-sm text-zinc-400">{category.name}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link
                            to={`/organizer/event/${eventId}/category/${categoryId}/matches`}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium text-sm transition-colors"
                        >
                            <Play className="w-4 h-4" />
                            경기 진행
                        </Link>
                        {matches.length === 0 && (
                            <button
                                onClick={generateSingleEliminationBracket}
                                disabled={generating || participants.length < 2}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl font-bold text-sm transition-colors"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        생성 중...
                                    </>
                                ) : (
                                    <>
                                        <Shuffle className="w-4 h-4" />
                                        대진표 생성
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Participants Info */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-red-400" />
                            <span className="font-medium">참가자: {participants.length}명</span>
                        </div>
                        {participants.length > 0 && (
                            <div className="text-sm text-zinc-400">
                                {category.bracketType === 'single_elimination' && (
                                    <>예상 경기 수: {participants.length - 1}경기</>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Empty State */}
                {matches.length === 0 && (
                    <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800/50 border-dashed rounded-2xl">
                        <Grid className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-zinc-400 mb-2">대진표가 아직 없습니다</h3>
                        <p className="text-zinc-500 mb-6">
                            {participants.length < 2
                                ? '대진표를 생성하려면 최소 2명의 확정 참가자가 필요합니다'
                                : '대진표 생성 버튼을 눌러 토너먼트를 시작하세요'}
                        </p>
                        {participants.length >= 2 && (
                            <button
                                onClick={generateSingleEliminationBracket}
                                disabled={generating}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl font-bold transition-colors"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        생성 중...
                                    </>
                                ) : (
                                    <>
                                        <Shuffle className="w-5 h-5" />
                                        대진표 자동 생성
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* Bracket Display */}
                {bracketRounds.length > 0 && (
                    <div className="overflow-x-auto pb-4">
                        <div className="flex gap-8 min-w-max">
                            {bracketRounds.map((roundMatches, roundIndex) => (
                                <div key={roundIndex} className="flex-shrink-0 w-64">
                                    {/* Round Header */}
                                    <div className="text-center mb-4">
                                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">
                                            {getRoundName(roundIndex + 1, totalRounds)}
                                        </h3>
                                    </div>

                                    {/* Matches */}
                                    <div className="space-y-4" style={{
                                        marginTop: roundIndex > 0 ? `${Math.pow(2, roundIndex) * 30}px` : 0,
                                    }}>
                                        {roundMatches.map((match, matchIndex) => (
                                            <div
                                                key={match.id || matchIndex}
                                                className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all ${
                                                    match.status === 'completed' ? 'border-green-500/30' :
                                                    match.status === 'in_progress' ? 'border-amber-500/30' :
                                                    'border-zinc-800'
                                                }`}
                                                style={{
                                                    marginBottom: roundIndex > 0 ? `${Math.pow(2, roundIndex) * 60 - 16}px` : 0,
                                                }}
                                            >
                                                {/* Match Number */}
                                                <div className="px-3 py-1 bg-zinc-800/50 text-xs text-zinc-500 flex items-center justify-between">
                                                    <span>경기 #{match.matchNumber}</span>
                                                    {match.status === 'completed' && (
                                                        <span className="text-green-400">완료</span>
                                                    )}
                                                    {match.status === 'in_progress' && (
                                                        <span className="text-amber-400">진행중</span>
                                                    )}
                                                </div>

                                                {/* Player 1 */}
                                                <div className={`px-3 py-2 border-b border-zinc-800 flex items-center justify-between ${
                                                    match.winnerId === match.player1?.id ? 'bg-green-500/10' : ''
                                                }`}>
                                                    <div className="flex items-center gap-2">
                                                        {match.winnerId === match.player1?.id && (
                                                            <Trophy className="w-4 h-4 text-amber-500" />
                                                        )}
                                                        <span className={`font-medium ${
                                                            match.winnerId === match.player1?.id ? 'text-green-400' :
                                                            !match.player1 ? 'text-zinc-600' : ''
                                                        }`}>
                                                            {match.player1?.participantName || (match.player1Bye ? 'BYE' : 'TBD')}
                                                        </span>
                                                    </div>
                                                    {match.player1?.teamName && (
                                                        <span className="text-xs text-zinc-500">{match.player1.teamName}</span>
                                                    )}
                                                </div>

                                                {/* Player 2 */}
                                                <div className={`px-3 py-2 flex items-center justify-between ${
                                                    match.winnerId === match.player2?.id ? 'bg-green-500/10' : ''
                                                }`}>
                                                    <div className="flex items-center gap-2">
                                                        {match.winnerId === match.player2?.id && (
                                                            <Trophy className="w-4 h-4 text-amber-500" />
                                                        )}
                                                        <span className={`font-medium ${
                                                            match.winnerId === match.player2?.id ? 'text-green-400' :
                                                            !match.player2 ? 'text-zinc-600' : ''
                                                        }`}>
                                                            {match.player2?.participantName || (match.player2Bye ? 'BYE' : 'TBD')}
                                                        </span>
                                                    </div>
                                                    {match.player2?.teamName && (
                                                        <span className="text-xs text-zinc-500">{match.player2.teamName}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Champion */}
                            {bracketRounds.length > 0 && (
                                <div className="flex-shrink-0 w-64 flex items-center">
                                    <div className="w-full">
                                        <div className="text-center mb-4">
                                            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide flex items-center justify-center gap-2">
                                                <Trophy className="w-4 h-4" />
                                                우승
                                            </h3>
                                        </div>
                                        <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl p-4 text-center">
                                            {(() => {
                                                const finalMatch = bracketRounds[bracketRounds.length - 1]?.[0];
                                                if (finalMatch?.winnerId) {
                                                    const winner = finalMatch.winnerId === finalMatch.player1?.id
                                                        ? finalMatch.player1
                                                        : finalMatch.player2;
                                                    return (
                                                        <div>
                                                            <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                                            <p className="font-bold text-lg">{winner?.participantName}</p>
                                                            {winner?.teamName && (
                                                                <p className="text-sm text-zinc-400">{winner.teamName}</p>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="text-zinc-500">
                                                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                        <p className="text-sm">대기 중</p>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Participants List */}
                {participants.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-red-400" />
                            참가자 명단
                        </h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
                            {participants.map((participant, index) => (
                                <div key={participant.id} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-zinc-500 text-sm w-6">{index + 1}</span>
                                        <div>
                                            <p className="font-medium">{participant.participantName}</p>
                                            <div className="flex gap-2 mt-1">
                                                {participant.beltLevel && (
                                                    <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                                                        {participant.beltLevel}
                                                    </span>
                                                )}
                                                {participant.weightClass && (
                                                    <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                                                        {participant.weightClass}
                                                    </span>
                                                )}
                                                {participant.teamName && (
                                                    <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                                                        {participant.teamName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {participant.weighInStatus === 'passed' ? (
                                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium flex items-center gap-1">
                                                <Check className="w-3 h-3" />
                                                계체 완료
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-zinc-700 text-zinc-400 rounded text-xs font-medium">
                                                계체 대기
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
