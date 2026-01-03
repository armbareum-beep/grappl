import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTournaments, deleteTournament } from '../../lib/api-admin';
import { Tournament } from '../../types';
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 gap-4">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading Tournaments...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-violet-600/10 blur-[100px] -z-10" />
                <div className="absolute top-0 left-0 w-[300px] h-[200px] bg-amber-600/5 blur-[100px] -z-10" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                        <div className="space-y-4">
                            <button
                                onClick={() => navigate('/admin')}
                                className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-sm font-medium">대시보드로 돌아가기</span>
                            </button>
                            <div className="space-y-2">
                                <h1 className="text-4xl font-black tracking-tighter text-white">토너먼트 관리</h1>
                                <p className="text-zinc-400 max-w-2xl text-lg leading-relaxed">
                                    커뮤니티의 축제인 토너먼트를 기획하고 진행 상황을 관리합니다.
                                </p>
                            </div>
                        </div>
                        <Link to="/admin/tournaments/new" className="w-full md:w-auto">
                            <button className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-violet-700 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-violet-500/30">
                                <Plus className="w-4 h-4" />
                                새 토너먼트 생성
                            </button>
                        </Link>
                    </div>

                    {/* Search & Stats Header */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="md:col-span-3 relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 w-5 h-5 group-focus-within:text-violet-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="토너먼트 제목, 개최 장소로 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/40 backdrop-blur-xl transition-all"
                            />
                        </div>
                        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 flex items-center justify-center gap-3 backdrop-blur-xl">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <span className="text-sm font-black text-white">{tournaments.length}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Total Events</span>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="bg-zinc-900/20 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-800/50">
                                        <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">Tournament Index</th>
                                        <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">Schedule / Location</th>
                                        <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">Participants</th>
                                        <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</th>
                                        <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">Management</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/30 font-medium">
                                    {filteredTournaments.length > 0 ? (
                                        filteredTournaments.map((tournament) => (
                                            <tr key={tournament.id} className="group hover:bg-zinc-800/20 transition-all">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:border-violet-500/30 group-hover:bg-violet-500/5 transition-all">
                                                            <Trophy className="w-6 h-6 group-hover:text-violet-400 transition-colors" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="text-base font-extrabold text-white group-hover:text-violet-300 transition-colors">{tournament.title}</div>
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Format: {tournament.format}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                            <Calendar className="w-3.5 h-3.5 text-violet-500/50" />
                                                            {new Date(tournament.startDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-zinc-600">
                                                            <MapPin className="w-3 h-3" />
                                                            {tournament.location}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                            <span className="text-zinc-500">Capacity</span>
                                                            <span className="text-white">{Math.round((tournament.currentParticipants / tournament.maxParticipants) * 100)}%</span>
                                                        </div>
                                                        <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all duration-1000"
                                                                style={{ width: `${(tournament.currentParticipants / tournament.maxParticipants) * 100}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-bold">
                                                            <Users className="w-3 h-3 text-zinc-600" />
                                                            <span>{tournament.currentParticipants} 명 / {tournament.maxParticipants} 명</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm
                                                        ${tournament.status === 'registration_open' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            tournament.status === 'upcoming' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                tournament.status === 'in_progress' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                                                                    'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                                                        {tournament.status === 'registration_open' ? 'REGISTRATION OPEN' :
                                                            tournament.status === 'upcoming' ? 'UPCOMING EVENT' :
                                                                tournament.status === 'in_progress' ? 'LIVE NOW' :
                                                                    tournament.status === 'completed' ? 'COMPLETED' : 'CANCELLED'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button
                                                        onClick={() => handleDelete(tournament.id)}
                                                        className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-white hover:bg-rose-600 hover:border-rose-500 rounded-2xl transition-all shadow-sm group-hover:translate-x-[-4px]"
                                                        title="Delete Event"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-32 text-center">
                                                <div className="flex flex-col items-center justify-center gap-6">
                                                    <div className="p-6 bg-zinc-900/50 rounded-full border border-zinc-800">
                                                        <Trophy className="w-12 h-12 text-zinc-700 opacity-30" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-zinc-500 font-bold">진행 중인 토너먼트가 없습니다.</p>
                                                        <p className="text-zinc-700 text-xs">새 토너먼트를 생성하여 커뮤니티 성장을 이끄세요.</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
