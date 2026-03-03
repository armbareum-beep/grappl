import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllApprovedTestimonials, getTestimonialStats } from '../lib/api';
import { Star, ArrowLeft, Quote, Edit3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Reviews: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const { data: testimonials = [], isLoading } = useQuery({
        queryKey: ['testimonials', 'all'],
        queryFn: async () => {
            const { data } = await getAllApprovedTestimonials();
            return data || [];
        },
        staleTime: 1000 * 60 * 5,
    });

    const { data: stats } = useQuery({
        queryKey: ['testimonials', 'stats'],
        queryFn: async () => {
            const { data } = await getTestimonialStats();
            return data;
        },
        staleTime: 1000 * 60 * 5,
    });

    return (
        <div className="min-h-screen bg-black pb-24">
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>뒤로가기</span>
                </button>

                <div className="text-center mb-12">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 mb-6">
                        <Quote className="w-3.5 h-3.5 text-violet-500 mr-2" />
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">COMMUNITY REVIEWS</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
                        수련생 후기
                    </h1>
                    <p className="text-zinc-400 max-w-md mx-auto mb-6">
                        그랩플레이 수련생들의 생생한 후기를 확인하세요.
                    </p>

                    {/* Stats */}
                    {stats && stats.totalCount > 0 && (
                        <div className="flex items-center justify-center gap-6 mb-8">
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                                <span className="text-2xl font-black text-white">{stats.averageRating}</span>
                                <span className="text-zinc-500 text-sm">/ 5.0</span>
                            </div>
                            <div className="w-px h-6 bg-zinc-800" />
                            <div className="text-zinc-400">
                                <span className="text-white font-bold">{stats.totalCount}</span>개의 리뷰
                            </div>
                        </div>
                    )}

                    {/* Write Review Button */}
                    {user && (
                        <button
                            onClick={() => navigate('/write-review')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-bold transition-colors"
                        >
                            <Edit3 className="w-4 h-4" />
                            후기 작성하기
                        </button>
                    )}
                </div>

                {/* Reviews List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                    </div>
                ) : testimonials.length === 0 ? (
                    <div className="text-center py-20">
                        <Quote className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <p className="text-zinc-500">아직 등록된 후기가 없습니다.</p>
                        {user && (
                            <button
                                onClick={() => navigate('/write-review')}
                                className="mt-4 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-bold transition-colors"
                            >
                                첫 번째 후기 작성하기
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {testimonials.map((review) => (
                            <div
                                key={review.id}
                                className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 md:p-8 hover:border-violet-500/30 transition-all duration-300"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
                                            <span className="text-white font-bold text-lg">{review.name?.[0] || '?'}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-zinc-100 text-base">{review.name || '익명'}</p>
                                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{review.belt}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5">
                                        {[...Array(review.rating || 5)].map((_, j) => (
                                            <Star key={j} className="w-4 h-4 fill-violet-500 text-violet-500" />
                                        ))}
                                        {[...Array(5 - (review.rating || 5))].map((_, j) => (
                                            <Star key={j} className="w-4 h-4 text-zinc-700" />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-zinc-300 leading-relaxed text-base md:text-lg">
                                    "{review.comment}"
                                </p>
                                {review.created_at && (
                                    <p className="text-xs text-zinc-600 mt-4">
                                        {new Date(review.created_at).toLocaleDateString('ko-KR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* CTA for non-logged users */}
                {!user && testimonials.length > 0 && (
                    <div className="text-center mt-12 p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                        <p className="text-zinc-400 mb-4">
                            그랩플레이 회원이시라면 후기를 작성해주세요!
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-bold transition-colors"
                        >
                            로그인하고 후기 작성하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reviews;
