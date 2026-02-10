import React, { useEffect, useState } from 'react';
import { Copy, Building, User, Clock, Download } from 'lucide-react';
import { getCreatorPayoutsAdmin } from '../../lib/api';
import { getAdminSettlements, exportSettlementsToCSV } from '../../lib/api-admin';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

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
    const [viewMode, setViewMode] = useState<'info' | 'settlement' | 'processing'>('processing');
    const [payouts, setPayouts] = useState<any[]>([]);

    // Payout Management State
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [calculating, setCalculating] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; action: () => void; title: string; message: string}>({isOpen: false, action: () => {}, title: '', message: ''});

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (viewMode === 'processing') {
            loadPayouts();
        }
    }, [viewMode, selectedYear, selectedMonth]);

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
        const { data } = await getAdminPayouts(selectedYear, selectedMonth + 1);
        setPayouts(data || []);
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
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase">정산 금액</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase">상태</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-zinc-500 uppercase">작업</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {payouts.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500">데이터가 없습니다.</td></tr>
                                ) : (
                                    payouts.map(p => (
                                        <tr key={p.id}>
                                            <td className="px-6 py-4 font-bold text-white">{p.creator?.name}</td>
                                            <td className="px-6 py-4 font-bold text-emerald-400">₩{p.amount.toLocaleString()}</td>
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
                                    ))
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
