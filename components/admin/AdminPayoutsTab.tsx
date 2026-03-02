import React, { useEffect, useState } from 'react';
import { Copy, Building, User, Clock, Download, RefreshCw, MinusCircle, Plus, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { getCreatorPayoutsAdmin } from '../../lib/api';
import { getAdminSettlements, exportSettlementsToCSV, getRevenueLedger, addRefundRecord, RevenueLedgerRecord, processRefund, getRecentPayments, deleteRefundRecords, getCreatorWatchTimeStats, CreatorWatchTimeStats, getPlatformFinancials, PlatformFinancials } from '../../lib/api-admin';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { Button } from '../Button';

interface CreatorPayoutInfo {
    id: string;
    name: string;
    email: string;
    payout_settings: {
        type: 'individual' | 'business';
        bankName?: string;
        accountNumber?: string;
        accountHolder?: string;
        residentRegistrationNumber?: string;
        paypalEmail?: string;
        wiseEmail?: string; // Legacy
        isKoreanResident?: boolean;
    };
}

export const AdminPayoutsTab: React.FC = () => {
    const { success, error: toastError } = useToast();
    const [creators, setCreators] = useState<CreatorPayoutInfo[]>([]);
    const [loading, setLoading] = useState(true);

    const [settlements, setSettlements] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'info' | 'settlement' | 'processing' | 'revenue' | 'finance'>('processing');
    const [payouts, setPayouts] = useState<any[]>([]);
    const [financials, setFinancials] = useState<PlatformFinancials | null>(null);

    // Revenue Ledger State
    const [revenueLedger, setRevenueLedger] = useState<RevenueLedgerRecord[]>([]);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('');
    const [refundSubscriptionId, setRefundSubscriptionId] = useState<string | null>(null);

    // Payments State (for actual refunds)
    const [payments, setPayments] = useState<any[]>([]);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [processingRefund, setProcessingRefund] = useState(false);

    // Payout Management State
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [calculating, setCalculating] = useState(false);

    // Watch Time Stats
    const [watchTimeStats, setWatchTimeStats] = useState<CreatorWatchTimeStats[]>([]);
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; action: () => void; title: string; message: string}>({isOpen: false, action: () => {}, title: '', message: ''});

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (viewMode === 'processing') {
            loadPayouts();
        } else if (viewMode === 'revenue') {
            loadRevenueLedger();
        } else if (viewMode === 'finance') {
            loadFinancials();
        }
    }, [viewMode, selectedYear, selectedMonth]);

    const loadFinancials = async () => {
        const data = await getPlatformFinancials(selectedYear, selectedMonth + 1);
        setFinancials(data);
    };

    const loadRevenueLedger = async () => {
        const [ledgerData, paymentsData] = await Promise.all([
            getRevenueLedger(100),
            getRecentPayments(50)
        ]);
        setRevenueLedger(ledgerData);
        setPayments(paymentsData);
    };

    const handleProcessRefund = async () => {
        if (!selectedPayment) return;

        setProcessingRefund(true);
        try {
            const result = await processRefund(
                selectedPayment.portone_payment_id,
                refundAmount ? parseInt(refundAmount) : undefined,
                refundReason || '관리자 환불 처리'
            );

            if (result.success) {
                success(`₩${result.refundedAmount?.toLocaleString()} 환불이 완료되었습니다.`);
                setShowRefundModal(false);
                setSelectedPayment(null);
                setRefundAmount('');
                setRefundReason('');
                loadRevenueLedger();
            } else {
                toastError(result.error || '환불 처리 실패');
            }
        } catch (err: any) {
            toastError(err.message || '환불 처리 중 오류 발생');
        } finally {
            setProcessingRefund(false);
        }
    };

    const handleAddRefund = async () => {
        const amount = parseInt(refundAmount);
        if (!amount || amount <= 0) {
            toastError('유효한 금액을 입력하세요');
            return;
        }

        const { error } = await addRefundRecord(refundSubscriptionId, amount, refundReason || '관리자 환불 처리');

        if (error) {
            console.error('환불 기록 추가 에러:', error);
            toastError(`환불 기록 추가 실패: ${error.message || error.code || JSON.stringify(error)}`);
        } else {
            success(`₩${amount.toLocaleString()} 환불 기록이 추가되었습니다`);
            setShowRefundModal(false);
            setRefundAmount('');
            setRefundReason('');
            setRefundSubscriptionId(null);
            loadRevenueLedger();
        }
    };

    const loadData = async () => {
        setLoading(true);
        const [creatorsRes, settlementsRes] = await Promise.all([
            getCreatorPayoutsAdmin(),
            getAdminSettlements()
        ]);

        if (creatorsRes.data) setCreators(creatorsRes.data);
        if (settlementsRes) setSettlements(settlementsRes);
        setLoading(false);
    };

    const loadPayouts = async () => {
        // Dynamic import to avoid circular dependencies if any, or just standard import
        const { getAdminPayouts } = await import('../../lib/api-admin');
        const [{ data }, watchStats] = await Promise.all([
            getAdminPayouts(selectedYear, selectedMonth + 1),
            getCreatorWatchTimeStats(selectedYear, selectedMonth + 1)
        ]);
        setPayouts(data || []);
        setWatchTimeStats(watchStats);
    }

    const handleCalculate = async () => {
        setConfirmModal({
            isOpen: true,
            title: '정산 계산 확인',
            message: `${selectedYear}년 ${selectedMonth + 1}월 정산을 계산하시겠습니까?`,
            action: async () => {
                setCalculating(true);
                const { calculatePayouts } = await import('../../lib/api-admin');
                const { error } = await calculatePayouts(selectedYear, selectedMonth + 1);
                setCalculating(false);

                if (error) {
                    toastError("Calculation failed");
                } else {
                    loadPayouts();
                }
                setConfirmModal(prev => ({...prev, isOpen: false}));
            }
        });
    };

    const handleStatusUpdate = async (id: string, status: 'processing' | 'paid') => {
        setConfirmModal({
            isOpen: true,
            title: '상태 변경 확인',
            message: `Update status to ${status}?`,
            action: async () => {
                const { updatePayoutStatus } = await import('../../lib/api-admin');
                await updatePayoutStatus(id, status);
                loadPayouts();
                setConfirmModal(prev => ({...prev, isOpen: false}));
            }
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        success('복사되었습니다: ' + text);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">정산 및 계좌 관리</h2>
                    <p className="text-zinc-400">크리에이터들의 수익 정산 현황과 등록된 지급 계좌를 관리합니다.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => exportSettlementsToCSV(settlements)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white hover:border-zinc-700 transition-all text-xs font-bold"
                    >
                        <Download className="w-4 h-4" />
                        CSV 내보내기
                    </button>
                    <div className="flex p-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl backdrop-blur-sm">
                        <button
                            onClick={() => setViewMode('processing')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'processing' ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                        >
                            정산 처리
                        </button>
                        <button
                            onClick={() => setViewMode('settlement')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'settlement' ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                        >
                            정산 금액 확인
                        </button>
                        <button
                            onClick={() => setViewMode('info')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'info' ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                        >
                            계좌 정보
                        </button>
                        <button
                            onClick={() => setViewMode('revenue')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'revenue' ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                        >
                            매출 원장
                        </button>
                        <button
                            onClick={() => setViewMode('finance')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'finance' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                        >
                            플랫폼 재무
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'processing' && (
                <div className="space-y-6">
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
                        <div className="flex items-center gap-4">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm font-bold"
                            >
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
                            </select>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm font-bold"
                            >
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <option key={i} value={i}>{i + 1}월</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleCalculate}
                            disabled={calculating}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                        >
                            {calculating ? '계산 중...' : '정산 계산 실행'}
                        </button>
                    </div>

                    <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden backdrop-blur-xl">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase">크리에이터</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-zinc-500 uppercase">시청시간</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-zinc-500 uppercase">정산 금액</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase">상태</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-zinc-500 uppercase">작업</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {payouts.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">데이터가 없습니다.</td></tr>
                                ) : (
                                    payouts.map(p => {
                                        const watchTime = watchTimeStats.find(w => w.creator_id === p.creator_id);
                                        const watchMinutes = watchTime ? Math.round(watchTime.paid_subscriber_watch_seconds / 60) : 0;
                                        const watchHours = Math.floor(watchMinutes / 60);
                                        const remainingMins = watchMinutes % 60;

                                        return (
                                            <tr key={p.id}>
                                                <td className="px-6 py-4 font-bold text-white">{p.creator?.name}</td>
                                                <td className="px-6 py-4 text-right">
                                                    {watchMinutes > 0 ? (
                                                        <div>
                                                            <span className="text-cyan-400 font-bold">
                                                                {watchHours > 0 ? `${watchHours}시간 ${remainingMins}분` : `${watchMinutes}분`}
                                                            </span>
                                                            <div className="text-xs text-zinc-500">유료 구독자</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-zinc-600">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-emerald-400">₩{p.amount.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${p.status === 'paid' ? 'bg-green-500/10 text-green-500' :
                                                            p.status === 'processing' ? 'bg-amber-500/10 text-amber-500' :
                                                                'bg-zinc-800 text-zinc-400'
                                                        }`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {p.status === 'draft' && (
                                                        <button onClick={() => handleStatusUpdate(p.id, 'processing')} className="text-indigo-400 hover:text-indigo-300 text-sm font-bold">Process</button>
                                                    )}
                                                    {p.status === 'processing' && (
                                                        <button onClick={() => handleStatusUpdate(p.id, 'paid')} className="text-green-500 hover:text-green-400 text-sm font-bold">Confirm Paid</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {(viewMode === 'info' || viewMode === 'settlement') && (
                <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">크리에이터</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">유형</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">상세 계좌 정보</th>
                                    <th className="px-6 py-5 text-right text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                        {viewMode === 'settlement' ? '정산 예정 리포트' : '부가 세무 정보'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center text-zinc-600 font-medium">
                                            <Clock className="w-6 h-6 mx-auto mb-2 animate-pulse" />
                                            데이터 로딩 중...
                                        </td>
                                    </tr>
                                ) : creators.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center text-zinc-600 font-medium tracking-tight">
                                            등록된 크리에이터 정보가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    creators.map((creator) => {
                                        const settings = creator.payout_settings || {};
                                        const isWise = settings.type === 'business';
                                        const isKoreanResident = settings.isKoreanResident;

                                        return (
                                            <tr key={creator.id} className="hover:bg-zinc-800/30 transition-colors group">
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="font-bold text-zinc-100 group-hover:text-violet-400 transition-colors">{creator.name}</div>
                                                    <div className="text-xs text-zinc-500 mt-0.5">{creator.email}</div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    {isWise ? (
                                                        <div className="space-y-1">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                                                <Building className="w-2.5 h-2.5 mr-1" />
                                                                PayPal (USD)
                                                            </span>
                                                            <div className="text-[10px] text-zinc-500 ml-1 font-bold">
                                                                {isKoreanResident ? 'KOR Resident' : 'Overseas'}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                            <User className="w-2.5 h-2.5 mr-1" />
                                                            KOR Bank (KRW)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="space-y-2">
                                                        {isWise ? (
                                                            <>
                                                                {(settings.paypalEmail || settings.wiseEmail) && (
                                                                    <div className="flex items-center text-xs text-zinc-300 group/item cursor-pointer hover:text-white" onClick={() => copyToClipboard(settings.paypalEmail || settings.wiseEmail!)}>
                                                                        <span className="w-20 text-zinc-500 font-bold">EMAIL:</span>
                                                                        <span className="font-medium">{settings.paypalEmail || settings.wiseEmail}</span>
                                                                        <Copy className="w-3 h-3 ml-2 opacity-0 group-hover/item:opacity-100 transition-opacity text-zinc-600" />
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center text-xs text-zinc-300 group/item cursor-pointer hover:text-white" onClick={() => copyToClipboard(`${settings.bankName} ${settings.accountNumber}`)}>
                                                                    <span className="w-16 text-zinc-500 font-bold">ACCOUNT:</span>
                                                                    <span className="font-medium">{settings.bankName} {settings.accountNumber}</span>
                                                                    <Copy className="w-3 h-3 ml-2 opacity-0 group-hover/item:opacity-100 transition-opacity text-zinc-600" />
                                                                </div>
                                                                <div className="flex items-center text-xs text-zinc-300 group/item cursor-pointer hover:text-white" onClick={() => copyToClipboard(settings.accountHolder!)}>
                                                                    <span className="w-16 text-zinc-500 font-bold">NAME:</span>
                                                                    <span className="font-medium">{settings.accountHolder}</span>
                                                                    <Copy className="w-3 h-3 ml-2 opacity-0 group-hover/item:opacity-100 transition-opacity text-zinc-600" />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-right">
                                                    {viewMode === 'settlement' ? (
                                                        (() => {
                                                            const stat = settlements.find(s => s.creator_id === creator.id);
                                                            if (!stat) return <span className="text-zinc-600 text-xs font-bold">- NO DATA -</span>;

                                                            return (
                                                                <div className="inline-block text-right">
                                                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">
                                                                        Gross Sales
                                                                    </div>
                                                                    <div className="text-zinc-100 font-bold text-sm mb-2">
                                                                        ₩{stat.total_revenue.toLocaleString()}
                                                                    </div>
                                                                    <div className="h-px bg-zinc-800 w-full my-2" />
                                                                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">
                                                                        Payout (Net)
                                                                    </div>
                                                                    <div className="text-emerald-400 font-black text-lg">
                                                                        ₩{stat.settlement_amount.toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (
                                                        !isWise && settings.residentRegistrationNumber && (
                                                            <div className="inline-block text-right group/tax cursor-pointer" onClick={() => copyToClipboard(settings.residentRegistrationNumber!)}>
                                                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1 group-hover/tax:text-zinc-400 transition-colors">
                                                                    Tax ID / Resident No
                                                                </div>
                                                                <div className="text-zinc-300 font-mono text-xs flex items-center justify-end">
                                                                    {settings.residentRegistrationNumber}
                                                                    <Copy className="w-3 h-3 ml-2 opacity-0 group-hover/tax:opacity-100 transition-opacity text-zinc-600" />
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {viewMode === 'revenue' && (
                <div className="space-y-8">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-white">결제 및 환불 관리</h3>
                            <p className="text-sm text-zinc-500 mt-1">
                                총 매출: ₩{revenueLedger.filter(r => r.product_type !== 'subscription_distribution').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                                {' '}({revenueLedger.filter(r => r.amount < 0).length}건 환불 포함)
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadRevenueLedger}
                                className="border-zinc-700"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                새로고침
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setSelectedPayment(null);
                                    setShowRefundModal(true);
                                }}
                                className="bg-zinc-700 hover:bg-zinc-600"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                수동 기록 추가
                            </Button>
                        </div>
                    </div>

                    {/* Payments Table - For Actual Refunds */}
                    <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden backdrop-blur-xl">
                        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                            <h4 className="font-bold text-white">결제 내역</h4>
                            <p className="text-xs text-zinc-500 mt-1">환불할 결제를 선택하면 PortOne API로 실제 환불이 진행됩니다</p>
                        </div>
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                    <th className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase">일자</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase">결제자</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase">금액</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase">상태</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase">작업</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {payments.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">결제 내역이 없습니다.</td></tr>
                                ) : (
                                    payments.map(payment => (
                                        <tr key={payment.id} className={payment.status === 'refunded' ? 'bg-rose-500/5 opacity-60' : ''}>
                                            <td className="px-6 py-3 text-sm text-zinc-400">
                                                {new Date(payment.created_at).toLocaleDateString('ko-KR')}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="text-sm text-white">{payment.user?.name || '-'}</div>
                                                <div className="text-xs text-zinc-500">{payment.user?.email}</div>
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-emerald-400">
                                                ₩{payment.amount?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                                    payment.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    payment.status === 'refunded' ? 'bg-rose-500/10 text-rose-400' :
                                                    'bg-zinc-500/10 text-zinc-400'
                                                }`}>
                                                    {payment.status === 'completed' ? '완료' :
                                                     payment.status === 'refunded' ? '환불됨' : payment.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                {payment.status === 'completed' && payment.portone_payment_id && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedPayment(payment);
                                                            setRefundAmount(payment.amount?.toString() || '');
                                                            setShowRefundModal(true);
                                                        }}
                                                        className="bg-rose-600 hover:bg-rose-700 text-xs"
                                                    >
                                                        <MinusCircle className="w-3 h-3 mr-1" />
                                                        환불
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Revenue Ledger Table */}
                    <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden backdrop-blur-xl">
                        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                            <h4 className="font-bold text-white">매출 원장 (Revenue Ledger)</h4>
                            <p className="text-xs text-zinc-500 mt-1">매출 및 환불 기록</p>
                        </div>
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                    <th className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase">일자</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase">유형</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase">금액</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase">상태</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase">작업</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {revenueLedger.filter(r => r.product_type !== 'subscription_distribution').length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">데이터가 없습니다.</td></tr>
                                ) : (
                                    revenueLedger.filter(r => r.product_type !== 'subscription_distribution').map(record => (
                                        <tr key={record.id} className={record.amount < 0 ? 'bg-rose-500/5' : ''}>
                                            <td className="px-6 py-3 text-sm text-zinc-400">
                                                {new Date(record.created_at).toLocaleDateString('ko-KR')}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                                    record.product_type.includes('refund')
                                                        ? 'bg-rose-500/10 text-rose-400'
                                                        : 'bg-emerald-500/10 text-emerald-400'
                                                }`}>
                                                    {record.product_type}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-3 text-right font-bold ${record.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                {record.amount < 0 ? '' : '+'}₩{record.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-zinc-400">
                                                {record.status}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                {record.product_type === 'refund' && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm('이 환불 기록을 삭제하시겠습니까?')) return;
                                                            const result = await deleteRefundRecords(record.id);
                                                            if (result.success) {
                                                                success('삭제되었습니다');
                                                                loadRevenueLedger();
                                                            } else {
                                                                toastError(result.error || '삭제 실패');
                                                            }
                                                        }}
                                                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Platform Financials View */}
            {viewMode === 'finance' && (
                <div className="space-y-8">
                    {/* Period Selector */}
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
                        <div className="flex items-center gap-4">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm font-bold"
                            >
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
                            </select>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-4 py-2 text-sm font-bold"
                            >
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <option key={i} value={i}>{i + 1}월</option>
                                ))}
                            </select>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadFinancials}
                            className="border-zinc-700"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            새로고침
                        </Button>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 매출 */}
                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-blue-400 text-sm font-bold">매출 (총 수입)</span>
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="text-3xl font-bold text-white mb-4">
                                ₩{(financials?.totalRevenue || 0).toLocaleString()}
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">구독 수익</span>
                                    <span className="text-zinc-300">₩{(financials?.subscriptionRevenue || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">상품 판매</span>
                                    <span className="text-zinc-300">₩{(financials?.productRevenue || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* 비용 */}
                        <div className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-rose-500/20 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-rose-400 text-sm font-bold">비용 (지출)</span>
                                <TrendingDown className="w-5 h-5 text-rose-400" />
                            </div>
                            <div className="text-3xl font-bold text-white mb-4">
                                ₩{(financials?.totalCosts || 0).toLocaleString()}
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">크리에이터 정산</span>
                                    <span className="text-zinc-300">₩{(financials?.creatorPayouts || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">환불</span>
                                    <span className="text-zinc-300">₩{(financials?.refunds || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* 수익 */}
                        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-emerald-400 text-sm font-bold">플랫폼 수익</span>
                                <Wallet className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="text-3xl font-bold text-white mb-4">
                                ₩{(financials?.netProfit || 0).toLocaleString()}
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">플랫폼 수수료 (20%)</span>
                                    <span className="text-zinc-300">₩{(financials?.platformFees || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">환불 차감</span>
                                    <span className="text-rose-400">-₩{(financials?.refunds || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Trend */}
                    <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden backdrop-blur-xl">
                        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                            <h4 className="font-bold text-white">월별 추이 (최근 6개월)</h4>
                        </div>
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                    <th className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase">월</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase">매출</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase">비용</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase">수익</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {(financials?.monthlyData || []).length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">데이터가 없습니다.</td></tr>
                                ) : (
                                    financials?.monthlyData.map((row, i) => (
                                        <tr key={i} className="hover:bg-zinc-800/30">
                                            <td className="px-6 py-4 text-sm text-white font-medium">{row.month}</td>
                                            <td className="px-6 py-4 text-right text-sm text-blue-400">₩{row.revenue.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-sm text-rose-400">₩{row.costs.toLocaleString()}</td>
                                            <td className={`px-6 py-4 text-right text-sm font-bold ${row.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                ₩{row.profit.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Note */}
                    <div className="bg-zinc-900/30 rounded-xl border border-zinc-800/50 p-4">
                        <p className="text-xs text-zinc-500">
                            <strong className="text-zinc-400">계산 방식:</strong> 플랫폼 수익 = 구독수익의 20% + 상품판매 수수료(20%) - 환불금액
                        </p>
                    </div>
                </div>
            )}

            {/* Refund Modal */}
            {showRefundModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-2">
                            {selectedPayment ? '결제 환불 처리' : '수동 환불 기록 추가'}
                        </h3>
                        <p className="text-sm text-zinc-400 mb-6">
                            {selectedPayment
                                ? '이 작업은 PortOne API를 통해 실제 환불을 진행하고, 매출 원장에 기록합니다.'
                                : '이미 외부에서 환불 처리된 건에 대해 매출 원장에만 기록을 추가합니다.'}
                        </p>

                        {selectedPayment && (
                            <div className="bg-zinc-800/50 rounded-lg p-4 mb-4 border border-zinc-700">
                                <div className="text-xs text-zinc-500 mb-1">결제 정보</div>
                                <div className="text-white font-bold">{selectedPayment.user?.name || '-'}</div>
                                <div className="text-sm text-zinc-400">{selectedPayment.user?.email}</div>
                                <div className="text-emerald-400 font-bold mt-2">₩{selectedPayment.amount?.toLocaleString()}</div>
                                <div className="text-xs text-zinc-500 mt-1">Payment ID: {selectedPayment.portone_payment_id?.slice(0, 20)}...</div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-zinc-400 mb-2">
                                    환불 금액 (원) {selectedPayment && <span className="text-zinc-500 font-normal">- 비워두면 전액 환불</span>}
                                </label>
                                <input
                                    type="number"
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(e.target.value)}
                                    placeholder={selectedPayment ? selectedPayment.amount?.toString() : "190000"}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-zinc-400 mb-2">환불 사유</label>
                                <input
                                    type="text"
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    placeholder="테스트 결제 취소"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                                />
                            </div>
                            {!selectedPayment && (
                                <div>
                                    <label className="block text-sm font-bold text-zinc-400 mb-2">Subscription ID (선택)</label>
                                    <input
                                        type="text"
                                        value={refundSubscriptionId || ''}
                                        onChange={(e) => setRefundSubscriptionId(e.target.value || null)}
                                        placeholder="관련 구독 ID (없으면 비워두세요)"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="outline"
                                className="flex-1 border-zinc-700"
                                disabled={processingRefund}
                                onClick={() => {
                                    setShowRefundModal(false);
                                    setSelectedPayment(null);
                                    setRefundAmount('');
                                    setRefundReason('');
                                    setRefundSubscriptionId(null);
                                }}
                            >
                                취소
                            </Button>
                            <Button
                                className="flex-1 bg-rose-600 hover:bg-rose-700"
                                disabled={processingRefund || (!selectedPayment && !refundAmount)}
                                onClick={selectedPayment ? handleProcessRefund : handleAddRefund}
                            >
                                {processingRefund ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        처리 중...
                                    </>
                                ) : (
                                    <>
                                        <MinusCircle className="w-4 h-4 mr-2" />
                                        {selectedPayment ? '환불 처리' : '기록 추가'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
                onConfirm={confirmModal.action}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="warning"
            />
        </div>
    );
};
