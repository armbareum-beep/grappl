import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, Pause, RotateCcw, Trophy, Users,
  Plus, Minus, Check, RefreshCw, ChevronDown, ChevronUp,
  Timer as TimerIcon, AlertCircle
} from 'lucide-react';
import {
  Event, CompetitionCategory, CompetitionMatch
} from '../../types';
import {
  fetchEventById, fetchCategories, fetchMatches,
  updateMatch, advanceWinner, subscribeToMatchUpdates
} from '../../lib/api-events';

const WIN_METHODS = [
  { value: 'points', label: '판정' },
  { value: 'submission', label: '서브미션' },
  { value: 'dq', label: '실격' },
  { value: 'injury', label: '부상' },
  { value: 'walkover', label: '부전승' },
];

export function MatchControl() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<CompetitionCategory[]>([]);
  const [matches, setMatches] = useState<CompetitionMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedMatch, setSelectedMatch] = useState<CompetitionMatch | null>(null);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(300); // Default 5 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(300);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Score state
  const [player1Points, setPlayer1Points] = useState(0);
  const [player2Points, setPlayer2Points] = useState(0);
  const [player1Advantages, setPlayer1Advantages] = useState(0);
  const [player2Advantages, setPlayer2Advantages] = useState(0);
  const [player1Penalties, setPlayer1Penalties] = useState(0);
  const [player2Penalties, setPlayer2Penalties] = useState(0);

  // Winner selection
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<'player1' | 'player2' | null>(null);
  const [winMethod, setWinMethod] = useState('points');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  // Real-time subscription
  useEffect(() => {
    if (!selectedCategoryId) return;

    const unsubscribe = subscribeToMatchUpdates(selectedCategoryId, (updatedMatch) => {
      setMatches(prev =>
        prev.map(m => m.id === updatedMatch.id ? updatedMatch : m)
      );
      if (selectedMatch?.id === updatedMatch.id) {
        setSelectedMatch(updatedMatch);
      }
    });

    return unsubscribe;
  }, [selectedCategoryId, selectedMatch?.id]);

  const loadData = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      const [eventData, categoriesData] = await Promise.all([
        fetchEventById(eventId),
        fetchCategories(eventId)
      ]);
      setEvent(eventData);
      setCategories(categoriesData);

      if (categoriesData.length > 0) {
        setSelectedCategoryId(categoriesData[0].id);
        const matchesData = await fetchMatches(categoriesData[0].id);
        setMatches(matchesData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = async (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedMatch(null);
    resetScores();
    resetTimer();

    try {
      const matchesData = await fetchMatches(categoryId);
      setMatches(matchesData);
    } catch (err) {
      console.error('Failed to load matches:', err);
    }
  };

  const handleSelectMatch = (match: CompetitionMatch) => {
    setSelectedMatch(match);
    setPlayer1Points(match.player1Points);
    setPlayer2Points(match.player2Points);
    setPlayer1Advantages(match.player1Advantages);
    setPlayer2Advantages(match.player2Advantages);
    setPlayer1Penalties(match.player1Penalties);
    setPlayer2Penalties(match.player2Penalties);
    resetTimer();
  };

  const resetScores = () => {
    setPlayer1Points(0);
    setPlayer2Points(0);
    setPlayer1Advantages(0);
    setPlayer2Advantages(0);
    setPlayer1Penalties(0);
    setPlayer2Penalties(0);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(timerDuration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartMatch = async () => {
    if (!selectedMatch) return;

    try {
      await updateMatch(selectedMatch.id, {
        status: 'in_progress',
        liveStatus: 'in_progress',
      });
      setSelectedMatch(prev => prev ? { ...prev, status: 'in_progress', liveStatus: 'in_progress' } : null);
    } catch (err) {
      console.error('Failed to start match:', err);
    }
  };

  const handleSaveScores = async () => {
    if (!selectedMatch) return;

    try {
      await updateMatch(selectedMatch.id, {
        player1Points,
        player2Points,
        player1Advantages,
        player2Advantages,
        player1Penalties,
        player2Penalties,
        matchDuration: timerDuration - timerSeconds,
      });
    } catch (err) {
      console.error('Failed to save scores:', err);
      alert('점수 저장에 실패했습니다.');
    }
  };

  const handleEndMatch = () => {
    setIsTimerRunning(false);
    // Determine winner based on points
    if (player1Points > player2Points) {
      setSelectedWinner('player1');
    } else if (player2Points > player1Points) {
      setSelectedWinner('player2');
    } else if (player1Advantages > player2Advantages) {
      setSelectedWinner('player1');
    } else if (player2Advantages > player1Advantages) {
      setSelectedWinner('player2');
    } else {
      setSelectedWinner(null);
    }
    setWinMethod('points');
    setShowWinnerModal(true);
  };

  const handleConfirmWinner = async () => {
    if (!selectedMatch || !selectedWinner) return;

    const winnerId = selectedWinner === 'player1'
      ? selectedMatch.player1Id
      : selectedMatch.player2Id;

    if (!winnerId) return;

    try {
      setSubmitting(true);
      // Save final scores
      await updateMatch(selectedMatch.id, {
        player1Points,
        player2Points,
        player1Advantages,
        player2Advantages,
        player1Penalties,
        player2Penalties,
        matchDuration: timerDuration - timerSeconds,
      });

      // Advance winner
      await advanceWinner(selectedMatch.id, winnerId, winMethod);

      setShowWinnerModal(false);
      setSelectedMatch(null);
      resetScores();
      resetTimer();

      // Reload matches
      const matchesData = await fetchMatches(selectedCategoryId);
      setMatches(matchesData);
    } catch (err) {
      console.error('Failed to end match:', err);
      alert('경기 종료 처리에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMatchStatusBadge = (match: CompetitionMatch) => {
    switch (match.status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">완료</span>;
      case 'in_progress':
        return <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">진행중</span>;
      default:
        return <span className="px-2 py-1 bg-zinc-500/20 text-zinc-400 rounded text-xs">대기</span>;
    }
  };

  const getRoundName = (round: number, totalRounds: number) => {
    const roundFromEnd = totalRounds - round + 1;
    if (roundFromEnd === 1) return '결승';
    if (roundFromEnd === 2) return '준결승';
    if (roundFromEnd === 3) return '8강';
    if (roundFromEnd === 4) return '16강';
    if (roundFromEnd === 5) return '32강';
    return `${round}라운드`;
  };

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, CompetitionMatch[]>);

  const totalRounds = Math.max(...Object.keys(matchesByRound).map(Number), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <p className="text-red-400 mb-4">{error || '이벤트를 찾을 수 없습니다.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-amber-500 hover:text-amber-400"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-amber-500/20 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              경기 컨트롤
            </h1>
            <p className="text-sm text-zinc-400 truncate">{event.title}</p>
          </div>
          <button
            onClick={loadData}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Match List */}
          <div className="lg:col-span-1 space-y-4">
            {/* Category Selector */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <label className="block text-sm font-medium text-zinc-400 mb-2">카테고리</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Match List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800">
                <h2 className="font-bold">경기 목록</h2>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {Object.entries(matchesByRound)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([round, roundMatches]) => (
                    <div key={round}>
                      <div className="px-4 py-2 bg-zinc-800/50 text-sm font-medium text-amber-500">
                        {getRoundName(Number(round), totalRounds)}
                      </div>
                      {roundMatches.map(match => (
                        <button
                          key={match.id}
                          onClick={() => handleSelectMatch(match)}
                          disabled={match.status === 'completed'}
                          className={`w-full p-4 text-left border-b border-zinc-800 transition-colors ${
                            selectedMatch?.id === match.id
                              ? 'bg-amber-500/10 border-l-2 border-l-amber-500'
                              : match.status === 'completed'
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-zinc-500">#{match.matchNumber}</span>
                            {getMatchStatusBadge(match)}
                          </div>
                          <div className="space-y-1">
                            <div className={`flex items-center gap-2 ${
                              match.winnerId === match.player1Id ? 'text-amber-500 font-bold' : ''
                            }`}>
                              <Users className="w-4 h-4" />
                              <span className="truncate">
                                {match.player1Bye ? 'BYE' : match.player1?.participantName || '미정'}
                              </span>
                            </div>
                            <div className={`flex items-center gap-2 ${
                              match.winnerId === match.player2Id ? 'text-amber-500 font-bold' : ''
                            }`}>
                              <Users className="w-4 h-4" />
                              <span className="truncate">
                                {match.player2Bye ? 'BYE' : match.player2?.participantName || '미정'}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right: Match Control Panel */}
          <div className="lg:col-span-2">
            {selectedMatch ? (
              <div className="space-y-4">
                {/* Timer */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="text-center mb-6">
                    <div className="text-6xl font-mono font-bold text-amber-500 mb-4">
                      {formatTime(timerSeconds)}
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      {!isTimerRunning ? (
                        <button
                          onClick={() => setIsTimerRunning(true)}
                          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors"
                        >
                          <Play className="w-5 h-5" />
                          시작
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsTimerRunning(false)}
                          className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors"
                        >
                          <Pause className="w-5 h-5" />
                          정지
                        </button>
                      )}
                      <button
                        onClick={resetTimer}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-bold transition-colors"
                      >
                        <RotateCcw className="w-5 h-5" />
                        리셋
                      </button>
                    </div>
                  </div>

                  {/* Timer Duration */}
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-zinc-400">경기 시간:</span>
                    {[180, 300, 360, 420, 480, 600].map(sec => (
                      <button
                        key={sec}
                        onClick={() => {
                          setTimerDuration(sec);
                          setTimerSeconds(sec);
                        }}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          timerDuration === sec
                            ? 'bg-amber-500 text-black font-bold'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {sec / 60}분
                      </button>
                    ))}
                  </div>
                </div>

                {/* Players & Scores */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Player 1 */}
                  <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl p-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-bold text-blue-400 truncate">
                        {selectedMatch.player1?.participantName || 'Player 1'}
                      </h3>
                      {selectedMatch.player1?.teamName && (
                        <p className="text-sm text-zinc-500">{selectedMatch.player1.teamName}</p>
                      )}
                    </div>

                    {/* Points */}
                    <div className="text-center mb-6">
                      <div className="text-5xl font-bold text-white mb-2">{player1Points}</div>
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => setPlayer1Points(Math.max(0, player1Points - 1))}
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="text-zinc-400">점수</span>
                        <button
                          onClick={() => setPlayer1Points(player1Points + 1)}
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex gap-2 justify-center mt-2">
                        {[2, 3, 4].map(pts => (
                          <button
                            key={pts}
                            onClick={() => setPlayer1Points(player1Points + pts)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold"
                          >
                            +{pts}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Advantages & Penalties */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-yellow-500">{player1Advantages}</div>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <button
                            onClick={() => setPlayer1Advantages(Math.max(0, player1Advantages - 1))}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-zinc-400">어드밴</span>
                          <button
                            onClick={() => setPlayer1Advantages(player1Advantages + 1)}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-500">{player1Penalties}</div>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <button
                            onClick={() => setPlayer1Penalties(Math.max(0, player1Penalties - 1))}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-zinc-400">페널티</span>
                          <button
                            onClick={() => setPlayer1Penalties(player1Penalties + 1)}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Player 2 */}
                  <div className="bg-zinc-900 border border-red-500/30 rounded-2xl p-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-bold text-red-400 truncate">
                        {selectedMatch.player2?.participantName || 'Player 2'}
                      </h3>
                      {selectedMatch.player2?.teamName && (
                        <p className="text-sm text-zinc-500">{selectedMatch.player2.teamName}</p>
                      )}
                    </div>

                    {/* Points */}
                    <div className="text-center mb-6">
                      <div className="text-5xl font-bold text-white mb-2">{player2Points}</div>
                      <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={() => setPlayer2Points(Math.max(0, player2Points - 1))}
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="text-zinc-400">점수</span>
                        <button
                          onClick={() => setPlayer2Points(player2Points + 1)}
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex gap-2 justify-center mt-2">
                        {[2, 3, 4].map(pts => (
                          <button
                            key={pts}
                            onClick={() => setPlayer2Points(player2Points + pts)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-bold"
                          >
                            +{pts}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Advantages & Penalties */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-yellow-500">{player2Advantages}</div>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <button
                            onClick={() => setPlayer2Advantages(Math.max(0, player2Advantages - 1))}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-zinc-400">어드밴</span>
                          <button
                            onClick={() => setPlayer2Advantages(player2Advantages + 1)}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-500">{player2Penalties}</div>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <button
                            onClick={() => setPlayer2Penalties(Math.max(0, player2Penalties - 1))}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-zinc-400">페널티</span>
                          <button
                            onClick={() => setPlayer2Penalties(player2Penalties + 1)}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  {selectedMatch.status === 'pending' && (
                    <button
                      onClick={handleStartMatch}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition-colors"
                    >
                      <Play className="w-6 h-6" />
                      경기 시작
                    </button>
                  )}
                  <button
                    onClick={handleSaveScores}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-bold text-lg transition-colors"
                  >
                    <Check className="w-6 h-6" />
                    점수 저장
                  </button>
                  <button
                    onClick={handleEndMatch}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-lg transition-colors"
                  >
                    <Trophy className="w-6 h-6" />
                    경기 종료
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
                <Trophy className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-zinc-400 mb-2">경기를 선택하세요</h3>
                <p className="text-zinc-500">좌측 목록에서 진행할 경기를 선택해주세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Winner Selection Modal */}
      {showWinnerModal && selectedMatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold">승자 결정</h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Winner Selection */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedWinner('player1')}
                  className={`p-4 rounded-xl border-2 transition-colors ${
                    selectedWinner === 'player1'
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="text-lg font-bold truncate">
                    {selectedMatch.player1?.participantName || 'Player 1'}
                  </div>
                  <div className="text-2xl font-bold text-amber-500 mt-2">
                    {player1Points}점
                  </div>
                </button>
                <button
                  onClick={() => setSelectedWinner('player2')}
                  className={`p-4 rounded-xl border-2 transition-colors ${
                    selectedWinner === 'player2'
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="text-lg font-bold truncate">
                    {selectedMatch.player2?.participantName || 'Player 2'}
                  </div>
                  <div className="text-2xl font-bold text-amber-500 mt-2">
                    {player2Points}점
                  </div>
                </button>
              </div>

              {/* Win Method */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">승리 방법</label>
                <select
                  value={winMethod}
                  onChange={(e) => setWinMethod(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                >
                  {WIN_METHODS.map(method => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3">
              <button
                onClick={() => setShowWinnerModal(false)}
                disabled={submitting}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmWinner}
                disabled={!selectedWinner || submitting}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {submitting ? '처리중...' : '확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
