import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Scale, ArrowLeft, CheckCircle, XCircle, AlertTriangle,
  Search, Filter, Clock, User, RefreshCw
} from 'lucide-react';
import { Event, EventRegistration, WeighInStatus } from '../../types';
import { fetchEventById, fetchRegistrations, updateRegistration } from '../../lib/api-events';

export function WeighInManager() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WeighInStatus>('all');
  const [weightClassFilter, setWeightClassFilter] = useState<string>('all');

  // Weigh-in modal
  const [weighingParticipant, setWeighingParticipant] = useState<EventRegistration | null>(null);
  const [weighInWeight, setWeighInWeight] = useState('');
  const [weighInNote, setWeighInNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      const [eventData, registrationData] = await Promise.all([
        fetchEventById(eventId),
        fetchRegistrations(eventId)
      ]);
      setEvent(eventData);
      // Only show confirmed participants
      setRegistrations(registrationData.filter(r =>
        r.paymentStatus === 'confirmed' && !r.cancelledAt
      ));
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique weight classes
  const weightClasses = [...new Set(registrations.map(r => r.weightClass).filter(Boolean))].sort();

  // Filter registrations
  const filteredRegistrations = registrations.filter(r => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!r.participantName.toLowerCase().includes(query) &&
          !r.teamName?.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && r.weighInStatus !== statusFilter) {
      return false;
    }
    if (weightClassFilter !== 'all' && r.weightClass !== weightClassFilter) {
      return false;
    }
    return true;
  });

  // Statistics
  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.weighInStatus === 'pending').length,
    passed: registrations.filter(r => r.weighInStatus === 'passed').length,
    failed: registrations.filter(r => r.weighInStatus === 'failed').length,
    noShow: registrations.filter(r => r.weighInStatus === 'no_show').length,
  };

  const handleWeighIn = async (status: WeighInStatus) => {
    if (!weighingParticipant) return;

    try {
      setUpdating(true);
      await updateRegistration(weighingParticipant.id, {
        weighInStatus: status,
        weighInWeight: weighInWeight ? parseFloat(weighInWeight) : undefined,
        weighInNote: weighInNote || undefined,
      });

      // Update local state
      setRegistrations(prev =>
        prev.map(r =>
          r.id === weighingParticipant.id
            ? {
                ...r,
                weighInStatus: status,
                weighInWeight: weighInWeight ? parseFloat(weighInWeight) : undefined,
                weighInNote: weighInNote || undefined,
                weighInAt: new Date().toISOString(),
              }
            : r
        )
      );

      setWeighingParticipant(null);
      setWeighInWeight('');
      setWeighInNote('');
    } catch (err) {
      console.error('Failed to update weigh-in:', err);
      alert('계체 정보 업데이트에 실패했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickStatus = async (registration: EventRegistration, status: WeighInStatus) => {
    try {
      await updateRegistration(registration.id, {
        weighInStatus: status,
      });

      setRegistrations(prev =>
        prev.map(r =>
          r.id === registration.id
            ? {
                ...r,
                weighInStatus: status,
                weighInAt: new Date().toISOString(),
              }
            : r
        )
      );
    } catch (err) {
      console.error('Failed to update weigh-in status:', err);
      alert('상태 업데이트에 실패했습니다.');
    }
  };

  const getStatusBadge = (status: WeighInStatus) => {
    switch (status) {
      case 'passed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            통과
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium">
            <XCircle className="w-3 h-3" />
            실격
          </span>
        );
      case 'no_show':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-zinc-500/20 text-zinc-400 rounded-lg text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            불참
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium">
            <Clock className="w-3 h-3" />
            대기
          </span>
        );
    }
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
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-amber-500/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" />
              계체 관리
            </h1>
            <p className="text-sm text-zinc-400 truncate">{event.title}</p>
          </div>
          <button
            onClick={loadData}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-zinc-400">전체</p>
          </div>
          <div className="bg-zinc-900 border border-amber-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
            <p className="text-xs text-zinc-400">대기</p>
          </div>
          <div className="bg-zinc-900 border border-green-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.passed}</p>
            <p className="text-xs text-zinc-400">통과</p>
          </div>
          <div className="bg-zinc-900 border border-red-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
            <p className="text-xs text-zinc-400">실격</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-600/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-zinc-400">{stats.noShow}</p>
            <p className="text-xs text-zinc-400">불참</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="이름 또는 팀명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-400">상태:</span>
            </div>
            {(['all', 'pending', 'passed', 'failed', 'no_show'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-amber-500 text-black'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {status === 'all' ? '전체' :
                 status === 'pending' ? '대기' :
                 status === 'passed' ? '통과' :
                 status === 'failed' ? '실격' : '불참'}
              </button>
            ))}
          </div>

          {weightClasses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-zinc-400">체급:</span>
              <button
                onClick={() => setWeightClassFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  weightClassFilter === 'all'
                    ? 'bg-amber-500 text-black'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                전체
              </button>
              {weightClasses.map(wc => (
                <button
                  key={wc}
                  onClick={() => setWeightClassFilter(wc!)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    weightClassFilter === wc
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {wc}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Participant List */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold">
            참가자 목록 ({filteredRegistrations.length}명)
          </h2>

          {filteredRegistrations.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
              <Scale className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">
                {registrations.length === 0
                  ? '확정된 참가자가 없습니다.'
                  : '검색 결과가 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRegistrations.map(registration => (
                <div
                  key={registration.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-amber-500/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-amber-500" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{registration.participantName}</h3>
                        {getStatusBadge(registration.weighInStatus)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1">
                        {registration.teamName && (
                          <span>{registration.teamName}</span>
                        )}
                        {registration.beltLevel && (
                          <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs">
                            {registration.beltLevel}
                          </span>
                        )}
                        {registration.weightClass && (
                          <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs">
                            {registration.weightClass}
                          </span>
                        )}
                      </div>
                      {registration.weighInWeight && (
                        <p className="text-sm text-amber-500 mt-1">
                          측정: {registration.weighInWeight}kg
                          {registration.weighInNote && (
                            <span className="text-zinc-500 ml-2">({registration.weighInNote})</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {registration.weighInStatus === 'pending' ? (
                        <>
                          <button
                            onClick={() => {
                              setWeighingParticipant(registration);
                              setWeighInWeight('');
                              setWeighInNote('');
                            }}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-medium text-sm transition-colors"
                          >
                            계체
                          </button>
                          <button
                            onClick={() => handleQuickStatus(registration, 'no_show')}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-sm transition-colors"
                          >
                            불참
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setWeighingParticipant(registration);
                            setWeighInWeight(registration.weighInWeight?.toString() || '');
                            setWeighInNote(registration.weighInNote || '');
                          }}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm transition-colors"
                        >
                          수정
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weigh-in Modal */}
      {weighingParticipant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-lg font-bold">계체 측정</h2>
              <p className="text-zinc-400 mt-1">{weighingParticipant.participantName}</p>
              {weighingParticipant.weightClass && (
                <p className="text-sm text-amber-500 mt-2">
                  등록 체급: {weighingParticipant.weightClass}
                </p>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  측정 체중 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weighInWeight}
                  onChange={(e) => setWeighInWeight(e.target.value)}
                  placeholder="예: 76.5"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  메모 (선택)
                </label>
                <input
                  type="text"
                  value={weighInNote}
                  onChange={(e) => setWeighInNote(e.target.value)}
                  placeholder="예: 2차 측정"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleWeighIn('passed')}
                  disabled={updating}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" />
                  통과
                </button>
                <button
                  onClick={() => handleWeighIn('failed')}
                  disabled={updating}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" />
                  실격
                </button>
              </div>
              <button
                onClick={() => {
                  setWeighingParticipant(null);
                  setWeighInWeight('');
                  setWeighInNote('');
                }}
                disabled={updating}
                className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
