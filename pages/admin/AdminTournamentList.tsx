import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTournaments, deleteTournament } from '../../lib/api-admin';
import { Tournament } from '../../types';
import { Button } from '../../components/Button';
import { Search, ArrowLeft, Trophy, Calendar, MapPin, Users, Plus, Trash2 } from 'lucide-react';

export const AdminTournamentList: React.FC = () => {
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTournaments();
    }, []);

    async function fetchTournaments() {
        try {
            const data = await getTournaments();
            setTournaments(data);
        } catch (error) {
            console.error('Error fetching tournaments:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (tournamentId: string) => {
        if (!window.confirm('정말로 이 토너먼트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            const { error } = await deleteTournament(tournamentId);
            if (error) throw error;

            setTournaments(tournaments.filter(t => t.id !== tournamentId));
            alert('토너먼트가 삭제되었습니다.');
        } catch (error) {
            console.error('Error deleting tournament:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const filteredTournaments = tournaments.filter(tournament =>
        tournament.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tournament.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex items-center gap-2 text-slate-400 hover:text-white mb-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>대시보드로 돌아가기</span>
                        </button>
                        <h1 className="text-3xl font-bold">토너먼트 관리</h1>
                        <p className="text-slate-400">개최 예정 및 진행 중인 토너먼트를 관리합니다.</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Link to="/admin/tournaments/new">
                            <Button className="bg-yellow-600 hover:bg-yellow-700 text-white w-full md:w-auto">
                                <Plus className="w-4 h-4 mr-2" />
                                새 토너먼트 생성
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="토너먼트 이름, 장소 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                </div>

                {/* Table */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">토너먼트 정보</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">일정/장소</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">참가자</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">상태</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredTournaments.length > 0 ? (
                                    filteredTournaments.map((tournament) => (
                                        <tr key={tournament.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center text-yellow-400">
                                                        <Trophy className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white">{tournament.title}</div>
                                                        <div className="text-xs text-slate-400">{tournament.format}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(tournament.startDate).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <MapPin className="w-3 h-3" />
                                                        {tournament.location}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                                    <Users className="w-4 h-4" />
                                                    {tournament.currentParticipants} / {tournament.maxParticipants}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                    ${tournament.status === 'registration_open' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                        tournament.status === 'upcoming' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                            tournament.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                                'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                                    {tournament.status === 'registration_open' ? '접수중' :
                                                        tournament.status === 'upcoming' ? '예정' :
                                                            tournament.status === 'in_progress' ? '진행중' :
                                                                tournament.status === 'completed' ? '종료' : '취소됨'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(tournament.id)}
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            등록된 토너먼트가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
