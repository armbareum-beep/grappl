import React, { useEffect, useState } from 'react';
import { X, Package, BookOpen, Zap, ArrowRight, List, Check } from 'lucide-react';
import { Bundle } from '../types';
import { getCourseById, getSparringVideoById } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface BundleDetailModalProps {
    bundle: Bundle;
    isOpen: boolean;
    onClose: () => void;
    onPurchase: () => void;
}

export const BundleDetailModal: React.FC<BundleDetailModalProps> = ({
    bundle,
    isOpen,
    onClose,
    onPurchase,
}) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [courses, setCourses] = useState<any[]>([]);
    const [routines, setRoutines] = useState<any[]>([]);
    const [sparringVideos, setSparringVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen && bundle) {
            loadBundleContents();
        }
    }, [isOpen, bundle]);

    const loadBundleContents = async () => {
        setLoading(true);
        try {
            const courseIds = bundle.course_ids || bundle.courseIds || [];
            const routineIds = bundle.routine_ids || bundle.routineIds || [];
            const sparringIds = bundle.sparring_ids || bundle.sparringIds || [];
            const drillIds = bundle.drill_ids || bundle.drillIds || [];

            // Load courses
            if (courseIds.length > 0) {
                const coursePromises = courseIds.map(id => getCourseById(id));
                const coursesData = await Promise.all(coursePromises);
                setCourses(coursesData.filter(c => c !== null));
            }

            // Load routines
            if (routineIds.length > 0) {
                const { data: routinesData } = await supabase
                    .from('routines')
                    .select('*')
                    .in('id', routineIds);
                setRoutines(routinesData || []);
            }

            // Load sparring
            if (sparringIds.length > 0) {
                const sparringPromises = sparringIds.map(id => getSparringVideoById(id));
                const sparringResults = await Promise.all(sparringPromises);
                setSparringVideos(sparringResults.map((r: any) => r.data).filter((v: any) => v !== null));
            }

            // Check owned content if user is logged in
            if (user?.id) {
                const owned = new Set<string>();

                // Check owned courses
                if (courseIds.length > 0) {
                    const { data: enrollments } = await supabase
                        .from('course_enrollments' as any)
                        .select('course_id')
                        .eq('user_id', user.id)
                        .in('course_id', courseIds);
                    enrollments?.forEach((e: any) => owned.add(e.course_id));
                }

                // Check owned routines
                if (routineIds.length > 0) {
                    const { data: userRoutines } = await supabase
                        .from('user_routines' as any)
                        .select('routine_id')
                        .eq('user_id', user.id)
                        .in('routine_id', routineIds);
                    userRoutines?.forEach((r: any) => owned.add(r.routine_id));
                }

                // Check owned sparring
                if (sparringIds.length > 0) {
                    const { data: userVideos } = await supabase
                        .from('user_videos' as any)
                        .select('video_id')
                        .eq('user_id', user.id)
                        .in('video_id', sparringIds);
                    userVideos?.forEach((v: any) => owned.add(v.video_id));
                }

                // Check owned drills
                if (drillIds.length > 0) {
                    const { data: userDrills } = await supabase
                        .from('user_drills' as any)
                        .select('drill_id')
                        .eq('user_id', user.id)
                        .in('drill_id', drillIds);
                    userDrills?.forEach((d: any) => owned.add(d.drill_id));
                }

                setOwnedIds(owned);
            }
        } catch (error) {
            console.error('Error loading bundle contents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCourseClick = (courseId: string) => {
        navigate(`/course/${courseId}`);
        onClose();
    };

    const handleRoutineClick = (routineId: string) => {
        navigate(`/drill-routine/${routineId}`);
        onClose();
    };

    const handleSparringClick = (videoId: string) => {
        navigate(`/sparring/${videoId}`);
        onClose();
    };

    if (!isOpen) return null;

    const courseSum = courses.reduce((sum, c) => sum + (Number(c?.price) || 0), 0);
    const routineSum = routines.reduce((sum, r) => sum + (Number(r?.price) || 0), 0);
    const sparringSum = sparringVideos.reduce((sum, s) => sum + (Number(s?.price) || 0), 0);
    const originalPrice = courseSum + routineSum + sparringSum;
    const discount = originalPrice - bundle.price;
    const discountPercent = originalPrice > bundle.price ? Math.round((discount / originalPrice) * 100) : 0;

    // Calculate owned items discount
    const ownedCoursesPrice = courses.filter(c => ownedIds.has(c.id)).reduce((sum, c) => sum + (Number(c?.price) || 0), 0);
    const ownedRoutinesPrice = routines.filter(r => ownedIds.has(r.id)).reduce((sum, r) => sum + (Number(r?.price) || 0), 0);
    const ownedSparringPrice = sparringVideos.filter(s => ownedIds.has(s.id)).reduce((sum, s) => sum + (Number(s?.price) || 0), 0);
    const totalOwnedPrice = ownedCoursesPrice + ownedRoutinesPrice + ownedSparringPrice;
    const adjustedPrice = Math.max(0, bundle.price - totalOwnedPrice);
    const hasOwnedItems = totalOwnedPrice > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-3xl max-h-[90vh] bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-violet-600 to-violet-700 p-6 flex-shrink-0">
                    <button
                        onClick={onClose}
                        aria-label="번들 상세 닫기"
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white/80 text-sm font-medium">Value Bundle Package</span>
                    </div>
                    <h2 className="text-2xl font-black text-white">{bundle.title}</h2>
                    <p className="text-white/80 mt-1 line-clamp-2">{bundle.description}</p>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                            <p className="text-zinc-500 font-medium">콘텐츠를 불러오는 중...</p>
                        </div>
                    ) : (
                        <>
                            {/* Price Overview */}
                            <div className="p-6 bg-zinc-800/50 rounded-2xl border border-zinc-700/50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-zinc-400 text-sm font-medium">번들 패키지 원가</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl font-bold text-zinc-500 line-through">
                                                ₩{originalPrice.toLocaleString()}
                                            </span>
                                            {discountPercent > 0 && (
                                                <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-lg font-black text-sm">
                                                    -{discountPercent}% 익스클루시브 혜택
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-violet-400 text-sm font-black whitespace-nowrap uppercase tracking-wider">Bundle Price</p>
                                        <p className={`text-3xl font-black ${hasOwnedItems ? 'text-zinc-500 line-through' : 'text-white'}`}>
                                            ₩{bundle.price.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {hasOwnedItems && (
                                    <div className="pt-4 border-t border-zinc-700/50 space-y-3">
                                        <div className="flex items-center justify-between text-blue-400">
                                            <span className="flex items-center gap-2 text-sm font-bold">
                                                <Check className="w-4 h-4" />
                                                이미 보유한 콘텐츠 차감
                                            </span>
                                            <span className="font-bold">-₩{totalOwnedPrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-emerald-400 text-sm font-black uppercase tracking-wider">Your Price</span>
                                            <span className="text-3xl font-black text-emerald-400">
                                                ₩{adjustedPrice.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Content Lists */}
                            <div className="space-y-8">
                                {/* Courses */}
                                {courses.length > 0 && (
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <BookOpen className="w-5 h-5 text-violet-500" />
                                            <h3 className="text-lg font-bold text-white tracking-tight">포함된 강좌 ({courses.length})</h3>
                                        </div>
                                        <div className="grid gap-3">
                                            {courses.map((course) => (
                                                <button
                                                    key={course.id}
                                                    onClick={() => handleCourseClick(course.id)}
                                                    className={`group flex items-center justify-between p-4 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl border transition-all text-left ${ownedIds.has(course.id) ? 'border-blue-500/30' : 'border-zinc-700/30'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative w-14 h-14 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700/50">
                                                            <img src={course.thumbnailUrl} alt={course.title + " 썸네일"} loading="lazy" className="w-full h-full object-cover" />
                                                            {ownedIds.has(course.id) && (
                                                                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                                    <Check className="w-6 h-6 text-blue-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-white font-bold group-hover:text-violet-400 transition-colors line-clamp-1">{course.title}</h4>
                                                                {ownedIds.has(course.id) && (
                                                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-black rounded-full uppercase">보유</span>
                                                                )}
                                                            </div>
                                                            <p className="text-zinc-500 text-sm">{course.creatorName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className={`font-bold ${ownedIds.has(course.id) ? 'text-blue-400 line-through' : 'text-zinc-400'}`}>₩{Number(course.price).toLocaleString()}</span>
                                                        <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-violet-400 transform group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Routines */}
                                {routines.length > 0 && (
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <List className="w-5 h-5 text-blue-500" />
                                            <h3 className="text-lg font-bold text-white tracking-tight">포함된 루틴 ({routines.length})</h3>
                                        </div>
                                        <div className="grid gap-3">
                                            {routines.map((routine) => (
                                                <button
                                                    key={routine.id}
                                                    onClick={() => handleRoutineClick(routine.id)}
                                                    className={`group flex items-center justify-between p-4 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl border transition-all text-left ${ownedIds.has(routine.id) ? 'border-blue-500/30' : 'border-zinc-700/30'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative w-14 h-14 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700/50">
                                                            {routine.thumbnail_url ? (
                                                                <img src={routine.thumbnail_url} alt={routine.title + " 썸네일"} loading="lazy" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-blue-500/10">
                                                                    <List className="w-6 h-6 text-blue-500" />
                                                                </div>
                                                            )}
                                                            {ownedIds.has(routine.id) && (
                                                                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                                    <Check className="w-6 h-6 text-blue-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-white font-bold group-hover:text-blue-400 transition-colors line-clamp-1">{routine.title}</h4>
                                                            {ownedIds.has(routine.id) && (
                                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-black rounded-full uppercase">보유</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className={`font-bold ${ownedIds.has(routine.id) ? 'text-blue-400 line-through' : 'text-zinc-400'}`}>₩{Number(routine.price).toLocaleString()}</span>
                                                        <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Sparring Videos */}
                                {sparringVideos.length > 0 && (
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Zap className="w-5 h-5 text-amber-500" />
                                            <h3 className="text-lg font-bold text-white tracking-tight">포함된 스파링 영상 ({sparringVideos.length})</h3>
                                        </div>
                                        <div className="grid gap-3">
                                            {sparringVideos.map((video) => (
                                                <button
                                                    key={video.id}
                                                    onClick={() => handleSparringClick(video.id)}
                                                    className={`group flex items-center justify-between p-4 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl border transition-all text-left ${ownedIds.has(video.id) ? 'border-blue-500/30' : 'border-zinc-700/30'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative w-14 h-14 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700/50">
                                                            <img src={video.thumbnailUrl} alt={video.title + " 썸네일"} loading="lazy" className="w-full h-full object-cover" />
                                                            {ownedIds.has(video.id) && (
                                                                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                                    <Check className="w-6 h-6 text-blue-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-white font-bold group-hover:text-amber-400 transition-colors line-clamp-1">{video.title}</h4>
                                                            {ownedIds.has(video.id) && (
                                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-black rounded-full uppercase">보유</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className={`font-bold ${ownedIds.has(video.id) ? 'text-blue-400 line-through' : 'text-zinc-400'}`}>₩{Number(video.price).toLocaleString()}</span>
                                                        <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-400 transform group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-6 flex-shrink-0">
                    <button
                        onClick={onPurchase}
                        className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-violet-900/30 transform active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-lg"
                    >
                        {hasOwnedItems ? (
                            <>
                                <span className="line-through text-white/50 mr-2">₩{bundle.price.toLocaleString()}</span>
                                ₩{adjustedPrice.toLocaleString()} 결제하고 즉시 마스터하기
                            </>
                        ) : (
                            <>₩{bundle.price.toLocaleString()} 결제하고 즉시 마스터하기</>
                        )}
                        <ArrowRight className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};
