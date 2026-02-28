import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { createTestimonial } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Star, Send, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';

const BELT_OPTIONS = [
    'White Belt',
    'Blue Belt',
    'Purple Belt',
    'Brown Belt',
    'Black Belt',
    '입문자',
    '취미 수련생'
];

export const WriteReview: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { success, error: toastError } = useToast();

    const [name, setName] = useState('');
    const [belt, setBelt] = useState('White Belt');
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [hasExistingReview, setHasExistingReview] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        // Load user profile name
        const loadProfile = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', user.id)
                .single();

            if (data?.name) {
                setName(data.name);
            }
        };

        // Check if user already has a pending/approved review
        const checkExistingReview = async () => {
            const { data } = await supabase
                .from('testimonials')
                .select('id, status')
                .eq('user_id', user.id)
                .in('status', ['pending', 'approved']);

            if (data && data.length > 0) {
                setHasExistingReview(true);
            }
        };

        loadProfile();
        checkExistingReview();
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toastError('로그인이 필요합니다.');
            return;
        }

        if (!comment.trim()) {
            toastError('후기 내용을 입력해주세요.');
            return;
        }

        if (comment.trim().length < 20) {
            toastError('후기는 최소 20자 이상 작성해주세요.');
            return;
        }

        setSubmitting(true);

        try {
            const { error } = await createTestimonial({
                name: name.trim() || '익명',
                belt,
                rating,
                comment: comment.trim(),
                user_id: user.id,
                status: 'pending'
            });

            if (error) throw error;

            setSubmitted(true);
            success('후기가 제출되었습니다! 관리자 승인 후 랜딩페이지에 게시됩니다.');
        } catch (err) {
            console.error('Error submitting review:', err);
            toastError('후기 제출에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) {
        return null;
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-4">후기 제출 완료!</h1>
                    <p className="text-zinc-400 mb-8">
                        소중한 후기 감사합니다.<br />
                        관리자 검토 후 랜딩페이지에 게시됩니다.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-colors"
                    >
                        홈으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    if (hasExistingReview) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-6">
                        <Star className="w-10 h-10 text-violet-500" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-4">이미 후기를 작성하셨습니다</h1>
                    <p className="text-zinc-400 mb-8">
                        한 계정당 하나의 후기만 작성 가능합니다.<br />
                        기존 후기가 승인되면 랜딩페이지에 게시됩니다.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
                    >
                        홈으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            <div className="max-w-2xl mx-auto px-4 py-12">
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
                        <Star className="w-3.5 h-3.5 text-violet-500 mr-2" />
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">WRITE REVIEW</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
                        수련 후기 작성하기
                    </h1>
                    <p className="text-zinc-400 max-w-md mx-auto">
                        그랩플레이에서의 경험을 공유해주세요.<br />
                        승인 후 랜딩페이지에 게시됩니다.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">
                                표시 이름
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="홍길동"
                                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-violet-500 outline-none text-white placeholder-zinc-600 transition-colors"
                            />
                            <p className="text-xs text-zinc-600 mt-1.5">비워두면 '익명'으로 표시됩니다.</p>
                        </div>

                        {/* Belt */}
                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">
                                벨트 / 수련 단계
                            </label>
                            <select
                                value={belt}
                                onChange={(e) => setBelt(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-violet-500 outline-none text-white transition-colors"
                            >
                                {BELT_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        {/* Rating */}
                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-3">
                                만족도 평점
                            </label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className="p-1 transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`w-8 h-8 transition-colors ${
                                                star <= (hoverRating || rating)
                                                    ? 'text-amber-400 fill-amber-400'
                                                    : 'text-zinc-700'
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Comment */}
                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">
                                후기 내용 <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="그랩플레이에서 어떤 경험을 하셨나요? 실력 향상에 도움이 되었던 점, 좋았던 점 등을 자유롭게 작성해주세요."
                                rows={5}
                                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-violet-500 outline-none text-white placeholder-zinc-600 resize-none transition-colors"
                                required
                            />
                            <p className="text-xs text-zinc-600 mt-1.5">
                                최소 20자 이상 작성해주세요. ({comment.length}자)
                            </p>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting || comment.trim().length < 20}
                        className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-bold text-lg transition-colors"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                제출 중...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                후기 제출하기
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-zinc-600">
                        제출된 후기는 관리자 검토 후 승인됩니다.<br />
                        부적절한 내용은 승인이 거절될 수 있습니다.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default WriteReview;
