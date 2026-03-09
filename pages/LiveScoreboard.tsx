import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Trophy, Users, Timer, ChevronRight, RefreshCw, ExternalLink
} from 'lucide-react';
import {
  Event, CompetitionCategory, CompetitionMatch
} from '../types';
import {
  fetchEvent, fetchCategories, fetchMatches,
  subscribeToEventMatches
} from '../lib/api-events';

export function LiveScoreboard() {
  const { urlKey } = useParams<{ urlKey: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<CompetitionCategory[]>([]);
  const [allMatches, setAllMatches] = useState<CompetitionMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (urlKey) {
      loadData();
    }
  }, [urlKey]);

  // Real-time subscription
  useEffect(() => {
    if (!event?.id) return;

    const unsubscribe = subscribeToEventMatches(event.id, (matches) => {
      setAllMatches(matches);
      setLastUpdate(new Date());
    });

    return unsubscribe;
  }, [event?.id]);

  const loadData = async () => {
    if (!urlKey) return;

    try {
      setLoading(true);

      // Fetch event by scoreboard URL key
      const { data: eventData, error: eventError } = await (await import('../lib/supabase')).supabase
        .from('events')
        .select(`
          *,
          organizer:creators(name, profile_image)
        `)
        .eq('scoreboard_url_key', urlKey)
        .eq('public_scoreboard', true)
        .single();

      if (eventError || !eventData) {
        setError('스코어보드를 찾을 수 없습니다.');
        return;
      }

      const transformedEvent: Event = {
        id: eventData.id,
        organizerId: eventData.organizer_id,
        organizerName: eventData.organizer?.name,
        type: eventData.type,
        title: eventData.title,
        description: eventData.description,
        coverImage: eventData.cover_image,
        venueName: eventData.venue_name,
        address: eventData.address,
        eventDate: eventData.event_date,
        startTime: eventData.start_time,
        endTime: eventData.end_time,
        status: eventData.status,
        publicScoreboard: eventData.public_scoreboard,
        scoreboardUrlKey: eventData.scoreboard_url_key,
        createdAt: eventData.created_at,
        updatedAt: eventData.updated_at,
      };

      setEvent(transformedEvent);

      // Fetch categories and matches
      const categoriesData = await fetchCategories(transformedEvent.id);
      setCategories(categoriesData);

      const allMatchesData: CompetitionMatch[] = [];
      for (const cat of categoriesData) {
        const matches = await fetchMatches(cat.id);
        allMatchesData.push(...matches);
      }
      setAllMatches(allMatchesData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load scoreboard:', err);
      setError('스코어보드를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Get matches by status
  const liveMatches = allMatches.filter(m => m.liveStatus === 'in_progress');
  const upcomingMatches = allMatches.filter(m =>
    m.status === 'pending' && !m.player1Bye && !m.player2Bye && m.player1Id && m.player2Id
  ).slice(0, 5);
  const recentMatches = allMatches
    .filter(m => m.status === 'completed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Get category by id
  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || '';
  };

  // Get round name
  const getRoundName = (match: CompetitionMatch) => {
    const categoryMatches = allMatches.filter(m => m.categoryId === match.categoryId);
    const totalRounds = Math.max(...categoryMatches.map(m => m.round), 0);
    const roundFromEnd = totalRounds - match.round + 1;
    if (roundFromEnd === 1) return '결승';
    if (roundFromEnd === 2) return '준결승';
    if (roundFromEnd === 3) return '8강';
    if (roundFromEnd === 4) return '16강';
    return `${match.round}라운드`;
  };

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
        <Trophy className="w-16 h-16 text-zinc-600 mb-4" />
        <p className="text-red-400 text-lg mb-4">{error || '스코어보드를 찾을 수 없습니다.'}</p>
        <Link
          to="/"
          className="text-amber-500 hover:text-amber-400"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-amber-900/30 to-transparent border-b border-amber-500/20">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" />
              <span className="text-amber-500 font-bold">LIVE SCOREBOARD</span>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
          </div>

          <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
          <p className="text-zinc-400">
            {event.eventDate} | {event.venueName}
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            마지막 업데이트: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              실시간 경기
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveMatches.map(match => (
                <div
                  key={match.id}
                  className="bg-gradient-to-br from-amber-900/20 to-zinc-900 border border-amber-500/30 rounded-2xl p-6 animate-pulse-slow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-amber-500 font-medium">
                      {getCategoryName(match.categoryId)} - {getRoundName(match)}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold">
                      <Timer className="w-3 h-3" />
                      진행중
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 items-center">
                    {/* Player 1 */}
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="w-8 h-8 text-blue-400" />
                      </div>
                      <h3 className="font-bold text-lg truncate">
                        {match.player1?.participantName || 'TBD'}
                      </h3>
                      {match.player1?.teamName && (
                        <p className="text-xs text-zinc-500">{match.player1.teamName}</p>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-4">
                        <span className="text-4xl font-bold text-blue-400">{match.player1Points}</span>
                        <span className="text-2xl text-zinc-500">-</span>
                        <span className="text-4xl font-bold text-red-400">{match.player2Points}</span>
                      </div>
                      <div className="flex items-center justify-center gap-4 mt-2 text-sm">
                        <span className="text-yellow-500">A:{match.player1Advantages}</span>
                        <span className="text-zinc-600">|</span>
                        <span className="text-yellow-500">A:{match.player2Advantages}</span>
                      </div>
                    </div>

                    {/* Player 2 */}
                    <div className="text-center">
                      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="font-bold text-lg truncate">
                        {match.player2?.participantName || 'TBD'}
                      </h3>
                      {match.player2?.teamName && (
                        <p className="text-xs text-zinc-500">{match.player2.teamName}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Matches */}
        {upcomingMatches.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">다음 경기</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              {upcomingMatches.map((match, index) => (
                <div
                  key={match.id}
                  className={`flex items-center p-4 ${
                    index < upcomingMatches.length - 1 ? 'border-b border-zinc-800' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-xs text-amber-500 mb-1">
                      {getCategoryName(match.categoryId)} - {getRoundName(match)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{match.player1?.participantName || 'TBD'}</span>
                      <span className="text-zinc-500">vs</span>
                      <span className="font-medium">{match.player2?.participantName || 'TBD'}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-sm">
                    대기
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Results */}
        {recentMatches.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">최근 결과</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              {recentMatches.map((match, index) => (
                <div
                  key={match.id}
                  className={`flex items-center p-4 ${
                    index < recentMatches.length - 1 ? 'border-b border-zinc-800' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-xs text-zinc-500 mb-1">
                      {getCategoryName(match.categoryId)} - {getRoundName(match)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        match.winnerId === match.player1Id ? 'text-amber-500' : 'text-zinc-400'
                      }`}>
                        {match.player1?.participantName || 'TBD'}
                        {match.winnerId === match.player1Id && ' 🏆'}
                      </span>
                      <span className="text-zinc-600">{match.player1Points} - {match.player2Points}</span>
                      <span className={`font-medium ${
                        match.winnerId === match.player2Id ? 'text-amber-500' : 'text-zinc-400'
                      }`}>
                        {match.winnerId === match.player2Id && '🏆 '}
                        {match.player2?.participantName || 'TBD'}
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">
                    {match.winMethod === 'points' ? '판정' :
                     match.winMethod === 'submission' ? '서브미션' :
                     match.winMethod === 'dq' ? '실격' :
                     match.winMethod === 'injury' ? '부상' :
                     match.winMethod === 'walkover' ? '부전승' : match.winMethod}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category Progress */}
        <section>
          <h2 className="text-xl font-bold mb-4">카테고리별 진행 현황</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => {
              const categoryMatches = allMatches.filter(m => m.categoryId === category.id);
              const completed = categoryMatches.filter(m => m.status === 'completed').length;
              const total = categoryMatches.filter(m => !m.player1Bye && !m.player2Bye).length;
              const progress = total > 0 ? (completed / total) * 100 : 0;

              return (
                <div
                  key={category.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold truncate">{category.name}</h3>
                    <span className="text-sm text-zinc-400">{completed}/{total}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {progress === 100 && (
                    <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      완료
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Empty State */}
        {allMatches.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-400 mb-2">아직 경기가 없습니다</h3>
            <p className="text-zinc-500">경기가 시작되면 여기에 표시됩니다.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-zinc-500 text-sm">
            Powered by <span className="text-amber-500 font-bold">GRAPPLAY</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
