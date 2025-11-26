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
            <div className="flex justify-center items-center min-h-screen bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white mb-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>대시보드로 돌아가기</span>
                    </button>
                    <h1 className="text-3xl font-bold text-white mb-2">1:1 문의 관리</h1>
                    <p className="text-slate-400">사용자 문의 사항을 확인하고 답변을 등록합니다.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* List Section */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Filters */}
                        <div className="flex gap-2 mb-4">
                            {(['all', 'open', 'resolved'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === status
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    {status === 'all' ? '전체' : status === 'open' ? '대기중' : '완료됨'}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>

                        {/* Ticket List */}
                        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden max-h-[600px] overflow-y-auto">
                            {filteredTickets.length > 0 ? (
                                <div className="divide-y divide-slate-800">
                                    {filteredTickets.map((ticket) => (
                                        <div
                                            key={ticket.id}
                                            onClick={() => setSelectedTicket(ticket)}
                                            className={`p-4 cursor-pointer transition-colors hover:bg-slate-800 ${selectedTicket?.id === ticket.id ? 'bg-slate-800 border-l-4 border-blue-500' : ''
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-medium text-white truncate pr-2">{ticket.subject}</span>
                                                {getStatusBadge(ticket.status)}
                                            </div>
                                            <div className="text-xs text-slate-500 mb-2">
                                                {ticket.userName || 'Anonymous'} · {new Date(ticket.createdAt).toLocaleDateString()}
                                            </div>
                                            <p className="text-sm text-slate-400 line-clamp-2">{ticket.message}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    문의 내역이 없습니다.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detail Section */}
                    <div className="lg:col-span-2">
                        {selectedTicket ? (
                            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 h-full flex flex-col">
                                <div className="mb-6 pb-6 border-b border-slate-800">
                                    <div className="flex justify-between items-start mb-4">
                                        <h2 className="text-xl font-bold text-white">{selectedTicket.subject}</h2>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">ID: {selectedTicket.id}</span>
                                            {getStatusBadge(selectedTicket.status)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-6">
                                        <div className="flex items-center gap-1">
                                            <MessageSquare className="w-4 h-4" />
                                            {selectedTicket.category}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {new Date(selectedTicket.createdAt).toLocaleString()}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <AlertCircle className="w-4 h-4" />
                                            {selectedTicket.priority}
                                        </div>
                                    </div>

                                    <div className="bg-slate-950 rounded-lg p-4 text-slate-300 whitespace-pre-wrap">
                                        {selectedTicket.message}
                                    </div>
                                </div>

                                {selectedTicket.adminResponse ? (
                                    <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                                        <div className="flex items-center gap-2 mb-2 text-blue-400 font-medium">
                                            <CheckCircle className="w-4 h-4" />
                                            답변 완료
                                        </div>
                                        <p className="text-slate-300 whitespace-pre-wrap">{selectedTicket.adminResponse}</p>
                                        <div className="text-xs text-slate-500 mt-4 text-right">
                                            답변일: {new Date(selectedTicket.respondedAt!).toLocaleString()}
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleResponse} className="mt-auto">
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            답변 작성
                                        </label>
                                        <textarea
                                            value={responseText}
                                            onChange={(e) => setResponseText(e.target.value)}
                                            placeholder="사용자에게 보낼 답변을 입력하세요..."
                                            className="w-full h-32 px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 resize-none"
                                            required
                                        />
                                        <div className="flex justify-end">
                                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                                                <Send className="w-4 h-4 mr-2" />
                                                답변 등록 및 완료 처리
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        ) : (
                            <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 flex flex-col items-center justify-center h-full text-slate-500">
                                <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                                <p>좌측 목록에서 문의를 선택하세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
