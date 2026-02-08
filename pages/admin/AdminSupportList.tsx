import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupportTickets, respondToTicket } from '../../lib/api-admin';
import { ArrowLeft, MessageSquare, Clock, CheckCircle2, Send, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export const AdminSupportList: React.FC = () => {
    const navigate = useNavigate();
    const { success, error: toastError } = useToast();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [adminResponse, setAdminResponse] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const data = await getSupportTickets();
            setTickets(data);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = async () => {
        if (!selectedTicket || !adminResponse) return;
        setSubmitting(true);
        try {
            const { error } = await respondToTicket(selectedTicket.id, adminResponse, 'resolved');
            if (error) throw error;
            success('답변이 전송되었습니다.');
            setAdminResponse('');
            setSelectedTicket(null);
            fetchTickets();
        } catch (error) {
            console.error('Error responding to ticket:', error);
            toastError('답변 전송에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div></div>;

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div className="space-y-1">
                        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-zinc-500 hover:text-white mb-4 transition-colors group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium">대시보드로 돌아가기</span>
                        </button>
                        <h1 className="text-3xl font-extrabold tracking-tight">1:1 문의 관리</h1>
                        <p className="text-zinc-400">사용자들이 남긴 문의사항을 확인하고 답변을 작성합니다.</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Tickets List */}
                    <div className="lg:col-span-1 space-y-4">
                        {tickets.length === 0 ? (
                            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
                                접수된 문의가 없습니다.
                            </div>
                        ) : (
                            tickets.map(ticket => (
                                <div
                                    key={ticket.id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${selectedTicket?.id === ticket.id ? 'bg-violet-500/10 border-violet-500/50' : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${ticket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                            {ticket.status === 'resolved' ? '답변완료' : '대기중'}
                                        </span>
                                        <span className="text-[10px] text-zinc-600 font-mono">
                                            {new Date(ticket.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-sm mb-1 truncate">{ticket.subject}</h3>
                                    <p className="text-xs text-zinc-500 mb-3 truncate">{ticket.message}</p>
                                    <div className="flex flex-col gap-1 mt-auto">
                                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                                            <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[8px]">{ticket.name?.charAt(0)}</div>
                                            {ticket.name}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 ml-6 truncate font-mono">
                                            {ticket.email}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Ticket Detail & Response Form */}
                    <div className="lg:col-span-2">
                        {selectedTicket ? (
                            <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-2xl font-black mb-2">{selectedTicket.subject}</h2>
                                            <div className="flex items-center gap-4 text-sm text-zinc-500 font-medium">
                                                <span>{selectedTicket.name} ({selectedTicket.email})</span>
                                                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                                <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-6 text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                        {selectedTicket.message}
                                    </div>
                                </div>

                                {selectedTicket.admin_response && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-violet-400 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Admin Response
                                        </h4>
                                        <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-6 text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                            {selectedTicket.admin_response}
                                        </div>
                                    </div>
                                )}

                                {selectedTicket.status !== 'resolved' && (
                                    <div className="space-y-4 pt-8 border-t border-zinc-800">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">답변 작성</h4>
                                        <textarea
                                            value={adminResponse}
                                            onChange={(e) => setAdminResponse(e.target.value)}
                                            rows={6}
                                            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:border-violet-500 outline-none resize-none transition-all"
                                            placeholder="문의에 대한 답변을 입력하세요..."
                                        />
                                        <button
                                            onClick={handleRespond}
                                            disabled={submitting || !adminResponse}
                                            className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {submitting ? 'SENDING...' : <><Send className="w-4 h-4" /> SEND RESPONSE</>}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center text-zinc-600">
                                <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                                <p className="font-bold">목록에서 문의를 선택하여 상세 내용을 확인하세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
