import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

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
            if (!session) throw new Error('Not authenticated');

            const body: any = { mode: type };
            if (type === 'course') body.courseId = id;
            if (type === 'routine') body.routineId = id;
            if (type === 'feedback') body.feedbackRequestId = id;
            if (type === 'subscription') body.priceId = id;

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify(body),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create payment intent');
            }

            const data = await response.json();
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
            } else if (type === 'subscription') {
                // For subscription, we might not know the amount easily without fetching the price from Stripe or having a mapping.
                // For now, we can try to infer it or just show "Subscription"
                // Or we can pass the amount in state if we want to be precise.
                // Let's default to a generic message or try to fetch if possible, but we don't have a prices table.
                // We'll leave it as 0 or handle it in the UI to show "Subscription" instead of price if 0.
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
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-white">결제 준비 중...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <h2 className="text-xl font-bold text-white mb-4">오류 발생</h2>
                    <p className="text-red-400 mb-4">{error}</p>
                    <Button onClick={() => navigate(-1)}>돌아가기</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-2xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-white mb-8">결제</h1>
                {clientSecret && (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                        <CheckoutForm clientSecret={clientSecret} amount={amount} />
                    </Elements>
                )}
            </div>
        </div>
    );
};
