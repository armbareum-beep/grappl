import React, { useEffect, useState } from 'react';
import { getAllUsersAdmin, promoteToCreator, grantComplimentarySubscription, revokeComplimentarySubscription } from '../../lib/api';
import { User, Search, Shield, UserCheck, ArrowLeft, Gift, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    is_subscriber: boolean;
    is_complimentary_subscription: boolean;
    subscription_tier: string | null;
    subscription_end_date: string | null;
    is_admin: boolean;
    created_at: string;
    is_creator: boolean;
}

export const AdminUserList: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [subscriptionEndDate, setSubscriptionEndDate] = useState('');

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
            console.log('[DEBUG] Fetching users...');
            const { data, error } = await getAllUsersAdmin();
            console.log('[DEBUG] Response:', { data, error });

            if (error) {
                console.error('[DEBUG] Error object:', error);
                throw error;
            }

            if (data) {
                console.log('[DEBUG] Users count:', data.length);
                setUsers(data);
                setFilteredUsers(data);
            } else {
                console.warn('[DEBUG] No data returned');
            }
        } catch (error: any) {
            console.error('Error fetching users:', error);
            const errorMsg = error?.message || error?.error_description || error?.hint || JSON.stringify(error);
            alert(`사용자 목록을 불러오는데 실패했습니다.\n\n에러: ${errorMsg}\n\nCode: ${error?.code || 'N/A'}`);
        } finally {
            setLoading(false);
        }
    }

    const handlePromote = async (userId: string, userName: string) => {
        if (!window.confirm(`'${userName}' 사용자를 인스트럭터로 승격시키겠습니까?`)) return;

        try {
            const result = await promoteToCreator(userId);
            if (result?.error) throw result.error;

            // Update local state
            setUsers(users.map(u =>
                u.id === userId ? { ...u, is_creator: true } : u
            ));
            alert('인스트럭터로 승격되었습니다! 🎉');
        } catch (error) {
            console.error('Error promoting user:', error);
            alert('승격 중 오류가 발생했습니다.');
        }
    };

    const handleOpenSubscriptionModal = (user: AdminUser) => {
        setSelectedUser(user);
        // Set default end date to 1 month from now
        const defaultEndDate = new Date();
        defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);
        setSubscriptionEndDate(defaultEndDate.toISOString().split('T')[0]);
        setShowSubscriptionModal(true);
    };

    const handleGrantSubscription = async () => {
        if (!selectedUser || !subscriptionEndDate) return;

        try {
            const endDateTime = new Date(subscriptionEndDate);
            endDateTime.setHours(23, 59, 59, 999);

            const { error } = await grantComplimentarySubscription(
                selectedUser.id,
                endDateTime.toISOString()
            );

            if (error) throw error;

            // Update local state
            setUsers(users.map(u =>
                u.id === selectedUser.id ? {
                    ...u,
                    is_subscriber: true,
                    is_complimentary_subscription: true,
                    subscription_tier: 'premium',
                    subscription_end_date: endDateTime.toISOString()
                } : u
            ));

            alert(`${selectedUser.name}에게 무료 구독이 부여되었습니다! 🎉`);
            setShowSubscriptionModal(false);
            setSelectedUser(null);
        } catch (error) {
            console.error('Error granting subscription:', error);
            alert('무료 구독 부여 중 오류가 발생했습니다.');
        }
    };

    const handleRevokeSubscription = async (userId: string, userName: string) => {
        if (!window.confirm(`'${userName}' 사용자의 무료 구독을 취소하시겠습니까?`)) return;

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

            alert('무료 구독이 취소되었습니다.');
        } catch (error) {
            console.error('Error revoking subscription:', error);
            alert('무료 구독 취소 중 오류가 발생했습니다.');
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
                                                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
                                                        Premium Member
                                                    </span>
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
                                        <td className="px-8 py-6 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Complimentary Subscription Button */}
                                                {user.is_complimentary_subscription ? (
                                                    <button
                                                        onClick={() => handleRevokeSubscription(user.id, user.name)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/10 text-red-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600/20 transition-all border border-red-500/30"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                        구독 취소
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleOpenSubscriptionModal(user)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600/10 text-pink-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-pink-600/20 transition-all border border-pink-500/30"
                                                    >
                                                        <Gift className="w-3.5 h-3.5" />
                                                        무료 구독 부여
                                                    </button>
                                                )}

                                                {/* Promote to Instructor Button */}
                                                {!user.is_creator ? (
                                                    <button
                                                        onClick={() => handlePromote(user.id, user.name)}
                                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-violet-700 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] border border-violet-500/30"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                        Promote to Instructor
                                                    </button>
                                                ) : (
                                                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-500/60">
                                                        <Shield className="w-3.5 h-3.5" />
                                                        Authorised Instructor
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
                                    ) : (
                                        <button
                                            onClick={() => handleOpenSubscriptionModal(user)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-pink-500/10 text-pink-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-pink-500/20 active:scale-95 transition-transform"
                                        >
                                            <Gift className="w-3 h-3" /> 무료 구독
                                        </button>
                                    )}

                                    {!user.is_creator ? (
                                        <button
                                            onClick={() => handlePromote(user.id, user.name)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-violet-500/30 shadow-lg shadow-violet-500/20 active:scale-95 transition-transform"
                                        >
                                            <UserCheck className="w-3 h-3" /> 승격
                                        </button>
                                    ) : (
                                        <div className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-950 text-emerald-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-800">
                                            <Shield className="w-3 h-3" /> Authorized
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
                            <h2 className="text-2xl font-black text-white">무료 구독 부여</h2>
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
                            </div>

                            <div>
                                <label className="block text-zinc-400 mb-2 font-medium">
                                    구독 만료일
                                </label>
                                <input
                                    type="date"
                                    value={subscriptionEndDate}
                                    onChange={(e) => setSubscriptionEndDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition-all"
                                    min={new Date().toISOString().split('T')[0]}
                                />
                                <p className="text-zinc-600 text-xs mt-2">
                                    선택한 날짜의 23:59:59까지 구독이 유효합니다
                                </p>
                            </div>

                            <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <Gift className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-pink-400 font-bold text-sm mb-1">무료 구독 혜택</p>
                                        <ul className="text-zinc-400 text-xs space-y-1">
                                            <li>• 모든 프리미엄 콘텐츠 무제한 접근</li>
                                            <li>• 시청 기록은 정산에서 제외됩니다</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSubscriptionModal(false)}
                                    className="flex-1 px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-all"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleGrantSubscription}
                                    className="flex-1 px-6 py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                                >
                                    부여하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
