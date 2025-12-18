import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PayPalButtons } from '@paypal/react-paypal-js';
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
                            <span className="text-slate-400">상품 금액</span>
                            <span className="text-white font-bold">₩{amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                            <span className="text-slate-400">최종 결제 금액 (약)</span>
                            <span className="text-2xl font-black text-blue-400">USD ${usdAmount}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 text-right">
                            * 해외 결제 특성상 환율에 따라 최종 금액이 다를 수 있습니다.
                        </p>
                    </div>

                    <div className="space-y-4">
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
                </div>
            </div>
        </div>
    );
};
