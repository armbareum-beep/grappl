import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Mail, Calendar, MapPin, DollarSign, Check, X,
    MessageCircle, Building, Clock, CreditCard, CheckCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingScreen } from '../../components/LoadingScreen';
import {
    fetchInvitationsForInstructor,
    respondToInvitation,
    confirmInvitationPayment,
    fetchOrganizerById
} from '../../lib/api-organizers';
import { InstructorInvitation, Creator } from '../../types';

export const InstructorInvitations: React.FC = () => {
    const navigate = useNavigate();
    const { user, creatorId, loading: authLoading } = useAuth();
    const { success, error: toastError } = useToast();

    const [loading, setLoading] = useState(true);
    const [invitations, setInvitations] = useState<InstructorInvitation[]>([]);
    const [instructor, setInstructor] = useState<Creator | null>(null);

    // Response modal state
    const [selectedInvitation, setSelectedInvitation] = useState<InstructorInvitation | null>(null);
    const [responseType, setResponseType] = useState<'accept' | 'decline' | null>(null);
    const [responseMessage, setResponseMessage] = useState('');
    const [responding, setResponding] = useState(false);

    // Payment confirmation state
    const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!creatorId) return;

            try {
                const [invitationsData, instructorData] = await Promise.all([
                    fetchInvitationsForInstructor(creatorId),
                    fetchOrganizerById(creatorId),
                ]);

                setInvitations(invitationsData);
                setInstructor(instructorData);
            } catch (error) {
                console.error('Failed to load invitations:', error);
                toastError('초청 목록을 불러올 수 없습니다.');
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading && creatorId) {
            loadData();
        }
    }, [creatorId, authLoading]);

    const handleRespond = async () => {
        if (!selectedInvitation || !responseType || !creatorId) return;

        setResponding(true);
        try {
            const response = responseType === 'accept' ? 'accepted' : 'declined';
            const updated = await respondToInvitation(
                selectedInvitation.id,
                creatorId,
                response,
                responseMessage
            );

            setInvitations(invitations.map(inv =>
                inv.id === selectedInvitation.id ? updated : inv
            ));

            setSelectedInvitation(null);
            setResponseType(null);
            setResponseMessage('');

            if (response === 'accepted') {
                success('초청을 승낙했습니다! 주최자에게 계좌정보가 공개됩니다.');
            } else {
                success('초청을 거절했습니다.');
            }
        } catch (error: any) {
            toastError(error.message || '응답 처리 중 오류가 발생했습니다.');
        } finally {
            setResponding(false);
        }
    };

    const handleConfirmPayment = async (invitationId: string) => {
        setConfirmingPaymentId(invitationId);
        try {
            const updated = await confirmInvitationPayment(invitationId);
            setInvitations(invitations.map(inv =>
                inv.id === invitationId ? updated : inv
            ));
            success('입금이 확인되었습니다!');
        } catch (error: any) {
            toastError(error.message || '입금 확인 중 오류가 발생했습니다.');
        } finally {
            setConfirmingPaymentId(null);
        }
    };

    // Check if instructor has bank account set up
    const hasBankAccount = instructor?.bankAccountForInvitation?.bankName &&
        instructor?.bankAccountForInvitation?.accountNumber;

    // Categorize invitations
    const pendingInvitations = invitations.filter(inv => inv.instructorResponse === 'pending');
    const awaitingPayment = invitations.filter(inv => inv.paymentStatus === 'awaiting_payment');
    const paidInvitations = invitations.filter(inv => inv.paymentStatus === 'paid');
    const completedInvitations = invitations.filter(inv =>
        inv.paymentStatus === 'confirmed' || inv.instructorResponse === 'declined' || inv.paymentStatus === 'cancelled'
    );

    if (authLoading || loading) {
        return <LoadingScreen message="초청 목록 불러오는 중..." />;
    }

    if (!user || !creatorId) {
        navigate('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 py-6 px-4 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">초청 관리</h1>
                        <p className="text-sm text-zinc-400">주최자로부터 받은 초청을 관리하세요</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Bank Account Warning */}
                {!hasBankAccount && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-200 font-medium mb-1">계좌 정보 미등록</p>
                                <p className="text-red-200/70 text-sm">
                                    초청을 승낙하려면 먼저 계좌 정보를 등록해야 합니다.
                                </p>
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
                                >
                                    설정에서 계좌 등록하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending Invitations */}
                {pendingInvitations.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-yellow-500" />
                            새 초청 ({pendingInvitations.length})
                        </h2>
                        <div className="space-y-4">
                            {pendingInvitations.map((invitation) => (
                                <InvitationCard
                                    key={invitation.id}
                                    invitation={invitation}
                                    onAccept={() => {
                                        if (!hasBankAccount) {
                                            toastError('계좌 정보를 먼저 등록해주세요.');
                                            return;
                                        }
                                        setSelectedInvitation(invitation);
                                        setResponseType('accept');
                                    }}
                                    onDecline={() => {
                                        setSelectedInvitation(invitation);
                                        setResponseType('decline');
                                    }}
                                    showActions
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Awaiting Payment */}
                {awaitingPayment.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            입금 대기 ({awaitingPayment.length})
                        </h2>
                        <div className="space-y-4">
                            {awaitingPayment.map((invitation) => (
                                <div key={invitation.id} className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                                    <InvitationCard invitation={invitation} />
                                    <div className="p-4 bg-amber-500/10 border-t border-amber-500/20">
                                        <p className="text-amber-200 text-sm mb-2">
                                            주최자가 입금하면 아래 버튼으로 확인해주세요
                                        </p>
                                        <p className="text-sm text-zinc-400">
                                            금액: <span className="font-bold text-white">{invitation.proposedFee.toLocaleString()}원</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Paid - Awaiting Confirmation */}
                {paidInvitations.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-500" />
                            입금 확인 필요 ({paidInvitations.length})
                        </h2>
                        <div className="space-y-4">
                            {paidInvitations.map((invitation) => (
                                <div key={invitation.id} className="bg-zinc-900 border border-blue-500/30 rounded-2xl overflow-hidden">
                                    <InvitationCard invitation={invitation} />
                                    <div className="p-4 bg-blue-500/10 border-t border-blue-500/20">
                                        <p className="text-blue-200 text-sm mb-3">
                                            주최자가 입금 완료를 알렸습니다. 계좌를 확인하고 입금이 확인되면 아래 버튼을 눌러주세요.
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-zinc-400">
                                                금액: <span className="font-bold text-white">{invitation.proposedFee.toLocaleString()}원</span>
                                            </p>
                                            <button
                                                onClick={() => handleConfirmPayment(invitation.id)}
                                                disabled={confirmingPaymentId === invitation.id}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl font-medium text-sm transition-colors"
                                            >
                                                {confirmingPaymentId === invitation.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        확인 중...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-4 h-4" />
                                                        입금 확인 완료
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Completed */}
                {completedInvitations.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-400">
                            <CheckCircle className="w-5 h-5" />
                            완료된 초청 ({completedInvitations.length})
                        </h2>
                        <div className="space-y-4">
                            {completedInvitations.map((invitation) => (
                                <InvitationCard
                                    key={invitation.id}
                                    invitation={invitation}
                                    className="opacity-60"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {invitations.length === 0 && (
                    <div className="text-center py-16">
                        <Mail className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-zinc-400 mb-2">초청이 없습니다</h3>
                        <p className="text-zinc-500">
                            주최자로부터 초청이 오면 여기에 표시됩니다
                        </p>
                    </div>
                )}
            </div>

            {/* Response Modal */}
            {selectedInvitation && responseType && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-2xl max-w-md w-full overflow-hidden">
                        <div className={`p-4 border-b border-zinc-800 ${
                            responseType === 'accept' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                            <h3 className="text-lg font-bold">
                                {responseType === 'accept' ? '초청 승낙' : '초청 거절'}
                            </h3>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Summary */}
                            <div className="bg-zinc-800 rounded-xl p-4">
                                <p className="text-sm text-zinc-400">행사</p>
                                <p className="font-bold">{selectedInvitation.event?.title || '알 수 없음'}</p>
                                <p className="text-sm text-zinc-400 mt-2">제안 금액</p>
                                <p className="font-bold text-lg">{selectedInvitation.proposedFee.toLocaleString()}원</p>
                            </div>

                            {responseType === 'accept' && (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                                    <p className="text-green-200 text-sm">
                                        승낙하면 등록된 계좌 정보가 주최자에게 공개됩니다.
                                    </p>
                                </div>
                            )}

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    <MessageCircle className="w-4 h-4 inline mr-1" />
                                    응답 메시지 (선택)
                                </label>
                                <textarea
                                    value={responseMessage}
                                    onChange={(e) => setResponseMessage(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500 resize-none"
                                    placeholder={responseType === 'accept' ? '감사합니다!' : '죄송하지만 일정이 맞지 않습니다...'}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedInvitation(null);
                                        setResponseType(null);
                                        setResponseMessage('');
                                    }}
                                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleRespond}
                                    disabled={responding}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${
                                        responseType === 'accept'
                                            ? 'bg-green-600 hover:bg-green-500'
                                            : 'bg-red-600 hover:bg-red-500'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {responding ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            처리 중...
                                        </>
                                    ) : responseType === 'accept' ? (
                                        <>
                                            <Check className="w-5 h-5" />
                                            승낙하기
                                        </>
                                    ) : (
                                        <>
                                            <X className="w-5 h-5" />
                                            거절하기
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

// Invitation Card Component
const InvitationCard: React.FC<{
    invitation: InstructorInvitation;
    onAccept?: () => void;
    onDecline?: () => void;
    showActions?: boolean;
    className?: string;
}> = ({ invitation, onAccept, onDecline, showActions, className }) => {
    const navigate = useNavigate();

    const getStatusBadge = () => {
        if (invitation.paymentStatus === 'confirmed') {
            return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">완료</span>;
        }
        if (invitation.paymentStatus === 'paid') {
            return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">입금 완료</span>;
        }
        if (invitation.paymentStatus === 'awaiting_payment') {
            return <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">입금 대기</span>;
        }
        if (invitation.instructorResponse === 'declined') {
            return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">거절됨</span>;
        }
        if (invitation.paymentStatus === 'cancelled') {
            return <span className="px-2 py-1 bg-zinc-500/20 text-zinc-400 rounded-full text-xs font-medium">취소됨</span>;
        }
        return null;
    };

    return (
        <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-4 ${className || ''}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Building className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <p className="font-bold">{invitation.organizer?.name || '주최자'}</p>
                        <p className="text-sm text-zinc-400">
                            {new Date(invitation.createdAt).toLocaleDateString('ko-KR')}
                        </p>
                    </div>
                </div>
                {getStatusBadge()}
            </div>

            {/* Event Info */}
            {invitation.event && (
                <div
                    onClick={() => navigate(`/events/${invitation.eventId}`)}
                    className="bg-zinc-800 rounded-xl p-3 mb-4 cursor-pointer hover:bg-zinc-700 transition-colors"
                >
                    <h4 className="font-bold mb-2">{invitation.event.title}</h4>
                    <div className="flex flex-wrap gap-3 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {invitation.event.event_date || '날짜 미정'}
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {(invitation.event as any).type === 'competition' ? '시합' :
                             (invitation.event as any).type === 'seminar' ? '세미나' : '오픈매트'}
                        </span>
                    </div>
                </div>
            )}

            {/* Fee & Message */}
            <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-green-500" />
                <span className="font-bold text-lg">{invitation.proposedFee.toLocaleString()}원</span>
                <span className="text-zinc-400 text-sm">(최소: {invitation.minFeeSnapshot.toLocaleString()}원)</span>
            </div>

            {invitation.invitationMessage && (
                <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-zinc-300">{invitation.invitationMessage}</p>
                </div>
            )}

            {invitation.responseMessage && (
                <div className="bg-zinc-800/50 rounded-lg p-3 mb-4 border-l-2 border-amber-500">
                    <p className="text-xs text-zinc-500 mb-1">내 응답</p>
                    <p className="text-sm text-zinc-300">{invitation.responseMessage}</p>
                </div>
            )}

            {/* Actions */}
            {showActions && (
                <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-800">
                    <button
                        onClick={onDecline}
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <X className="w-5 h-5" />
                        거절
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Check className="w-5 h-5" />
                        승낙
                    </button>
                </div>
            )}
        </div>
    );
};
