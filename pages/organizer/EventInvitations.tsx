import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, Users, Send, Plus, Check, X, Clock, CreditCard, Loader2,
    Copy, CheckCircle, Ban, Calendar, AlertCircle, DollarSign, Building
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingScreen } from '../../components/LoadingScreen';
import {
    fetchInvitationsByEvent,
    markInvitationPaid,
    cancelInvitation
} from '../../lib/api-organizers';
import { fetchEventById } from '../../lib/api-events';
import { InstructorInvitation, Event } from '../../types';

export const EventInvitations: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const { user, isOrganizer, loading: authLoading } = useAuth();
    const { success, error: toastError } = useToast();

    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<Event | null>(null);
    const [invitations, setInvitations] = useState<InstructorInvitation[]>([]);

    const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!eventId) return;

            try {
                const [eventData, invitationsData] = await Promise.all([
                    fetchEventById(eventId),
                    fetchInvitationsByEvent(eventId),
                ]);

                setEvent(eventData);
                setInvitations(invitationsData);
            } catch (error) {
                console.error('Failed to load data:', error);
                toastError('데이터를 불러올 수 없습니다.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [eventId]);

    const handleMarkPaid = async (invitationId: string) => {
        setMarkingPaidId(invitationId);
        try {
            const updated = await markInvitationPaid(invitationId);
            setInvitations(invitations.map(inv =>
                inv.id === invitationId ? updated : inv
            ));
            success('입금 완료로 표시했습니다. 지도자의 확인을 기다려주세요.');
        } catch (error: any) {
            toastError(error.message || '처리 중 오류가 발생했습니다.');
        } finally {
            setMarkingPaidId(null);
        }
    };

    const handleCancel = async (invitationId: string) => {
        if (!confirm('이 초청을 취소하시겠습니까?')) return;

        setCancellingId(invitationId);
        try {
            const updated = await cancelInvitation(invitationId);
            setInvitations(invitations.map(inv =>
                inv.id === invitationId ? updated : inv
            ));
            success('초청이 취소되었습니다.');
        } catch (error: any) {
            toastError(error.message || '취소 중 오류가 발생했습니다.');
        } finally {
            setCancellingId(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        success('클립보드에 복사되었습니다.');
    };

    // Categorize invitations
    const pendingInvitations = invitations.filter(inv => inv.instructorResponse === 'pending');
    const acceptedInvitations = invitations.filter(inv =>
        inv.instructorResponse === 'accepted' && inv.paymentStatus !== 'confirmed'
    );
    const completedInvitations = invitations.filter(inv =>
        inv.paymentStatus === 'confirmed' || inv.instructorResponse === 'declined' || inv.paymentStatus === 'cancelled'
    );

    if (authLoading || loading) {
        return <LoadingScreen message="초청 현황 불러오는 중..." />;
    }

    if (!user || !isOrganizer) {
        navigate('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 py-6 px-4 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">지도자 초청 현황</h1>
                            {event && (
                                <p className="text-sm text-zinc-400">{event.title}</p>
                            )}
                        </div>
                    </div>
                    <Link
                        to={`/organizer/event/${eventId}/invite`}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl font-medium text-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        지도자 초청
                    </Link>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold">{invitations.length}</div>
                        <div className="text-xs text-zinc-500">총 초청</div>
                    </div>
                    <div className="bg-zinc-900 border border-yellow-500/30 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-400">{pendingInvitations.length}</div>
                        <div className="text-xs text-zinc-500">응답 대기</div>
                    </div>
                    <div className="bg-zinc-900 border border-amber-500/30 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-amber-400">{acceptedInvitations.length}</div>
                        <div className="text-xs text-zinc-500">진행 중</div>
                    </div>
                    <div className="bg-zinc-900 border border-green-500/30 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">
                            {completedInvitations.filter(inv => inv.paymentStatus === 'confirmed').length}
                        </div>
                        <div className="text-xs text-zinc-500">완료</div>
                    </div>
                </div>

                {/* Empty State */}
                {invitations.length === 0 && (
                    <div className="text-center py-16">
                        <Users className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-zinc-400 mb-2">초청한 지도자가 없습니다</h3>
                        <p className="text-zinc-500 mb-6">세미나를 위해 지도자를 초청해보세요</p>
                        <Link
                            to={`/organizer/event/${eventId}/invite`}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            지도자 초청하기
                        </Link>
                    </div>
                )}

                {/* Pending Invitations */}
                {pendingInvitations.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-yellow-500" />
                            응답 대기 ({pendingInvitations.length})
                        </h2>
                        <div className="space-y-3">
                            {pendingInvitations.map((invitation) => (
                                <InvitationManageCard
                                    key={invitation.id}
                                    invitation={invitation}
                                    onCancel={() => handleCancel(invitation.id)}
                                    cancelling={cancellingId === invitation.id}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Accepted - In Progress */}
                {acceptedInvitations.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-amber-500" />
                            진행 중 ({acceptedInvitations.length})
                        </h2>
                        <div className="space-y-4">
                            {acceptedInvitations.map((invitation) => (
                                <div key={invitation.id} className="bg-zinc-900 border border-amber-500/30 rounded-2xl overflow-hidden">
                                    <InvitationManageCard
                                        invitation={invitation}
                                        showBankAccount
                                        onCopyAccount={copyToClipboard}
                                    />

                                    {/* Payment Actions */}
                                    {invitation.paymentStatus === 'awaiting_payment' && (
                                        <div className="p-4 bg-amber-500/10 border-t border-amber-500/20">
                                            <p className="text-amber-200 text-sm mb-3">
                                                아래 계좌로 송금 후 '입금 완료' 버튼을 눌러주세요.
                                            </p>
                                            <button
                                                onClick={() => handleMarkPaid(invitation.id)}
                                                disabled={markingPaidId === invitation.id}
                                                className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                {markingPaidId === invitation.id ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        처리 중...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="w-5 h-5" />
                                                        입금 완료
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {invitation.paymentStatus === 'paid' && (
                                        <div className="p-4 bg-blue-500/10 border-t border-blue-500/20">
                                            <div className="flex items-center gap-2 text-blue-200">
                                                <Clock className="w-5 h-5" />
                                                <span>지도자의 입금 확인을 기다리는 중...</span>
                                            </div>
                                        </div>
                                    )}
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
                            완료 / 종료 ({completedInvitations.length})
                        </h2>
                        <div className="space-y-3">
                            {completedInvitations.map((invitation) => (
                                <InvitationManageCard
                                    key={invitation.id}
                                    invitation={invitation}
                                    className="opacity-60"
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Invitation Card for Organizer Management
const InvitationManageCard: React.FC<{
    invitation: InstructorInvitation;
    onCancel?: () => void;
    cancelling?: boolean;
    showBankAccount?: boolean;
    onCopyAccount?: (text: string) => void;
    className?: string;
}> = ({ invitation, onCancel, cancelling, showBankAccount, onCopyAccount, className }) => {
    const navigate = useNavigate();

    const getStatusBadge = () => {
        if (invitation.paymentStatus === 'confirmed') {
            return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" />완료</span>;
        }
        if (invitation.paymentStatus === 'paid') {
            return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">입금 확인 대기</span>;
        }
        if (invitation.paymentStatus === 'awaiting_payment') {
            return <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">입금 대기</span>;
        }
        if (invitation.instructorResponse === 'pending') {
            return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">응답 대기</span>;
        }
        if (invitation.instructorResponse === 'declined') {
            return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium flex items-center gap-1"><X className="w-3 h-3" />거절됨</span>;
        }
        if (invitation.paymentStatus === 'cancelled') {
            return <span className="px-2 py-1 bg-zinc-500/20 text-zinc-400 rounded-full text-xs font-medium flex items-center gap-1"><Ban className="w-3 h-3" />취소됨</span>;
        }
        return null;
    };

    return (
        <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-4 ${className || ''}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        onClick={() => navigate(`/creator/${invitation.instructorId}`)}
                        className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden cursor-pointer hover:ring-2 ring-amber-500 transition-all"
                    >
                        {invitation.instructor?.profileImage ? (
                            <img
                                src={invitation.instructor.profileImage}
                                alt={invitation.instructor.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-zinc-600" />
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="font-bold">{invitation.instructor?.name || '알 수 없음'}</p>
                        <p className="text-sm text-zinc-400">
                            {new Date(invitation.createdAt).toLocaleDateString('ko-KR')} 초청
                        </p>
                    </div>
                </div>
                {getStatusBadge()}
            </div>

            {/* Fee Info */}
            <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-green-500" />
                <span className="font-bold text-lg">{invitation.proposedFee.toLocaleString()}원</span>
            </div>

            {/* Invitation Message */}
            {invitation.invitationMessage && (
                <div className="bg-zinc-800/50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-zinc-500 mb-1">보낸 메시지</p>
                    <p className="text-sm text-zinc-300">{invitation.invitationMessage}</p>
                </div>
            )}

            {/* Response Message */}
            {invitation.responseMessage && (
                <div className="bg-zinc-800/50 rounded-lg p-3 mb-3 border-l-2 border-amber-500">
                    <p className="text-xs text-zinc-500 mb-1">지도자 응답</p>
                    <p className="text-sm text-zinc-300">{invitation.responseMessage}</p>
                </div>
            )}

            {/* Bank Account (shown when accepted) */}
            {showBankAccount && invitation.instructorBankAccount && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                    <p className="text-xs text-green-400 mb-2 font-medium">지도자 계좌 정보</p>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-400">은행</span>
                            <span className="font-medium">{invitation.instructorBankAccount.bankName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-400">계좌번호</span>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{invitation.instructorBankAccount.accountNumber}</span>
                                <button
                                    onClick={() => onCopyAccount?.(invitation.instructorBankAccount!.accountNumber)}
                                    className="p-1 hover:bg-zinc-700 rounded transition-colors"
                                >
                                    <Copy className="w-4 h-4 text-zinc-400" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-400">예금주</span>
                            <span className="font-medium">{invitation.instructorBankAccount.holderName}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Button for Pending */}
            {onCancel && invitation.instructorResponse === 'pending' && (
                <button
                    onClick={onCancel}
                    disabled={cancelling}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                    {cancelling ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            취소 중...
                        </>
                    ) : (
                        <>
                            <X className="w-4 h-4" />
                            초청 취소
                        </>
                    )}
                </button>
            )}
        </div>
    );
};
