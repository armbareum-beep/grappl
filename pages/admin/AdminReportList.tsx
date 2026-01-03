import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReports, updateReportStatus } from '../../lib/api-admin';
import { Report } from '../../types';
import { Search, ArrowLeft, AlertTriangle, CheckCircle, XCircle, MessageSquare, Video, User } from 'lucide-react';

export const AdminReportList: React.FC = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');

    useEffect(() => {
        fetchReports();
    }, []);

    async function fetchReports() {
        try {
            const data = await getReports();
            setReports(data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleStatusUpdate = async (reportId: string, status: 'resolved' | 'dismissed') => {
        try {
            const { error } = await updateReportStatus(reportId, status);
            if (error) throw error;

            setReports(reports.map(r =>
                r.id === reportId ? { ...r, status } : r
            ));
        } catch (error) {
            console.error('Error updating report status:', error);
            alert('상태 업데이트 중 오류가 발생했습니다.');
        }
    };

    const filteredReports = reports.filter(report => {
        const matchesSearch =
            report.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (report.reporterName && report.reporterName.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesFilter = filterStatus === 'all' || report.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    const getTargetIcon = (type: string) => {
        switch (type) {
            case 'video': return <Video className="w-4 h-4" />;
            case 'comment': return <MessageSquare className="w-4 h-4" />;
            case 'user': return <User className="w-4 h-4" />;
            default: return <AlertTriangle className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-zinc-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div className="space-y-1">
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex items-center gap-2 text-zinc-500 hover:text-white mb-4 transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium">대시보드로 돌아가기</span>
                        </button>
                        <h1 className="text-3xl font-extrabold tracking-tight">신고 관리</h1>
                        <p className="text-zinc-400">플랫폼 내 부적절한 콘텐츠 및 사용자 신고 내역을 통합 관리합니다.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="신고 사유, 신고자 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all backdrop-blur-sm"
                        />
                    </div>
                    <div className="flex gap-1.5 p-1.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl backdrop-blur-sm">
                        {(['all', 'pending', 'resolved', 'dismissed'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${filterStatus === status
                                    ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                    }`}
                            >
                                {status === 'all' ? '전체' :
                                    status === 'pending' ? '대기' :
                                        status === 'resolved' ? '완료' : '기각'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">대상</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">신고 내용</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">리포터</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">상태</th>
                                    <th className="px-6 py-5 text-right text-xs font-bold text-zinc-500 uppercase tracking-widest">액션</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {filteredReports.length > 0 ? (
                                    filteredReports.map((report) => (
                                        <tr key={report.id} className="hover:bg-zinc-800/30 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 group-hover:text-violet-400 group-hover:border-violet-500/30 transition-all">
                                                        {getTargetIcon(report.targetType)}
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{report.targetType}</div>
                                                        <div className="text-sm font-bold text-zinc-100 group-hover:text-violet-100 transition-colors">ID: {report.targetId.substring(0, 8)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-medium text-zinc-200 line-clamp-1">{report.reason}</div>
                                                {report.targetContent && (
                                                    <div className="text-xs text-zinc-500 mt-1 line-clamp-1 italic font-medium">"{report.targetContent}"</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-sm text-zinc-400 font-medium">
                                                {report.reporterName || '익명'}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border 
                                                    ${report.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                        report.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            'bg-zinc-800 text-zinc-500 border-zinc-700/50'}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                {report.status === 'pending' && (
                                                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleStatusUpdate(report.id, 'resolved')}
                                                            className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-xl transition-all"
                                                            title="처리 완료"
                                                        >
                                                            <CheckCircle className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(report.id, 'dismissed')}
                                                            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                                                            title="기각"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-zinc-600 font-medium">
                                            미처리된 신고 내역이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
