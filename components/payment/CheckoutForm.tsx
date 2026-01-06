import React, { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { Button } from '../Button';
import { CreditCard, Globe, ShieldCheck } from 'lucide-react';

interface CheckoutFormProps {
    amount: number;
    onSuccess: () => void;
    onCancel: () => void;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({ amount, onSuccess, onCancel }) => {
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Convert KRW to USD (Updated to 1430 for more accuracy)
    const usdAmount = (amount / 1430).toFixed(2);

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-400">
                    <Globe className="w-4 h-4 text-violet-500" />
                    <span className="text-xs font-bold uppercase tracking-widest">해외 결제 (PayPal)</span>
                </div>

                <div className="p-5 bg-zinc-950/50 rounded-2xl border border-zinc-800 flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-violet-500/50 transition-colors">
                            <CreditCard className="w-6 h-6 text-zinc-500" />
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs font-bold uppercase">Estimated USD</p>
                            <p className="text-xl font-black text-white italic">${usdAmount}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <ShieldCheck className="w-5 h-5 text-emerald-500 ml-auto mb-1" />
                        <span className="text-[10px] text-emerald-500/60 font-medium">Secure Payment</span>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`text-sm p-4 rounded-2xl font-medium flex items-center gap-3 ${message.includes('성공') || message.includes('완료')
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${message.includes('성공') || message.includes('완료') ? 'bg-emerald-500 animate-pulse' : 'bg-rose-50'}`} />
                    {message}
                </div>
            )}

            <div className="min-h-[150px] relative">
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
                className="w-full h-14 rounded-2xl border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all font-bold"
                disabled={isLoading}
            >
                결제 취소
            </Button>
        </div>
    );
};
