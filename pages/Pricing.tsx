import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Check, Zap, Crown } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';



type SubscriptionTier = 'basic' | 'premium';

export const Pricing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading] = React.useState(false);
  const [currentTier, setCurrentTier] = React.useState<SubscriptionTier | null>(null);
  const [isSubscribed, setIsSubscribed] = React.useState(false);

  // Get return URL from location state
  const returnUrl = (location.state as any)?.returnUrl;

  React.useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  const fetchSubscriptionStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('is_subscriber, subscription_tier')
      .eq('id', user.id)
      .single();

    if (data) {
      setIsSubscribed(data.is_subscriber || false);
      setCurrentTier(data.subscription_tier || null);
    }
  };


  // Pricing data with Stripe Price IDs
  const pricing = {
    basic: {
      monthly: { price: 29000, priceId: 'price_1SWs3iDWGN6smyu7MNbjs5kM' }, // Basic Monthly
      yearly: { price: 290000, priceId: 'price_1SYHwZDWGN6smyu74bzDxySW' }, // Basic Yearly
    },
    premium: {
      monthly: { price: 39000, priceId: 'price_1SYHxWDWGN6smyu7qHuppVy5' }, // Pro Monthly
      yearly: { price: 390000, priceId: 'price_1SYI2UDWGN6smyu7BhMUtAQN' }, // Pro Yearly
    },
  };

  const handleSubscription = (priceId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Pass returnUrl to checkout
    navigate(`/checkout/subscription/${priceId}`, { state: { returnUrl } });
  };

  const getMonthlyEquivalent = (yearlyPrice: number) => {
    return Math.floor(yearlyPrice / 12);
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-hidden pt-8 pb-12 md:pt-12 md:pb-20 font-sans selection:bg-violet-500/30">
      {/* Background Interaction: Violet Radial Gradient */}
      <div className="pointer-events-none absolute inset-0 flex justify-center overflow-hidden">
        <div className="h-[1000px] w-[1000px] flex-shrink-0 bg-violet-600/15 blur-[120px] rounded-full mix-blend-screen opacity-50 -translate-y-2/3" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Current Subscription Status */}
        {isSubscribed && currentTier && (
          <div className="mb-12 bg-zinc-900/60 border border-violet-500/30 rounded-2xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-violet-400" />
                <div>
                  <h3 className="text-xl font-bold text-zinc-50">
                    현재 이용 중인 플랜: {currentTier === 'premium' ? 'Pro 멤버십' : 'Standard 멤버십'}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    구독 기간 동안 모든 프리미엄 콘텐츠를 자유롭게 이용하실 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header & Title */}
        <div className="text-center space-y-4">
          <h2 className="text-base font-bold text-violet-400 tracking-widest uppercase">Membership</h2>
          <p className="text-5xl md:text-6xl font-black tracking-tighter text-zinc-50">
            Select Your Pass
            <span className="block text-2xl md:text-3xl font-medium text-zinc-400 mt-4 tracking-normal">
              단품 구매로 시작하거나,<br className="hidden md:block" /> 멤버십 가입으로 모든 혜택을 누리세요.
            </span>
          </p>
        </div>

        {/* Pricing Cards: 1 Month vs 1 Year */}
        <div className="mt-20 grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
          {/* 1 Month Pass */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-[40px] p-10 flex flex-col transition-transform duration-300 hover:scale-[1.01]">
            <div className="mb-8 text-center lg:text-left">
              <h3 className="text-2xl font-bold text-zinc-100 italic uppercase tracking-tight">1 Month Pass</h3>
              <p className="mt-2 text-zinc-400">부담 없이 시작하는 한 달의 주짓수 여정.</p>
            </div>

            <div className="mb-8 text-center lg:text-left">
              <div className="flex items-baseline justify-center lg:justify-start gap-2">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">KRW</span>
                <span className="text-5xl font-black text-zinc-50">
                  {pricing.basic.monthly.price.toLocaleString()}
                </span>
                <span className="text-xl text-zinc-500">/월</span>
              </div>
            </div>

            <ul className="space-y-4 flex-1 mb-10">
              {[
                '전체 레슨, 드릴, 스파링 영상 접근',
                '신규 콘텐츠 매주 자동 업데이트',
                '가격이 인상되어도 기존 구독료 유지'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="flex-shrink-0 w-6 h-6 text-violet-400" />
                  <span className="text-zinc-300 text-lg">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full h-16 rounded-2xl text-lg font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
              onClick={() => handleSubscription(pricing.basic.monthly.priceId)}
              disabled={loading || isSubscribed}
            >
              {isSubscribed ? '이미 이용 중입니다' : '1개월 시작하기'}
            </Button>
          </div>

          {/* 1 Year Pass (Recommended) */}
          <div className="relative bg-zinc-900/40 backdrop-blur-xl border border-violet-500/50 rounded-[40px] p-10 flex flex-col shadow-[0_0_40px_rgba(124,58,237,0.15)] transition-transform duration-300 hover:scale-[1.01]">
            <div className="absolute top-0 right-10 -translate-y-1/2">
              <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold px-5 py-2 rounded-full shadow-lg flex items-center gap-1.5 ring-4 ring-zinc-950">
                <Zap className="w-4 h-4 fill-white text-white" />
                Best Value
              </div>
            </div>

            <div className="mb-8 text-center lg:text-left">
              <h3 className="text-2xl font-bold text-zinc-50 italic uppercase tracking-tight">1 Year Pass</h3>
              <p className="mt-2 text-violet-200/80">장기적인 성장을 위한 가장 합리적인 선택.</p>
            </div>

            <div className="mb-8 text-center lg:text-left">
              <div className="flex items-baseline justify-center lg:justify-start gap-2">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">KRW</span>
                <span className="text-5xl font-black text-zinc-50">
                  {getMonthlyEquivalent(pricing.basic.yearly.price).toLocaleString()}
                </span>
                <span className="text-xl text-zinc-500">/월</span>
              </div>
              <p className="text-sm text-violet-400 font-bold mt-2">
                연간 전체 {pricing.basic.yearly.price.toLocaleString()}원 (월 24,166원)
              </p>
            </div>

            <ul className="space-y-4 flex-1 mb-10">
              {[
                '1개월권의 모든 혜택 포함',
                '전체 금액 대비 약 17% 할인',
                '오프라인 세미나 우선 참여권',
                '인스트럭터 피드백 우선 답변'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="flex-shrink-0 w-6 h-6 text-violet-400" />
                  <span className="text-zinc-100 text-lg font-bold">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full h-16 rounded-2xl text-xl font-black bg-zinc-100 text-zinc-950 hover:bg-white transition-colors shadow-lg shadow-violet-900/20"
              onClick={() => handleSubscription(pricing.basic.yearly.priceId)}
              disabled={loading || isSubscribed}
            >
              {isSubscribed ? '이미 이용 중입니다' : '1년 구독 신청'}
            </Button>
          </div>
        </div>

        <div className="mt-20 text-center">
          <p className="text-zinc-500 mb-4 italic font-medium">클래스나 패키지 상품을 찾고 계신가요?</p>

          <Link to="/bundles" className="text-violet-400 font-bold hover:text-violet-300 transition-colors border-b border-violet-500/30 pb-1">
            번들/패키지 상품 보러가기 &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
