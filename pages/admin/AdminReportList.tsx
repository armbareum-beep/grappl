import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReports, updateReportStatus } from '../../lib/api-admin';
import { Report } from '../../types';
import { Button } from '../../components/Button';
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
            <div className="flex justify-center items-center min-h-screen bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex items-center gap-2 text-slate-400 hover:text-white mb-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>대시보드로 돌아가기</span>
                        </button>
                        <h1 className="text-3xl font-bold">신고 관리</h1>
                        <p className="text-slate-400">사용자 신고 내역을 검토하고 처리합니다.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="신고 사유, 신고자 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'pending', 'resolved', 'dismissed'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === status
                                        ? 'bg-red-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                {status === 'all' ? '전체' :
                                    status === 'pending' ? '대기중' :
                                        status === 'resolved' ? '처리됨' : '기각됨'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">대상</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">신고 사유</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">신고자</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">상태</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredReports.length > 0 ? (
                                    filteredReports.map((report) => (
                                        <tr key={report.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                                                        {getTargetIcon(report.targetType)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-white capitalize">{report.targetType}</div>
                                                        <div className="text-xs text-slate-500">ID: {report.targetId.substring(0, 8)}...</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-white">{report.reason}</div>
                                                {report.targetContent && (
                                                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">"{report.targetContent}"</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-400">
                                                {report.reporterName || 'Anonymous'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                    ${report.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                        report.status === 'resolved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                            'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {report.status === 'pending' && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleStatusUpdate(report.id, 'resolved')}
                                                            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors"
                                                            title="처리 완료"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(report.id, 'dismissed')}
                                                            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-500/10 rounded-lg transition-colors"
                                                            title="기각"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            신고 내역이 없습니다.
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
