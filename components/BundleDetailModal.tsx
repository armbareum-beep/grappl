import React, { useEffect, useState } from 'react';
import { X, Package, BookOpen, Zap, ArrowRight } from 'lucide-react';
import { Bundle } from '../types';
import { getCourseById } from '../lib/api';
import { useNavigate } from 'react-router-dom';

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
    const [courses, setCourses] = useState<any[]>([]);
    const [_drills, setDrills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && bundle) {
            loadBundleContents();
        }
    }, [isOpen, bundle]);

    const loadBundleContents = async () => {
        setLoading(true);
        try {
            // Load courses
            if (bundle.course_ids && bundle.course_ids.length > 0) {
                const coursePromises = bundle.course_ids.map(id => getCourseById(id));
                const coursesData = await Promise.all(coursePromises);
                setCourses(coursesData.filter(c => c !== null));
            }

            // Load drills (if you have a getDrillById function)
            // For now, we'll just show drill count
            setDrills([]);
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

    const _handleDrillClick = (drillId: string) => {
        navigate(`/drill/${drillId}`);
        onClose();
    };

    if (!isOpen) return null;

    const originalPrice = courses.reduce((sum, course) => sum + (course?.price || 0), 0);
    const discount = originalPrice - bundle.price;
    const discountPercent = originalPrice > 0 ? Math.round((discount / originalPrice) * 100) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-3xl max-h-[90vh] bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-violet-600 to-violet-700 p-6">
                    <button
                        onClick={onClose}
                        aria-label="번들 상세 닫기"
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                            <Package className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white mb-2">{bundle.name}</h2>
                            <p className="text-violet-100">{bundle.description}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Pricing Info */}
                            <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm text-zinc-400 mb-1">번들 할인가</p>
                                        <p className="text-3xl font-bold text-white">₩{bundle.price.toLocaleString()}</p>
                                    </div>
                                    {discountPercent > 0 && (
                                        <div className="text-right">
                                            <p className="text-sm text-zinc-400 line-through mb-1">₩{originalPrice.toLocaleString()}</p>
                                            <div className="inline-flex items-center px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                                                {discountPercent}% 할인
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-zinc-400">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" />
                                        <span>{bundle.course_ids?.length || 0}개 강좌</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        <span>{bundle.drill_ids?.length || 0}개 드릴</span>
                                    </div>
                                </div>
                            </div>

                            {/* Courses List */}
                            {courses.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-violet-400" />
                                        포함된 강좌
                                    </h3>
                                    <div className="space-y-3">
                                        {courses.map((course) => (
                                            <button
                                                key={course.id}
                                                onClick={() => handleCourseClick(course.id)}
                                                className="w-full bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-violet-500 rounded-xl p-4 transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {course.thumbnail_url && (
                                                        <img
                                                            src={course.thumbnail_url}
                                                            alt={course.title}
                                                            className="w-20 h-20 rounded-lg object-cover"
                                                        />
                                                    )}
                                                    <div className="flex-1 text-left">
                                                        <h4 className="font-semibold text-white group-hover:text-violet-400 transition-colors mb-1">
                                                            {course.title}
                                                        </h4>
                                                        <p className="text-sm text-zinc-400 line-clamp-2">{course.description}</p>
                                                        <p className="text-xs text-zinc-500 mt-1">
                                                            {course.instructor_name} • {course.level}
                                                        </p>
                                                    </div>
                                                    <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Drills List (if available) */}
                            {bundle.drill_ids && bundle.drill_ids.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-violet-400" />
                                        포함된 드릴
                                    </h3>
                                    <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                                        <p className="text-zinc-400 text-sm">
                                            {bundle.drill_ids.length}개의 드릴이 포함되어 있습니다.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-6">
                    <button
                        onClick={onPurchase}
                        className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-semibold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl"
                    >
                        ₩{bundle.price.toLocaleString()} 구매하기
                    </button>
                </div>
            </div>
        </div>
    );
};
