import React, { useEffect, useState } from 'react';
import { getAllUsersAdmin, promoteToCreator } from '../../lib/api';
import { User, Search, Shield, UserCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    is_subscriber: boolean;
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
            if (error) throw error;
            if (data) {
                setUsers(data);
                setFilteredUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('사용자 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }

    const handlePromote = async (userId: string, userName: string) => {
        if (!window.confirm(`'${userName}' 사용자를 인스트럭터로 승격시키겠습니까?`)) return;

        try {
            const { error } = await promoteToCreator(userId);
            if (error) throw error;

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
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-all group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">대시보드로 돌아가기</span>
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
                <div className="bg-zinc-900/20 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:border-violet-500/30 group-hover:bg-violet-500/5 transition-all shadow-sm">
                                                    <User className="h-7 w-7 group-hover:text-violet-400 transition-colors" />
                                                </div>
                                                <div>
                                                    <div className="text-base font-extrabold text-white group-hover:text-violet-300 transition-colors">
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
                                                {user.is_subscriber && (
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
            </div>
        </div>
    );
};
