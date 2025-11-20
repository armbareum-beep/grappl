import React, { useState } from 'react';
import { Button } from '../components/Button';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-black italic text-blue-600">GRAPPL</h2>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900">
            {isLogin ? '로그인' : '계정 생성'}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {isLogin ? '아직 계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {isLogin ? '회원가입' : '로그인'}
            </button>
          </p>
        </div>
        <form className="mt-8 space-y-6" action="#" method="POST">
          <input type="hidden" name="remember" value="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">이메일 주소</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="이메일 주소"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">비밀번호</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호"
              />
            </div>
          </div>

          <div>
            <Button className="w-full" size="lg">
              {isLogin ? '로그인' : '가입하기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
