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

    // Korean Bank fields
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [residentRegistrationNumber, setResidentRegistrationNumber] = useState('');

    // Wise / USD fields
    const [wiseEmail, setWiseEmail] = useState('');
    const [wiseAccountNumber, setWiseAccountNumber] = useState('');
    const [wiseRoutingNumber, setWiseRoutingNumber] = useState('');
    const [wiseSwiftBic, setWiseSwiftBic] = useState('');
    const [isKoreanResident, setIsKoreanResident] = useState(false);

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
                // Load Korean bank info
                if (data.payoutSettings) {
                    setBankName(data.payoutSettings.bankName || '');
                    setAccountNumber(data.payoutSettings.accountNumber || '');
                    setAccountHolder(data.payoutSettings.accountHolder || '');
                    setResidentRegistrationNumber(data.payoutSettings.residentRegistrationNumber || '');

                    // Load Wise info
                    setWiseEmail(data.payoutSettings.wiseEmail || '');
                    setWiseAccountNumber(data.payoutSettings.wiseAccountNumber || '');
                    setWiseRoutingNumber(data.payoutSettings.wiseRoutingNumber || '');
                    setWiseSwiftBic(data.payoutSettings.wiseSwiftBic || '');
                    setIsKoreanResident(data.payoutSettings.isKoreanResident || false);
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
                bankName,
                accountNumber,
                accountHolder,
                residentRegistrationNumber,
                // Wise fields
                wiseEmail,
                wiseAccountNumber,
                wiseRoutingNumber,
                wiseSwiftBic,
                isKoreanResident
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

    if (loading) {
        return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white">정산 설정</h2>
                <p className="text-slate-400 mt-1">수익금을 정산받을 계좌와 세금 정보를 관리하세요.</p>
            </div>

            {/* Stripe Connect Section Removed as per user request */}

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
                                한국 계좌 (KRW)
                            </span>
                        </div>
                        <p className="text-sm text-slate-400">
                            국내 은행 계좌로 원화 입금 (3.3% 원천징수)
                        </p>
                    </button>

                    <button
                        onClick={() => setPayoutType('business')}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${payoutType === 'business'
                            ? 'border-blue-500 bg-blue-900/20'
                            : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                            }`}
                    >
                        <div className="flex items-center space-x-3 mb-2">
                            <Building className={`w-5 h-5 ${payoutType === 'business' ? 'text-blue-400' : 'text-slate-400'}`} />
                            <span className={`font-semibold ${payoutType === 'business' ? 'text-blue-400' : 'text-white'}`}>
                                달러 외화 계좌 (USD)
                            </span>
                        </div>
                        <p className="text-sm text-slate-400">
                            Wise 및 국내/해외 외화 계좌로 송금 (SWIFT)
                        </p>
                    </button>
                </div>
            </div>

            {payoutType === 'individual' ? (
                /* Korean Bank Account Information */
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">입금 계좌 정보 (KRW)</h3>
                    <p className="text-sm text-slate-400">수익금을 정산받을 한국 계좌 정보를 입력하세요.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                은행명 *
                            </label>
                            <input
                                type="text"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                placeholder="예: 카카오뱅크, 신한은행"
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                계좌번호 *
                            </label>
                            <input
                                type="text"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                placeholder="하이픈(-) 없이 입력"
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                예금주 *
                            </label>
                            <input
                                type="text"
                                value={accountHolder}
                                onChange={(e) => setAccountHolder(e.target.value)}
                                placeholder="본인 명의의 계좌 예금주"
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                주민등록번호 (앞 6자리 + 뒤 1자리) *
                            </label>
                            <input
                                type="text"
                                value={residentRegistrationNumber}
                                onChange={(e) => setResidentRegistrationNumber(e.target.value)}
                                placeholder="예: 900101-1"
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                3.3% 사업소득세 원천징수 신고를 위해 필요합니다.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                /* Wise / USD Information */
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Wise 계좌 정보 (USD)</h3>
                    <p className="text-sm text-slate-400">달러(USD)를 송금받을 Wise 계좌 정보를 입력하세요.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="flex items-center space-x-2 p-3 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isKoreanResident}
                                    onChange={(e) => setIsKoreanResident(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 bg-slate-900"
                                />
                                <span className="text-sm text-white">
                                    저는 한국 거주자입니다 (3.3% 세금 원천징수 대상)
                                </span>
                            </label>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Email / Wise Email (권장)
                            </label>
                            <input
                                type="email"
                                value={wiseEmail}
                                onChange={(e) => setWiseEmail(e.target.value)}
                                placeholder="example@email.com"
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Wise 계정이 있다면 이메일만으로 송금이 가능합니다. 없으실 경우 연락 가능한 이메일을 적어주세요.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Routing Number / SWIFT Code
                            </label>
                            <input
                                type="text"
                                value={wiseRoutingNumber}
                                onChange={(e) => setWiseRoutingNumber(e.target.value)}
                                placeholder="SWIFT Code 또는 Routing Number"
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Account Number (계좌번호)
                            </label>
                            <input
                                type="text"
                                value={wiseAccountNumber}
                                onChange={(e) => setWiseAccountNumber(e.target.value)}
                                placeholder="외화 계좌번호"
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {isKoreanResident && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    주민등록번호 (앞 6자리 + 뒤 1자리) *
                                </label>
                                <input
                                    type="text"
                                    value={residentRegistrationNumber}
                                    onChange={(e) => setResidentRegistrationNumber(e.target.value)}
                                    placeholder="예: 900101-1"
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    한국 거주자의 경우 3.3% 사업소득세 원천징수 신고를 위해 필요합니다.
                                </p>
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg flex items-start">
                                <AlertCircle className="w-5 h-5 mr-2 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-300">
                                    <p className="font-semibold mb-1">안내사항</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Wise 계정이나 국내 외화계좌 정보 모두 입력 가능합니다.</li>
                                        <li>달러(USD) 송금 시 발생하는 수수료는 수취인 부담일 수 있습니다.</li>
                                        {!isKoreanResident && (
                                            <li>해외 거주자의 경우 한국 세금(3.3%)이 원천징수되지 않습니다. (거주국가 세법 적용)</li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
