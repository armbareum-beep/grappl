import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CheckoutForm } from './CheckoutForm';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
// Replace with your actual Publishable Key from Stripe Dashboard
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentModalProps {
    courseId: string;
    courseTitle: string;
    price: number;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    courseId,
    courseTitle,
    price,
    isOpen,
    onClose,
    onSuccess
}) => {
    const [clientSecret, setClientSecret] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Create PaymentIntent as soon as the page loads
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ courseId }),
            })
                .then((res) => {
                    if (!res.ok) throw new Error('Network response was not ok');
                    return res.json();
                })
                .then((data) => {
                    if (data.error) throw new Error(data.error);
                    setClientSecret(data.clientSecret);
                })
                .catch((err) => {
                    console.error("Error creating payment intent:", err);
                    setError("결제 시스템을 불러오는데 실패했습니다.");
                });
        }
    }, [isOpen, courseId]);

    if (!isOpen) return null;

    const appearance = {
        theme: 'stripe' as const,
    };
    const options = {
        clientSecret,
        appearance,
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                강좌 결제
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-gray-500 mb-1">상품명</p>
                            <p className="text-lg font-bold text-gray-900">{courseTitle}</p>
                            <p className="text-xl font-bold text-blue-600 mt-2">{price.toLocaleString()}원</p>
                        </div>

                        {error ? (
                            <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm">
                                {error}
                            </div>
                        ) : (
                            clientSecret && (
                                <Elements options={options} stripe={stripePromise}>
                                    <CheckoutForm
                                        amount={price}
                                        onSuccess={onSuccess}
                                        onCancel={onClose}
                                    />
                                </Elements>
                            )
                        )}

                        {!clientSecret && !error && (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
