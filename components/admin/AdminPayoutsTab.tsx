import React, { useEffect, useState } from 'react';
import { AlertCircle, Copy, Building, User, Clock } from 'lucide-react';
import { getCreatorPayoutsAdmin } from '../../lib/api';
import { getAdminSettlements } from '../../lib/api-admin';

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
    const [creators, setCreators] = useState<CreatorPayoutInfo[]>([]);
    const [loading, setLoading] = useState(true);

    const [settlements, setSettlements] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'info' | 'settlement'>('settlement'); // Default to settlement view

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        // Load both basic info and settlement stats
        const [creatorsRes, settlementsRes] = await Promise.all([
            getCreatorPayoutsAdmin(),
            getAdminSettlements()
        ]);

        if (creatorsRes.data) setCreators(creatorsRes.data);
        if (settlementsRes) setSettlements(settlementsRes);

        setLoading(false);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast style alert? For now using simple alert or we could add a toast state
        alert('복사되었습니다: ' + text);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">정산 및 계좌 관리</h2>
                    <p className="text-zinc-400">크리에이터들의 수익 정산 현황과 등록된 지급 계좌를 관리합니다.</p>
                </div>
                <div className="flex p-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl backdrop-blur-sm">
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

            {/* Info Notice */}
            <div className="bg-zinc-900/50 border border-violet-500/20 rounded-2xl p-6 flex items-start gap-4 backdrop-blur-sm">
                <div className="p-2 bg-violet-500/10 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-violet-400" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-bold text-zinc-100 uppercase tracking-widest">수동 정산 프로세스 가이드</p>
                    <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-[11px] text-zinc-400 font-medium">
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                            지정된 계좌로 직접 실시간 송금
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                            국내 거주자 3.3% 원천세 공제 필수
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                            PayPal 송금 시 환율 차이는 크리에이터 부담
                        </li>
                    </ul>
                </div>
            </div>

            {/* Payouts Table */}
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
        </div>
    );
};
