import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, Play, Eye, Clock, Users, Calendar,
    ChevronLeft, ChevronRight, Search, Filter, BookOpen, Dumbbell, Swords
} from 'lucide-react';
import {
    getAllWatchLogs,
    getWatchStatsSummary,
    WatchLogItem
} from '../../lib/api-admin';

export const AdminWatchLogs: React.FC = () => {
    const [logs, setLogs] = useState<WatchLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    const [stats, setStats] = useState({
        todayWatchMinutes: 0,
        todayUniqueViewers: 0,
        weekWatchMinutes: 0,
        weekUniqueViewers: 0,
        monthWatchMinutes: 0,
        monthUniqueViewers: 0
    });

    // Filters
    const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'lesson' | 'drill' | 'sparring'>('all');
    const [membershipFilter, setMembershipFilter] = useState<'all' | 'admin' | 'paid' | 'free_trial' | 'free'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const ITEMS_PER_PAGE = 30;

    useEffect(() => {
        loadData();
    }, [page, contentTypeFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [logsData, statsData] = await Promise.all([
                getAllWatchLogs(page, ITEMS_PER_PAGE, {
                    contentType: contentTypeFilter === 'all' ? undefined : contentTypeFilter
                }),
                page === 1 ? getWatchStatsSummary() : Promise.resolve(stats)
            ]);

            setLogs(logsData.logs);
            setTotalCount(logsData.totalCount);
            setHasMore(logsData.hasMore);

            if (page === 1) {
                setStats(statsData);
            }
        } catch (error) {
            console.error('Error loading watch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatWatchTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}시간 ${minutes}분`;
        }
        return `${minutes}분`;
    };

    const getContentIcon = (type: string) => {
        switch (type) {
            case 'lesson': return <BookOpen className="w-4 h-4 text-violet-400" />;
            case 'drill': return <Dumbbell className="w-4 h-4 text-emerald-400" />;
            case 'sparring': return <Swords className="w-4 h-4 text-rose-400" />;
            default: return <Play className="w-4 h-4 text-zinc-400" />;
        }
    };

    const getContentTypeLabel = (type: string) => {
        switch (type) {
            case 'lesson': return '레슨';
            case 'drill': return '드릴';
            case 'sparring': return '스파링';
            default: return type;
        }
    };

    const filteredLogs = logs.filter(log => {
        // Membership filter
        if (membershipFilter !== 'all' && log.membershipType !== membershipFilter) {
            return false;
        }
        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return log.userName.toLowerCase().includes(term) ||
                log.userEmail.toLowerCase().includes(term) ||
                log.contentTitle.toLowerCase().includes(term);
        }
        return true;
    });

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link
                            to="/admin"
                            className="flex items-center gap-2 text-zinc-500 hover:text-white mb-4 transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium">관리자 대시보드</span>
                        </Link>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Eye className="w-8 h-8 text-cyan-400" />
                            시청 기록 현황
                        </h1>
                        <p className="text-zinc-400 mt-2">고객들의 영상 시청 기록을 한눈에 확인하세요</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs text-zinc-500 font-bold">오늘 시청</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.todayWatchMinutes}분</p>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-violet-400" />
                            <span className="text-xs text-zinc-500 font-bold">오늘 시청자</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.todayUniqueViewers}명</p>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-zinc-500 font-bold">주간 시청</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.weekWatchMinutes}분</p>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-zinc-500 font-bold">주간 시청자</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.weekUniqueViewers}명</p>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-rose-400" />
                            <span className="text-xs text-zinc-500 font-bold">월간 시청</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.monthWatchMinutes}분</p>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-zinc-500 font-bold">월간 시청자</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.monthUniqueViewers}명</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="사용자명, 이메일, 콘텐츠명 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            />
                        </div>

                        {/* Content Type Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-zinc-500" />
                            <select
                                value={contentTypeFilter}
                                onChange={(e) => {
                                    setContentTypeFilter(e.target.value as any);
                                    setPage(1);
                                }}
                                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            >
                                <option value="all">전체 콘텐츠</option>
                                <option value="lesson">레슨만</option>
                                <option value="drill">드릴만</option>
                                <option value="sparring">스파링만</option>
                            </select>
                        </div>

                        {/* Membership Filter */}
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-zinc-500" />
                            <select
                                value={membershipFilter}
                                onChange={(e) => {
                                    setMembershipFilter(e.target.value as any);
                                    setPage(1);
                                }}
                                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            >
                                <option value="all">전체 회원</option>
                                <option value="admin">관리자</option>
                                <option value="paid">유료구독자</option>
                                <option value="free_trial">무료구독자</option>
                                <option value="free">무료회원</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Watch Logs Table */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-zinc-900/80 border-b border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                        사용자
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                        콘텐츠
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                        인스트럭터
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                        시청 시간
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                        날짜
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex justify-center items-center gap-2 text-zinc-500">
                                                <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                                                로딩 중...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <Eye className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                            <p className="text-zinc-500">시청 기록이 없습니다.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <Link
                                                    to={`/admin/users/${log.userId}`}
                                                    className="hover:text-cyan-400 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-white">{log.userName}</span>
                                                        {log.membershipType === 'admin' && (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                                                관리자
                                                            </span>
                                                        )}
                                                        {log.membershipType === 'paid' && (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                유료구독
                                                            </span>
                                                        )}
                                                        {log.membershipType === 'free_trial' && (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                                무료구독
                                                            </span>
                                                        )}
                                                        {log.membershipType === 'free' && (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                                                                무료회원
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-zinc-500">{log.userEmail}</div>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {getContentIcon(log.contentType)}
                                                    <div>
                                                        <div className="font-medium text-white">{log.contentTitle}</div>
                                                        <div className="text-xs text-zinc-500">
                                                            {getContentTypeLabel(log.contentType)}
                                                            {log.courseTitle && ` · ${log.courseTitle}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-zinc-400">
                                                {log.creatorName}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-cyan-400 font-mono font-bold">
                                                    {formatWatchTime(log.watchSeconds)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-sm text-white">{log.date}</div>
                                                <div className="text-xs text-zinc-500">
                                                    {new Date(log.updatedAt).toLocaleTimeString('ko-KR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
                            <div className="text-sm text-zinc-500">
                                총 {totalCount.toLocaleString()}건 중 {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, totalCount)}건
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-zinc-400 px-3">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={!hasMore}
                                    className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
