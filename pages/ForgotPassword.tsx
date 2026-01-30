import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const { resetPassword } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await resetPassword(email);

            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
            }
        } catch (err: any) {
            setError(err.message || '오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-900/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-500 relative z-10">
                    {/* Logo */}
                    <div className="flex justify-center">
                        <Link to="/" className="text-3xl font-black text-zinc-50 tracking-tighter hover:text-violet-400 transition-colors">
                            Grapplay
                        </Link>
                    </div>

                    {/* Success Message */}
                    <div className="text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-3xl font-black tracking-tighter text-zinc-50">
                                이메일을 확인해주세요
                            </h2>
                            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                                <span className="text-violet-400 font-medium">{email}</span>로<br />
                                비밀번호 재설정 링크를 발송했습니다.
                            </p>
                            <p className="mt-2 text-xs text-zinc-500">
                                이메일이 도착하지 않았다면 스팸 폴더를 확인해주세요.
                            </p>
                        </div>

                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-violet-400 transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            로그인 페이지로 돌아가기
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-900/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-500 relative z-10">
                {/* Logo */}
                <div className="flex justify-center">
                    <Link to="/" className="text-3xl font-black text-zinc-50 tracking-tighter hover:text-violet-400 transition-colors">
                        Grapplay
                    </Link>
                </div>

                {/* Header */}
                <div className="text-center">
                    <h2 className="text-4xl font-black tracking-tighter text-zinc-50">
                        비밀번호 찾기
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500 mb-8">
                        가입하신 이메일 주소를 입력해주세요
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start">
                            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-500">{error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-xs font-bold text-zinc-400 uppercase ml-1 mb-2">
                            이메일
                        </label>
                        <div className="relative group bg-zinc-900/50 border border-zinc-800 rounded-2xl focus-within:border-violet-500/50 transition-all duration-300">
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                <Mail className="w-5 h-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                            </div>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full bg-transparent border-none text-zinc-100 placeholder:text-zinc-600 pl-12 pr-4 py-4 text-sm focus:ring-0 focus:outline-none"
                                placeholder="example@grapplay.com"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-violet-600 hover:bg-violet-500 text-zinc-50 font-bold text-lg rounded-full py-4 shadow-[0_10px_20px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        {loading ? '전송 중...' : '재설정 링크 받기'}
                    </button>
                </form>

                {/* Back to Login */}
                <div className="text-center">
                    <Link
                        to="/login"
                        className="text-sm text-zinc-500 hover:text-violet-400 transition-all inline-flex items-center gap-1 group"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        로그인 페이지로 돌아가기
                    </Link>
                </div>
            </div>
        </div>
    );
};
