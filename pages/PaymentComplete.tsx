import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { createNotification } from '../lib/api-notifications';

export const PaymentComplete: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('결제 상태를 확인하고 있습니다...');

    // Stripe params
    const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');

    // PortOne params (from redirect)
    const portonePaymentId = searchParams.get('paymentId');
    const portoneBillingKey = searchParams.get('billingKey');
    const portoneCode = searchParams.get('code');
    const portoneMessage = searchParams.get('message');

    // Custom params we passed
    const mode = searchParams.get('mode');
    const productId = searchParams.get('productId');
    const amount = searchParams.get('amount');
    const couponCode = searchParams.get('couponCode');
    const returnUrl = searchParams.get('returnUrl');
    const userIdFromUrl = searchParams.get('userId');

    useEffect(() => {
        const verifyPayment = async () => {
            // PortOne redirect flow
            if (portonePaymentId || portoneBillingKey) {
                // Check for PortOne error
                if (portoneCode) {
                    setStatus('error');
                    setMessage(portoneMessage || '결제가 실패했습니다.');
                    return;
                }

                try {
                    const { data: { session } } = await supabase.auth.getSession();

                    // Use userId from URL if session is not available (mobile redirect case)
                    const effectiveUserId = user?.id || userIdFromUrl;

                    if (!session && !userIdFromUrl) {
                        setStatus('error');
                        setMessage('로그인이 필요합니다.');
                        return;
                    }

                    // Get upgrade details from sessionStorage if this is an upgrade
                    const upgradeDetails = mode === 'subscription_upgrade'
                        ? JSON.parse(sessionStorage.getItem('upgradeDetails') || '{}')
                        : null;

                    const verifyResponse = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-portone-payment`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
                            },
                            body: JSON.stringify({
                                paymentId: portonePaymentId || '',
                                billingKey: portoneBillingKey || '',
                                mode: mode,
                                id: mode === 'subscription_upgrade' ? upgradeDetails?.currentSubscription?.id : productId,
                                userId: effectiveUserId,
                                couponCode: couponCode || undefined,
                                amount: amount ? parseInt(amount) : undefined
                            }),
                        }
                    );

                    if (!verifyResponse.ok) {
                        const errorData = await verifyResponse.json();
                        throw new Error(errorData.error || '결제 검증 실패');
                    }

                    // Clean up upgrade details
                    if (mode === 'subscription_upgrade') {
                        sessionStorage.removeItem('upgradeDetails');
                    }

                    // Send success notification
                    if (effectiveUserId) {
                        createNotification({
                            type: 'payment_success',
                            user_id: effectiveUserId,
                            title: '결제 성공',
                            message: '결제가 완료되었습니다.',
                            link: '/payment/history',
                            metadata: {
                                amount: amount ? parseInt(amount) : 0,
                                product_id: productId,
                            }
                        }).catch(err => console.error('Notification error:', err));
                    }

                    setStatus('success');
                    setMessage('결제가 성공적으로 완료되었습니다!');
                } catch (error: any) {
                    console.error('Payment verification error:', error);
                    setStatus('error');
                    setMessage(error.message || '결제 검증 중 오류가 발생했습니다.');

                    // Send failure notification
                    const failUserId = user?.id || userIdFromUrl;
                    if (failUserId) {
                        createNotification({
                            type: 'payment_failed',
                            user_id: failUserId,
                            title: '결제 실패',
                            message: error.message || '결제가 실패했습니다.',
                            link: `/checkout/${mode}/${productId}`,
                            metadata: {
                                error_message: error.message
                            }
                        }).catch(err => console.error('Notification error:', err));
                    }
                }
                return;
            }

            // Stripe redirect flow
            if (paymentIntentClientSecret) {
                setStatus('success');
                setMessage('결제가 성공적으로 완료되었습니다!');
                return;
            }

            // No valid payment params
            setStatus('error');
            setMessage('잘못된 접근입니다.');
        };

        verifyPayment();
    }, [portonePaymentId, portoneBillingKey, portoneCode, paymentIntentClientSecret, user?.id]);

    const getNavigationTarget = () => {
        if (returnUrl) return returnUrl;

        switch (mode) {
            case 'course':
                return productId ? `/course/${productId}` : '/library';
            case 'routine':
                return productId ? `/routine/${productId}` : '/library';
            case 'sparring':
                return productId ? `/sparring/${productId}` : '/library';
            case 'drill':
                return productId ? `/drill/${productId}` : '/library';
            case 'subscription':
            case 'subscription_upgrade':
                return '/settings';
            case 'bundle':
                return '/library';
            case 'feedback':
                return '/feedback';
            default:
                return '/library';
        }
    };

    const getButtonText = () => {
        if (returnUrl) return '이어서 시청하기';

        switch (mode) {
            case 'course':
            case 'routine':
            case 'sparring':
            case 'drill':
                return '콘텐츠 보러가기';
            case 'subscription':
            case 'subscription_upgrade':
                return '설정으로 이동';
            case 'feedback':
                return '피드백 센터로 이동';
            default:
                return '내 강의실로 이동';
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mb-4"></div>
                        <p className="text-zinc-400">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">결제 완료!</h2>
                        <p className="text-zinc-400 mb-8">{message}</p>
                        <Button
                            onClick={() => navigate(getNavigationTarget())}
                            className="w-full"
                        >
                            {getButtonText()}
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                            <XCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">결제 실패</h2>
                        <p className="text-zinc-400 mb-8">{message}</p>
                        <div className="space-y-3 w-full">
                            {mode && productId && (
                                <Button
                                    onClick={() => navigate(`/checkout/${mode}/${productId}`)}
                                    className="w-full"
                                >
                                    다시 시도하기
                                </Button>
                            )}
                            <Button
                                onClick={() => navigate('/')}
                                variant="outline"
                                className="w-full"
                            >
                                홈으로 돌아가기
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
