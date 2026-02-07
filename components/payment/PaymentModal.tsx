import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CheckoutForm } from './CheckoutForm';
import { supabase } from '../../lib/supabase';
import { X, Ticket, Tag, Check, AlertCircle } from 'lucide-react';
import { validateCoupon } from '../../lib/api';
import { Button } from '../Button';
import { motion, AnimatePresence } from 'framer-motion';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    price: number;
    courseId?: string;
    type: 'course' | 'subscription' | 'routine';
    onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    title,
    price: initialPrice,
    courseId,
    type,
    onSuccess
}) => {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [discountedPrice, setDiscountedPrice] = useState(initialPrice);

    useEffect(() => {
        if (isOpen && initialPrice > 0) {
            fetchPaymentIntent(discountedPrice);
        }
    }, [isOpen, initialPrice, discountedPrice]);

    const fetchPaymentIntent = async (amount: number) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    amount: Math.round(amount),
                    currency: 'krw',
                    metadata: {
                        courseId,
                        type,
                        couponCode: appliedCoupon?.code
                    }
                }),
            });

            const data = await response.json();
            if (data.clientSecret) {
                setClientSecret(data.clientSecret);
            }
        } catch (error) {
            console.error('Error creating payment intent:', error);
        }
    };

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setIsApplyingCoupon(true);
        setCouponError(null);

        try {
            const { data, error } = await validateCoupon(couponCode);
            if (error) {
                setCouponError(error.message || '유효하지 않은 쿠폰입니다.');
                setAppliedCoupon(null);
                setDiscountedPrice(initialPrice);
            } else if (data) {
                setAppliedCoupon(data);
                let newPrice = initialPrice;
                if (data.discountType === 'percent') {
                    newPrice = initialPrice * (1 - data.value / 100);
                } else if (data.discountType === 'fixed') {
                    newPrice = Math.max(0, initialPrice - data.value);
                }
                setDiscountedPrice(Math.round(newPrice));
                // Refetch payment intent with new price
                await fetchPaymentIntent(Math.round(newPrice));
            }
        } catch (err) {
            setCouponError('쿠폰 검증 중 오류가 발생했습니다.');
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    const options = {
        clientSecret: clientSecret || '',
        appearance: {
            theme: 'night' as const,
            variables: {
                colorPrimary: '#7c3aed',
                colorBackground: '#18181b',
                colorText: '#fafafa',
                colorDanger: '#ef4444',
                fontFamily: 'Inter, system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '12px',
            },
        },
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl shadow-black/50"
            >
                {/* Header */}
                <div className="p-8 border-b border-zinc-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">결제하기</h2>
                        <p className="text-zinc-400 text-sm mt-1">{title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="결제 모달 닫기"
                        className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    {/* Price Summary */}
                    <div className="p-6 bg-zinc-950/50 rounded-2xl border border-zinc-800 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-500 font-medium">상품 금액</span>
                            <span className="text-zinc-300">₩{initialPrice.toLocaleString()}</span>
                        </div>

                        {appliedCoupon && (
                            <div className="flex justify-between items-center text-emerald-400">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <Tag className="w-4 h-4" /> 쿠폰 할인 ({appliedCoupon.code})
                                </span>
                                <span>-₩{(initialPrice - discountedPrice).toLocaleString()}</span>
                            </div>
                        )}

                        <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
                            <span className="text-white font-bold">최종 결제 금액</span>
                            <span className="text-2xl font-black text-violet-400">₩{discountedPrice.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Coupon Input */}
                    {!appliedCoupon && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">쿠폰 코드</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        placeholder="쿠폰 코드를 입력하세요"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium"
                                    />
                                </div>
                                <Button
                                    onClick={handleApplyCoupon}
                                    disabled={!couponCode || isApplyingCoupon}
                                    className="rounded-2xl px-6 bg-zinc-800 hover:bg-zinc-700 border-none"
                                >
                                    {isApplyingCoupon ? '...' : '적용'}
                                </Button>
                            </div>
                            {couponError && (
                                <p className="text-xs text-rose-500 font-medium pl-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {couponError}
                                </p>
                            )}
                        </div>
                    )}

                    {appliedCoupon && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-emerald-400 text-sm font-bold">쿠폰이 적용되었습니다</p>
                                    <p className="text-emerald-500/60 text-xs">{appliedCoupon.code}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setAppliedCoupon(null);
                                    setDiscountedPrice(initialPrice);
                                    setCouponCode('');
                                }}
                                className="text-zinc-500 hover:text-white transition-colors text-xs font-bold underline underline-offset-4"
                            >
                                취소
                            </button>
                        </div>
                    )}

                    {/* Payment Form */}
                    {clientSecret ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <Elements options={options} stripe={stripePromise}>
                                <CheckoutForm
                                    amount={discountedPrice}
                                    onSuccess={onSuccess}
                                    onCancel={onClose}
                                />
                            </Elements>
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-zinc-500 text-sm font-medium">결제 모듈을 불러오는 중...</p>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-zinc-950/30 border-t border-zinc-800">
                    <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                        결제 시 Grapplay 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.<br />
                        구독 해지는 언제든 마이페이지에서 가능합니다.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
