import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bundle } from '../types';
import { Package, BookOpen, ArrowRight, List } from 'lucide-react';
import { BundleDetailModal } from './BundleDetailModal';

interface BundleCardProps {
    bundle: Bundle;
}

export const BundleCard: React.FC<BundleCardProps> = ({ bundle }) => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const courseCount = bundle.course_ids?.length || bundle.courseIds?.length || 0;
    const routineCount = bundle.routine_ids?.length || bundle.routineIds?.length || 0;
    const sparringCount = bundle.sparring_ids?.length || bundle.sparringIds?.length || 0;
    const totalItems = courseCount + routineCount + sparringCount;

    const handlePurchase = () => {
        setIsModalOpen(false);
        navigate(`/checkout/bundle/${bundle.id}`);
    };

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="group block h-full relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.15)] hover:-translate-y-1 w-full text-left"
            >
                <div className="p-6 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-violet-500/10 rounded-xl">
                            <Package className="w-6 h-6 text-violet-500" />
                        </div>
                        <div className="bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700">
                            <span className="text-xs font-semibold text-zinc-300">
                                {totalItems} 콘텐츠
                            </span>
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-violet-400 transition-colors line-clamp-2">
                        {bundle.title || bundle.name}
                    </h3>

                    {/* Description */}
                    <p className="text-zinc-400 text-sm leading-relaxed mb-4 line-clamp-3 flex-grow">
                        {bundle.description}
                    </p>

                    {/* Content Breakdown */}
                    <div className="flex gap-3 mb-4 text-xs text-zinc-400">
                        {courseCount > 0 && (
                            <div className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                <span>강좌 {courseCount}개</span>
                            </div>
                        )}
                        {routineCount > 0 && (
                            <div className="flex items-center gap-1">
                                <List className="w-3 h-3" />
                                <span>루틴 {routineCount}개</span>
                            </div>
                        )}
                        {sparringCount > 0 && (
                            <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span>스파링 {sparringCount}개</span>
                            </div>
                        )}
                    </div>

                    {/* Price & CTA */}
                    <div className="pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">번들 할인가</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-black text-white">
                                    ₩{bundle.price.toLocaleString()}
                                </p>
                                {bundle.originalPrice && bundle.originalPrice > bundle.price && (
                                    <div className="flex flex-col">
                                        <p className="text-xs text-zinc-500 line-through">
                                            ₩{bundle.originalPrice.toLocaleString()}
                                        </p>
                                        <p className="text-xs font-bold text-red-500">
                                            {bundle.discountPercent}% OFF
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm group-hover:gap-3 transition-all">
                            자세히 보기
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </button>

            <BundleDetailModal
                bundle={bundle}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onPurchase={handlePurchase}
            />
        </>
    );
};
