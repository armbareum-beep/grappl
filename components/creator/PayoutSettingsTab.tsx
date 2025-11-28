import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPayoutSettings, updatePayoutSettings } from '../../lib/api';
import { Button } from '../Button';
import { CreditCard, Building, User, AlertCircle, CheckCircle } from 'lucide-react';

export const PayoutSettingsTab: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
    const [payoutType, setPayoutType] = useState<'individual' | 'business'>('individual');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Wise account fields
    const [wiseAccountNumber, setWiseAccountNumber] = useState('');
    const [wiseRoutingNumber, setWiseRoutingNumber] = useState('');
    const [wiseSwiftBic, setWiseSwiftBic] = useState('');
    const [wiseAccountName, setWiseAccountName] = useState('');

    useEffect(() => {
        if (user) {
            loadSettings();
        }
    }, [user]);

    const loadSettings = async () => {
        if (!user) return;
        try {
            const { data, error } = await getPayoutSettings(user.id);
            if (error) throw error;
            if (data) {
                setStripeAccountId(data.stripeAccountId);
                if (data.payoutSettings?.type) {
                    setPayoutType(data.payoutSettings.type);
                }
                // Load Wise account info
                if (data.payoutSettings) {
                    setWiseAccountNumber(data.payoutSettings.wiseAccountNumber || '');
                    setWiseRoutingNumber(data.payoutSettings.wiseRoutingNumber || '');
                    setWiseSwiftBic(data.payoutSettings.wiseSwiftBic || '');
                    setWiseAccountName(data.payoutSettings.wiseAccountName || '');
                }
            }
        } catch (err) {
            console.error('Error loading payout settings:', err);
            setError('설정을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!user) return;
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const { error } = await updatePayoutSettings(user.id, {
                type: payoutType,
                wiseAccountNumber,
                wiseRoutingNumber,
                wiseSwiftBic,
                wiseAccountName
            });
            if (error) throw error;
            setSuccess('설정이 저장되었습니다.');
        } catch (err) {
            console.error('Error saving payout settings:', err);
            setError('설정 저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleConnectStripe = () => {
        // In a real implementation, this would redirect to your backend endpoint
        // which then redirects to Stripe OAuth.
        // window.location.href = `${import.meta.env.VITE_API_URL}/connect-stripe?user_id=${user?.id}`;
        alert('Stripe Connect 연동 기능은 백엔드(Edge Function) 구현이 필요합니다.\n\n실제 구현 시:\n1. Stripe OAuth로 리다이렉트\n2. 계좌 정보 입력\n3. stripe_account_id 저장');
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white">정산 설정</h2>
                <p className="text-slate-400 mt-1">수익금을 정산받을 계좌와 세금 정보를 관리하세요.</p>
            </div>

            {/* Status Card */}
            <div className={`p-6 rounded-xl border ${stripeAccountId ? 'bg-green-900/20 border-green-500/30' : 'bg-slate-900 border-slate-800'}`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-full ${stripeAccountId ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                {stripeAccountId ? '정산 계좌가 연결되었습니다' : '정산 계좌를 연결해주세요'}
                            </h3>
                            <p className="text-slate-400 text-sm mt-1">
                                {stripeAccountId
                                    ? 'Stripe Connect를 통해 안전하게 정산받고 있습니다.'
                                    : '수익금을 정산받으려면 Stripe 계정을 연결해야 합니다.'}
                            </p>
                        </div>
                    </div>
                    {!stripeAccountId && (
                        <Button onClick={handleConnectStripe}>
                            Stripe 연결하기
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">정산 유형 선택</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => setPayoutType('individual')}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${payoutType === 'individual'
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                            }`}
                    >
                        <div className="flex items-center space-x-3 mb-2">
                            <User className={`w-5 h-5 ${payoutType === 'individual' ? 'text-blue-400' : 'text-slate-400'}`} />
                            <span className={`font-semibold ${payoutType === 'individual' ? 'text-blue-400' : 'text-white'}`}>
                                개인 (프리랜서)
                            </span>
                        </div>
                        <p className="text-sm text-slate-400">
                            3.3% 사업소득세를 원천징수하고 정산받습니다.
                        </p>
                    </button>

                    {/* Business option removed as per user request */}
                </div>
            </div>

            {/* Wise Account Information */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Wise 계좌 정보</h3>
                <p className="text-sm text-slate-400">정산금을 받을 Wise 계좌 정보를 입력하세요.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            계좌번호 (Account Number) *
                        </label>
                        <input
                            type="text"
                            value={wiseAccountNumber}
                            onChange={(e) => setWiseAccountNumber(e.target.value)}
                            placeholder="977226919280108"
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            라우팅 번호 (Routing Number) *
                        </label>
                        <input
                            type="text"
                            value={wiseRoutingNumber}
                            onChange={(e) => setWiseRoutingNumber(e.target.value)}
                            placeholder="084009519"
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            SWIFT/BIC *
                        </label>
                        <input
                            type="text"
                            value={wiseSwiftBic}
                            onChange={(e) => setWiseSwiftBic(e.target.value)}
                            placeholder="TRWIUS35XXX"
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            예금주명 (Account Name) *
                        </label>
                        <input
                            type="text"
                            value={wiseAccountName}
                            onChange={(e) => setWiseAccountName(e.target.value)}
                            placeholder="그래플레이"
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 bg-green-900/20 text-green-400 border border-green-500/30 rounded-lg flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {success}
                </div>
            )}

            <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                    {saving ? '저장 중...' : '설정 저장'}
                </Button>
            </div>
        </div>
    );
};
