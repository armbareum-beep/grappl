import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Users, Search, Filter, CheckCircle, XCircle, Clock,
    UserPlus, Download, Phone, Mail, AlertTriangle, Scale, MoreVertical,
    Trash2, Edit2, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingScreen } from '../../components/LoadingScreen';
import {
    fetchEventById, fetchRegistrations, createRegistration, updateRegistration, cancelRegistration
} from '../../lib/api-events';
import { exportParticipantsToCSV } from '../../lib/api-organizers';
import { Event, EventRegistration, RegistrationPaymentStatus } from '../../types';

const BELT_OPTIONS = ['화이트', '블루', '퍼플', '브라운', '블랙'];
const WEIGHT_OPTIONS = ['루스터', '라이트페더', '페더', '라이트', '미들', '미디엄헤비', '헤비', '슈퍼헤비', '울트라헤비', '오픈클래스'];

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'waitlist';

const StatusBadge: React.FC<{ status: RegistrationPaymentStatus }> = ({ status }) => {
    const config = {
        pending: { label: '입금 대기', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
        confirmed: { label: '입금 확인', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
        cancelled: { label: '취소됨', color: 'bg-red-500/20 text-red-400', icon: XCircle },
        refunded: { label: '환불됨', color: 'bg-zinc-500/20 text-zinc-400', icon: XCircle },
        waitlist: { label: '대기자', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
    }[status] || { label: status, color: 'bg-zinc-500/20 text-zinc-400', icon: Clock };

    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${config.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {config.label}
        </span>
    );
};

const WeighInBadge: React.FC<{ status: string }> = ({ status }) => {
    const config = {
        pending: { label: '계체 대기', color: 'bg-zinc-500/20 text-zinc-400' },
        passed: { label: '계체 완료', color: 'bg-green-500/20 text-green-400' },
        failed: { label: '계체 실패', color: 'bg-red-500/20 text-red-400' },
        no_show: { label: '불참', color: 'bg-red-500/20 text-red-400' },
    }[status] || { label: status, color: 'bg-zinc-500/20 text-zinc-400' };

    return (
        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${config.color}`}>
            {config.label}
        </span>
    );
};

export const ManageParticipants: React.FC = () => {
    const { id: eventId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isOrganizer } = useAuth();
    const organizerId = user?.id;
    const { success, error: toastError } = useToast();

    const [event, setEvent] = useState<Event | null>(null);
    const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState<EventRegistration | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Add participant form
    const [addForm, setAddForm] = useState({
        participantName: '',
        phone: '',
        email: '',
        beltLevel: '',
        weightClass: '',
        teamName: '',
        organizerNote: '',
    });

    useEffect(() => {
        async function loadData() {
            if (!eventId) return;

            try {
                const eventData = await fetchEventById(eventId);
                setEvent(eventData);

                // Check if user is the organizer
                if (eventData.organizerId !== organizerId) {
                    toastError('이 이벤트의 주최자만 접근할 수 있습니다.');
                    navigate('/organizer/dashboard');
                    return;
                }

                // Load registrations separately
                try {
                    const regs = await fetchRegistrations(eventId);
                    setRegistrations(regs);
                } catch (regError) {
                    console.error('Error loading registrations:', regError);
                    // Registration table might not exist yet
                }
            } catch (error) {
                console.error('Error loading event:', error);
                toastError('이벤트를 찾을 수 없습니다.');
                navigate('/organizer/dashboard');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [eventId, organizerId]);

    const filteredRegistrations = registrations.filter(reg => {
        const matchesSearch =
            reg.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.phone?.includes(searchTerm) ||
            reg.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.teamName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || reg.paymentStatus === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const handleConfirmPayment = async (registrationId: string) => {
        setActionLoading(true);
        try {
            const updated = await updateRegistration(registrationId, {
                paymentStatus: 'confirmed',
                confirmedByOrganizer: true,
            });
            setRegistrations(prev =>
                prev.map(r => r.id === registrationId ? updated : r)
            );
            success('입금이 확인되었습니다.');
            setShowDetailModal(null);
        } catch (error: any) {
            toastError(error.message || '입금 확인 중 오류가 발생했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelRegistration = async (registrationId: string) => {
        if (!confirm('정말 이 참가 신청을 취소하시겠습니까?')) return;

        setActionLoading(true);
        try {
            const updated = await cancelRegistration(registrationId, '주최자에 의한 취소');
            setRegistrations(prev =>
                prev.map(r => r.id === registrationId ? updated : r)
            );
            success('참가 신청이 취소되었습니다.');
            setShowDetailModal(null);
        } catch (error: any) {
            toastError(error.message || '취소 중 오류가 발생했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddParticipant = async () => {
        if (!addForm.participantName.trim()) {
            toastError('이름을 입력해주세요.');
            return;
        }

        setActionLoading(true);
        try {
            const newReg = await createRegistration({
                eventId: eventId!,
                participantName: addForm.participantName,
                phone: addForm.phone,
                email: addForm.email,
                beltLevel: addForm.beltLevel,
                weightClass: addForm.weightClass,
                teamName: addForm.teamName,
                isManualEntry: true,
            });

            // Add organizer note if provided
            if (addForm.organizerNote) {
                await updateRegistration(newReg.id, {
                    organizerNote: addForm.organizerNote,
                });
            }

            setRegistrations(prev => [newReg, ...prev]);
            setShowAddModal(false);
            setAddForm({
                participantName: '',
                phone: '',
                email: '',
                beltLevel: '',
                weightClass: '',
                teamName: '',
                organizerNote: '',
            });
            success('참가자가 추가되었습니다.');
        } catch (error: any) {
            toastError(error.message || '참가자 추가 중 오류가 발생했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleExportCSV = async () => {
        if (!eventId) return;

        try {
            const csvContent = await exportParticipantsToCSV(eventId);
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${event?.title || 'participants'}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            success('엑셀 파일이 다운로드되었습니다.');
        } catch (error: any) {
            toastError(error.message || '다운로드 중 오류가 발생했습니다.');
        }
    };

    const stats = {
        total: registrations.length,
        confirmed: registrations.filter(r => r.paymentStatus === 'confirmed').length,
        pending: registrations.filter(r => r.paymentStatus === 'pending').length,
        cancelled: registrations.filter(r => r.paymentStatus === 'cancelled').length,
        waitlist: registrations.filter(r => r.paymentStatus === 'waitlist').length,
    };

    if (loading) {
        return <LoadingScreen message="참가자 목록 불러오는 중..." />;
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
                <p className="text-zinc-400">이벤트를 찾을 수 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 py-6 px-4">
                <div className="max-w-7xl mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>뒤로</span>
                    </button>

                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-black">{event.title}</h1>
                            <p className="text-zinc-400 mt-1">참가자 관리</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline">엑셀 다운로드</span>
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-colors"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span className="hidden sm:inline">참가자 추가</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black">{stats.total}</div>
                        <div className="text-xs text-zinc-500">전체</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-green-400">{stats.confirmed}</div>
                        <div className="text-xs text-zinc-500">입금 확인</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-yellow-400">{stats.pending}</div>
                        <div className="text-xs text-zinc-500">입금 대기</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-blue-400">{stats.waitlist}</div>
                        <div className="text-xs text-zinc-500">대기자</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-red-400">{stats.cancelled}</div>
                        <div className="text-xs text-zinc-500">취소</div>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="이름, 연락처, 이메일, 팀으로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'pending', 'confirmed', 'waitlist', 'cancelled'] as FilterStatus[]).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-xl font-bold transition-colors ${filterStatus === status
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                            >
                                {status === 'all' && '전체'}
                                {status === 'pending' && '대기'}
                                {status === 'confirmed' && '확인'}
                                {status === 'waitlist' && '대기자'}
                                {status === 'cancelled' && '취소'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Participants List */}
                {filteredRegistrations.length > 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-zinc-800 text-left text-sm text-zinc-500">
                                        <th className="py-4 px-4 font-bold">이름</th>
                                        <th className="py-4 px-4 font-bold hidden sm:table-cell">연락처</th>
                                        <th className="py-4 px-4 font-bold hidden md:table-cell">띠/체급</th>
                                        <th className="py-4 px-4 font-bold hidden lg:table-cell">팀</th>
                                        <th className="py-4 px-4 font-bold">상태</th>
                                        {event.type === 'competition' && (
                                            <th className="py-4 px-4 font-bold hidden sm:table-cell">계체</th>
                                        )}
                                        <th className="py-4 px-4 font-bold">액션</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRegistrations.map((reg) => (
                                        <tr
                                            key={reg.id}
                                            className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                                        >
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-amber-400 font-bold">
                                                        {reg.participantName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">{reg.participantName}</div>
                                                        {reg.isManualEntry && (
                                                            <span className="text-xs text-zinc-500">수동 추가</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 hidden sm:table-cell">
                                                <div className="text-sm text-zinc-400">
                                                    {reg.phone || '-'}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 hidden md:table-cell">
                                                <div className="text-sm">
                                                    {reg.beltLevel && <span className="text-zinc-300">{reg.beltLevel}</span>}
                                                    {reg.beltLevel && reg.weightClass && <span className="text-zinc-600 mx-1">/</span>}
                                                    {reg.weightClass && <span className="text-zinc-400">{reg.weightClass}</span>}
                                                    {!reg.beltLevel && !reg.weightClass && <span className="text-zinc-600">-</span>}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 hidden lg:table-cell">
                                                <span className="text-sm text-zinc-400">{reg.teamName || '-'}</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <StatusBadge status={reg.paymentStatus} />
                                            </td>
                                            {event.type === 'competition' && (
                                                <td className="py-4 px-4 hidden sm:table-cell">
                                                    <WeighInBadge status={reg.weighInStatus} />
                                                </td>
                                            )}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    {reg.paymentStatus === 'pending' && (
                                                        <button
                                                            onClick={() => handleConfirmPayment(reg.id)}
                                                            className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                                                            title="입금 확인"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setShowDetailModal(reg)}
                                                        className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                                                        title="상세 보기"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-zinc-900/50 border border-zinc-800/50 border-dashed rounded-2xl p-12 text-center">
                        <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-zinc-400 mb-2">
                            {searchTerm || filterStatus !== 'all' ? '검색 결과가 없습니다' : '아직 참가자가 없습니다'}
                        </h3>
                        <p className="text-zinc-500">
                            {searchTerm || filterStatus !== 'all'
                                ? '다른 검색어나 필터를 시도해보세요'
                                : '참가자를 수동으로 추가하거나 이벤트를 공유하세요'
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* Add Participant Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-zinc-800">
                            <h2 className="text-xl font-bold">참가자 수동 추가</h2>
                            <p className="text-sm text-zinc-400 mt-1">입금 확인된 상태로 추가됩니다</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2">이름 *</label>
                                <input
                                    type="text"
                                    value={addForm.participantName}
                                    onChange={(e) => setAddForm({ ...addForm, participantName: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                                    placeholder="참가자 이름"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2">연락처</label>
                                    <input
                                        type="tel"
                                        value={addForm.phone}
                                        onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                                        placeholder="010-0000-0000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">이메일</label>
                                    <input
                                        type="email"
                                        value={addForm.email}
                                        onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2">띠</label>
                                    <select
                                        value={addForm.beltLevel}
                                        onChange={(e) => setAddForm({ ...addForm, beltLevel: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="">선택</option>
                                        {BELT_OPTIONS.map(belt => (
                                            <option key={belt} value={belt}>{belt}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">체급</label>
                                    <select
                                        value={addForm.weightClass}
                                        onChange={(e) => setAddForm({ ...addForm, weightClass: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="">선택</option>
                                        {WEIGHT_OPTIONS.map(weight => (
                                            <option key={weight} value={weight}>{weight}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2">소속 팀</label>
                                <input
                                    type="text"
                                    value={addForm.teamName}
                                    onChange={(e) => setAddForm({ ...addForm, teamName: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                                    placeholder="팀/체육관 이름"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2">주최자 메모</label>
                                <textarea
                                    value={addForm.organizerNote}
                                    onChange={(e) => setAddForm({ ...addForm, organizerNote: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 resize-none"
                                    rows={2}
                                    placeholder="내부 메모 (참가자에게 보이지 않음)"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-zinc-800 flex gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleAddParticipant}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? '추가 중...' : '추가하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-zinc-800">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold">{showDetailModal.participantName}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <StatusBadge status={showDetailModal.paymentStatus} />
                                        {showDetailModal.isManualEntry && (
                                            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
                                                수동 추가
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDetailModal(null)}
                                    className="p-2 hover:bg-zinc-800 rounded-lg"
                                >
                                    <XCircle className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Contact Info */}
                            <div className="space-y-3">
                                {showDetailModal.phone && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-zinc-500" />
                                        <a href={`tel:${showDetailModal.phone}`} className="text-amber-400">
                                            {showDetailModal.phone}
                                        </a>
                                    </div>
                                )}
                                {showDetailModal.email && (
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-4 h-4 text-zinc-500" />
                                        <a href={`mailto:${showDetailModal.email}`} className="text-amber-400">
                                            {showDetailModal.email}
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* BJJ Info */}
                            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">띠</span>
                                    <span>{showDetailModal.beltLevel || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">체급</span>
                                    <span>{showDetailModal.weightClass || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">소속</span>
                                    <span>{showDetailModal.teamName || '-'}</span>
                                </div>
                                {event?.type === 'competition' && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-zinc-500">계체</span>
                                        <WeighInBadge status={showDetailModal.weighInStatus} />
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            {showDetailModal.participantNote && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                    <div className="text-xs text-blue-400 font-bold mb-1">참가자 메모</div>
                                    <p className="text-sm">{showDetailModal.participantNote}</p>
                                </div>
                            )}

                            {showDetailModal.organizerNote && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                    <div className="text-xs text-amber-400 font-bold mb-1">주최자 메모</div>
                                    <p className="text-sm">{showDetailModal.organizerNote}</p>
                                </div>
                            )}

                            {/* Timestamps */}
                            <div className="text-xs text-zinc-500 space-y-1">
                                <div>신청일: {new Date(showDetailModal.createdAt).toLocaleString('ko-KR')}</div>
                                {showDetailModal.confirmedAt && (
                                    <div>확인일: {new Date(showDetailModal.confirmedAt).toLocaleString('ko-KR')}</div>
                                )}
                                {showDetailModal.cancelledAt && (
                                    <div>취소일: {new Date(showDetailModal.cancelledAt).toLocaleString('ko-KR')}</div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t border-zinc-800 space-y-3">
                            {showDetailModal.paymentStatus === 'pending' && (
                                <button
                                    onClick={() => handleConfirmPayment(showDetailModal.id)}
                                    disabled={actionLoading}
                                    className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    입금 확인
                                </button>
                            )}

                            {showDetailModal.paymentStatus !== 'cancelled' && (
                                <button
                                    onClick={() => handleCancelRegistration(showDetailModal.id)}
                                    disabled={actionLoading}
                                    className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    참가 취소
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
