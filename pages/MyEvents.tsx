import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, ArrowLeft, MapPin, Clock, Users, Trophy,
  CheckCircle, AlertCircle, XCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { fetchUserRegistrations } from '../lib/api-events';
import { EventRegistration, RegistrationPaymentStatus } from '../types';

const EventTypeLabel: React.FC<{ type: string }> = ({ type }) => {
  const config = {
    competition: { label: '시합', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    seminar: { label: '세미나', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    openmat: { label: '오픈매트', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  }[type] || { label: type, color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' };

  return (
    <span className={`px-2 py-1 text-xs font-bold rounded-full border ${config.color}`}>
      {config.label}
    </span>
  );
};

const PaymentStatusBadge: React.FC<{ status: RegistrationPaymentStatus }> = ({ status }) => {
  const config: Record<RegistrationPaymentStatus, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: '결제 대기', color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock className="w-3 h-3" /> },
    awaiting_payment: { label: '입금 대기', color: 'bg-orange-500/20 text-orange-400', icon: <AlertCircle className="w-3 h-3" /> },
    paid: { label: '결제 완료', color: 'bg-blue-500/20 text-blue-400', icon: <CheckCircle className="w-3 h-3" /> },
    confirmed: { label: '참가 확정', color: 'bg-green-500/20 text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
    cancelled: { label: '취소됨', color: 'bg-red-500/20 text-red-400', icon: <XCircle className="w-3 h-3" /> },
    refunded: { label: '환불됨', color: 'bg-zinc-500/20 text-zinc-400', icon: <XCircle className="w-3 h-3" /> },
  };

  const { label, color, icon } = config[status] || config.pending;

  return (
    <span className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full ${color}`}>
      {icon}
      {label}
    </span>
  );
};

export const MyEvents: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;

      try {
        const data = await fetchUserRegistrations(user.id);
        setRegistrations(data);
      } catch (error) {
        console.error('Error fetching registrations:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading && user) {
      fetchData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user?.id, authLoading]);

  if (authLoading || loading) {
    return <LoadingScreen message="참가 내역을 불러오는 중..." />;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const now = new Date();

  // Filter registrations by event date
  const upcomingRegistrations = registrations.filter(r => {
    if (!r.event?.eventDate) return false;
    return new Date(r.event.eventDate) >= now && r.paymentStatus !== 'cancelled' && r.paymentStatus !== 'refunded';
  });

  const pastRegistrations = registrations.filter(r => {
    if (!r.event?.eventDate) return false;
    return new Date(r.event.eventDate) < now || r.paymentStatus === 'cancelled' || r.paymentStatus === 'refunded';
  });

  const displayedRegistrations = activeTab === 'upcoming' ? upcomingRegistrations : pastRegistrations;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>뒤로가기</span>
          </button>

          <h1 className="text-2xl font-black flex items-center gap-3">
            <Calendar className="w-7 h-7 text-amber-500" />
            내 행사
          </h1>
          <p className="text-zinc-400 mt-1">참가 신청한 행사 내역입니다</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'upcoming'
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            예정된 행사 ({upcomingRegistrations.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'past'
                ? 'bg-amber-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            지난 행사 ({pastRegistrations.length})
          </button>
        </div>

        {/* Empty State */}
        {displayedRegistrations.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <Calendar className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-400 mb-2">
              {activeTab === 'upcoming' ? '예정된 행사가 없습니다' : '지난 행사가 없습니다'}
            </h3>
            <p className="text-zinc-500 mb-6">
              {activeTab === 'upcoming'
                ? '새로운 행사에 참가해보세요!'
                : '아직 참가한 행사가 없습니다.'}
            </p>
            {activeTab === 'upcoming' && (
              <button
                onClick={() => navigate('/events')}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-colors"
              >
                행사 둘러보기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedRegistrations.map((registration) => {
              const event = registration.event;
              if (!event) return null;

              return (
                <div
                  key={registration.id}
                  onClick={() => navigate(`/event/${event.id}`)}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex">
                    {/* Cover Image */}
                    <div className="w-32 h-32 flex-shrink-0 bg-gradient-to-br from-zinc-800 to-zinc-900 relative">
                      {event.coverImage ? (
                        <img
                          src={event.coverImage}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Trophy className="w-10 h-10 text-zinc-700" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <EventTypeLabel type={event.type} />
                          <PaymentStatusBadge status={registration.paymentStatus} />
                        </div>
                      </div>

                      <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-amber-400 transition-colors">
                        {event.title}
                      </h3>

                      <div className="flex flex-wrap gap-3 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(event.eventDate)}
                        </span>
                        {event.venueName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.venueName}
                          </span>
                        )}
                      </div>

                      {/* Registration Info */}
                      {(registration.beltLevel || registration.weightClass) && (
                        <div className="flex gap-2 mt-2">
                          {registration.beltLevel && (
                            <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs">
                              {registration.beltLevel}
                            </span>
                          )}
                          {registration.weightClass && (
                            <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs">
                              {registration.weightClass}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
