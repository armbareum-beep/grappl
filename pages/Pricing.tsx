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

  const getDiscountPercent = (monthly: number, yearly: number) => {
    return Math.round((1 - yearly / (monthly * 12)) * 100);
  };

  return (
    <div className="bg-slate-950 py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Current Subscription Status */}
        {isSubscribed && currentTier && (
          <div className="mb-12 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-yellow-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">
                    현재 플랜: {currentTier === 'premium' ? 'Pro (프리미엄)' : 'Basic (베이직)'}
                  </h3>
                  <p className="text-sm text-slate-300">
                    {currentTier === 'premium'
                      ? '모든 강좌와 루틴을 무제한으로 이용 중입니다'
                      : '모든 강좌를 무제한으로 이용 중입니다'}
                  </p>
                </div>
              </div>
              {currentTier === 'basic' && (
                <Button
                  onClick={() => handleSubscription(pricing.premium[billingPeriod].priceId)}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <TrendingUp className="w-4 h-4" />
                  Pro로 업그레이드
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="text-center">
          <h2 className="text-base font-semibold text-blue-400 tracking-wide uppercase">요금제</h2>
          <p className="mt-1 text-3xl font-black text-white sm:text-5xl lg:text-6xl">
            당신에게 맞는 플랜을 선택하세요
          </p>
          <p className="max-w-2xl mt-5 mx-auto text-lg md:text-xl text-slate-400">
            단품 구매로 필요한 기술만 배우거나, 구독을 통해 모든 콘텐츠를 누리세요.
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${billingPeriod === 'monthly'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
          >
            월간 결제
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all relative ${billingPeriod === 'yearly'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
          >
            연간 결제
            <span className="absolute -top-2 -right-2 bg-amber-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
              17% 할인
            </span>
          </button>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
          {/* Basic Plan */}
          <div className="bg-slate-900 rounded-2xl shadow-xl border-2 border-slate-700 p-6 md:p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-slate-700 text-white px-4 py-1 rounded-bl-xl text-sm font-bold">
              베이직
            </div>
            <h3 className="text-2xl font-bold text-white mt-2">강의 무제한</h3>
            <p className="mt-4 text-slate-400">부담 없이 시작하는 주짓수 라이프.</p>

            <div className="mt-6">
              {billingPeriod === 'monthly' ? (
                <>
                  <span className="text-4xl md:text-5xl font-black text-white">
                    ₩{pricing.basic.monthly.price.toLocaleString()}
                  </span>
                  <span className="text-lg font-medium text-slate-400">/월</span>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl md:text-5xl font-black text-white">
                      ₩{getMonthlyEquivalent(pricing.basic.yearly.price).toLocaleString()}
                    </span>
                    <span className="text-2xl font-bold text-slate-500 line-through">
                      ₩{pricing.basic.monthly.price.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-lg font-medium text-slate-400">/월</span>
                  <p className="text-sm text-blue-400 font-medium mt-2">
                    🔥 연간 결제 시 {getDiscountPercent(pricing.basic.monthly.price, pricing.basic.yearly.price)}% 할인 (총 ₩{pricing.basic.yearly.price.toLocaleString()})
                  </p>
                </>
              )}
            </div>

            <ul className="mt-8 space-y-4 flex-1">
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-blue-400" />
                <span className="ml-3 text-slate-300 text-lg">모든 강좌 무제한 시청</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-blue-400" />
                <span className="ml-3 text-slate-300 text-lg">매주 업데이트되는 신규 기술</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-blue-400" />
                <span className="ml-3 text-slate-300 text-lg">스파링 분석 영상 접근</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-blue-400" />
                <span className="ml-3 text-slate-300 text-lg">루틴 30% 할인 구매</span>
              </li>
            </ul>

            <div className="mt-8">
              <Button
                className="w-full h-14 text-lg bg-slate-700 hover:bg-slate-600 shadow-lg"
                onClick={() =>
                  handleSubscription(
                    billingPeriod === 'monthly' ? pricing.basic.monthly.priceId : pricing.basic.yearly.priceId
                  )
                }
                disabled={loading || (isSubscribed && currentTier === 'basic') || (isSubscribed && currentTier === 'premium')}
              >
                {isSubscribed && currentTier === 'basic'
                  ? '현재 플랜'
                  : isSubscribed && currentTier === 'premium'
                    ? '다운그레이드 불가'
                    : loading
                      ? '처리 중...'
                      : '베이직 시작하기'}
              </Button>
              {billingPeriod === 'monthly' && (
                <p className="text-xs text-center text-slate-500 mt-3">언제든 해지 가능</p>
              )}
            </div>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-2xl border-2 border-blue-500 p-6 md:p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-1 rounded-bl-xl text-sm font-bold flex items-center gap-1">
              <Zap className="w-4 h-4" />
              추천
            </div>
            <h3 className="text-2xl font-bold text-white mt-2">강의 + 루틴 무제한</h3>
            <p className="mt-4 text-blue-100">진지하게 수련하는 분들을 위한 선택.</p>

            <div className="mt-6">
              {billingPeriod === 'monthly' ? (
                <>
                  <span className="text-4xl md:text-5xl font-black text-white">
                    ₩{pricing.premium.monthly.price.toLocaleString()}
                  </span>
                  <span className="text-lg font-medium text-blue-100">/월</span>
                  <p className="text-sm text-amber-300 font-medium mt-2">
                    💪 베이직 대비 월 1만원 추가로 루틴 무제한!
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl md:text-5xl font-black text-white">
                      ₩{getMonthlyEquivalent(pricing.premium.yearly.price).toLocaleString()}
                    </span>
                    <span className="text-2xl font-bold text-blue-300 line-through">
                      ₩{pricing.premium.monthly.price.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-lg font-medium text-blue-100">/월</span>
                  <p className="text-sm text-amber-300 font-medium mt-2">
                    🔥 연간 결제 시 {getDiscountPercent(pricing.premium.monthly.price, pricing.premium.yearly.price)}% 할인 (총 ₩{pricing.premium.yearly.price.toLocaleString()})
                  </p>
                </>
              )}
            </div>

            <ul className="mt-8 space-y-4 flex-1">
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-amber-300" />
                <span className="ml-3 text-white text-lg font-semibold">베이직의 모든 혜택</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-amber-300" />
                <span className="ml-3 text-white text-lg font-semibold">모든 루틴 무제한 접근</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-amber-300" />
                <span className="ml-3 text-white text-lg">신규 루틴 자동 추가</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-amber-300" />
                <span className="ml-3 text-white text-lg">오프라인 세미나 우선권</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-amber-300" />
                <span className="ml-3 text-white text-lg">인스트럭터 Q&A 우선 답변</span>
              </li>
            </ul>

            <div className="mt-8">
              <Button
                className="w-full h-14 text-lg bg-white text-blue-600 hover:bg-blue-50 shadow-lg font-bold"
                onClick={() =>
                  handleSubscription(
                    billingPeriod === 'monthly' ? pricing.premium.monthly.priceId : pricing.premium.yearly.priceId
                  )
                }
                disabled={loading || (isSubscribed && currentTier === 'premium')}
              >
                {isSubscribed && currentTier === 'premium' ? '현재 플랜' : loading ? '처리 중...' : '프리미엄 시작하기'}
              </Button>
              {billingPeriod === 'monthly' && (
                <p className="text-xs text-center text-blue-200 mt-3">언제든 해지 가능</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-500 mb-4">구독이 부담스러우신가요?</p>
          <Link to="/browse" className="text-blue-600 font-semibold hover:underline">
            단품 강좌 둘러보기 &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
