import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupportTickets, respondToTicket } from '../../lib/api-admin';
import { SupportTicket } from '../../types';
import { Button } from '../../components/Button';
import { Search, ArrowLeft, MessageSquare, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';

export const AdminSupportList: React.FC = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [responseText, setResponseText] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all');

    useEffect(() => {
        fetchTickets();
    }, []);

    async function fetchTickets() {
        try {
            const data = await getSupportTickets();
            setTickets(data);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleResponse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicket || !responseText.trim()) return;

        try {
            const { error } = await respondToTicket(selectedTicket.id, responseText, 'resolved');
            if (error) throw error;

            setTickets(tickets.map(t =>
                t.id === selectedTicket.id
                    ? { ...t, status: 'resolved', adminResponse: responseText, respondedAt: new Date().toISOString() }
                    : t
            ));
            setSelectedTicket(null);
            setResponseText('');
            alert('답변이 등록되었습니다.');
        } catch (error) {
            console.error('Error responding to ticket:', error);
            alert('답변 등록 중 오류가 발생했습니다.');
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch =
            ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ticket.userName && ticket.userName.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesFilter = filterStatus === 'all' ||
            (filterStatus === 'open' ? ['open', 'in_progress'].includes(ticket.status) : ticket.status === 'resolved');

        return matchesSearch && matchesFilter;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open':
                return <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-xs">대기중</span>;
            case 'in_progress':
                return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded text-xs">처리중</span>;
            case 'resolved':
                return <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-xs">완료</span>;
            default:
                return <span className="px-2 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded text-xs">{status}</span>;
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
                <div className="mb-10">
                    <button
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white mb-4 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">대시보드로 돌아가기</span>
                    </button>
                    <h1 className="text-3xl font-extrabold tracking-tight">1:1 문의 관리</h1>
                    <p className="text-zinc-400">사용자들의 문의 사항을 실시간으로 확인하고 지원합니다.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* List Section */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Filters */}
                        <div className="flex gap-1.5 p-1.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl backdrop-blur-sm">
                            {(['all', 'open', 'resolved'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === status
                                        ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                        }`}
                                >
                                    {status === 'all' ? '전체' : status === 'open' ? '대기' : '완료'}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all text-sm"
                            />
                        </div>

                        {/* Ticket List */}
                        <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden max-h-[600px] overflow-y-auto backdrop-blur-xl">
                            {filteredTickets.length > 0 ? (
                                <div className="divide-y divide-zinc-800/50">
                                    {filteredTickets.map((ticket) => (
                                        <div
                                            key={ticket.id}
                                            onClick={() => setSelectedTicket(ticket)}
                                            className={`p-5 cursor-pointer transition-all hover:bg-zinc-800/50 group ${selectedTicket?.id === ticket.id ? 'bg-zinc-800/80 border-l-4 border-violet-500' : ''
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-zinc-100 group-hover:text-violet-400 transition-colors truncate pr-2">{ticket.subject}</span>
                                                {getStatusBadge(ticket.status)}
                                            </div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 block">
                                                {ticket.userName || 'Anonymous'} · {new Date(ticket.createdAt).toLocaleDateString()}
                                            </div>
                                            <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">{ticket.message}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-zinc-600 font-medium">
                                    문의 내역이 없습니다.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detail Section */}
                    <div className="lg:col-span-2">
                        {selectedTicket ? (
                            <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/50 p-8 h-full flex flex-col backdrop-blur-xl">
                                <div className="mb-8 pb-8 border-b border-zinc-800/50">
                                    <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                                        <h2 className="text-2xl font-extrabold tracking-tight text-white leading-tight">{selectedTicket.subject}</h2>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">ID: {selectedTicket.id.substring(0, 8)}</span>
                                            {getStatusBadge(selectedTicket.status)}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-8">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
                                            {selectedTicket.category}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-violet-500" />
                                            {new Date(selectedTicket.createdAt).toLocaleString()}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-3.5 h-3.5 text-violet-500" />
                                            Priority: {selectedTicket.priority}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-950/50 rounded-2xl p-6 text-zinc-300 whitespace-pre-wrap leading-relaxed border border-zinc-800/50">
                                        {selectedTicket.message}
                                    </div>
                                </div>

                                {selectedTicket.adminResponse ? (
                                    <div className="bg-violet-900/10 border border-violet-500/20 rounded-2xl p-6 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="flex items-center gap-2 mb-4 text-violet-400 font-black uppercase tracking-widest text-xs">
                                            <CheckCircle className="w-4 h-4" />
                                            지원팀 답변 완료
                                        </div>
                                        <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{selectedTicket.adminResponse}</p>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mt-6 text-right">
                                            Responded: {new Date(selectedTicket.respondedAt!).toLocaleString()}
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleResponse} className="mt-auto space-y-6">
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                답변 작성
                                            </label>
                                            <textarea
                                                value={responseText}
                                                onChange={(e) => setResponseText(e.target.value)}
                                                placeholder="사용자에게 보낼 상세 답변을 입력하세요..."
                                                className="w-full h-40 px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 mb-2 resize-none leading-relaxed transition-all"
                                                required
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <Button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-6 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                                                <Send className="w-4 h-4 mr-2" />
                                                답변 등록 및 완료
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        ) : (
                            <div className="bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800 p-20 flex flex-col items-center justify-center h-full text-zinc-600">
                                <div className="w-20 h-20 bg-zinc-900/50 rounded-2xl flex items-center justify-center mb-6">
                                    <MessageSquare className="w-10 h-10 opacity-20" />
                                </div>
                                <p className="font-bold text-lg text-zinc-500">문의 사항을 선택해주세요</p>
                                <p className="text-sm text-zinc-600 mt-2 text-center max-w-xs">왼쪽 목록에서 상세 내용을 확인하고 싶은 문의를 선택하세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
