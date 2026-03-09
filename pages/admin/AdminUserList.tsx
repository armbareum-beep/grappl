import React, { useEffect, useState } from 'react';
import { getAllUsersAdmin, promoteToCreator, grantComplimentarySubscription, extendSubscriptionComplimentary, revokeComplimentarySubscription, clearComplimentaryPeriod } from '../../lib/api';
import { registerManualPayment } from '../../lib/api-admin';
import { promoteToOrganizer } from '../../lib/api-organizers';
import { User, Search, Shield, UserCheck, ArrowLeft, Gift, X, Calendar, Plus, DollarSign, CreditCard, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal } from '../../components/common/ConfirmModal';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    is_subscriber: boolean;
    is_complimentary_subscription: boolean;
    subscription_tier: string | null;
    subscription_end_date: string | null;
    complimentary_start_date: string | null;
    complimentary_end_date: string | null;
    is_admin: boolean;
    created_at: string;
    is_creator: boolean;
    is_organizer?: boolean;
    creator_type?: 'instructor' | 'organizer' | 'both';
}

export const AdminUserList: React.FC = () => {
    const navigate = useNavigate();
    const { success, error: toastError } = useToast();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [subscriptionStartDate, setSubscriptionStartDate] = useState('');
    const [subscriptionEndDate, setSubscriptionEndDate] = useState('');
    const [subscriptionMode, setSubscriptionMode] = useState<'full' | 'extend'>('full');
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; action: () => void; title: string; message: string}>({isOpen: false, action: () => {}, title: '', message: ''});

    // Manual Payment Modal
    const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
    const [manualPaymentUser, setManualPaymentUser] = useState<AdminUser | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentCurrency, setPaymentCurrency] = useState<'USD' | 'KRW'>('KRW');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'other'>('cash');
    const [subscriptionType, setSubscriptionType] = useState<'monthly' | 'yearly'>('monthly');
    const [paymentStartDate, setPaymentStartDate] = useState('');
    const [paymentEndDate, setPaymentEndDate] = useState('');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredUsers(users);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            setFilteredUsers(users.filter(user =>
                (user.name?.toLowerCase().includes(lowerTerm) || false) ||
                (user.email?.toLowerCase().includes(lowerTerm) || false)
            ));
        }
    }, [searchTerm, users]);

    async function fetchUsers() {
        try {
            const { data, error } = await getAllUsersAdmin();

            if (error) {
                console.error('[DEBUG] Error object:', error);
                throw error;
            }

            if (data) {
                setUsers(data);
                setFilteredUsers(data);
            } else {
                console.warn('[DEBUG] No data returned');
            }
        } catch (error: any) {
            console.error('Error fetching users:', error);
            const errorMsg = error?.message || error?.error_description || error?.hint || JSON.stringify(error);
            toastError(`사용자 목록을 불러오는데 실패했습니다: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    }

    const handlePromote = async (userId: string, userName: string) => {
        setConfirmModal({
            isOpen: true,
            title: '인스트럭터 승격 확인',
            message: `'${userName}' 사용자를 인스트럭터로 승격시키겠습니까?`,
            action: async () => {
                try {
                    const result = await promoteToCreator(userId);
                    if (result?.error) throw result.error;

                    // Update local state
                    setUsers(users.map(u =>
                        u.id === userId ? { ...u, is_creator: true } : u
                    ));
                    success('인스트럭터로 승격되었습니다!');
                } catch (error) {
                    console.error('Error promoting user:', error);
                    toastError('승격 중 오류가 발생했습니다.');
                } finally {
                    setConfirmModal(prev => ({...prev, isOpen: false}));
                }
            }
        });
    };

    const handlePromoteToOrganizer = async (userId: string, userName: string) => {
        setConfirmModal({
            isOpen: true,
            title: '주최자 승격 확인',
            message: `'${userName}' 사용자를 주최자로 승격시키겠습니까? 행사 개최 권한이 부여됩니다.`,
            action: async () => {
                try {
                    const result = await promoteToOrganizer(userId);
                    if (result?.error) throw result.error;

                    // Update local state
                    setUsers(users.map(u =>
                        u.id === userId ? { ...u, is_organizer: true, creator_type: u.is_creator ? 'both' : 'organizer' } : u
                    ));
                    success('주최자로 승격되었습니다!');
                } catch (error) {
                    console.error('Error promoting to organizer:', error);
                    toastError('주최자 승격 중 오류가 발생했습니다.');
                } finally {
                    setConfirmModal(prev => ({...prev, isOpen: false}));
                }
            }
        });
    };

    const handleOpenSubscriptionModal = (user: AdminUser, mode: 'full' | 'extend' = 'full') => {
        setSelectedUser(user);
        setSubscriptionMode(mode);

        // Set default start date to today
        const today = new Date();
        setSubscriptionStartDate(today.toISOString().split('T')[0]);

        // Set default end date to 1 month from now
        const defaultEndDate = new Date();
        defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);
        setSubscriptionEndDate(defaultEndDate.toISOString().split('T')[0]);

        setShowSubscriptionModal(true);
    };

    const handleGrantSubscription = async () => {
        if (!selectedUser || !subscriptionStartDate || !subscriptionEndDate) return;

        try {
            let result;

            if (subscriptionMode === 'extend') {
                // 기존 유료 구독에 무료 기간 추가
                result = await extendSubscriptionComplimentary(
                    selectedUser.id,
                    subscriptionStartDate,
                    subscriptionEndDate
                );
            } else {
                // 전체 무료 구독 부여
                result = await grantComplimentarySubscription(
                    selectedUser.id,
                    subscriptionStartDate,
                    subscriptionEndDate
                );
            }

            if (result.error) throw result.error;

            // Update local state
            setUsers(users.map(u =>
                u.id === selectedUser.id ? {
                    ...u,
                    is_subscriber: true,
                    is_complimentary_subscription: subscriptionMode === 'full',
                    subscription_tier: 'premium',
                    subscription_end_date: subscriptionEndDate,
                    complimentary_start_date: subscriptionStartDate,
                    complimentary_end_date: subscriptionEndDate
                } : u
            ));

            if (subscriptionMode === 'extend') {
                success(`${selectedUser.name}에게 무료 기간이 추가되었습니다! (${subscriptionStartDate} ~ ${subscriptionEndDate})`);
            } else {
                success(`${selectedUser.name}에게 무료 구독이 부여되었습니다!`);
            }

            setShowSubscriptionModal(false);
            setSelectedUser(null);
        } catch (error) {
            console.error('Error granting subscription:', error);
            toastError('무료 구독 부여 중 오류가 발생했습니다.');
        }
    };

    const handleRevokeSubscription = async (userId: string, userName: string) => {
        setConfirmModal({
            isOpen: true,
            title: '무료 구독 취소 확인',
            message: `'${userName}' 사용자의 무료 구독을 취소하시겠습니까?`,
            action: async () => {
                try {
                    const { error } = await revokeComplimentarySubscription(userId);
                    if (error) throw error;

                    // Update local state
                    setUsers(users.map(u =>
                        u.id === userId ? {
                            ...u,
                            is_subscriber: false,
                            is_complimentary_subscription: false,
                            subscription_tier: null,
                            subscription_end_date: null
                        } : u
                    ));

                    success('무료 구독이 취소되었습니다.');
                } catch (error) {
                    console.error('Error revoking subscription:', error);
                    toastError('무료 구독 취소 중 오류가 발생했습니다.');
                } finally {
                    setConfirmModal(prev => ({...prev, isOpen: false}));
                }
            }
        });
    };

    const handleOpenManualPaymentModal = (user: AdminUser) => {
        setManualPaymentUser(user);
        setPaymentAmount('');
        setPaymentCurrency('KRW');
        setPaymentMethod('cash');
        setSubscriptionType('monthly');

        const today = new Date();
        setPaymentStartDate(today.toISOString().split('T')[0]);

        const defaultEndDate = new Date();
        defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);
        setPaymentEndDate(defaultEndDate.toISOString().split('T')[0]);

        setShowManualPaymentModal(true);
    };

    const handleSubscriptionTypeChange = (type: 'monthly' | 'yearly') => {
        setSubscriptionType(type);
        // 종료일 자동 계산
        if (paymentStartDate) {
            const start = new Date(paymentStartDate);
            const end = new Date(start);
            if (type === 'yearly') {
                end.setFullYear(end.getFullYear() + 1);
            } else {
                end.setMonth(end.getMonth() + 1);
            }
            setPaymentEndDate(end.toISOString().split('T')[0]);
        }
    };

    const handleRegisterManualPayment = async () => {
        if (!manualPaymentUser || !paymentAmount || !paymentStartDate || !paymentEndDate) {
            toastError('모든 필드를 입력해주세요.');
            return;
        }

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toastError('올바른 금액을 입력해주세요.');
            return;
        }

        setIsProcessingPayment(true);
        try {
            const result = await registerManualPayment({
                userId: manualPaymentUser.id,
                amount,
                currency: paymentCurrency,
                paymentMethod,
                subscriptionType,
                subscriptionStartDate: paymentStartDate,
                subscriptionEndDate: paymentEndDate
            });

            if (result.error) throw new Error(result.error);

            // Update local state
            setUsers(users.map(u =>
                u.id === manualPaymentUser.id ? {
                    ...u,
                    is_subscriber: true,
                    is_complimentary_subscription: false,
                    subscription_tier: 'premium',
                    subscription_end_date: paymentEndDate
                } : u
            ));

            success(`${manualPaymentUser.name}님의 유료 구독이 등록되었습니다! (${paymentCurrency} ${amount.toLocaleString()})`);
            setShowManualPaymentModal(false);
            setManualPaymentUser(null);
        } catch (error: any) {
            console.error('Error registering manual payment:', error);
            toastError('결제 등록 중 오류가 발생했습니다: ' + (error.message || ''));
        } finally {
            setIsProcessingPayment(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 gap-4">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Accessing User Database...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            {/* Header Section */}
            <div className="relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-violet-600/10 blur-[100px] -z-10" />
                <div className="absolute top-0 left-0 w-[300px] h-[200px] bg-emerald-600/5 blur-[100px] -z-10" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-all group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">뒤로가기</span>
                    </button>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black tracking-tighter text-white">커뮤니티 사용자 관리</h1>
                            <p className="text-zinc-400 max-w-2xl text-lg leading-relaxed">
                                플랫폼의 모든 사용자를 통합 관리하고 적절한 권한을 부여합니다.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 px-6 py-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl backdrop-blur-xl">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Records: {users.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Search Header */}
                <div className="mb-10 relative group">
                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-zinc-600 group-focus-within:text-violet-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search users by name, email, or credentials..."
                        className="w-full pl-16 pr-8 py-5 bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] text-white placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/40 backdrop-blur-xl transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Table Container */}
                <div className="hidden md:block bg-zinc-900/20 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-800/50">
                            <thead>
                                <tr className="bg-zinc-900/50">
                                    <th scope="col" className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        Identity & Records
                                    </th>
                                    <th scope="col" className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        Access & Permissions
                                    </th>
                                    <th scope="col" className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        Enrolment Date
                                    </th>
                                    <th scope="col" className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        Governance
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/30">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="group hover:bg-zinc-800/20 transition-all">
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="flex items-center gap-5 group/user cursor-pointer" onClick={() => navigate(`/admin/users/${user.id}`)}>
                                                <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover/user:border-violet-500/30 group-hover/user:bg-violet-500/5 transition-all shadow-sm">
                                                    <User className="h-7 w-7 group-hover/user:text-violet-400 transition-colors" />
                                                </div>
                                                <div>
                                                    <div className="text-base font-extrabold text-white group-hover/user:text-violet-300 transition-colors">
                                                        {user.name || 'Anonymous Warrior'}
                                                    </div>
                                                    <div className="text-sm text-zinc-500 font-medium">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="flex flex-wrap gap-2">
                                                {user.is_admin && (
                                                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-sm">
                                                        Administrator
                                                    </span>
                                                )}
                                                {user.is_creator && (
                                                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                                                        Instructor
                                                    </span>
                                                )}
                                                {(user.is_organizer || user.creator_type === 'organizer' || user.creator_type === 'both') && (
                                                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
                                                        <Flag className="w-3 h-3 mr-1" />
                                                        Organizer
                                                    </span>
                                                )}
                                                {user.is_complimentary_subscription && (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-pink-500/10 text-pink-400 border border-pink-500/20 shadow-sm">
                                                            <Gift className="w-3 h-3 mr-1.5" />
                                                            무료 구독
                                                        </span>
                                                        {user.subscription_end_date && (
                                                            <span className="text-[9px] text-zinc-600 font-medium">
                                                                만료: {new Date(user.subscription_end_date).toLocaleDateString('ko-KR')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {user.is_subscriber && !user.is_complimentary_subscription && (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
                                                            Premium Member
                                                        </span>
                                                        {user.complimentary_start_date && user.complimentary_end_date && (
                                                            <span className="text-[9px] text-cyan-400 font-medium">
                                                                무료기간: {user.complimentary_start_date} ~ {user.complimentary_end_date}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {!user.is_admin && !user.is_creator && !user.is_subscriber && (
                                                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-800/50 text-zinc-500 border border-zinc-800 shadow-sm font-medium">
                                                        Standard User
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="text-sm font-bold text-zinc-500">
                                                {new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="grid grid-cols-2 gap-2 min-w-[280px]">
                                                {/* 구독 관리 */}
                                                {user.is_complimentary_subscription ? (
                                                    <button
                                                        onClick={() => handleRevokeSubscription(user.id, user.name)}
                                                        className="flex flex-col items-center gap-1 p-3 bg-red-600/10 text-red-400 rounded-xl hover:bg-red-600/20 transition-all border border-red-500/30"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        <span className="text-[9px] font-bold">구독 취소</span>
                                                    </button>
                                                ) : user.is_subscriber ? (
                                                    <button
                                                        onClick={() => handleOpenSubscriptionModal(user, 'extend')}
                                                        className="flex flex-col items-center gap-1 p-3 bg-cyan-600/10 text-cyan-400 rounded-xl hover:bg-cyan-600/20 transition-all border border-cyan-500/30"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        <span className="text-[9px] font-bold">무료 추가</span>
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenManualPaymentModal(user)}
                                                            className="flex flex-col items-center gap-1 p-3 bg-emerald-600/10 text-emerald-400 rounded-xl hover:bg-emerald-600/20 transition-all border border-emerald-500/30"
                                                        >
                                                            <CreditCard className="w-4 h-4" />
                                                            <span className="text-[9px] font-bold">유료 등록</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenSubscriptionModal(user, 'full')}
                                                            className="flex flex-col items-center gap-1 p-3 bg-pink-600/10 text-pink-400 rounded-xl hover:bg-pink-600/20 transition-all border border-pink-500/30"
                                                        >
                                                            <Gift className="w-4 h-4" />
                                                            <span className="text-[9px] font-bold">무료 구독</span>
                                                        </button>
                                                    </>
                                                )}

                                                {/* 인스트럭터 */}
                                                {!user.is_creator ? (
                                                    <button
                                                        onClick={() => handlePromote(user.id, user.name)}
                                                        className="flex flex-col items-center gap-1 p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-all border border-violet-500/30"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                        <span className="text-[9px] font-bold">인스트럭터</span>
                                                    </button>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1 p-3 bg-zinc-900 border border-emerald-500/30 rounded-xl text-emerald-500/80">
                                                        <Shield className="w-4 h-4" />
                                                        <span className="text-[9px] font-bold">인스트럭터</span>
                                                    </div>
                                                )}

                                                {/* 주최자 */}
                                                {!(user.is_organizer || user.creator_type === 'organizer' || user.creator_type === 'both') ? (
                                                    <button
                                                        onClick={() => handlePromoteToOrganizer(user.id, user.name)}
                                                        className="flex flex-col items-center gap-1 p-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all border border-amber-500/30"
                                                    >
                                                        <Flag className="w-4 h-4" />
                                                        <span className="text-[9px] font-bold">주최자</span>
                                                    </button>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1 p-3 bg-zinc-900 border border-amber-500/30 rounded-xl text-amber-500/80">
                                                        <Flag className="w-4 h-4" />
                                                        <span className="text-[9px] font-bold">주최자</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredUsers.length === 0 && (
                        <div className="text-center py-32">
                            <div className="w-20 h-20 bg-zinc-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800">
                                <Search className="w-10 h-10 text-zinc-800" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-500">No matching personnel found</h3>
                            <p className="text-zinc-700 text-sm mt-2">Adjust your search parameters to find the users you're looking for.</p>
                        </div>
                    )}
                </div>

                {/* Mobile View - Card List */}
                <div className="md:hidden space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-16 bg-zinc-900/40 rounded-[2rem] border border-zinc-800/50">
                            <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-zinc-500">사용자를 찾을 수 없습니다</h3>
                            <p className="text-zinc-600 text-sm mt-2 px-4">검색 조건을 변경해보세요.</p>
                        </div>
                    ) : (
                        filteredUsers.map((user) => (
                            <div key={user.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6 backdrop-blur-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4 group/mobile-user" onClick={() => navigate(`/admin/users/${user.id}`)}>
                                        <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 shadow-sm">
                                            <User className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="text-lg font-extrabold text-white mb-0.5">{user.name || 'Anonymous'}</div>
                                            <div className="text-xs text-zinc-500 font-medium">{user.email}</div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pt-1.5">
                                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-6">
                                    {user.is_admin && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                            Administrator
                                        </span>
                                    )}
                                    {user.is_creator && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            Instructor
                                        </span>
                                    )}
                                    {(user.is_organizer || user.creator_type === 'organizer' || user.creator_type === 'both') && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            <Flag className="w-3 h-3 mr-1" /> Organizer
                                        </span>
                                    )}
                                    {user.is_complimentary_subscription && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-pink-500/10 text-pink-400 border border-pink-500/20">
                                            <Gift className="w-3 h-3 mr-1.5" /> 무료 구독
                                        </span>
                                    )}
                                    {user.is_subscriber && !user.is_complimentary_subscription && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            Premium
                                        </span>
                                    )}
                                    {!user.is_admin && !user.is_creator && !user.is_subscriber && (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-800/50 text-zinc-500 border border-zinc-800">
                                            Standard
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {user.is_complimentary_subscription ? (
                                        <button
                                            onClick={() => handleRevokeSubscription(user.id, user.name)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 active:scale-95 transition-transform"
                                        >
                                            <X className="w-3 h-3" /> 구독 취소
                                        </button>
                                    ) : user.is_subscriber ? (
                                        <button
                                            onClick={() => handleOpenSubscriptionModal(user, 'extend')}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500/10 text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-500/20 active:scale-95 transition-transform"
                                        >
                                            <Plus className="w-3 h-3" /> 무료 추가
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleOpenManualPaymentModal(user)}
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 active:scale-95 transition-transform"
                                            >
                                                <CreditCard className="w-3 h-3" /> 유료 등록
                                            </button>
                                            <button
                                                onClick={() => handleOpenSubscriptionModal(user, 'full')}
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-pink-500/10 text-pink-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-pink-500/20 active:scale-95 transition-transform"
                                            >
                                                <Gift className="w-3 h-3" /> 무료 구독
                                            </button>
                                        </>
                                    )}

                                    {!user.is_creator ? (
                                        <button
                                            onClick={() => handlePromote(user.id, user.name)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-violet-500/30 shadow-lg shadow-violet-500/20 active:scale-95 transition-transform"
                                        >
                                            <UserCheck className="w-3 h-3" /> 인스트럭터
                                        </button>
                                    ) : (
                                        <div className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-950 text-emerald-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-800">
                                            <Shield className="w-3 h-3" /> Instructor
                                        </div>
                                    )}

                                    {!(user.is_organizer || user.creator_type === 'organizer' || user.creator_type === 'both') ? (
                                        <button
                                            onClick={() => handlePromoteToOrganizer(user.id, user.name)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-500/30 shadow-lg shadow-amber-500/20 active:scale-95 transition-transform"
                                        >
                                            <Flag className="w-3 h-3" /> 주최자
                                        </button>
                                    ) : (
                                        <div className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-950 text-amber-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-800">
                                            <Flag className="w-3 h-3" /> Organizer
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Subscription Modal */}
            {showSubscriptionModal && selectedUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-white">
                                {subscriptionMode === 'extend' ? '무료 기간 추가' : '무료 구독 부여'}
                            </h2>
                            <button
                                onClick={() => setShowSubscriptionModal(false)}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <p className="text-zinc-400 mb-2">사용자</p>
                                <p className="text-white font-bold text-lg">{selectedUser.name}</p>
                                <p className="text-zinc-500 text-sm">{selectedUser.email}</p>
                                {subscriptionMode === 'extend' && selectedUser.subscription_end_date && (
                                    <p className="text-amber-400 text-xs mt-2">
                                        현재 구독 만료: {new Date(selectedUser.subscription_end_date).toLocaleDateString('ko-KR')}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-zinc-400 mb-2 font-medium">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        시작일
                                    </label>
                                    <input
                                        type="date"
                                        value={subscriptionStartDate}
                                        onChange={(e) => setSubscriptionStartDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-zinc-400 mb-2 font-medium">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        종료일
                                    </label>
                                    <input
                                        type="date"
                                        value={subscriptionEndDate}
                                        onChange={(e) => setSubscriptionEndDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition-all"
                                        min={subscriptionStartDate}
                                    />
                                </div>
                            </div>

                            {subscriptionMode === 'extend' ? (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <Plus className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-amber-400 font-bold text-sm mb-1">무료 기간 추가</p>
                                            <ul className="text-zinc-400 text-xs space-y-1">
                                                <li>• 기존 유료 구독 상태 유지</li>
                                                <li>• <strong className="text-amber-300">지정 기간만</strong> 정산에서 제외</li>
                                                <li>• 유료 결제 기간은 정상 정산됨</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <Gift className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-pink-400 font-bold text-sm mb-1">전체 무료 구독</p>
                                            <ul className="text-zinc-400 text-xs space-y-1">
                                                <li>• 모든 프리미엄 콘텐츠 무제한 접근</li>
                                                <li>• <strong className="text-pink-300">전체 시청 기록</strong> 정산에서 제외</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSubscriptionModal(false)}
                                    className="flex-1 px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleGrantSubscription}
                                    className={`flex-1 px-6 py-3 text-white rounded-xl font-bold transition-all ${
                                        subscriptionMode === 'extend'
                                            ? 'bg-amber-600 hover:bg-amber-700 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                                            : 'bg-pink-600 hover:bg-pink-700 shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                                    }`}
                                >
                                    {subscriptionMode === 'extend' ? '기간 추가' : '부여하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Payment Modal */}
            {showManualPaymentModal && manualPaymentUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <CreditCard className="w-6 h-6 text-emerald-400" />
                                유료 구독 등록
                            </h2>
                            <button
                                onClick={() => setShowManualPaymentModal(false)}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <p className="text-zinc-400 mb-2">사용자</p>
                                <p className="text-white font-bold text-lg">{manualPaymentUser.name}</p>
                                <p className="text-zinc-500 text-sm">{manualPaymentUser.email}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-zinc-400 mb-2 font-medium">
                                        <DollarSign className="w-4 h-4 inline mr-1" />
                                        결제 금액
                                    </label>
                                    <input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-zinc-400 mb-2 font-medium">통화</label>
                                    <select
                                        value={paymentCurrency}
                                        onChange={(e) => setPaymentCurrency(e.target.value as 'USD' | 'KRW')}
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                    >
                                        <option value="KRW">KRW (원)</option>
                                        <option value="USD">USD ($)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-zinc-400 mb-2 font-medium">결제 방법</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank_transfer' | 'other')}
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                    >
                                        <option value="cash">현금</option>
                                        <option value="bank_transfer">계좌이체</option>
                                        <option value="other">기타</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-zinc-400 mb-2 font-medium">구독 타입</label>
                                    <select
                                        value={subscriptionType}
                                        onChange={(e) => handleSubscriptionTypeChange(e.target.value as 'monthly' | 'yearly')}
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                    >
                                        <option value="monthly">1개월권</option>
                                        <option value="yearly">1년권</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-zinc-400 mb-2 font-medium">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        시작일
                                    </label>
                                    <input
                                        type="date"
                                        value={paymentStartDate}
                                        onChange={(e) => setPaymentStartDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-zinc-400 mb-2 font-medium">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        만료일
                                    </label>
                                    <input
                                        type="date"
                                        value={paymentEndDate}
                                        onChange={(e) => setPaymentEndDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                        min={paymentStartDate}
                                    />
                                </div>
                            </div>

                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <CreditCard className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-emerald-400 font-bold text-sm mb-1">
                                            {subscriptionType === 'yearly' ? '1년권 유료 구독' : '1개월권 유료 구독'}
                                        </p>
                                        <ul className="text-zinc-400 text-xs space-y-1">
                                            <li>• 사용자가 <strong className="text-emerald-300">유료 구독자</strong>로 설정됩니다</li>
                                            {subscriptionType === 'yearly' ? (
                                                <li>• 정산: <strong className="text-emerald-300">12개월로 나눠서</strong> 매월 정산에 반영</li>
                                            ) : (
                                                <li>• 정산: 해당 월 정산에 <strong className="text-emerald-300">전액 반영</strong></li>
                                            )}
                                            {paymentAmount && (
                                                <li className="text-emerald-300 font-medium">
                                                    → 월 {(parseFloat(paymentAmount) / (subscriptionType === 'yearly' ? 12 : 1)).toLocaleString()}원 정산 반영
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowManualPaymentModal(false)}
                                    className="flex-1 px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all"
                                    disabled={isProcessingPayment}
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleRegisterManualPayment}
                                    disabled={isProcessingPayment || !paymentAmount}
                                    className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessingPayment ? '처리 중...' : '등록하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
                onConfirm={confirmModal.action}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="warning"
            />
        </div>
    );
};
