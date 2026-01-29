import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRoutines, deleteRoutine } from '../../lib/api-admin';
import { DrillRoutine, Difficulty } from '../../types';
import { Trash2, Eye, Search, Plus, ArrowLeft, Activity, Edit } from 'lucide-react';

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
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 gap-4">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading Routines Data...</p>
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
                            <h1 className="text-4xl font-black tracking-tighter text-white">커리큘럼 루틴 관리</h1>
                            <p className="text-zinc-400 max-w-2xl text-lg leading-relaxed">
                                트레이닝 루틴과 시퀀스를 구성하고 전체 인벤토리를 관리합니다.
                            </p>
                        </div>
                        <Link to="/routines/new" className="group">
                            <button className="flex items-center gap-2 px-8 py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-violet-700 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-violet-500/30">
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                                Create New Routine
                            </button>
                        </Link>
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
                        placeholder="Search routines by title, description or attributes..."
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
                                        Routine Sequence
                                    </th>
                                    <th scope="col" className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        Content Structure
                                    </th>
                                    <th scope="col" className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        Intensity Level
                                    </th>
                                    <th scope="col" className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        Pricing
                                    </th>
                                    <th scope="col" className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/30">
                                {filteredRoutines.map((routine) => (
                                    <tr key={routine.id} className="group hover:bg-zinc-800/20 transition-all">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center text-zinc-400 group-hover:border-violet-500/30 group-hover:bg-violet-500/5 transition-all shadow-sm">
                                                    {(routine as any).thumbnailUrl || (routine as any).thumbnail_url ? (
                                                        <img src={(routine as any).thumbnailUrl || (routine as any).thumbnail_url} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <Activity className="h-7 w-7 group-hover:text-violet-400 transition-colors" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-base font-extrabold text-white group-hover:text-violet-300 transition-colors truncate max-w-[300px]">
                                                        {routine.title}
                                                    </div>
                                                    <div className="text-sm text-zinc-500 font-medium truncate max-w-[300px]">
                                                        {routine.description || 'No detailed description provided.'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                                {routine.drills?.length || 0} Drills Included
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm
                                                ${routine.difficulty === Difficulty.Beginner ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    routine.difficulty === Difficulty.Intermediate ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                                                        'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                {routine.difficulty}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            {routine.price === 0 ? (
                                                <div className="text-sm font-black text-emerald-400 uppercase tracking-widest">
                                                    Free Access
                                                </div>
                                            ) : (
                                                <div className="text-sm font-extrabold text-white">
                                                    ₩{routine.price?.toLocaleString() || 0}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link to={`/routines/${routine.id}`}>
                                                    <button className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white hover:border-zinc-700 transition-all">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                                <Link to={`/creator/routines/${routine.id}/edit`}>
                                                    <button className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(routine.id)}
                                                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-500 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredRoutines.length === 0 && (
                        <div className="text-center py-32">
                            <div className="w-20 h-20 bg-zinc-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800">
                                <Search className="w-10 h-10 text-zinc-800" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-500">No matching routines identified</h3>
                            <p className="text-zinc-700 text-sm mt-2">Try adjusting your filters or search terms.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
