import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';


export const Login: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);

    const { signIn, signUp, signInWithGoogle } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const fromState = (location.state as any)?.from;

    // 리다이렉트할 경로 결정
    // 1. from state에 pathname이 있으면 해당 경로 사용
    // 2. from이 문자열이면 그대로 사용
    // 3. 둘 다 없으면 /home으로 이동
    const getRedirectPath = () => {
        if (fromState?.pathname) {
            // 로그인 페이지나 루트에서 온 경우가 아니라면 원래 페이지로
            if (fromState.pathname !== '/login' && fromState.pathname !== '/') {
                return fromState;
            }
        } else if (typeof fromState === 'string' && fromState !== '/login' && fromState !== '/') {
            return fromState;
        }
        return '/home';
    };

    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const formEmail = formData.get('email') as string;
        const formPassword = formData.get('password') as string;

        try {
            // Create a timeout promise (Extended to 10s for mobile)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('로그인 요청 시간이 초과되었습니다. 다시 시도해주세요.')), 10000)
            );

            // Race between the actual auth call and the timeout
            const normalizedEmail = formEmail.trim().toLowerCase();
            const normalizedPassword = formPassword.trim();

            const authPromise = isLogin
                ? signIn(normalizedEmail, normalizedPassword)
                : signUp(normalizedEmail, normalizedPassword);

            const result = await Promise.race([authPromise, timeoutPromise]) as { error: any };
            const { error } = result;

            if (error) {
                if (error.message === 'Invalid login credentials') {
                    setError('이메일 또는 비밀번호가 잘못되었습니다. 구글로 가입하셨다면 아래 "Google 계정으로 계속하기"를 이용해주세요.');
                } else {
                    setError(error.message);
                }
            } else {
                const redirectPath = getRedirectPath();
                navigate(redirectPath, { replace: true });
            }
        } catch (err: any) {
            console.error('Login error:', err);
            if (err.message === 'Invalid login credentials') {
                setError('이메일 또는 비밀번호가 잘못되었습니다. 구글로 가입하셨다면 아래 "Google 계정으로 계속하기"를 이용해주세요.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google') => {
        setError('');
        setSocialLoading(provider);

        try {
            // OAuth 로그인 전에 리다이렉트 경로 저장
            const redirectPath = getRedirectPath();
            if (redirectPath !== '/home') {
                try {
                    const pathString = typeof redirectPath === 'string'
                        ? redirectPath
                        : (redirectPath as any).pathname;
                    localStorage.setItem('oauth_redirect_path', pathString);
                } catch (e) {
                    console.warn('Failed to save redirect path:', e);
                }
            }

            const result = await signInWithGoogle();

            if (result.error) {
                setError(result.error.message);
                setSocialLoading(null);
            }
            // Note: OAuth will redirect, so we don't need to handle success here
        } catch (err: any) {
            setError(err.message);
            setSocialLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-900/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-500 relative z-10">
                {/* Logo Integration */}
                <div className="flex justify-center">
                    <Link to="/" className="text-3xl font-black text-zinc-50 tracking-tighter hover:text-violet-400 transition-colors">
                        Grapplay
                    </Link>
                </div>

                {/* Header */}
                <div className="text-center">
                    <h2 className="text-4xl font-black tracking-tighter text-zinc-50">
                        {isLogin ? '로그인' : '회원가입'}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500 mb-8">
                        {isLogin ? 'Grapplay 계정으로 로그인하세요' : '새로운 계정을 만드세요'}
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-8">
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
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => {
                                        const cleaned = e.target.value.replace(/^\s+|\s+$/g, '');
                                        setEmail(cleaned);
                                    }}
                                    onBlur={(e) => setEmail(e.target.value.trim())}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    autoComplete="email"
                                    spellCheck="false"
                                    className="block w-full bg-transparent border-none text-zinc-100 placeholder:text-zinc-600 pl-12 pr-4 py-4 text-sm focus:ring-0 focus:outline-none"
                                    placeholder="example@grapplay.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-xs font-bold text-zinc-400 uppercase ml-1 mb-2">
                                비밀번호
                            </label>
                            <div className="relative group bg-zinc-900/50 border border-zinc-800 rounded-2xl focus-within:border-violet-500/50 transition-all duration-300">
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                    <Lock className="w-5 h-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => {
                                        const cleaned = e.target.value.replace(/^\s+|\s+$/g, '');
                                        setPassword(cleaned);
                                    }}
                                    onBlur={(e) => setPassword(e.target.value.trim())}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    autoComplete="current-password"
                                    spellCheck="false"
                                    className="block w-full bg-transparent border-none text-zinc-100 placeholder:text-zinc-600 pl-12 pr-12 py-4 text-sm focus:ring-0 focus:outline-none"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:outline-none z-20"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            {!isLogin && (
                                <p className="mt-1 text-xs text-zinc-500 ml-1">최소 6자 이상 입력해주세요</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-violet-600 hover:bg-violet-500 text-zinc-50 font-bold text-lg rounded-full py-4 shadow-[0_10px_20px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
                        </button>
                    </form>

                    {/* Toggle */}
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-sm text-zinc-500 hover:text-violet-400 transition-all font-medium"
                        >
                            {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                        </button>
                    </div>

                    {/* Social Login */}
                    <div>
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-800"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-zinc-950 text-zinc-700 font-medium">또는</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleSocialLogin('google')}
                            disabled={socialLoading !== null}
                            className="w-full flex items-center justify-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full py-4 px-4 hover:bg-zinc-800 transition-colors group"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="text-zinc-300 font-medium group-hover:text-zinc-100 transition-colors">
                                {socialLoading === 'google' ? 'Google 로그인 중...' : 'Google 계정으로 계속하기'}
                            </span>
                        </button>
                    </div>

                    {/* Back to Home */}
                    <div className="text-center">
                        <Link to="/" className="text-sm text-zinc-500 hover:text-violet-400 transition-all inline-flex items-center gap-1 group">
                            ← 홈으로 돌아가기
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
