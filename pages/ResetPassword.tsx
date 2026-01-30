import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

export const ResetPassword: React.FC = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const { updatePassword } = useAuth();
    const navigate = useNavigate();

    // Check if we have a valid session (user clicked the reset link)
    useEffect(() => {
        const checkSession = async () => {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');

            if (!accessToken) {
                setError('유효하지 않은 재설정 링크입니다. 비밀번호 찾기를 다시 시도해주세요.');
            }
        };

        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (newPassword.length < 6) {
            setError('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await updatePassword(newPassword);

            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
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
                                비밀번호가 변경되었습니다
                            </h2>
                            <p className="mt-4 text-sm text-zinc-400">
                                새로운 비밀번호로 로그인해주세요.
                            </p>
                            <p className="mt-2 text-xs text-zinc-500">
                                잠시 후 로그인 페이지로 이동합니다...
                            </p>
                        </div>
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
                        새 비밀번호 설정
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500 mb-8">
                        새로운 비밀번호를 입력해주세요
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
                        <label htmlFor="newPassword" className="block text-xs font-bold text-zinc-400 uppercase ml-1 mb-2">
                            새 비밀번호
                        </label>
                        <div className="relative group bg-zinc-900/50 border border-zinc-800 rounded-2xl focus-within:border-violet-500/50 transition-all duration-300">
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                <Lock className="w-5 h-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                            </div>
                            <input
                                id="newPassword"
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="block w-full bg-transparent border-none text-zinc-100 placeholder:text-zinc-600 pl-12 pr-4 py-4 text-sm focus:ring-0 focus:outline-none"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500 ml-1">최소 6자 이상 입력해주세요</p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="block text-xs font-bold text-zinc-400 uppercase ml-1 mb-2">
                            비밀번호 확인
                        </label>
                        <div className="relative group bg-zinc-900/50 border border-zinc-800 rounded-2xl focus-within:border-violet-500/50 transition-all duration-300">
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                <Lock className="w-5 h-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                            </div>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full bg-transparent border-none text-zinc-100 placeholder:text-zinc-600 pl-12 pr-4 py-4 text-sm focus:ring-0 focus:outline-none"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-violet-600 hover:bg-violet-500 text-zinc-50 font-bold text-lg rounded-full py-4 shadow-[0_10px_20px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        {loading ? '변경 중...' : '비밀번호 변경'}
                    </button>
                </form>

                {/* Back to Login */}
                <div className="text-center">
                    <Link to="/login" className="text-sm text-zinc-500 hover:text-violet-400 transition-all inline-flex items-center gap-1 group">
                        ← 로그인 페이지로 돌아가기
                    </Link>
                </div>
            </div>
        </div>
    );
};
