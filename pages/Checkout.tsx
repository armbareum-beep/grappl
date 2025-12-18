import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm: React.FC<{ clientSecret: string; amount: number }> = ({ clientSecret, amount }) => {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setLoading(true);
        setError('');

        const { error: submitError } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/payment/complete`,
            },
        });

        if (submitError) {
            setError(submitError.message || '결제에 실패했습니다.');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
                <h3 className="text-lg font-semibold text-white mb-4">결제 정보</h3>
                <PaymentElement />
            </div>

            {error && (
                <div className="p-4 bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="text-slate-400">
                    <p className="text-sm">결제 금액</p>
                    <p className="text-2xl font-bold text-white">
                        {amount > 0 ? `₩${amount.toLocaleString()}` : '구독 결제'}
                    </p>
                </div>
                <Button type="submit" disabled={!stripe || loading}>
                    {loading ? '처리 중...' : '결제하기'}
                </Button>
            </div>
        </form>
    );
};

export const Checkout: React.FC = () => {
    const { type, id } = useParams<{ type: string; id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [clientSecret, setClientSecret] = useState('');
    const [amount, setAmount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/login', { state: { from: location } });
            return;
        }

        createPaymentIntent();
    }, [user, type, id]);

    const createPaymentIntent = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('로그인이 필요합니다.');

            const body: any = { mode: type };
            if (type === 'course') body.courseId = id;
            if (type === 'routine') body.routineId = id;
            if (type === 'feedback') body.feedbackRequestId = id;
            if (type === 'bundle') body.bundleId = id;
            if (type === 'subscription') body.priceId = id;

            console.log('Creating payment intent:', { type, id, body });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            let response;
            try {
                response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify(body),
                        signal: controller.signal
                    }
                );
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
                }
                throw new Error('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
            }

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = '결제 준비 중 오류가 발생했습니다.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                    console.error('Payment intent error:', errorData);
                } catch (e) {
                    console.error('Failed to parse error response');
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Payment intent created successfully');
            setClientSecret(data.clientSecret);

            // Get amount for display
            if (type === 'course') {
                const { data: course } = await supabase.from('courses').select('price').eq('id', id).single();
                setAmount(course?.price || 0);
            } else if (type === 'routine') {
                const { data: routine } = await supabase.from('routines').select('price').eq('id', id).single();
                setAmount(routine?.price || 0);
            } else if (type === 'feedback') {
                const { data: feedback } = await supabase.from('feedback_requests').select('price').eq('id', id).single();
                setAmount(feedback?.price || 0);
            } else if (type === 'bundle') {
                const { data: bundle } = await supabase.from('bundles').select('price').eq('id', id).single();
                setAmount(bundle?.price || 0);
            } else if (type === 'subscription') {
                setAmount(0);
            }

            setLoading(false);
        } catch (err: any) {
            console.error('Error creating payment intent:', err);
            setError(err.message || '결제 준비 중 오류가 발생했습니다.');
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingScreen message="결제 정보를 준비하고 있습니다..." />;
    }


    if (error) {
        return <ErrorScreen
            title="결제 오류"
            error={error}
            resetMessage="결제 준비 중 오류가 발생했습니다. 잠시 후 다시 시도하시거나 캐시를 삭제해 주세요."
        />;
    }


    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-2xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-white mb-8">결제</h1>
                {clientSecret && (
                    <Elements
                        stripe={stripePromise}
                        options={{
                            clientSecret,
                            appearance: {
                                theme: 'night',
                                variables: {
                                    colorPrimary: '#3b82f6',
                                    colorBackground: '#0f172a',
                                    colorText: '#f1f5f9',
                                    colorDanger: '#ef4444',
                                    fontFamily: 'Inter, system-ui, sans-serif',
                                    spacingUnit: '4px',
                                    borderRadius: '8px',
                                }
                            }
                        }}
                    >
                        <CheckoutForm clientSecret={clientSecret} amount={amount} />
                    </Elements>
                )}
            </div>
        </div>
    );
};
