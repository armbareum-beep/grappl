import React, { useEffect, useState } from 'react';
import { getPendingCreators, approveCreator, rejectCreator, getCreators } from '../../lib/api';
import { deleteCreator } from '../../lib/api-admin';
import { Creator } from '../../types';
import { Check, X, User, ArrowLeft, Trash2, Shield, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CreatorApprovalList: React.FC = () => {
    const navigate = useNavigate();
    const [creators, setCreators] = useState<Creator[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'active'>('active'); // Default to active to see current list

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    async function fetchData() {
        setLoading(true);
        try {
            if (activeTab === 'pending') {
                const { data } = await getPendingCreators();
                if (data) {
                    const mappedCreators: Creator[] = data.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        bio: item.bio,
                        profileImage: item.profile_image,
                        subscriberCount: 0,
                        isCreator: false
                    }));
                    setCreators(mappedCreators);
                } else {
                    setCreators([]);
                }
            } else {
                const data = await getCreators();
                setCreators(data);
            }
        } catch (error) {
            console.error('Error fetching creators:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleApprove = async (creatorId: string) => {
        if (!window.confirm('이 인스트럭터를 승인하시겠습니까?')) return;

        try {
            const { error } = await approveCreator(creatorId);
            if (error) throw error;

            setCreators(creators.filter(c => c.id !== creatorId));
            alert('인스트럭터가 승인되었습니다! 🎉');
        } catch (error) {
            console.error('Error approving creator:', error);
            alert('승인 중 오류가 발생했습니다.');
        }
    };

    const handleReject = async (creatorId: string) => {
        if (!window.confirm('이 인스트럭터 신청을 거부하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            const { error } = await rejectCreator(creatorId);
            if (error) throw error;

            setCreators(creators.filter(c => c.id !== creatorId));
            alert('인스트럭터 신청이 거부되었습니다.');
        } catch (error) {
            console.error('Error rejecting creator:', error);
            alert('거부 중 오류가 발생했습니다.');
        }
    };

    const handleDelete = async (creatorId: string) => {
        if (!window.confirm('정말 이 인스트럭터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            const { error } = await deleteCreator(creatorId);
            if (error) throw error;

            setCreators(creators.filter(c => c.id !== creatorId));
            alert('인스트럭터가 삭제되었습니다.');
        } catch (error) {
            console.error('Error deleting creator:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 gap-4">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading Instructors...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-violet-600/10 blur-[100px] -z-10" />
                <div className="absolute top-0 left-0 w-[300px] h-[200px] bg-cyan-600/5 blur-[100px] -z-10" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <button
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-all group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">대시보드로 돌아가기</span>
                    </button>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black tracking-tighter text-white">인스트럭터 관리</h1>
                        <p className="text-zinc-400 max-w-2xl text-lg leading-relaxed">
                            플랫폼의 가치를 높이는 훌륭한 인스트럭터들을 검증하고 지원합니다.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Tabs */}
                <div className="flex gap-8 mb-12 border-b border-zinc-900">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`pb-4 px-2 font-black uppercase tracking-widest text-xs transition-all relative ${activeTab === 'active' ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                    >
                        전체 인스트럭터
                        {activeTab === 'active' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-400 rounded-t-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`pb-4 px-2 font-black uppercase tracking-widest text-xs transition-all relative ${activeTab === 'pending' ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                    >
                        승인 대기
                        {activeTab === 'pending' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-400 rounded-t-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
                        )}
                    </button>
                </div>

                {creators.length === 0 ? (
                    <div className="bg-zinc-900/40 rounded-[2.5rem] border border-dashed border-zinc-800 p-20 text-center animate-in fade-in duration-500">
                        <div className="w-20 h-20 bg-zinc-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800">
                            <User className="w-10 h-10 text-zinc-800" />
                        </div>
                        <h3 className="text-xl font-extrabold text-white mb-2">
                            {activeTab === 'pending' ? '대기 중인 신청이 없습니다' : '등록된 인스트럭터가 없습니다'}
                        </h3>
                        <p className="text-zinc-600 max-w-sm mx-auto">
                            {activeTab === 'pending'
                                ? '새로운 인스트럭터 신청이 들어오면 실시간으로 여기에 표시됩니다.'
                                : '아직 플랫폼에서 활동 중인 정식 인스트럭터가 존재하지 않습니다.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {creators.map((creator) => (
                            <div key={creator.id} className="bg-zinc-900/20 rounded-[2rem] border border-zinc-800/50 p-8 flex flex-col md:flex-row items-start md:items-center gap-8 backdrop-blur-sm group hover:border-violet-500/30 transition-all">
                                <div className="w-20 h-20 rounded-[1.5rem] bg-zinc-950 border border-zinc-800 overflow-hidden flex-shrink-0 group-hover:border-violet-500/50 transition-all shadow-2xl relative">
                                    {creator.profileImage ? (
                                        <img
                                            src={creator.profileImage}
                                            alt={creator.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="w-10 h-10 text-zinc-800 group-hover:text-violet-500/30 transition-colors" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-2xl font-black tracking-tight text-white group-hover:text-violet-300 transition-colors">{creator.name}</h3>
                                        {activeTab === 'active' && (
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full">
                                                <Shield className="w-3 h-3 text-violet-400 fill-violet-400/20" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Verified Instructor</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2 max-w-2xl font-medium">{creator.bio || '등록된 인스트럭터 소개글이 없습니다.'}</p>
                                    <div className="flex items-center gap-4 pt-1">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800/50 rounded-lg border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                            {activeTab === 'active' ? (
                                                <>
                                                    <Users className="w-3 h-3" />
                                                    <span>수강생 {creator.subscriberCount?.toLocaleString() || 0} 명</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Calendar className="w-3 h-3" />
                                                    <span>신청일: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    {activeTab === 'pending' ? (
                                        <>
                                            <button
                                                onClick={() => handleApprove(creator.id)}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-violet-700 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-violet-500/30"
                                            >
                                                <Check className="w-4 h-4" />
                                                Authorise
                                            </button>
                                            <button
                                                onClick={() => handleReject(creator.id)}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white hover:bg-rose-600/10 hover:border-rose-500/30 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                                Reject
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleDelete(creator.id)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-zinc-950 border border-zinc-800 text-zinc-600 hover:text-white hover:bg-rose-600 hover:border-rose-500 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Terminate
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
