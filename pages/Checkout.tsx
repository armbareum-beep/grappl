import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PayPalButtons } from '@paypal/react-paypal-js';
import * as PortOne from '@portone/browser-sdk/v2';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

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
            if (type === 'course') {
                const { data: course } = await supabase.from('courses').select('title, price').eq('id', id).single();
                setAmount(course?.price || 0);
                setProductTitle(course?.title || '강좌');
            } else if (type === 'routine') {
                const { data: routine } = await supabase.from('routines').select('title, price').eq('id', id).single();
                setAmount(routine?.price || 0);
                setProductTitle(routine?.title || '루틴');
            } else if (type === 'feedback') {
                const { data: feedback } = await supabase.from('feedback_requests').select('price').eq('id', id).single();
                setAmount(feedback?.price || 0);
                setProductTitle('피드백 요청');
            } else if (type === 'bundle') {
                const { data: bundle } = await supabase.from('bundles').select('title, price').eq('id', id).single();
                setAmount(bundle?.price || 0);
                setProductTitle(bundle?.title || '번들 패키지');
            } else if (type === 'subscription') {
                const isPro = id?.includes('price_1SYHx') || id?.includes('price_1SYI2');
                const isYearly = id?.includes('price_1SYHw') || id?.includes('price_1SYI2');

                if (isPro) {
                    setAmount(isYearly ? 390000 : 39000);
                    setProductTitle(isYearly ? 'Pro 구독 (연간)' : 'Pro 구독 (월간)');
                } else {
                    setAmount(isYearly ? 290000 : 29000);
                    setProductTitle(isYearly ? 'Basic 구독 (연간)' : 'Basic 구독 (월간)');
                }
            }
            setLoading(false);
        } catch (err: any) {
            console.error('Error fetching product info:', err);
            setError('상품 정보를 불러오는 중 오류가 발생했습니다.');
            setLoading(false);
        }
    };

    // Convert KRW to USD (Approx 1450 KRW = 1 USD for conservative estimate)
    const usdAmount = (amount / 1450).toFixed(2);

    const handleSuccess = async (details: any) => {
        try {
            // Call our future verify function or update DB directly (not recommended for production, but fast for launch)
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
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-2xl mx-auto px-4">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">
                    <h1 className="text-3xl font-bold text-white mb-2">결제</h1>
                    <p className="text-slate-400 mb-8">{productTitle}</p>

                    <div className="mb-8 p-6 bg-slate-950/50 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-400">결제 금액</span>
                            <span className="text-2xl text-white font-bold">₩{amount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* PayPal Payment (International) */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    <span className="text-blue-400">🌍</span> 해외 결제 (PayPal)
                                </h3>
                                <div className="text-right">
                                    <span className="block text-sm font-bold text-blue-400">USD ${usdAmount}</span>
                                    <span className="block text-[10px] text-slate-500">Approx.</span>
                                </div>
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

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-slate-900 text-slate-500">또는</span>
                            </div>
                        </div>

                        {/* Portone Payment (Korean) */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                <span className="text-yellow-400">🇰🇷</span> 국내 결제 (카드/간편결제)
                            </h3>

                            {/* Contact Info Inputs (Only for Domestic Payment) */}
                            <div className="space-y-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        이름 (필수)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="홍길동"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">
                                        연락처 (필수)
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="010-0000-0000"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                                            totalAmount: amount,
                                            currency: "KRW",
                                            payMethod: "CARD",
                                            customer: {
                                                email: user?.email,
                                                phoneNumber: phoneNumber || undefined,
                                                fullName: fullName || undefined,
                                                firstName: fullName || undefined,
                                                lastName: undefined, // PortOne usually takes fullName fine
                                            },
                                        });

                                        if (response?.code != null) {
                                            // 결제 실패
                                            alert(`결제 실패: ${response.message}`);
                                            return;
                                        }

                                        // 결제 성공 - 백엔드 검증
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
                                                }),
                                            }
                                        );

                                        if (!verifyResponse.ok) {
                                            throw new Error('결제 검증 실패');
                                        }

                                        navigate('/payment/complete');
                                    } catch (err: any) {
                                        console.error('Portone Error:', err);
                                        // Display the actual error message or a fallback
                                        setError(`국내 결제 초기화 실패: ${err.message || JSON.stringify(err)}`);
                                    }
                                }}
                                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                <span>💳</span>
                                <span>카드/카카오페이로 결제하기</span>
                            </button>
                            <p className="text-xs text-slate-500 mt-2 text-center">
                                신용카드, 카카오페이, 네이버페이 등 사용 가능
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
