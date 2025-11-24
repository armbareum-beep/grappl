import React, { useEffect, useState } from 'react';
import {
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import { Button } from '../Button';

interface CheckoutFormProps {
    amount: number;
    onSuccess: () => void;
    onCancel: () => void;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({ amount, onSuccess, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!stripe) {
            return;
        }

        const clientSecret = new URLSearchParams(window.location.search).get(
            "payment_intent_client_secret"
        );

        if (!clientSecret) {
            return;
        }

        stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
            switch (paymentIntent?.status) {
                case "succeeded":
                    setMessage("결제가 성공했습니다!");
                    onSuccess();
                    break;
                case "processing":
                    setMessage("결제 처리 중입니다.");
                    break;
                case "requires_payment_method":
                    setMessage("결제 수단이 필요합니다.");
                    break;
                default:
                    setMessage("알 수 없는 오류가 발생했습니다.");
                    break;
            }
        });
    }, [stripe]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Make sure to change this to your payment completion page
                return_url: `${window.location.origin}/payment/complete`,
            },
            redirect: 'if_required' // Avoid redirect if possible
        });

        if (error) {
            if (error.type === "card_error" || error.type === "validation_error") {
                setMessage(error.message || "오류가 발생했습니다.");
            } else {
                setMessage("예기치 않은 오류가 발생했습니다.");
            }
        } else {
            // Payment succeeded without redirect
            setMessage("결제가 완료되었습니다!");
            onSuccess();
        }

        setIsLoading(false);
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement id="payment-element" options={{ layout: "tabs" }} />

            {message && (
                <div id="payment-message" className={`text-sm p-3 rounded-md ${message.includes('성공') || message.includes('완료') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="flex gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1"
                    disabled={isLoading}
                >
                    취소
                </Button>
                <Button
                    disabled={isLoading || !stripe || !elements}
                    id="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <span id="button-text">
                        {isLoading ? "처리 중..." : `${amount.toLocaleString()}원 결제하기`}
                    </span>
                </Button>
            </div>
        </form>
    );
};
