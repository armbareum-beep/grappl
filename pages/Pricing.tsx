import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { purchaseSubscription } from '../lib/api';

export const Pricing: React.FC = () => {
  const { user, isSubscribed } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleSubscription = async (plan: 'monthly' | 'yearly') => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const { error } = await purchaseSubscription(user.id, plan);
      if (error) {
        alert('구독 처리 중 오류가 발생했습니다.');
      } else {
        alert('구독이 완료되었습니다! 🎉\n이제 모든 강좌를 무제한으로 이용할 수 있습니다.');
        // Force reload to update context state since we're using localStorage
        window.location.href = '/#/browse';
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="bg-slate-50 py-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">이미 구독 중입니다! 🎉</h2>
          <p className="text-slate-600 mb-8">모든 강좌를 무제한으로 이용하실 수 있습니다.</p>
          <Link to="/browse">
            <Button size="lg">강좌 보러 가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-base font-semibold text-blue-600 tracking-wide uppercase">요금제</h2>
        <p className="mt-1 text-4xl font-black text-slate-900 sm:text-5xl lg:text-6xl">
          당신에게 맞는 플랜을 선택하세요
        </p>
        <p className="max-w-2xl mt-5 mx-auto text-xl text-slate-500">
          단품 구매로 필요한 기술만 배우거나, 구독을 통해 모든 콘텐츠를 누리세요.
        </p>

        <div className="mt-16 grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
          {/* Single Plan */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col">
            <h3 className="text-xl font-semibold text-slate-900">단품 구매</h3>
            <p className="mt-4 text-slate-500 text-sm">특정 기술이나 세미나가 필요할 때.</p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-slate-900">₩15,000~</span>
            </div>
            <ul className="mt-6 space-y-4 flex-1">
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
                <span className="ml-3 text-slate-600 text-sm text-left">해당 영상 평생 소장</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
                <span className="ml-3 text-slate-600 text-sm text-left">고화질 시청</span>
              </li>
            </ul>
            <div className="mt-8">
              <Link to="/browse">
                <Button variant="outline" className="w-full">영상 둘러보기</Button>
              </Link>
            </div>
          </div>

          {/* Monthly Subscription */}
          <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-8 flex flex-col transform md:-translate-y-4 relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
              BEST VALUE
            </div>
            <h3 className="text-xl font-semibold text-white">월간 구독</h3>
            <p className="mt-4 text-slate-400 text-sm">지속적인 성장을 위한 최고의 선택.</p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-white">₩29,000</span>
              <span className="text-base font-medium text-slate-400">/월</span>
            </div>
            <ul className="mt-6 space-y-4 flex-1">
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-5 h-5 text-blue-400" />
                <span className="ml-3 text-slate-300 text-sm text-left">모든 강좌 무제한 시청</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-5 h-5 text-blue-400" />
                <span className="ml-3 text-slate-300 text-sm text-left">매주 업데이트되는 신규 기술</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-5 h-5 text-blue-400" />
                <span className="ml-3 text-slate-300 text-sm text-left">스파링 분석 영상 접근 권한</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-5 h-5 text-blue-400" />
                <span className="ml-3 text-slate-300 text-sm text-left">언제든지 해지 가능</span>
              </li>
            </ul>
            <div className="mt-8">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 border-none"
                onClick={() => handleSubscription('monthly')}
                disabled={loading}
              >
                {loading ? '처리 중...' : '지금 구독하기'}
              </Button>
            </div>
          </div>

          {/* Yearly Plan */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col">
            <h3 className="text-xl font-semibold text-slate-900">연간 구독</h3>
            <p className="mt-4 text-slate-500 text-sm">1년 결제하고 2개월 무료 혜택.</p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-slate-900">₩290,000</span>
              <span className="text-base font-medium text-slate-500">/년</span>
            </div>
            <ul className="mt-6 space-y-4 flex-1">
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
                <span className="ml-3 text-slate-600 text-sm text-left">월간 구독의 모든 혜택</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
                <span className="ml-3 text-slate-600 text-sm text-left">오프라인 세미나 우선권</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
                <span className="ml-3 text-slate-600 text-sm text-left">한정판 굿즈 증정</span>
              </li>
            </ul>
            <div className="mt-8">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSubscription('yearly')}
                disabled={loading}
              >
                {loading ? '처리 중...' : '연간 결제하기'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
