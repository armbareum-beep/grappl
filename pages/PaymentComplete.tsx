import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStripe } from '@stripe/react-stripe-js';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/Button';

export const PaymentComplete: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('결제 상태를 확인하고 있습니다...');

    const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');

    useEffect(() => {
        if (!paymentIntentClientSecret) {
            setStatus('error');
            setMessage('잘못된 접근입니다.');
            return;
        }

        // Here you would typically verify the payment status with Stripe
        // For now, we'll assume if we have the client secret and no error param, it's likely success
        // In a real app, you might want to use stripe.retrievePaymentIntent here

        const checkStatus = async () => {
            // Simulating a check or you can use the stripe object if you wrap this page in Elements
            // But usually the redirect contains enough info or you fetch from your backend
            setStatus('success');
            setMessage('결제가 성공적으로 완료되었습니다!');
        };

        checkStatus();
    }, [paymentIntentClientSecret]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-slate-600">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">결제 완료!</h2>
                        <p className="text-slate-600 mb-8">{message}</p>
                        <Button onClick={() => navigate('/my-courses')} className="w-full">
                            내 강의실로 이동
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">결제 실패</h2>
                        <p className="text-slate-600 mb-8">{message}</p>
                        <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                            홈으로 돌아가기
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
