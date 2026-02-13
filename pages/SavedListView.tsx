import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
    getUserSavedLessons,
    getUserSavedCourses,
    getUserSavedRoutines,
    getUserSavedDrills,
    getUserRoutines,
    getSavedSparringVideos,
    getPurchasedSparringVideos,
    getFeedbackRequests
} from '../lib/api';
import { listUserWeeklyRoutinePlans } from '../lib/api-weekly-routine';
import { listUserSkillTrees } from '../lib/api-skill-tree';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { CourseCard } from '../components/CourseCard';
import { DrillRoutineCard } from '../components/DrillRoutineCard';
import { DrillCard } from '../components/DrillCard';
import { SparringCard } from '../components/SparringCard';
import { ChainCard } from './MyLibrary';
import { MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const SavedListView: React.FC = () => {
    const { type } = useParams<{ type: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getTitle = () => {
        switch (type) {
            case 'classes': return 'Classes & Lessons';
            case 'lessons': return 'Saved Lessons';
            case 'routines': return 'Training Routines';
            case 'drills': return 'Saved Drills';
            case 'sparring': return 'My Sparring';
            case 'roadmaps': return 'My Roadmap';
            case 'weekly-routines': return 'Weekly Routines';
            case 'feedbacks': return 'My Feedback Requests';
            default: return 'Saved Items';
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                let data: any[] = [];
                if (type === 'classes') {
                    const [lessonsRes, coursesRes] = await Promise.all([
                        getUserSavedLessons(user.id),
                        getUserSavedCourses(user.id)
                    ]);
                    const lessons = Array.isArray(lessonsRes) ? lessonsRes : ((lessonsRes as any).data || []);
                    const courses = Array.isArray(coursesRes) ? coursesRes : ((coursesRes as any).data || []);

                    // Deduplicate in case a lesson's parent course is also saved (or vice versa)
                    // But actually they are different types, so we just combine them.
                    data = [...courses, ...lessons];
                } else if (type === 'lessons') {
                    const lessonsRes = await getUserSavedLessons(user.id);
                    data = Array.isArray(lessonsRes) ? lessonsRes : ((lessonsRes as any).data || []);
                } else if (type === 'drills') {
                    const drillsRes = await getUserSavedDrills(user.id);
                    data = Array.isArray(drillsRes) ? drillsRes : ((drillsRes as any).data || []);
                } else if (type === 'routines') {
                    const savedRes = await getUserSavedRoutines(user.id);
                    const personalRes = await getUserRoutines(user.id);
                    const saved = Array.isArray(savedRes) ? savedRes : ((savedRes as any).data || []);
                    const personal = Array.isArray(personalRes) ? personalRes : ((personalRes as any).data || []);
                    data = [...personal, ...saved];
                } else if (type === 'sparring') {
                    const savedRes = await getSavedSparringVideos(user.id);
                    const purchasedRes = await getPurchasedSparringVideos(user.id);
                    const saved = Array.isArray(savedRes) ? savedRes : ((savedRes as any).data || []);
                    const purchased = Array.isArray(purchasedRes) ? purchasedRes : ((purchasedRes as any).data || []);

                    const purchasedIds = new Set(purchased.map((v: any) => v.id));
                    const savedIds = new Set(saved.map((v: any) => v.id));

                    data = Array.from(new Set([...savedIds, ...purchasedIds])).map(id => {
                        const item = saved.find((v: any) => v.id === id) || purchased.find((v: any) => v.id === id);
                        return {
                            ...item,
                            isPurchased: purchasedIds.has(id)
                        };
                    });
                } else if (type === 'roadmaps') {
                    const res = await listUserSkillTrees(user.id);
                    data = Array.isArray(res) ? res : ((res as any).data || []);
                } else if (type === 'weekly-routines') {
                    const res = await listUserWeeklyRoutinePlans(user.id);
                    data = Array.isArray(res) ? res : ((res as any).data || []);
                } else if (type === 'feedbacks') {
                    const res = await getFeedbackRequests(user.id, 'student');
                    let feedbackData = Array.isArray(res) ? res : ((res as any).data || []);

                    if (feedbackData.length === 0) {
                        const studentName = (user as any).name || (user as any).user_metadata?.name || '나학생';
                        feedbackData = [
                            {
                                id: 'dummy-student-1',
                                studentId: user.id || 'anonymous',
                                studentName: studentName,
                                instructorId: 'target-creator-1',
                                instructorName: '나크리에이터',
                                videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
                                description: '가드 패스 시 중심 잡기가 힘들어요.',
                                status: 'pending',
                                price: 30000,
                                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                                updatedAt: new Date().toISOString()
                            },
                            {
                                id: 'dummy-student-2',
                                studentId: user.id || 'anonymous',
                                studentName: studentName,
                                instructorId: 'target-creator-1',
                                instructorName: '나크리에이터',
                                videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
                                description: '스윕 타이밍을 잘 모르겠습니다.',
                                status: 'in_progress',
                                price: 35000,
                                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                                updatedAt: new Date().toISOString()
                            },
                            {
                                id: 'dummy-student-3',
                                studentId: user.id || 'anonymous',
                                studentName: studentName,
                                instructorId: 'target-creator-1',
                                instructorName: '나크리에이터',
                                videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
                                description: '백 포지션 탈출법 피드백 부탁드립니다.',
                                status: 'completed',
                                feedbackContent: '상대방의 훅을 해제할 때 골반을 들어올리는 것이 핵심입니다. 제가 보내드린 영상의 1분 20초 부분을 참고해서 연습해 보세요. 아주 잘하고 계십니다!',
                                responseVideoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
                                price: 30000,
                                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
                                updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
                            }
                        ];
                    }
                    data = feedbackData;
                }
                setItems(data);
            } catch (err) {
                console.error('Error fetching saved list:', err);
                setError('데이터를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [type, user?.id]);

    if (loading) return <LoadingScreen />;
    if (error) return <ErrorScreen error={error} />;

    return (
        <div className="min-h-screen bg-black pt-24 pb-12 px-4 md:px-12">
            <div className="max-w-7xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span>돌아가기</span>
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">{getTitle()}</h1>
                    <p className="text-zinc-500">{items.length}개의 항목</p>
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                        <p className="text-zinc-500">저장된 항목이 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {items.map((item) => {
                            const handleUnsave = () => {
                                if (item.isPurchased) return;
                                setItems(prev => prev.filter(i => i.id !== item.id));
                            };

                            if (type === 'classes') return <CourseCard key={item.id} course={item} onUnsave={handleUnsave} />;
                            if (type === 'lessons') return <CourseCard key={item.id} course={item} onUnsave={handleUnsave} />;
                            if (type === 'routines') return <DrillRoutineCard key={item.id} routine={item} onUnsave={handleUnsave} />;
                            if (type === 'drills') return <DrillCard key={item.id} drill={item} />;
                            if (type === 'sparring') return <SparringCard key={item.id} video={item} onUnsave={handleUnsave} hasAccess={item.isPurchased} />;
                            if (type === 'roadmaps') return <ChainCard key={item.id} chain={item} />;
                            if (type === 'weekly-routines') return (
                                <button
                                    key={item.id}
                                    onClick={() => navigate(`/training-routines?id=${item.id}`)}
                                    className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all text-left group"
                                >
                                    <div className="aspect-square bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 flex items-center justify-center">
                                        {item.thumbnailUrl ? (
                                            <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-4xl">📅</div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-white font-bold text-sm line-clamp-2 group-hover:text-violet-400 transition-colors">{item.title}</h3>
                                        <p className="text-zinc-500 text-xs mt-1">{item.description || '주간 훈련 일정'}</p>
                                    </div>
                                </button>
                            );
                            if (type === 'feedbacks') return (
                                <button
                                    key={item.id}
                                    onClick={() => navigate('/feedback-center')}
                                    className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-violet-500/50 transition-all text-left"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center text-violet-400">
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        {item.status === 'completed' ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        ) : (
                                            <Clock className="w-5 h-5 text-amber-400" />
                                        )}
                                    </div>
                                    <h3 className="text-white font-bold text-base mb-1 line-clamp-1">{item.description || '내용 없음'}</h3>
                                    <p className="text-zinc-500 text-xs mb-4">Instructor: {item.instructorName}</p>
                                    <div className="mt-auto flex items-center justify-between text-[10px] font-bold uppercase tracking-widest pt-3 border-t border-zinc-800/50">
                                        <span className="text-zinc-600">{new Date(item.createdAt).toLocaleDateString()}</span>
                                        <span className={item.status === 'completed' ? "text-green-400" : "text-amber-400"}>
                                            {item.status === 'completed' ? 'RESULT READY' : 'IN PROGRESS'}
                                        </span>
                                    </div>
                                </button>
                            );
                            return null;
                        })}
                    </div>
                )}
            </div>

        </div>
    );
};
