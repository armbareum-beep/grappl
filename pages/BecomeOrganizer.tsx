import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, CheckCircle, ArrowRight, Calendar, Users, Trophy, Megaphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

export const BecomeOrganizer: React.FC = () => {
    const navigate = useNavigate();
    const { user, isOrganizer, refreshAuth } = useAuth();
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const handleApply = async () => {
        if (!user) {
            navigate('/auth');
            return;
        }

        if (!agreed) {
            toastError('이용 약관에 동의해주세요.');
            return;
        }

        setLoading(true);
        try {
            // Check if creator profile exists
            const { data: existingCreator } = await supabase
                .from('creators')
                .select('id, can_host_events')
                .eq('id', user.id)
                .maybeSingle();

            if (existingCreator?.can_host_events) {
                success('이미 주최자로 등록되어 있습니다.');
                navigate('/organizer/dashboard');
                return;
            }

            if (existingCreator) {
                // Update existing creator
                const { error } = await supabase
                    .from('creators')
                    .update({
                        can_host_events: true,
                        creator_type: 'both', // Was instructor, now also organizer
                        approved: true // Ensure visible to others
                    })
                    .eq('id', user.id);

                if (error) throw error;
            } else {
                // Create new creator profile
                const { error } = await supabase
                    .from('creators')
                    .insert({
                        id: user.id,
                        name: user.user_metadata?.name || user.email?.split('@')[0] || '주최자',
                        can_host_events: true,
                        creator_type: 'organizer',
                        approved: true
                    });

                if (error) throw error;
            }

            // Create default event team
            const { error: brandError } = await supabase
                .from('event_brands')
                .insert({
                    creator_id: user.id,
                    name: user.user_metadata?.name || user.email?.split('@')[0] || '내 이벤트 팀',
                    is_default: true
                });

            if (brandError && !brandError.message.includes('duplicate')) {
                console.error('Failed to create default event team:', brandError);
            }

            await refreshAuth();
            success('주최자 등록이 완료되었습니다!');
            navigate('/organizer/dashboard');
        } catch (err: any) {
            console.error('Error applying as organizer:', err);
            toastError('등록 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (isOrganizer) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">이미 주최자입니다</h1>
                    <p className="text-zinc-400 mb-6">주최자 대시보드에서 이벤트를 관리하세요.</p>
                    <button
                        onClick={() => navigate('/organizer/dashboard')}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-colors"
                    >
                        대시보드로 이동
                    </button>
                </div>
            </div>
        );
    }

    const features = [
        {
            icon: Calendar,
            title: '무제한 이벤트 생성',
            description: '시합, 세미나, 오픈매트 등 다양한 이벤트를 무료로 만들 수 있습니다.'
        },
        {
            icon: Users,
            title: '참가자 관리',
            description: '신청 현황, 결제 확인, 대기자 관리를 한 곳에서 처리하세요.'
        },
        {
            icon: Trophy,
            title: '대진표 & 스코어보드',
            description: '시합 대진표를 자동 생성하고 실시간 스코어보드를 제공합니다.'
        },
        {
            icon: Megaphone,
            title: '지도자 초청',
            description: '플랫폼 내 지도자에게 세미나/오픈매트 초청을 보낼 수 있습니다.'
        }
    ];

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-zinc-950 to-zinc-950" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />

                <div className="relative max-w-4xl mx-auto px-4 py-24 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm font-medium mb-6">
                        <Flag className="w-4 h-4" />
                        무료로 시작하기
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black mb-6">
                        <span className="text-amber-400">이벤트 주최자</span>가 되어보세요
                    </h1>

                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
                        시합, 세미나, 오픈매트를 직접 개최하고 참가자를 모집하세요.
                        <br />
                        모든 기능을 무료로 사용할 수 있습니다.
                    </p>
                </div>
            </div>

            {/* Features */}
            <div className="max-w-4xl mx-auto px-4 py-16">
                <div className="grid md:grid-cols-2 gap-6">
                    {features.map((feature, idx) => (
                        <div
                            key={idx}
                            className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-amber-500/30 transition-colors"
                        >
                            <feature.icon className="w-10 h-10 text-amber-500 mb-4" />
                            <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                            <p className="text-zinc-400 text-sm">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="max-w-xl mx-auto px-4 pb-24">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                    <h2 className="text-xl font-bold mb-6 text-center">주최자 등록</h2>

                    <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-xl">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">무료 이벤트 생성</p>
                                <p className="text-sm text-zinc-500">생성 수 제한 없이 무료로 사용</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-xl">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">무통장입금 직접 수령</p>
                                <p className="text-sm text-zinc-500">참가비는 주최자 계좌로 직접 수령</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-xl">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">영상 판매 수익</p>
                                <p className="text-sm text-zinc-500">이벤트 영상 판매 시 80% 수익</p>
                            </div>
                        </div>
                    </div>

                    <label className="flex items-start gap-3 mb-6 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900 mt-0.5"
                        />
                        <span className="text-sm text-zinc-400">
                            <a href="/terms" target="_blank" className="text-amber-400 hover:underline">이용약관</a> 및{' '}
                            <a href="/privacy" target="_blank" className="text-amber-400 hover:underline">개인정보처리방침</a>에 동의합니다.
                        </span>
                    </label>

                    <button
                        onClick={handleApply}
                        disabled={loading || !agreed}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>주최자로 등록하기</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    {!user && (
                        <p className="text-center text-sm text-zinc-500 mt-4">
                            로그인이 필요합니다.{' '}
                            <button
                                onClick={() => navigate('/auth')}
                                className="text-amber-400 hover:underline"
                            >
                                로그인하기
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
