import React, { useEffect, useState } from 'react';
import { getSystemLogs } from '../../lib/api-admin';
import { Shield, AlertTriangle, AlertOctagon, Info, Clock, Search, RefreshCw, Terminal, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LogEntry {
    id: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    category: string;
    message: string;
    details?: any;
    ip_address?: string;
    created_at: string;
}

export const AdminSystemLogs: React.FC = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterLevel, setFilterLevel] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        const { data, error } = await getSystemLogs(200);
        if (data) setLogs(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        if (filterLevel !== 'all' && log.level !== filterLevel) return false;
        if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase()) && !log.category.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'info': return <Info className="w-4 h-4 text-blue-400" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
            case 'error': return <AlertOctagon className="w-4 h-4 text-red-400" />;
            case 'critical': return <Shield className="w-4 h-4 text-rose-500" />;
            default: return <Terminal className="w-4 h-4 text-zinc-400" />;
        }
    };

    const getLevelStyle = (level: string) => {
        switch (level) {
            case 'info': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'warning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'critical': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">뒤로가기</span>
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight mb-1">System & Security Logs</h1>
                        <p className="text-zinc-400">Monitor system events, errors, and security audits.</p>
                    </div>
                    <button
                        onClick={fetchLogs}
                        disabled={loading}
                        className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-zinc-900/40 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'info', 'warning', 'error', 'critical'].map(level => (
                            <button
                                key={level}
                                onClick={() => setFilterLevel(level)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${filterLevel === level
                                        ? 'bg-zinc-100 text-zinc-900 border-white'
                                        : 'bg-zinc-900/40 text-zinc-500 border-zinc-800 hover:text-white'
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                    {loading ? (
                        <div className="p-20 text-center">
                            <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-zinc-200 rounded-full mx-auto mb-4" />
                            <p className="text-zinc-500 text-sm">Loading system logs...</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800/50">
                            {filteredLogs.length === 0 ? (
                                <div className="p-20 text-center text-zinc-500">No logs found matching your criteria.</div>
                            ) : (
                                filteredLogs.map(log => (
                                    <div key={log.id} className="p-4 hover:bg-zinc-900/50 transition-colors flex flex-col md:flex-row gap-4 text-sm">
                                        <div className="flex-shrink-0 flex flex-col gap-2 w-40">
                                            <div className="flex items-center gap-2 text-zinc-500 font-mono text-xs">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.created_at).toLocaleString()}
                                            </div>
                                            <div className={`self-start inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${getLevelStyle(log.level)}`}>
                                                {getLevelIcon(log.level)}
                                                <span className="text-[10px] font-black uppercase">{log.level}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase border border-zinc-700">{log.category}</span>
                                                {log.ip_address && <span className="text-zinc-600 font-mono text-[10px]">{log.ip_address}</span>}
                                            </div>
                                            <p className="text-zinc-300 font-medium break-words">{log.message}</p>
                                            {log.details && Object.keys(log.details).length > 0 && (
                                                <pre className="mt-2 text-[10px] text-zinc-500 bg-black/40 p-2 rounded-lg overflow-x-auto">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
