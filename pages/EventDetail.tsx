import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Calendar, ArrowLeft, Trophy, Users, MapPin, Clock, Share2, CalendarPlus,
    CreditCard, CheckCircle, AlertCircle, Copy, ExternalLink, Video, Play, Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { fetchEventById, createRegistration, fetchRegistrations, fetchUserBjjProfile, updateUserBjjProfile } from '../lib/api-events';
import { generateCalendarUrl, fetchEventVideos } from '../lib/api-organizers';
import { Event, EventRegistration } from '../types';

interface EventVideo {
    id: string;
    type: 'drill' | 'lesson' | 'sparring';
    title: string;
    thumbnail_url?: string;
    contentId: string;
}

const EventTypeLabel: React.FC<{ type: string; large?: boolean }> = ({ type, large }) => {
    const config = {
        competition: { label: '시합', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
        seminar: { label: '세미나', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        openmat: { label: '오픈매트', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    }[type] || { label: type, color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' };

    return (
        <span className={`px-3 py-1 ${large ? 'text-sm' : 'text-xs'} font-bold rounded-full border ${config.color}`}>
            {config.label}
        </span>
    );
};

const BELT_OPTIONS = ['화이트', '블루', '퍼플', '브라운', '블랙'];
const WEIGHT_OPTIONS = ['루스터', '라이트페더', '페더', '라이트', '미들', '미디엄헤비', '헤비', '슈퍼헤비', '울트라헤비', '오픈클래스'];

export const EventDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { success, error: toastError } = useToast();

    const [event, setEvent] = useState<Event | null>(null);
    const [myRegistration, setMyRegistration] = useState<EventRegistration | null>(null);
    const [eventVideos, setEventVideos] = useState<EventVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRegistrationModal, setShowRegistrationModal] = useState(false);
    const [registering, setRegistering] = useState(false);

    // Registration form
    const [formData, setFormData] = useState({
        participantName: '',
        phone: '',
        email: '',
        beltLevel: '',
        weightClass: '',
        teamName: '',
        participantNote: '',
    });

    useEffect(() => {
        async function fetchData() {
            if (!id) return;

            try {
                const [eventData, videosData] = await Promise.all([
                    fetchEventById(id),
                    fetchEventVideos(id),
                ]);

                setEvent(eventData);

                // Process event videos
                const videos: EventVideo[] = [];
                videosData.forEach((ev: any) => {
                    if (ev.drill) {
                        videos.push({
                            id: ev.id,
                            type: 'drill',
                            title: ev.drill.title,
                            thumbnail_url: ev.drill.thumbnail_url,
                            contentId: ev.drill.id,
                        });
                    }
                    if (ev.lesson) {
                        videos.push({
                            id: ev.id,
                            type: 'lesson',
                            title: ev.lesson.title,
                            thumbnail_url: ev.lesson.thumbnail_url,
                            contentId: ev.lesson.id,
                        });
                    }
                    if (ev.sparring) {
                        videos.push({
                            id: ev.id,
                            type: 'sparring',
                            title: ev.sparring.title,
                            thumbnail_url: ev.sparring.thumbnail_url,
                            contentId: ev.sparring.id,
                        });
                    }
                });
                setEventVideos(videos);

                // Check if user already registered
                if (user) {
                    const registrations = await fetchRegistrations(id);
                    const myReg = registrations.find(r => r.userId === user.id);
                    if (myReg) {
                        setMyRegistration(myReg);
                    }
                }
            } catch (error) {
                console.error('Error fetching event:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id, user]);

    // Pre-fill registration form with user's saved BJJ profile
    useEffect(() => {
        async function loadUserProfile() {
            if (!user) return;

            try {
                const profile = await fetchUserBjjProfile(user.id);
                if (profile) {
                    setFormData(prev => ({
                        ...prev,
                        participantName: profile.name || user.user_metadata?.name || '',
                        phone: profile.phone || '',
                        email: user.email || '',
                        beltLevel: profile.beltLevel || '',
                        weightClass: profile.weightClass || '',
                        teamName: profile.teamName || '',
                    }));
                } else {
                    // Fallback to auth metadata
                    setFormData(prev => ({
                        ...prev,
                        participantName: user.user_metadata?.name || '',
                        email: user.email || '',
                    }));
                }
            } catch (error) {
                console.error('Error loading user profile:', error);
            }
        }

        loadUserProfile();
    }, [user]);

    const handleRegister = async () => {
        if (!user) {
            toastError('로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        if (!formData.participantName.trim()) {
            toastError('이름을 입력해주세요.');
            return;
        }

        setRegistering(true);

        try {
            const registration = await createRegistration({
                eventId: id!,
                userId: user.id,
                participantName: formData.participantName,
                phone: formData.phone,
                email: formData.email || user.email,
                beltLevel: formData.beltLevel,
                weightClass: formData.weightClass,
                teamName: formData.teamName,
                participantNote: formData.participantNote,
            });

            // Save user's BJJ profile for future registrations
            try {
                await updateUserBjjProfile(user.id, {
                    phone: formData.phone,
                    beltLevel: formData.beltLevel,
                    weightClass: formData.weightClass,
                    teamName: formData.teamName,
                });
            } catch (profileError) {
                console.warn('Failed to save BJJ profile:', profileError);
                // Don't fail registration if profile save fails
            }

            setMyRegistration(registration);
            setShowRegistrationModal(false);
            success('참가 신청이 완료되었습니다!');
        } catch (error: any) {
            toastError(error.message || '참가 신청 중 오류가 발생했습니다.');
        } finally {
            setRegistering(false);
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            success('링크가 복사되었습니다!');
        } catch {
            // Fallback for mobile
            if (navigator.share) {
                navigator.share({ title: event?.title, url });
            }
        }
    };

    const handleAddToCalendar = (type: 'google' | 'apple') => {
        if (!event) return;
        const url = generateCalendarUrl(event, type);
        if (type === 'google') {
            window.open(url, '_blank');
        } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = `${event.title}.ics`;
            a.click();
        }
    };

    if (loading) {
        return <LoadingScreen message="이벤트 정보 불러오는 중..." />;
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-zinc-300 mb-4">이벤트를 찾을 수 없습니다</h2>
                    <button
                        onClick={() => navigate('/events')}
                        className="text-amber-500 hover:text-amber-400"
                    >
                        이벤트 목록으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    const isFull = event.maxParticipants && (event.currentParticipants || 0) >= event.maxParticipants;
    const effectiveDate = event.nextOccurrence || event.eventDate;
    const isPast = new Date(effectiveDate) < new Date();
    const canRegister = !isPast && !isFull && !myRegistration && (event.useInternalRegistration !== false);

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header Image */}
            <div className="relative h-64 md:h-80 bg-gradient-to-br from-zinc-800 to-zinc-900">
                {event.coverImage && (
                    <img
                        src={event.coverImage}
                        alt={event.title}
                        className="w-full h-full object-cover"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur-sm rounded-xl text-white hover:bg-zinc-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">뒤로가기</span>
                </button>

                {/* Share Button */}
                <button
                    onClick={handleShare}
                    className="absolute top-4 right-4 p-3 bg-zinc-900/80 backdrop-blur-sm rounded-xl text-white hover:bg-zinc-800 transition-colors"
                >
                    <Share2 className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
                {/* Main Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 mb-6">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <EventTypeLabel type={event.type} large />
                        {isPast && (
                            <span className="px-3 py-1 text-sm font-bold rounded-full bg-zinc-700 text-zinc-400">
                                종료됨
                            </span>
                        )}
                        {isFull && !isPast && (
                            <span className="px-3 py-1 text-sm font-bold rounded-full bg-red-500/20 text-red-400">
                                마감
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black mb-6">{event.title}</h1>

                    {/* Key Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl">
                            <Calendar className="w-8 h-8 text-amber-500" />
                            <div>
                                <div className="text-sm text-zinc-500">일시</div>
                                <div className="font-bold">
                                    {new Date(event.nextOccurrence || event.eventDate).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        weekday: 'long',
                                    })}
                                </div>
                                {event.startTime && (
                                    <div className="text-zinc-400">
                                        {event.startTime} {event.endTime && `~ ${event.endTime}`}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl">
                            <MapPin className="w-8 h-8 text-amber-500" />
                            <div>
                                <div className="text-sm text-zinc-500">장소</div>
                                <div className="font-bold">{event.venueName || '미정'}</div>
                                {event.address && (
                                    <div className="text-zinc-400 text-sm">{event.address}</div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl">
                            <Users className="w-8 h-8 text-amber-500" />
                            <div>
                                <div className="text-sm text-zinc-500">참가자</div>
                                <div className="font-bold">
                                    {event.currentParticipants || 0}명 신청
                                    {event.maxParticipants && ` / ${event.maxParticipants}명 정원`}
                                </div>
                            </div>
                        </div>

                        {event.useInternalRegistration !== false && (
                            <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl">
                                <CreditCard className="w-8 h-8 text-amber-500" />
                                <div>
                                    <div className="text-sm text-zinc-500">참가비</div>
                                    <div className={`font-bold text-xl ${event.price === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                                        {event.price === 0 ? '무료' : `₩${event.price.toLocaleString()}`}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {event.description && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold mb-4">상세 정보</h2>
                            <div
                                className="prose prose-invert max-w-none text-zinc-400"
                                dangerouslySetInnerHTML={{ __html: event.description }}
                            />
                        </div>
                    )}

                    {/* Calendar Buttons */}
                    <div className="flex gap-3 mb-8">
                        <button
                            onClick={() => handleAddToCalendar('google')}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
                        >
                            <CalendarPlus className="w-4 h-4" />
                            Google 캘린더 추가
                        </button>
                        <button
                            onClick={() => handleAddToCalendar('apple')}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
                        >
                            <CalendarPlus className="w-4 h-4" />
                            iCal 다운로드
                        </button>
                    </div>

                    {/* Registration Status / Button */}
                    {myRegistration ? (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                                <span className="text-green-400 font-bold">참가 신청 완료</span>
                            </div>
                            <div className="text-zinc-400 text-sm space-y-1">
                                <p>신청자: {myRegistration.participantName}</p>
                                <p>상태: {
                                    myRegistration.paymentStatus === 'confirmed' ? '입금 확인됨' :
                                        myRegistration.paymentStatus === 'pending' ? '입금 대기중' :
                                            myRegistration.paymentStatus
                                }</p>
                            </div>
                        </div>
                    ) : canRegister ? (
                        <button
                            onClick={() => setShowRegistrationModal(true)}
                            className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl font-black text-lg transition-all"
                        >
                            참가 신청하기
                        </button>
                    ) : isPast ? (
                        <div className="text-center py-4 text-zinc-500">
                            종료된 이벤트입니다
                        </div>
                    ) : isFull ? (
                        <div className="text-center py-4 text-red-400">
                            정원이 마감되었습니다
                        </div>
                    ) : !event.useInternalRegistration && !isPast ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <p className="text-sm text-amber-200 text-center">
                                    이 이벤트는 외부 링크를 통해서만 신청을 받습니다.
                                </p>
                            </div>
                            {event.externalPaymentLink && (
                                <a
                                    href={event.externalPaymentLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-4 bg-amber-600 hover:bg-amber-500 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all"
                                >
                                    외부 페이지에서 신청하기
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Bank Transfer Info */}
                {event.useInternalRegistration !== false && event.paymentType === 'bank_transfer' && event.bankAccount && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-amber-500" />
                            입금 안내
                        </h2>
                        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-400">은행</span>
                                <span className="font-medium">{event.bankAccount.bankName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-400">계좌번호</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{event.bankAccount.accountNumber}</span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(event.bankAccount!.accountNumber);
                                            success('계좌번호가 복사되었습니다!');
                                        }}
                                        className="p-1 hover:bg-zinc-700 rounded"
                                    >
                                        <Copy className="w-4 h-4 text-zinc-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-400">예금주</span>
                                <span className="font-medium">{event.bankAccount.holderName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-400">입금액</span>
                                <span className="font-bold text-amber-400">₩{event.price.toLocaleString()}</span>
                            </div>
                        </div>
                        <p className="text-zinc-500 text-sm mt-4">
                            * 입금 후 주최자 확인까지 시간이 소요될 수 있습니다
                        </p>
                    </div>
                )}

                {/* Event Videos Section */}
                {eventVideos.length > 0 && (
                    <div className="bg-zinc-900 border border-violet-500/30 rounded-2xl p-6 mb-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Video className="w-5 h-5 text-violet-500" />
                            행사 영상
                        </h2>

                        {myRegistration?.paymentStatus === 'confirmed' ? (
                            <>
                                <p className="text-sm text-zinc-400 mb-4">
                                    참가자 전용 영상입니다. 무료로 시청하실 수 있습니다.
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {eventVideos.map((video) => (
                                        <div
                                            key={video.id}
                                            onClick={() => navigate(
                                                video.type === 'drill' ? `/drill/${video.contentId}` :
                                                    video.type === 'lesson' ? `/lessons/${video.contentId}` :
                                                        `/sparring/${video.contentId}`
                                            )}
                                            className="bg-zinc-800 rounded-xl overflow-hidden cursor-pointer group hover:ring-2 ring-violet-500 transition-all"
                                        >
                                            <div className={`${video.type === 'drill' ? 'aspect-[9/16]' : 'aspect-video'} bg-zinc-700 relative`}>
                                                {video.thumbnail_url && (
                                                    <img
                                                        src={video.thumbnail_url}
                                                        alt={video.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Play className="w-10 h-10 text-white" />
                                                </div>
                                            </div>
                                            <div className="p-3">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${video.type === 'drill' ? 'bg-violet-500/20 text-violet-400' :
                                                        video.type === 'lesson' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {video.type === 'drill' ? '드릴' : video.type === 'lesson' ? '레슨' : '스파링'}
                                                </span>
                                                <p className="text-sm font-medium truncate mt-2">{video.title}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 bg-zinc-800/30 rounded-xl">
                                <Lock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                                <p className="text-zinc-400 font-medium mb-1">
                                    {eventVideos.length}개의 행사 영상이 준비되어 있습니다
                                </p>
                                <p className="text-zinc-500 text-sm">
                                    {!myRegistration ? '참가 신청 후 입금이 확인되면 시청하실 수 있습니다' :
                                        myRegistration.paymentStatus === 'pending' ? '입금 확인 후 시청하실 수 있습니다' :
                                            '참가 확인 후 시청하실 수 있습니다'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Event Team Info */}
                <div
                    onClick={() => navigate(event.brandId ? `/event-team/${event.brandId}` : '/event-teams')}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 cursor-pointer hover:border-amber-500/50 transition-all"
                >
                    <h2 className="text-lg font-bold mb-4">이벤트 팀</h2>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden">
                            {event.brand?.logo ? (
                                <img src={event.brand.logo} alt="" className="w-full h-full object-cover" />
                            ) : event.organizerProfileImage ? (
                                <img src={event.organizerProfileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-amber-500">
                                    {(event.brand?.name || event.organizerName || '팀').charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-lg">{event.brand?.name || event.organizerName || '이벤트 팀'}</div>
                            <div className="text-zinc-500 text-sm">팀 프로필 보기 →</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Registration Modal */}
            {showRegistrationModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-zinc-800">
                            <h2 className="text-xl font-bold">참가 신청</h2>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    이름 <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.participantName}
                                    onChange={(e) => setFormData({ ...formData, participantName: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                    placeholder="홍길동"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    연락처
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                    placeholder="010-1234-5678"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    이메일
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                    placeholder={user?.email || 'email@example.com'}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                                        띠
                                    </label>
                                    <select
                                        value={formData.beltLevel}
                                        onChange={(e) => setFormData({ ...formData, beltLevel: e.target.value })}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="">선택</option>
                                        {BELT_OPTIONS.map(belt => (
                                            <option key={belt} value={belt}>{belt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                                        체급
                                    </label>
                                    <select
                                        value={formData.weightClass}
                                        onChange={(e) => setFormData({ ...formData, weightClass: e.target.value })}
                                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="">선택</option>
                                        {WEIGHT_OPTIONS.map(wc => (
                                            <option key={wc} value={wc}>{wc}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    소속 팀
                                </label>
                                <input
                                    type="text"
                                    value={formData.teamName}
                                    onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500"
                                    placeholder="소속 체육관/팀명"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    메모 (선택)
                                </label>
                                <textarea
                                    value={formData.participantNote}
                                    onChange={(e) => setFormData({ ...formData, participantNote: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500 resize-none"
                                    placeholder="주최자에게 전달할 메모"
                                />
                            </div>

                            {event.paymentType === 'bank_transfer' && event.price > 0 && (
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-amber-200">
                                            <p className="font-medium mb-1">무통장입금 안내</p>
                                            <p className="text-amber-200/70">
                                                신청 후 {event.bankAccount?.bankName} {event.bankAccount?.accountNumber}로
                                                ₩{event.price.toLocaleString()}을 입금해주세요.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-zinc-800 flex gap-3">
                            <button
                                onClick={() => setShowRegistrationModal(false)}
                                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleRegister}
                                disabled={registering}
                                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 rounded-xl font-bold transition-colors"
                            >
                                {registering ? '신청 중...' : '신청하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
