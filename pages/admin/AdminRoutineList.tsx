import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRoutines, deleteRoutine } from '../../lib/api-admin';
import { DrillRoutine, Difficulty } from '../../types';
import { Button } from '../../components/Button';
import { Trash2, Eye, Search, Plus, ArrowLeft, Activity } from 'lucide-react';

export const AdminRoutineList: React.FC = () => {
    const navigate = useNavigate();
    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRoutines();
    }, []);

    async function fetchRoutines() {
        try {
            const data = await getRoutines();
            setRoutines(data);
        } catch (error) {
            console.error('Error fetching routines:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (routineId: string) => {
        if (!window.confirm('정말로 이 루틴을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            const { error } = await deleteRoutine(routineId);
            if (error) throw error;

            setRoutines(routines.filter(r => r.id !== routineId));
            alert('루틴이 삭제되었습니다.');
        } catch (error) {
            console.error('Error deleting routine:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const filteredRoutines = routines.filter(routine =>
        routine.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (routine.description && routine.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
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
                        <h1 className="text-3xl font-bold">루틴 관리</h1>
                        <p className="text-slate-400">등록된 훈련 루틴을 관리합니다.</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Link to="/routines/new">
                            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white w-full md:w-auto">
                                <Plus className="w-4 h-4 mr-2" />
                                새 루틴 생성
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="루틴 제목, 설명 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>

                {/* Table */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">루틴 정보</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">구성</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">난이도</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">가격</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredRoutines.length > 0 ? (
                                    filteredRoutines.map((routine) => (
                                        <tr key={routine.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400">
                                                        <Activity className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white">{routine.title}</div>
                                                        <div className="text-xs text-slate-400 line-clamp-1">{routine.description}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400">
                                                {routine.drills?.length || 0}개의 드릴
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                    ${routine.difficulty === Difficulty.Beginner ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                        routine.difficulty === Difficulty.Intermediate ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                            'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                    {routine.difficulty}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-white">
                                                {routine.price ? `₩${routine.price.toLocaleString()}` : '무료'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link to={`/routines/${routine.id}`}>
                                                        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(routine.id)}
                                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            검색 결과가 없습니다.
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
