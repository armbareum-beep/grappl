import React, { useEffect, useState } from 'react';
import { getAllUsersAdmin, promoteToCreator } from '../../lib/api';
import { Button } from '../../components/Button';
import { User, Check, Search, Shield, UserCheck } from 'lucide-react';

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
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">사용자 관리</h1>
                <p className="text-slate-600">전체 사용자 목록을 조회하고 권한을 관리합니다.</p>
            </div>

            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    placeholder="이름 또는 이메일 검색..."
                    className="pl-10 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 border"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                사용자
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                상태
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                가입일
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                관리
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                            <User className="h-6 w-6" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-slate-900">{user.name || '이름 없음'}</div>
                                            <div className="text-sm text-slate-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                        {user.is_admin && (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 w-fit">
                                                관리자
                                            </span>
                                        )}
                                        {user.is_creator && (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 w-fit">
                                                인스트럭터
                                            </span>
                                        )}
                                        {user.is_subscriber && (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 w-fit">
                                                구독자
                                            </span>
                                        )}
                                        {!user.is_admin && !user.is_creator && !user.is_subscriber && (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800 w-fit">
                                                일반
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {!user.is_creator ? (
                                        <Button
                                            onClick={() => handlePromote(user.id, user.name)}
                                            variant="outline"
                                            size="sm"
                                            className="text-blue-600 hover:text-blue-900 border-blue-200 hover:bg-blue-50"
                                        >
                                            <UserCheck className="w-4 h-4 mr-1" />
                                            인스트럭터 만들기
                                        </Button>
                                    ) : (
                                        <span className="text-slate-400 flex items-center justify-end">
                                            <Check className="w-4 h-4 mr-1" />
                                            이미 인스트럭터
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        검색 결과가 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
};
