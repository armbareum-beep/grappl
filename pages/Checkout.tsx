import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PayPalButtons } from '@paypal/react-paypal-js';
import * as PortOne from '@portone/browser-sdk/v2';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { validateCoupon } from '../lib/api';
import { Button } from '../components/Button';
import { Ticket, Tag, Check, AlertCircle, ShieldCheck, CreditCard, Globe, ArrowLeft } from 'lucide-react';

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

    // Coupon states
    const [couponCode, setCouponCode] = useState('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [discountedAmount, setDiscountedAmount] = useState(0);

    useEffect(() => {
        if (user) {
            // Pre-fill name if available
            setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            navigate('/login', { state: { from: location } });
            return;
        }

        fetchProductInfo();
    }, [user, type, id]);

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
                navigate('/payment/complete');
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
                            <p className="text-zinc-400 mb-8 font-medium">{productTitle}</p>

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

                    {/* Right: Payment Methods */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-[60px] rounded-full"></div>

                            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                                Payment Method
                            </h2>

                            <div className="space-y-8">
                                {/* PayPal */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-blue-400 font-bold" />
                                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">해외 (PayPal)</h3>
                                        </div>
                                        <span className="text-xs font-black text-blue-400 italic">${usdAmount} USD</span>
                                    </div>
                                    <PayPalButtons
                                        style={{ layout: "vertical", color: "blue", shape: "rect", label: "checkout" }}
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
                                            setError('PayPal 결제 중 오류가 발생했습니다.');
                                        }}
                                    />
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-zinc-800"></div>
                                    </div>
                                    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]">
                                        <span className="px-4 bg-zinc-900 text-zinc-600">OR</span>
                                    </div>
                                </div>

                                {/* Domestic */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-emerald-400" />
                                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">국내 (카드/간편결제)</h3>
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
                                                const response = await PortOne.requestPayment({
                                                    storeId: import.meta.env.VITE_PORTONE_STORE_ID,
                                                    channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY,
                                                    paymentId: `payment-${Date.now()}`,
                                                    orderName: productTitle,
                                                    totalAmount: discountedAmount,
                                                    currency: "KRW",
                                                    payMethod: "CARD",
                                                    customer: {
                                                        email: user?.email,
                                                        phoneNumber: phoneNumber || undefined,
                                                        fullName: fullName || undefined,
                                                    },
                                                });

                                                if (response?.code != null) {
                                                    alert(`결제 실패: ${response.message}`);
                                                    return;
                                                }

                                                const { data: { session } } = await supabase.auth.getSession();
                                                if (!session) throw new Error('Not authenticated');

                                                const verifyResponse = await fetch(
                                                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-portone-payment`,
                                                    {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${session.access_token}`,
                                                        },
                                                        body: JSON.stringify({
                                                            paymentId: response?.paymentId || '',
                                                            mode: type,
                                                            id: id,
                                                            userId: user?.id,
                                                            couponCode: appliedCoupon?.code
                                                        }),
                                                    }
                                                );

                                                if (!verifyResponse.ok) {
                                                    throw new Error('결제 검증 실패');
                                                }

                                                navigate('/payment/complete');
                                            } catch (err: any) {
                                                setError(`국내 결제 초기화 실패: ${err.message || JSON.stringify(err)}`);
                                            }
                                        }}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-6 rounded-[20px] transition-all duration-300 shadow-lg shadow-emerald-900/20 active:scale-95 uppercase tracking-tighter italic text-lg"
                                    >
                                        결제하기
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Terms Section */}
                        <div className="p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800/50">
                            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Refund Policy</h3>
                            <div className="space-y-3 text-[10px] text-zinc-500 leading-relaxed font-medium">
                                <p>• 강좌 구매 후 7일 이내, 수강 진도율 10% 미만인 경우 전액 환불이 가능합니다.</p>
                                <p>• 구독 서비스는 결제일로부터 7일 이내 미사용 시 전액 환불됩니다.</p>
                                <p>• 환불은 고객센터를 통해 신청해주시기 바랍니다.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
