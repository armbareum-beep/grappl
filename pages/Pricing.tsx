import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { PaymentModal } from '../components/payment/PaymentModal';

export const Pricing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);

  const handleSubscription = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Open Stripe Payment Modal
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    alert('구독이 완료되었습니다! 🎉\n이제 모든 강좌를 무제한으로 이용할 수 있습니다.');
    window.location.href = '/#/browse';
    window.location.reload();
  };

  // if (isSubscribed) {
  //   return (
  //     <div className="bg-slate-50 py-20 min-h-screen flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
  //           <Check className="w-8 h-8" />
  //         </div>
  //         <h2 className="text-3xl font-bold text-slate-900 mb-4">이미 구독 중입니다! 🎉</h2>
  //         <p className="text-slate-600 mb-8">모든 강좌를 무제한으로 이용하실 수 있습니다.</p>
  //         <Link to="/browse">
  //           <Button size="lg">강좌 보러 가기</Button>
  //         </Link>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="bg-slate-50 py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-base font-semibold text-blue-600 tracking-wide uppercase">요금제</h2>
        <p className="mt-1 text-3xl font-black text-slate-900 sm:text-5xl lg:text-6xl">
          당신에게 맞는 플랜을 선택하세요
        </p>
        <p className="max-w-2xl mt-5 mx-auto text-lg md:text-xl text-slate-500">
          단품 구매로 필요한 기술만 배우거나, 구독을 통해 모든 콘텐츠를 누리세요.
        </p>

        <div className="mt-16 grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
          {/* Monthly Subscription */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-100 p-6 md:p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-xl text-sm font-bold">
              첫 달 무료 체험
            </div>
            <h3 className="text-2xl font-bold text-slate-900">월간 멤버십</h3>
            <p className="mt-4 text-slate-500">부담 없이 시작하는 주짓수 라이프.</p>
            <div className="mt-6">
              <span className="text-4xl md:text-5xl font-black text-slate-900">₩39,000</span>
              <span className="text-lg font-medium text-slate-500">/월</span>
            </div>
            <p className="text-sm text-blue-600 font-medium mt-2">✨ 첫 달 0원, 언제든 해지 가능</p>

            <ul className="mt-8 space-y-4 flex-1">
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-blue-500" />
                <span className="ml-3 text-slate-700 text-lg">모든 강좌 무제한 시청</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-blue-500" />
                <span className="ml-3 text-slate-700 text-lg">매주 업데이트되는 신규 기술</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-blue-500" />
                <span className="ml-3 text-slate-700 text-lg">스파링 분석 영상 접근 권한</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-blue-500" />
                <span className="ml-3 text-slate-700 text-lg">단품 구매 시 추가 할인</span>
              </li>
            </ul>
            <div className="mt-8">
              <Button
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                onClick={handleSubscription}
                disabled={loading}
              >
                {loading ? '처리 중...' : '1개월 무료로 시작하기'}
              </Button>
              <p className="text-xs text-center text-slate-400 mt-3">체험 기간 종료 후 자동 결제됩니다.</p>
            </div>
          </div>

          {/* Yearly Plan */}
          <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-6 md:p-8 flex flex-col relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-1.5 rounded-full text-sm font-bold shadow-lg w-max max-w-[90%] text-center whitespace-nowrap">
              BEST CHOICE (2개월 무료)
            </div>
            <h3 className="text-2xl font-bold text-white mt-2 md:mt-0">연간 멤버십</h3>
            <p className="mt-4 text-slate-400">진지하게 수련하는 분들을 위한 선택.</p>
            <div className="mt-6">
              <span className="text-4xl md:text-5xl font-black text-white">₩390,000</span>
              <span className="text-lg font-medium text-slate-400">/년</span>
            </div>
            <p className="text-sm text-amber-400 font-medium mt-2">🔥 월 32,500원 꼴 (17% 할인)</p>

            <ul className="mt-8 space-y-4 flex-1">
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-amber-400" />
                <span className="ml-3 text-slate-300 text-lg">월간 멤버십의 모든 혜택</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-amber-400" />
                <span className="ml-3 text-slate-300 text-lg">오프라인 세미나 우선권</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-amber-400" />
                <span className="ml-3 text-slate-300 text-lg">한정판 굿즈 증정</span>
              </li>
              <li className="flex items-start">
                <Check className="flex-shrink-0 w-6 h-6 text-amber-400" />
                <span className="ml-3 text-slate-300 text-lg">인스트럭터 Q&A 우선 답변</span>
              </li>
            </ul>
            <div className="mt-8">
              <Button
                variant="outline"
                className="w-full h-14 text-lg border-slate-700 text-white hover:bg-slate-800 hover:text-white"
                onClick={handleSubscription}
                disabled={loading}
              >
                {loading ? '처리 중...' : '연간 멤버십 가입하기'}
              </Button>
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

      {/* Payment Modal */}
      <PaymentModal
        mode="subscription"
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        courseTitle="Grappl Pro 월간 구독"
        price={39000}
      />
    </div>
  );
};
