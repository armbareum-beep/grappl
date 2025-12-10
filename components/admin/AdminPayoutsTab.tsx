import React, { useEffect, useState } from 'react';
import { DollarSign, Clock, CheckCircle, AlertCircle, Calendar, Copy, Building, User } from 'lucide-react';
import { getCreatorPayoutsAdmin } from '../../lib/api';

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
        wiseEmail?: string;
        wiseAccountNumber?: string;
        wiseRoutingNumber?: string;
        wiseSwiftBic?: string;
        isKoreanResident?: boolean;
    };
}

export const AdminPayoutsTab: React.FC = () => {
    const [creators, setCreators] = useState<CreatorPayoutInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPayouts();
    }, []);

    const loadPayouts = async () => {
        setLoading(true);
        const { data } = await getCreatorPayoutsAdmin();
        if (data) {
            setCreators(data);
        }
        setLoading(false);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('복사되었습니다: ' + text);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">정산 계좌 관리</h2>
                    <p className="text-slate-400 mt-1">크리에이터들의 정산 계좌 정보를 확인하고 송금할 수 있습니다.</p>
                </div>
            </div>

            {/* Info Notice */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                    <p className="font-medium text-blue-100">수동 정산 가이드</p>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-blue-300">
                        <li>아래 정보를 확인하여 해당 계좌로 직접 송금해주세요.</li>
                        <li>한국 계좌(KRW)의 경우 3.3% 사업소득세를 원천징수 후 입금해야 합니다.</li>
                        <li>Wise(USD)의 경우 Wise 비즈니스 계정에서 이메일 송금을 권장합니다.</li>
                    </ul>
                </div>
            </div>

            {/* Payouts Table */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    크리에이터
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    정산 유형
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    계좌 정보
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    추가 정보
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        로딩 중...
                                    </td>
                                </tr>
                            ) : creators.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        등록된 크리에이터가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                creators.map((creator) => {
                                    const settings = creator.payout_settings || {};
                                    const isWise = settings.type === 'business';
                                    const isKoreanResident = settings.isKoreanResident;
                                    const taxRate = isWise && !isKoreanResident ? 0 : 3.3;

                                    return (
                                        <tr key={creator.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-white">{creator.name}</div>
                                                <div className="text-sm text-slate-400">{creator.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {isWise ? (
                                                    <div className="flex flex-col">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 w-fit">
                                                            <Building className="w-3 h-3 mr-1" />
                                                            Wise (USD)
                                                        </span>
                                                        <span className="text-xs text-slate-400 mt-1 ml-1">
                                                            {isKoreanResident ? '한국 거주 (3.3%)' : '해외 거주 (0%)'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        <User className="w-3 h-3 mr-1" />
                                                        한국 계좌 (KRW)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    {isWise ? (
                                                        <>
                                                            {settings.wiseEmail && (
                                                                <div className="flex items-center text-sm text-white group cursor-pointer" onClick={() => copyToClipboard(settings.wiseEmail!)}>
                                                                    <span className="w-20 text-slate-400">Email:</span>
                                                                    <span>{settings.wiseEmail}</span>
                                                                    <Copy className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                                                                </div>
                                                            )}
                                                            {settings.wiseAccountNumber && (
                                                                <div className="flex items-center text-sm text-white group cursor-pointer" onClick={() => copyToClipboard(settings.wiseAccountNumber!)}>
                                                                    <span className="w-20 text-slate-400">Account:</span>
                                                                    <span>{settings.wiseAccountNumber}</span>
                                                                    <Copy className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                                                                </div>
                                                            )}
                                                            {settings.wiseRoutingNumber && (
                                                                <div className="flex items-center text-sm text-white group cursor-pointer" onClick={() => copyToClipboard(settings.wiseRoutingNumber!)}>
                                                                    <span className="w-20 text-slate-400">Routing:</span>
                                                                    <span>{settings.wiseRoutingNumber}</span>
                                                                    <Copy className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center text-sm text-white group cursor-pointer" onClick={() => copyToClipboard(`${settings.bankName} ${settings.accountNumber}`)}>
                                                                <span className="w-16 text-slate-400">계좌:</span>
                                                                <span>{settings.bankName} {settings.accountNumber}</span>
                                                                <Copy className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                                                            </div>
                                                            <div className="flex items-center text-sm text-white group cursor-pointer" onClick={() => copyToClipboard(settings.accountHolder!)}>
                                                                <span className="w-16 text-slate-400">예금주:</span>
                                                                <span>{settings.accountHolder}</span>
                                                                <Copy className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {!isWise && settings.residentRegistrationNumber && (
                                                    <div className="flex items-center text-sm text-slate-300 group cursor-pointer" onClick={() => copyToClipboard(settings.residentRegistrationNumber!)}>
                                                        <span className="mr-2">주민번호:</span>
                                                        <span>{settings.residentRegistrationNumber}</span>
                                                        <Copy className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                                                    </div>
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
