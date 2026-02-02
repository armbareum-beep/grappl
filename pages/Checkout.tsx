import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import * as PortOne from '@portone/browser-sdk/v2';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { validateCoupon } from '../lib/api';
import { Button } from '../components/Button';
import { Ticket, Tag, Check, AlertCircle, ShieldCheck, CreditCard, Globe, ArrowLeft, RefreshCw } from 'lucide-react';

export const Checkout: React.FC = () => {
    const { type, id } = useParams<{ type: string; id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [amount, setAmount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [productTitle, setProductTitle] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [fullName, setFullName] = useState('');

    // Get return URL from location state
    const returnUrl = (location.state as any)?.returnUrl;

    // Coupon states
    const [couponCode, setCouponCode] = useState('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [discountedAmount, setDiscountedAmount] = useState(0);
    const [activeTab, setActiveTab] = useState<'domestic' | 'paypal'>('domestic');

    const isYearly = productTitle.includes('(연간)');

    useEffect(() => {
        if (user) {
            // Pre-fill name if available
            setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
        }
    }, [user?.id]);

    useEffect(() => {
        if (!user) {
            navigate('/login', { state: { from: location } });
            return;
        }

        fetchProductInfo();
    }, [user?.id, type, id]);

    const fetchProductInfo = async () => {
        setLoading(true);
        try {
            let initialAmount = 0;
            if (type === 'course') {
                const { data: course } = await supabase.from('courses').select('title, price').eq('id', id).single();
                initialAmount = course?.price || 0;
                setProductTitle(course?.title || '강좌');
            } else if (type === 'routine') {
                const { data: routine } = await supabase.from('routines').select('title, price').eq('id', id).single();
                initialAmount = routine?.price || 0;
                setProductTitle(routine?.title || '루틴');
            } else if (type === 'feedback') {
                const { data: feedback } = await supabase.from('feedback_requests').select('price').eq('id', id).single();
                initialAmount = feedback?.price || 0;
                setProductTitle('피드백 요청');
            } else if (type === 'bundle') {
                const { data: bundle } = await supabase.from('bundles').select('title, price').eq('id', id).single();
                initialAmount = bundle?.price || 0;
                setProductTitle(bundle?.title || '번들 패키지');
            } else if (type === 'subscription') {
                const isPro = id?.includes('price_1SYHx') || id?.includes('price_1SYI2');
                const isYearly = id?.includes('price_1SYHw') || id?.includes('price_1SYI2');

                if (isPro) {
                    initialAmount = isYearly ? 390000 : 39000;
                    setProductTitle(isYearly ? 'Pro 구독 (연간)' : 'Pro 구독 (월간)');
                } else {
                    initialAmount = isYearly ? 290000 : 29000;
                    setProductTitle(isYearly ? 'Basic 구독 (연간)' : 'Basic 구독 (월간)');
                }
            }
            setAmount(initialAmount);
            setDiscountedAmount(initialAmount);
            setLoading(false);
        } catch (err: any) {
            console.error('Error fetching product info:', err);
            setError('상품 정보를 불러오는 중 오류가 발생했습니다.');
            setLoading(false);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setIsApplyingCoupon(true);
        setCouponError(null);

        try {
            const { data, error: vError } = await validateCoupon(couponCode);
            if (vError) {
                setCouponError(vError.message || '유효하지 않은 쿠폰입니다.');
                setAppliedCoupon(null);
                setDiscountedAmount(amount);
            } else if (data) {
                setAppliedCoupon(data);
                let newAmount = amount;
                if (data.discountType === 'percent') {
                    newAmount = amount * (1 - data.value / 100);
                } else if (data.discountType === 'fixed') {
                    newAmount = Math.max(0, amount - data.value);
                }
                setDiscountedAmount(Math.round(newAmount));
            }
        } catch (err) {
            setCouponError('쿠폰 검증 중 오류가 발생했습니다.');
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    // Convert KRW to USD (Updated to 1430 for more accuracy)
    const usdAmount = (discountedAmount / 1430).toFixed(2);

    const handleSuccess = async (details: any) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-paypal-payment`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        orderID: details.id,
                        mode: type,
                        id: id,
                        userId: user!.id,
                        couponCode: appliedCoupon?.code,
                        details: details
                    }),
                }
            );

            if (response.ok) {
                // Pass returnUrl to payment complete page
                navigate('/payment/complete', { state: { returnUrl } });
            } else {
                const err = await response.json();
                throw new Error(err.error || '결제 검증에 실패했습니다.');
            }
        } catch (err: any) {
            console.error('Success callback error:', err);
            alert(err.message || '결제 완료 처리 중 오류가 발생했습니다. 고객센터로 문의해주세요.');
        }
    };

    if (loading) {
        return <LoadingScreen message="결제 정보를 준비하고 있습니다..." />;
    }

    if (error) {
        return <ErrorScreen
            title="결제 오류"
            error={error}
            resetMessage="잠시 후 다시 시도하시거나 캐시를 삭제해 주세요."
        />;
    }

    return (
        <div className="min-h-screen bg-zinc-950 py-12 md:py-20 selection:bg-violet-500/30">
            <div className="max-w-4xl mx-auto px-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    <span className="font-bold text-sm">뒤로 가기</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left: Summary & Coupons */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl">
                            <h1 className="text-3xl font-black text-white mb-2 tracking-tight italic uppercase transform -skew-x-2">Checkout</h1>
                            <p className="text-zinc-400 mb-6 font-medium">{productTitle}</p>

                            {type === 'subscription' && (
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-8 border ${isYearly
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                    }`}>
                                    {isYearly ? (
                                        <>
                                            <CreditCard className="w-3.5 h-3.5" />
                                            <span>1회 결제 (12개월 이용권)</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            <span>매월 자동 결제</span>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-zinc-500 font-medium">
                                    <span>주문 금액</span>
                                    <span>₩{amount.toLocaleString()}</span>
                                </div>

                                {appliedCoupon && (
                                    <div className="flex justify-between items-center text-emerald-400 font-bold">
                                        <span className="flex items-center gap-1.5 uppercase text-xs tracking-wider">
                                            <Tag className="w-3.5 h-3.5" /> Coupon Discount
                                        </span>
                                        <span>-₩{(amount - discountedAmount).toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-zinc-800 flex justify-between items-end">
                                    <span className="text-zinc-300 font-bold">최종 결제 금액</span>
                                    <div className="text-right">
                                        <div className="text-4xl font-black text-white leading-none">
                                            ₩{discountedAmount.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Coupon Section */}
                            <div className="pt-8 border-t border-zinc-800">
                                {!appliedCoupon ? (
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Promotional Code</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="text"
                                                    value={couponCode}
                                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                    placeholder="쿠폰 코드를 입력하세요"
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all font-bold"
                                                />
                                            </div>
                                            <Button
                                                onClick={handleApplyCoupon}
                                                disabled={!couponCode || isApplyingCoupon}
                                                className="rounded-2xl px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-none font-bold"
                                            >
                                                {isApplyingCoupon ? '...' : '적용'}
                                            </Button>
                                        </div>
                                        {couponError && (
                                            <p className="text-xs text-rose-500 font-medium pl-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {couponError}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <Check className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-emerald-400 text-sm font-black uppercase tracking-wider">Coupon Applied</p>
                                                <p className="text-emerald-500/60 text-xs font-bold">{appliedCoupon.code}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setAppliedCoupon(null);
                                                setDiscountedAmount(amount);
                                                setCouponCode('');
                                            }}
                                            className="text-zinc-500 hover:text-white transition-colors text-xs font-black underline underline-offset-4"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Security Badge */}
                        <div className="flex items-center justify-center gap-6 py-4 bg-zinc-900/30 rounded-3xl border border-zinc-800/50">
                            <div className="flex items-center gap-2 text-zinc-500">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Secure Checkout</span>
                            </div>
                            <div className="w-px h-4 bg-zinc-800"></div>
                            <div className="flex items-center gap-2 text-zinc-500">
                                <Globe className="w-5 h-5 text-violet-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Global Access</span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-[60px] rounded-full pointer-events-none"></div>

                            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                                Payment Method
                            </h2>

                            {/* Tabs Header */}
                            <div className="flex bg-zinc-950 p-1.5 rounded-2xl mb-8 border border-zinc-800/50">
                                <button
                                    onClick={() => setActiveTab('domestic')}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'domestic'
                                        ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                        : 'text-zinc-600 hover:text-zinc-400'
                                        }`}
                                >
                                    국내 결제
                                </button>
                                <button
                                    onClick={() => setActiveTab('paypal')}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'paypal'
                                        ? 'bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                                        : 'text-zinc-600 hover:text-zinc-400'
                                        }`}
                                >
                                    해외 결제
                                </button>
                            </div>

                            <div className="min-h-[400px]">
                                {/* Domestic Tab */}
                                {activeTab === 'domestic' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-emerald-400" />
                                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">카드/간편결제 (KRW)</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="홍길동"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    className="w-full bg-zinc-950 text-white rounded-2xl px-4 py-3 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Phone</label>
                                                <input
                                                    type="tel"
                                                    placeholder="010-0000-0000"
                                                    value={phoneNumber}
                                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                                    className="w-full bg-zinc-950 text-white rounded-2xl px-4 py-3 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                if (!phoneNumber || !fullName) {
                                                    alert('이름과 연락처를 모두 입력해주세요.');
                                                    return;
                                                }
                                                try {
                                                    const isMonthlySubscription = type === 'subscription' && !productTitle.includes('(연간)');

                                                    // Determine Channel Key (V2 Specific)
                                                    // User Request: Yearly Subscription should use GENERAL Channel (One-time payment)
                                                    const channelKey = (type === 'subscription' && isMonthlySubscription)
                                                        ? import.meta.env.VITE_PORTONE_CHANNEL_KEY_SUBSCRIPTION
                                                        : import.meta.env.VITE_PORTONE_CHANNEL_KEY_GENERAL;

                                                    let response;
                                                    // Monthly Subscription -> Issue Billing Key
                                                    if (isMonthlySubscription) {
                                                        response = await PortOne.requestIssueBillingKey({
                                                            storeId: import.meta.env.VITE_PORTONE_STORE_ID,
                                                            channelKey: channelKey,
                                                            billingKeyMethod: "CARD",
                                                            issueName: productTitle,
                                                            issueId: `issue-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                                                            customer: {
                                                                customerId: user?.id, // Updated for V2
                                                                email: user?.email,
                                                                phoneNumber: phoneNumber ? phoneNumber.replace(/-/g, '') : undefined,
                                                                fullName: fullName || undefined,
                                                            },
                                                        });
                                                    }
                                                    // Yearly Pass & Others -> One-time Payment
                                                    else {
                                                        response = await PortOne.requestPayment({
                                                            storeId: import.meta.env.VITE_PORTONE_STORE_ID,
                                                            channelKey: channelKey,
                                                            paymentId: `payment-${Date.now()}`,
                                                            orderName: productTitle,
                                                            totalAmount: discountedAmount,
                                                            currency: "KRW",
                                                            payMethod: "CARD",
                                                            customer: {
                                                                customerId: user?.id, // Updated for V2
                                                                email: user?.email,
                                                                phoneNumber: phoneNumber ? phoneNumber.replace(/-/g, '') : undefined,
                                                                fullName: fullName || undefined,
                                                            },
                                                        });
                                                    }

                                                    if (response?.code != null) {
                                                        alert(`결제 실패: ${response.message}`);
                                                        return;
                                                    }

                                                    const { data: { session } } = await supabase.auth.getSession();
                                                    if (!session) throw new Error('Not authenticated');

                                                    const anyResponse = response as any;

                                                    const verifyResponse = await fetch(
                                                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-portone-payment`,
                                                        {
                                                            method: 'POST',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                                'Authorization': `Bearer ${session.access_token}`,
                                                            },
                                                            body: JSON.stringify({
                                                                paymentId: anyResponse?.paymentId || '',
                                                                billingKey: anyResponse?.billingKey || '',
                                                                mode: type,
                                                                id: id,
                                                                userId: user?.id,
                                                                couponCode: appliedCoupon?.code,
                                                                amount: isMonthlySubscription ? discountedAmount : undefined
                                                            }),
                                                        }
                                                    );

                                                    if (!verifyResponse.ok) throw new Error('결제 검증 실패');

                                                    navigate('/payment/complete', { state: { returnUrl } });
                                                } catch (err: any) {
                                                    console.error(err);
                                                    setError(`결제 처리 실패: ${err.message}`);
                                                }
                                            }}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-6 rounded-[20px] transition-all duration-300 shadow-lg shadow-emerald-900/20 active:scale-95 uppercase tracking-tighter italic text-lg"
                                        >
                                            {type === 'subscription' && !productTitle.includes('(연간)') ? '정기결제 시작하기' : '결제하기'}
                                        </button>
                                    </div>
                                )}

                                {/* PayPal Tab */}
                                {activeTab === 'paypal' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex justify-between items-center bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-blue-400 font-bold" />
                                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">해외 결제 (USD)</h3>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-[10px] font-black text-blue-400/50 uppercase tracking-widest">Estimated</span>
                                                <span className="text-sm font-black text-blue-400 italic">${usdAmount} USD</span>
                                            </div>
                                        </div>

                                        <div className="relative z-10 min-h-[150px] flex flex-col items-center justify-center">
                                            <PayPalButtonsSection
                                                usdAmount={usdAmount}
                                                productTitle={productTitle}
                                                handleSuccess={handleSuccess}
                                                setError={setError}
                                            />
                                        </div>
                                        <p className="text-[10px] text-zinc-500 text-center font-bold uppercase tracking-wider">
                                            * Domestic cards might be declined by PayPal.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Terms Section */}
                        <div className="p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800/50">
                            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Refund Policy & Terms</h3>
                            <div className="space-y-3 text-[10px] text-zinc-500 leading-relaxed font-medium">
                                {(type === 'course' || type === 'bundle') && (
                                    <p className="text-zinc-400">
                                        • 본 상품은 평생 소장 상품입니다. 단, 결제일로부터 1년은 유료 서비스 기간, 그 이후는 무료 서비스 제공 기간으로 산정됩니다.
                                    </p>
                                )}
                                <p>• 강좌/디지털 콘텐츠 구매 후 7일 이내, 이용 기록이 없는 경우 전액 환불 가능합니다.</p>
                                <p>• 구독 서비스는 결제일로부터 7일 이내 미사용 시 전액 환불됩니다.</p>
                                <p>• 환불 문의는 고객센터 채널을 이용해 주시기 바랍니다.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper component for PayPal buttons with loading state
const PayPalButtonsSection: React.FC<{
    usdAmount: string;
    productTitle: string;
    handleSuccess: (details: any) => Promise<void>;
    setError: (msg: string) => void;
}> = ({ usdAmount, productTitle, handleSuccess, setError }) => {
    const [{ isPending, isRejected }] = usePayPalScriptReducer();

    return (
        <div className="w-full">
            {isPending && (
                <div className="flex flex-col items-center gap-4 py-8">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic animate-pulse">Initializing Global Payment Engine...</p>
                </div>
            )}
            {isRejected && (
                <div className="flex flex-col items-center gap-4 py-8 bg-red-500/5 rounded-2xl border border-red-500/10">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest italic">Failed to load PayPal Engine</p>
                    <p className="text-[10px] text-zinc-500 text-center px-4">Possible reason: Missing Client ID or Network issue.</p>
                </div>
            )}
            <PayPalButtons
                style={{ layout: "vertical", color: "blue", shape: "rect", label: "checkout" }}
                forceReRender={[usdAmount]}
                createOrder={(_, actions) => {
                    return actions.order.create({
                        intent: "CAPTURE",
                        purchase_units: [
                            {
                                amount: {
                                    currency_code: "USD",
                                    value: usdAmount,
                                },
                                description: productTitle,
                            },
                        ],
                    });
                }}
                onApprove={async (_, actions) => {
                    if (actions.order) {
                        const details = await actions.order.capture();
                        await handleSuccess(details);
                    }
                }}
                onError={(err) => {
                    console.error('PayPal Error:', err);
                    setError('PayPal 결제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                }}
            />
        </div>
    );
};
