import React, { useEffect, useState } from 'react';
import {
    RefreshCw, BookOpen, Dumbbell, Swords, Clock,
    CheckCircle2, Info, Loader2,
    ArrowLeft, Play
} from 'lucide-react';
import {
    scanMissingDurations, syncDurations,
    DurationSyncItem, SyncResultItem
} from '../../lib/api-admin';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router-dom';

type TabKey = 'lessons' | 'drills' | 'sparring';

interface SyncableItem extends DurationSyncItem {
    syncStatus: 'pending' | 'syncing' | 'success' | 'failed' | 'skipped';
    syncResult?: SyncResultItem;
}

const TABS: { key: TabKey; label: string; icon: React.ElementType; table: 'lessons' | 'drills' | 'sparring_videos' }[] = [
    { key: 'lessons', label: '레슨', icon: BookOpen, table: 'lessons' },
    { key: 'drills', label: '드릴', icon: Dumbbell, table: 'drills' },
    { key: 'sparring', label: '스파링', icon: Swords, table: 'sparring_videos' },
];

const BATCH_SIZE = 10;

export const AdminDurationSync: React.FC = () => {
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('lessons');
    const [data, setData] = useState<Record<TabKey, SyncableItem[]>>({
        lessons: [], drills: [], sparring: []
    });
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
    const { success, error: toastError } = useToast();

    const scan = async () => {
        try {
            setScanning(true);
            const result = await scanMissingDurations();
            setData({
                lessons: result.lessons.map(i => ({ ...i, syncStatus: 'pending' })),
                drills: result.drills.map(i => ({ ...i, syncStatus: 'pending' })),
                sparring: result.sparring.map(i => ({ ...i, syncStatus: 'pending' })),
            });
        } catch (err: any) {
            toastError('스캔에 실패했습니다.');
            console.error(err);
        } finally {
            setScanning(false);
        }
    };

    useEffect(() => {
        scan();
    }, []);

    const getVimeoUrl = (item: DurationSyncItem): string => {
        return item.vimeo_url || item.video_url || '';
    };

    const handleSync = async (tabKey: TabKey) => {
        const tab = TABS.find(t => t.key === tabKey)!;
        const items = data[tabKey].filter(i => i.syncStatus === 'pending' || i.syncStatus === 'failed');
        if (items.length === 0) return;

        setSyncing(true);
        setSyncProgress({ current: 0, total: items.length });

        // Mark all as pending
        setData(prev => ({
            ...prev,
            [tabKey]: prev[tabKey].map(i =>
                items.find(it => it.id === i.id) ? { ...i, syncStatus: 'pending' as const } : i
            )
        }));

        let completed = 0;

        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = items.slice(i, i + BATCH_SIZE);

            // Mark batch as syncing
            setData(prev => ({
                ...prev,
                [tabKey]: prev[tabKey].map(item => {
                    const inBatch = batch.find(b => b.id === item.id);
                    return inBatch ? { ...item, syncStatus: 'syncing' as const } : item;
                })
            }));

            try {
                const payload = batch.map(item => ({
                    id: item.id,
                    vimeoUrl: getVimeoUrl(item),
                }));

                const { results } = await syncDurations(tab.table, payload);

                // Update each item with result
                setData(prev => ({
                    ...prev,
                    [tabKey]: prev[tabKey].map(item => {
                        const result = results.find(r => r.id === item.id);
                        if (!result) return item;
                        return {
                            ...item,
                            syncStatus: result.status as SyncableItem['syncStatus'],
                            syncResult: result,
                            // Update displayed data if success
                            ...(result.status === 'success' && result.updates ? {
                                length: result.updates.length || item.length,
                                duration_minutes: result.updates.duration_minutes || item.duration_minutes,
                                thumbnail_url: result.updates.thumbnail_url || item.thumbnail_url,
                            } : {})
                        };
                    })
                }));

                completed += results.length;
            } catch {
                // Mark batch as failed
                setData(prev => ({
                    ...prev,
                    [tabKey]: prev[tabKey].map(item => {
                        const inBatch = batch.find(b => b.id === item.id);
                        return inBatch ? { ...item, syncStatus: 'failed' as const } : item;
                    })
                }));
                completed += batch.length;
            }

            setSyncProgress({ current: completed, total: items.length });
        }

        const finalData = data[tabKey];
        const successCount = finalData.filter(i => i.syncStatus === 'success').length;
        if (successCount > 0) {
            success(`${successCount}개 항목이 동기화되었습니다.`);
        }

        setSyncing(false);
    };

    const handleSyncAll = async () => {
        for (const tab of TABS) {
            if (data[tab.key].filter(i => i.syncStatus === 'pending' || i.syncStatus === 'failed').length > 0) {
                await handleSync(tab.key);
            }
        }
    };

    const totalMissing = data.lessons.length + data.drills.length + data.sparring.length;
    const totalSuccess = [...data.lessons, ...data.drills, ...data.sparring].filter(i => i.syncStatus === 'success').length;
    const currentItems = data[activeTab];

    const statusBadge = (status: SyncableItem['syncStatus']) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">미동기화</span>;
            case 'syncing':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />동기화 중</span>;
            case 'success':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">완료</span>;
            case 'failed':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">실패</span>;
            case 'skipped':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">건너뜀</span>;
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div className="space-y-2">
                        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4">
                            <ArrowLeft className="w-3.5 h-3.5" /> 뒤로가기
                        </button>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                                Vimeo 영상 동기화
                            </h1>
                            <div className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" /> SYNC MODE
                            </div>
                        </div>
                        <p className="text-zinc-400 text-lg">영상 길이 및 썸네일 데이터를 Vimeo에서 자동으로 가져옵니다.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            onClick={scan}
                            disabled={scanning || syncing}
                            className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
                            스캔하기
                        </Button>
                        <Button
                            onClick={handleSyncAll}
                            disabled={scanning || syncing || totalMissing === 0}
                            className="bg-violet-600 hover:bg-violet-500 text-white"
                        >
                            <Play className={`w-4 h-4 mr-2`} />
                            전체 동기화 ({totalMissing})
                        </Button>
                    </div>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {TABS.map(tab => {
                        const count = data[tab.key].length;
                        const successCount = data[tab.key].filter(i => i.syncStatus === 'success').length;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`text-left bg-zinc-900/40 border rounded-2xl p-6 backdrop-blur-xl transition-all ${
                                    activeTab === tab.key ? 'border-violet-500/50 ring-1 ring-violet-500/20' :
                                    count > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-800/50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{tab.label}</span>
                                    <Icon className={`w-4 h-4 ${count > 0 ? 'text-amber-500' : 'text-zinc-600'}`} />
                                </div>
                                <div className={`text-3xl font-bold tracking-tight ${count > 0 ? 'text-amber-500' : 'text-white'}`}>
                                    {scanning ? '-' : count}
                                </div>
                                {successCount > 0 && (
                                    <p className="text-[10px] text-emerald-500 mt-1">{successCount}개 동기화 완료</p>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Sync Progress */}
                {syncing && syncProgress.total > 0 && (
                    <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-5 mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-violet-300 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> 동기화 진행 중...
                            </span>
                            <span className="text-xs text-zinc-400">{syncProgress.current} / {syncProgress.total}</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-violet-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Completed summary */}
                {!syncing && totalSuccess > 0 && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 mb-8 flex gap-4 items-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span className="text-sm text-zinc-300">
                            총 <strong className="text-emerald-400">{totalSuccess}개</strong> 항목의 영상 길이 및 썸네일이 동기화되었습니다.
                        </span>
                    </div>
                )}

                {/* Info Box */}
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-5 mb-8 flex gap-4 items-start">
                    <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-zinc-400 leading-relaxed">
                        <strong className="text-zinc-200 block mb-1">영상 동기화란?</strong>
                        데이터베이스에 영상 길이(duration)나 썸네일이 누락된 레코드를 찾아, Vimeo API에서 해당 정보를 가져와 자동으로 업데이트합니다.
                        업로드 중 오류가 발생하거나 이전 데이터에 길이가 저장되지 않은 경우 이 도구를 사용하세요.
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 mb-6 border-b border-zinc-800/50">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const count = data[tab.key].length;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
                                    activeTab === tab.key
                                        ? 'border-violet-500 text-white'
                                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {count > 0 && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                        activeTab === tab.key ? 'bg-violet-500/20 text-violet-300' : 'bg-zinc-800 text-zinc-400'
                                    }`}>{count}</span>
                                )}
                            </button>
                        );
                    })}

                    {/* Per-tab sync button */}
                    <div className="ml-auto flex items-center pb-2">
                        <button
                            onClick={() => handleSync(activeTab)}
                            disabled={syncing || scanning || currentItems.filter(i => i.syncStatus === 'pending' || i.syncStatus === 'failed').length === 0}
                            className="text-xs text-violet-400 hover:text-violet-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                            이 탭만 동기화
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl overflow-hidden backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-900/50 text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800/50">
                                    <th className="px-6 py-4 font-black">제목</th>
                                    <th className="px-6 py-4 font-black">Vimeo ID</th>
                                    <th className="px-6 py-4 font-black">현재 길이</th>
                                    <th className="px-6 py-4 font-black">썸네일</th>
                                    <th className="px-6 py-4 font-black text-right">상태</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/30">
                                {scanning ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-8">
                                                <div className="h-6 bg-zinc-800/50 rounded-lg w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : currentItems.length > 0 ? (
                                    currentItems.map(item => {
                                        const vimeoUrl = getVimeoUrl(item);
                                        const vimeoId = vimeoUrl.includes(':') ? vimeoUrl.split(':')[0] : vimeoUrl;
                                        return (
                                            <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-zinc-200 line-clamp-1 group-hover:text-violet-400 transition-colors">
                                                        {item.title || '(제목 없음)'}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-600 mt-0.5 font-mono">{item.id.slice(0, 8)}...</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <code className="text-[11px] font-mono text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/50">
                                                        {vimeoId}
                                                    </code>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {item.length && item.length !== '0:00' ? (
                                                            <span className="text-emerald-400">{item.length}</span>
                                                        ) : (
                                                            <span className="text-amber-400">없음</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.thumbnail_url && !item.thumbnail_url.includes('placeholder') ? (
                                                        <div className="w-16 aspect-video bg-zinc-800 rounded overflow-hidden border border-white/5">
                                                            <img src={item.thumbnail_url} alt={`${item.title || '영상'} 썸네일`} loading="lazy" className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-amber-400">없음</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {statusBadge(item.syncStatus)}
                                                    {item.syncResult?.error && (
                                                        <div className="text-[10px] text-rose-400 mt-1">{item.syncResult.error}</div>
                                                    )}
                                                    {item.syncResult?.updates?.length && item.syncStatus === 'success' && (
                                                        <div className="text-[10px] text-emerald-400 mt-1">{item.syncResult.updates.length}</div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <CheckCircle2 className="w-10 h-10 text-emerald-500/20" />
                                                <div className="text-zinc-500 font-medium">동기화 대상이 없습니다. 모든 데이터가 최신 상태입니다.</div>
                                            </div>
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
