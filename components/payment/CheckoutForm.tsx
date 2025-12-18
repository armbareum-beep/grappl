import React, { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { Button } from '../Button';

interface CheckoutFormProps {
    amount: number;
    onSuccess: () => void;
    onCancel: () => void;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({ amount, onSuccess, onCancel }) => {
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Convert KRW to USD
    const usdAmount = (amount / 1450).toFixed(2);

    return (
        <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">결제 금액</span>
                    <span className="text-lg font-bold text-slate-900">₩{amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">USD 변환 (약)</span>
                    <span className="text-blue-600 font-semibold">${usdAmount}</span>
                </div>
            </div>

            {message && (
                <div className={`text-sm p-3 rounded-md ${message.includes('성공') || message.includes('완료') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="min-h-[150px]">
                <PayPalButtons
                    style={{ layout: "vertical", color: "blue", shape: "rect" }}
                    createOrder={(_, actions) => {
                        return actions.order.create({
                            intent: "CAPTURE",
                            purchase_units: [{
                                amount: {
                                    currency_code: "USD",
                                    value: usdAmount
                                }
                            }]
                        });
                    }}
                    onApprove={async (_, actions) => {
                        if (actions.order) {
                            setIsLoading(true);
                            await actions.order.capture();
                            setMessage("결제가 완료되었습니다!");
                            onSuccess();
                            setIsLoading(false);
                        }
                    }}
                    onError={(err) => {
                        console.error('PayPal Error:', err);
                        setMessage("결제 중 오류가 발생했습니다.");
                    }}
                />
            </div>

            <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="w-full"
                disabled={isLoading}
            >
                취소
            </Button>
        </div>
    );
};
