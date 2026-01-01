import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, TrendingUp } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';


type BillingPeriod = 'monthly' | 'yearly';
type SubscriptionTier = 'basic' | 'premium';

export const Pricing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [billingPeriod, setBillingPeriod] = React.useState<BillingPeriod>('yearly');
  const [currentTier, setCurrentTier] = React.useState<SubscriptionTier | null>(null);
  const [isSubscribed, setIsSubscribed] = React.useState(false);

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
    navigate(`/checkout/subscription/${priceId}`);
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
                    현재 플랜: {currentTier === 'premium' ? 'Pro (프리미엄)' : 'Basic (베이직)'}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {currentTier === 'premium'
                      ? '모든 강좌와 루틴을 무제한으로 이용 중입니다'
                      : '모든 강좌를 무제한으로 이용 중입니다'}
                  </p>
                </div>
              </div>
              {currentTier === 'basic' && (
                <Button
                  onClick={() => handleSubscription(pricing.premium[billingPeriod].priceId)}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-0"
                >
                  <TrendingUp className="w-4 h-4" />
                  Pro로 업그레이드
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Header & Title */}
        <div className="text-center space-y-4">
          <h2 className="text-base font-bold text-violet-400 tracking-widest uppercase">Pricing</h2>
          <p className="text-5xl md:text-6xl font-black tracking-tighter text-zinc-50">
            Select a plan that fits you.
            <span className="block text-2xl md:text-3xl font-medium text-zinc-400 mt-4 tracking-normal">
              단품 구매로 필요한 기술만 배우거나,<br className="hidden md:block" /> 구독을 통해 모든 콘텐츠를 누리세요.
            </span>
          </p>
        </div>

        {/* Payment Toggle */}
        <div className="mt-16 flex justify-center">
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-full">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-8 py-3 rounded-full text-base font-semibold transition-all duration-300 ${billingPeriod === 'monthly'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              월간 결제
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-8 py-3 rounded-full text-base font-semibold transition-all duration-300 flex items-center gap-2 ${billingPeriod === 'yearly'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              연간 결제
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${billingPeriod === 'yearly' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}>
                17% Off
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
          {/* Basic Plan */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-[40px] p-10 flex flex-col transition-transform duration-300 hover:scale-[1.01]">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-zinc-100">Basic Plan</h3>
              <p className="mt-2 text-zinc-400">부담 없이 시작하는 주짓수 라이프.</p>
            </div>

            <div className="mb-8">
              {billingPeriod === 'monthly' ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-zinc-50">
                    ₩{pricing.basic.monthly.price.toLocaleString()}
                  </span>
                  <span className="text-xl text-zinc-500">/월</span>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-zinc-50">
                      ₩{getMonthlyEquivalent(pricing.basic.yearly.price).toLocaleString()}
                    </span>
                    <span className="text-xl text-zinc-500">/월</span>
                  </div>
                  <p className="text-sm text-violet-400 font-medium mt-2">
                    연간 결제 시 ₩{pricing.basic.yearly.price.toLocaleString()}
                  </p>
                </>
              )}
            </div>

            <ul className="space-y-4 flex-1 mb-10">
              {[
                '모든 강좌 무제한 시청',
                '매주 업데이트되는 신규 기술',
                '스파링 분석 영상 접근',
                '루틴 30% 할인 구매'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="flex-shrink-0 w-6 h-6 text-violet-400" />
                  <span className="text-zinc-300 text-lg">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full h-14 rounded-2xl text-lg font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors"
              onClick={() => handleSubscription(
                billingPeriod === 'monthly' ? pricing.basic.monthly.priceId : pricing.basic.yearly.priceId
              )}
              disabled={loading || (isSubscribed && currentTier === 'basic') || (isSubscribed && currentTier === 'premium')}
            >
              {isSubscribed && currentTier === 'basic' ? '현재 플랜' : isSubscribed && currentTier === 'premium' ? '다운그레이드 불가' : 'Basic 시작하기'}
            </Button>
          </div>

          {/* Premium Plan (Recommended) */}
          <div className="relative bg-zinc-900/40 backdrop-blur-xl border border-violet-500/50 rounded-[40px] p-10 flex flex-col shadow-[0_0_40px_rgba(124,58,237,0.15)] transition-transform duration-300 hover:scale-[1.01]">
            <div className="absolute top-0 right-10 -translate-y-1/2">
              <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-white" />
                Recommended
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-zinc-50">Premium Plan</h3>
              <p className="mt-2 text-violet-200/80">진지하게 수련하는 분들을 위한 선택.</p>
            </div>

            <div className="mb-8">
              {billingPeriod === 'monthly' ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-zinc-50">
                      ₩{pricing.premium.monthly.price.toLocaleString()}
                    </span>
                    <span className="text-xl text-zinc-500">/월</span>
                  </div>
                  <p className="text-sm text-violet-400 font-medium mt-2">
                    베이직 + 1만원으로 모든 혜택
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-zinc-50">
                      ₩{getMonthlyEquivalent(pricing.premium.yearly.price).toLocaleString()}
                    </span>
                    <span className="text-xl text-zinc-500">/월</span>
                  </div>
                  <p className="text-sm text-violet-400 font-medium mt-2">
                    연간 결제 시 ₩{pricing.premium.yearly.price.toLocaleString()}
                  </p>
                </>
              )}
            </div>

            <ul className="space-y-4 flex-1 mb-10">
              {[
                '베이직의 모든 혜택 포함',
                '모든 루틴 무제한 접근',
                '신규 루틴 자동 추가',
                '오프라인 세미나 우선권',
                '인스트럭터 Q&A 우선 답변'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="flex-shrink-0 w-6 h-6 text-violet-400" />
                  <span className="text-zinc-100 text-lg font-medium">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full h-14 rounded-2xl text-lg font-black bg-zinc-100 text-zinc-950 hover:bg-white transition-colors shadow-lg shadow-violet-900/20"
              onClick={() => handleSubscription(
                billingPeriod === 'monthly' ? pricing.premium.monthly.priceId : pricing.premium.yearly.priceId
              )}
              disabled={loading || (isSubscribed && currentTier === 'premium')}
            >
              {isSubscribed && currentTier === 'premium' ? '현재 플랜' : 'Premium 시작하기'}
            </Button>
          </div>
        </div>

        <div className="mt-20 text-center">
          <p className="text-zinc-500 mb-4">구독이 부담스러우신가요?</p>
          <Link to="/bundles" className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">
            번들 패키지 둘러보기 &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
