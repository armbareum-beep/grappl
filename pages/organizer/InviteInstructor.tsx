import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, Users, Search, DollarSign, Send,
    MessageCircle, X, AlertCircle, Loader2, ChevronRight,
    Trophy, Calendar, Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingScreen } from '../../components/LoadingScreen';
import {
    fetchAvailableInstructors,
    createInvitation,
    fetchInvitationsByEvent
} from '../../lib/api-organizers';
import { fetchEventById } from '../../lib/api-events';
import { Creator, InstructorInvitation, Event } from '../../types';

export const InviteInstructor: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const { user, isOrganizer, loading: authLoading } = useAuth();
    const organizerId = user?.id;
    const { success, error: toastError } = useToast();

    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<Event | null>(null);
    const [instructors, setInstructors] = useState<Creator[]>([]);
    const [existingInvitations, setExistingInvitations] = useState<InstructorInvitation[]>([]);

    // Invitation modal state
    const [selectedInstructor, setSelectedInstructor] = useState<Creator | null>(null);
    const [proposedFee, setProposedFee] = useState('');
    const [invitationMessage, setInvitationMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!eventId) return;

            try {
                const eventData = await fetchEventById(eventId);
                setEvent(eventData);

                // Load instructors filtered by event type
                try {
                    const instructorsData = await fetchAvailableInstructors({
                        eventType: eventData.type as 'competition' | 'seminar' | 'openmat'
                    });
                    setInstructors(instructorsData);
                } catch (err) {
                    console.error('Failed to load instructors:', err);
                }

                try {
                    const invitationsData = await fetchInvitationsByEvent(eventId);
                    setExistingInvitations(invitationsData);
                } catch (err) {
                    console.error('Failed to load invitations:', err);
                }
            } catch (error) {
                console.error('Failed to load event:', error);
                toastError('이벤트를 불러올 수 없습니다.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [eventId]);

    const getMinFeeForEventType = (instructor: Creator) => {
        if (!event) return instructor.minInvitationFee || 0;
        switch (event.type) {
            case 'competition':
                return instructor.minCompetitionFee || instructor.minInvitationFee || 0;
            case 'seminar':
                return instructor.minSeminarFee || instructor.minInvitationFee || 0;
            case 'openmat':
                return instructor.minOpenmatFee || instructor.minInvitationFee || 0;
            default:
                return instructor.minInvitationFee || 0;
        }
    };

    const handleOpenInviteModal = (instructor: Creator) => {
        setSelectedInstructor(instructor);
        setProposedFee(getMinFeeForEventType(instructor).toString());
        setInvitationMessage('');
    };

    const handleSendInvitation = async () => {
        if (!selectedInstructor || !eventId || !organizerId) return;

        const fee = parseInt(proposedFee);
        const minFee = getMinFeeForEventType(selectedInstructor);
        if (isNaN(fee) || fee < minFee) {
            toastError(`최소 금액은 ${minFee.toLocaleString()}원입니다.`);
            return;
        }

        setSending(true);
        try {
            const newInvitation = await createInvitation({
                eventId,
                organizerId: organizerId,
                instructorId: selectedInstructor.id,
                proposedFee: fee,
                invitationMessage,
            });

            setExistingInvitations([...existingInvitations, newInvitation]);
            setSelectedInstructor(null);
            success('초청장을 보냈습니다! 지도자의 응답을 기다려주세요.');
        } catch (error: any) {
            toastError(error.message || '초청장 발송 중 오류가 발생했습니다.');
        } finally {
            setSending(false);
        }
    };

    const getInvitationStatus = (instructorId: string) => {
        return existingInvitations.find(inv => inv.instructorId === instructorId);
    };

    const getEventTypeLabel = () => {
        if (!event) return '';
        switch (event.type) {
            case 'competition': return '시합';
            case 'seminar': return '세미나';
            case 'openmat': return '오픈매트';
            default: return '';
        }
    };

    const getEventTypeIcon = () => {
        if (!event) return <Users className="w-5 h-5" />;
        switch (event.type) {
            case 'competition': return <Trophy className="w-5 h-5 text-red-400" />;
            case 'seminar': return <Users className="w-5 h-5 text-blue-400" />;
            case 'openmat': return <Calendar className="w-5 h-5 text-green-400" />;
            default: return <Users className="w-5 h-5" />;
        }
    };

    if (authLoading || loading) {
        return <LoadingScreen message="지도자 목록 불러오는 중..." />;
    }

    if (!user || !isOrganizer) {
        navigate('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 py-6 px-4 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">지도자 초청</h1>
                        {event && (
                            <p className="text-sm text-zinc-400 flex items-center gap-1">
                                {getEventTypeIcon()}
                                {event.title}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
                {/* Info Banner */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                    <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="text-amber-200 font-medium mb-1">초청 진행 방식</p>
                            <ol className="text-amber-200/70 list-decimal list-inside space-y-1">
                                <li>지도자에게 금액을 제안하고 초청장을 보냅니다</li>
                                <li>지도자가 승낙하면 계좌번호가 공개됩니다</li>
                                <li>해당 계좌로 직접 송금합니다</li>
                                <li>지도자가 입금을 확인하면 완료!</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {getEventTypeIcon()}
                        {getEventTypeLabel()} 초청 가능한 지도자
                    </h2>
                    {existingInvitations.length > 0 && (
                        <Link
                            to={`/organizer/event/${eventId}/invitations`}
                            className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 font-medium"
                        >
                            초청 현황 보기 ({existingInvitations.length})
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>

                {/* Instructor Cards Grid */}
                {instructors.length === 0 ? (
                    <div className="text-center py-16 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                        <Users className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                        <h3 className="text-white font-bold text-lg mb-2">
                            {getEventTypeLabel()} 초청 가능한 지도자가 없습니다
                        </h3>
                        <p className="text-zinc-500 text-sm">
                            아직 {getEventTypeLabel()} 초청을 활성화한 지도자가 없습니다
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {instructors.map((instructor) => {
                            const existingInvite = getInvitationStatus(instructor.id);
                            const isAlreadyInvited = !!existingInvite;
                            const minFee = getMinFeeForEventType(instructor);

                            return (
                                <Link
                                    key={instructor.id}
                                    to={`/creator/${instructor.id}`}
                                    className={`group relative bg-zinc-900 border rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col no-underline ${
                                        isAlreadyInvited
                                            ? 'border-zinc-700 opacity-60'
                                            : 'border-zinc-800 hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:-translate-y-1'
                                    }`}
                                >
                                    {/* Glowing Backlight Effect on Hover */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                    {/* Card Header Background */}
                                    <div className="h-32 bg-gradient-to-b from-zinc-800 to-zinc-900 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent opacity-50"></div>

                                        {/* Price Badge */}
                                        <div className="absolute top-4 right-4 px-3 py-1 bg-zinc-950/50 border border-amber-500/30 rounded-full backdrop-blur-sm">
                                            <span className="text-[10px] font-bold text-amber-300 tracking-wider">
                                                최소 ₩{minFee.toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Already Invited Badge */}
                                        {isAlreadyInvited && (
                                            <div className="absolute top-4 left-4 px-3 py-1 bg-zinc-950/80 border border-zinc-600 rounded-full">
                                                <span className="text-[10px] font-bold text-zinc-400">이미 초청함</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Avatar (Centered) */}
                                    <div className="relative -mt-16 flex justify-center mb-4 z-10">
                                        <div className="w-32 h-32 rounded-full p-1 bg-zinc-900 ring-4 ring-zinc-900 group-hover:ring-amber-500/30 transition-all duration-300 shadow-xl">
                                            <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 relative">
                                                {instructor.profileImage ? (
                                                    <img
                                                        src={instructor.profileImage}
                                                        alt={instructor.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Users className="w-12 h-12 text-zinc-600" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content (Centered) */}
                                    <div className="px-6 pb-8 flex-1 flex flex-col items-center text-center z-10">
                                        <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors mb-2">
                                            {instructor.name}
                                        </h3>

                                        <p className="text-sm text-zinc-400 line-clamp-2 mb-6 max-w-sm leading-relaxed min-h-[40px] px-2">
                                            {instructor.bio || instructor.invitationDescription || '초청 가능'}
                                        </p>

                                        {/* Specialties */}
                                        {instructor.specialties && instructor.specialties.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-6 justify-center">
                                                {instructor.specialties.slice(0, 2).map((s: string) => (
                                                    <span key={s} className="bg-zinc-800/50 text-zinc-300 text-[11px] px-2 py-1 rounded-lg border border-zinc-700/50 font-medium">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="w-full pt-6 mt-auto border-t border-zinc-800/50">
                                            <div className="flex items-center justify-center gap-4 mb-6 text-xs text-zinc-400">
                                                <div className="flex items-center gap-1 font-medium">
                                                    <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                                                    최소 {minFee.toLocaleString()}원
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!isAlreadyInvited) {
                                                        handleOpenInviteModal(instructor);
                                                    }
                                                }}
                                                disabled={isAlreadyInvited}
                                                className={`w-full py-3 font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn border ${
                                                    isAlreadyInvited
                                                        ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                                                        : 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500/30 hover:border-amber-500'
                                                }`}
                                            >
                                                {isAlreadyInvited ? (
                                                    <span>이미 초청함</span>
                                                ) : (
                                                    <>
                                                        <span>초청하기</span>
                                                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Invitation Modal */}
            {selectedInstructor && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold">초청장 보내기</h3>
                            <button
                                onClick={() => setSelectedInstructor(null)}
                                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Instructor Info */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden ring-2 ring-amber-500/30">
                                    {selectedInstructor.profileImage ? (
                                        <img
                                            src={selectedInstructor.profileImage}
                                            alt={selectedInstructor.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Users className="w-8 h-8 text-zinc-600" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">{selectedInstructor.name}</h4>
                                    <p className="text-sm text-zinc-400 flex items-center gap-1">
                                        {getEventTypeIcon()}
                                        {getEventTypeLabel()} 최소: {getMinFeeForEventType(selectedInstructor).toLocaleString()}원
                                    </p>
                                </div>
                            </div>

                            {/* Fee Input */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    <DollarSign className="w-4 h-4 inline mr-1" />
                                    제안 금액 (원)
                                </label>
                                <input
                                    type="number"
                                    value={proposedFee}
                                    onChange={(e) => setProposedFee(e.target.value)}
                                    min={getMinFeeForEventType(selectedInstructor)}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                    placeholder="금액 입력"
                                />
                                {parseInt(proposedFee) < getMinFeeForEventType(selectedInstructor) && (
                                    <p className="text-red-400 text-sm mt-1">
                                        최소 금액 이상을 입력해주세요
                                    </p>
                                )}
                            </div>

                            {/* Message Input */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    <MessageCircle className="w-4 h-4 inline mr-1" />
                                    초청 메시지 (선택)
                                </label>
                                <textarea
                                    value={invitationMessage}
                                    onChange={(e) => setInvitationMessage(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none"
                                    placeholder="세미나 목적, 예상 참가자 수 등..."
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedInstructor(null)}
                                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSendInvitation}
                                    disabled={sending || parseInt(proposedFee) < getMinFeeForEventType(selectedInstructor)}
                                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            보내는 중...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            초청장 보내기
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
