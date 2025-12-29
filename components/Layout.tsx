import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, Video, BookOpen, DollarSign, Upload, LogOut, Settings, Zap, Trophy, Users, Package, Clapperboard } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../contexts/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';

import { LevelUpModal } from './LevelUpModal';
import { TitleEarnedModal } from './TitleEarnedModal';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const location = useLocation();
  const { user, signOut, isCreator, isAdmin } = useAuth();

  // Global Modals State
  const [levelUpData, setLevelUpData] = React.useState<{ oldLevel: number; newLevel: number; beltLevel: number } | null>(null);
  const [titleEarnedData, setTitleEarnedData] = React.useState<{ titleName: string; description?: string; rarity?: 'common' | 'rare' | 'epic' | 'legendary' } | null>(null);

  React.useEffect(() => {
    const handleLevelUp = (event: CustomEvent) => {
      setLevelUpData(event.detail);
    };

    const handleTitleEarned = (event: CustomEvent) => {
      setTitleEarnedData(event.detail);
    };

    window.addEventListener('grappl:level-up' as any, handleLevelUp);
    window.addEventListener('grappl:title-earned' as any, handleTitleEarned);

    return () => {
      window.removeEventListener('grappl:level-up' as any, handleLevelUp);
      window.removeEventListener('grappl:title-earned' as any, handleTitleEarned);
    };
  }, []);

  const navigation = [
    { name: '클래스', href: '/browse', icon: BookOpen },
    { name: '드릴 & 루틴', href: '/drills', icon: Zap },
    { name: '스파링', href: '/sparring', icon: Clapperboard },
    { name: '피드', href: '/journal', icon: Users },
    { name: '아레나', href: '/arena', icon: Trophy },
    // { name: '요금제', href: '/pricing', icon: DollarSign },
  ];

  const isActive = (path: string) => location.pathname === path;

  const isLandingPage = location.pathname === '/';

  if (isLandingPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Navigation */}
      <nav className="bg-slate-900 shadow-lg sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img src="/logo_v2_final.png" alt="Grapplay" className="h-14 w-auto object-contain" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-2 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 lg:space-x-2 whitespace-nowrap ${isActive(item.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right side buttons */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-3">
              {user && <NotificationDropdown />}
              {user && isAdmin && (
                <>
                  <Link to="/admin/dashboard">
                    <Button variant="outline" size="sm" className="flex items-center space-x-2 border-purple-500 text-purple-400 hover:bg-purple-900/30 whitespace-nowrap px-2 lg:px-3">
                      <Settings className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden lg:inline">관리자 관리</span>
                    </Button>
                  </Link>
                </>
              )}
              {user && !isCreator && (
                <Link to="/become-creator">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 whitespace-nowrap px-2 lg:px-3 border-slate-600 text-slate-200 hover:bg-slate-800">
                    <Upload className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden lg:inline">인스트럭터 되기</span>
                  </Button>
                </Link>
              )}
              {user && isCreator && (
                <Link to="/creator">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 whitespace-nowrap px-2 lg:px-3 border-slate-600 text-slate-200 hover:bg-slate-800">
                    <Upload className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden lg:inline">인스트럭터</span>
                  </Button>
                </Link>
              )}

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 px-2 lg:px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium hidden lg:inline">{user.user_metadata?.name || user.email?.split('@')[0]}</span>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 py-1 z-50">
                      <Link
                        to="/library"
                        className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-4 h-4" />
                          <span>내 라이브러리</span>
                        </div>
                      </Link>
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-2">
                          <Settings className="w-4 h-4" />
                          <span>설정</span>
                        </div>
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/30"
                      >
                        <div className="flex items-center space-x-2">
                          <LogOut className="w-4 h-4" />
                          <span>로그아웃</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login">
                  <Button>로그인</Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-600 hover:text-slate-900 p-2"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Main Navigation removed from Mobile Menu (Moved to Bottom Bar) */}

              {user && !isCreator && (
                <Link
                  to="/become-creator"
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:bg-slate-800 hover:text-white flex items-center space-x-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Upload className="w-5 h-5" />
                  <span>인스트럭터 되기</span>
                </Link>
              )}
              {user && isCreator && (
                <Link
                  to="/creator"
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:bg-slate-800 hover:text-white flex items-center space-x-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Upload className="w-5 h-5" />
                  <span>인스트럭터 대시보드</span>
                </Link>
              )}
              {user ? (
                <>
                  <Link
                    to="/library"
                    className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:bg-slate-800 hover:text-white flex items-center space-x-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>내 라이브러리</span>
                  </Link>
                  <Link
                    to="/settings"
                    className="block px-3 py-2 rounded-md text-base font-medium text-slate-400 hover:bg-slate-800 hover:text-white flex items-center space-x-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="w-5 h-5" />
                    <span>설정</span>
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-red-900/30 flex items-center space-x-2"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>로그아웃</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  <span>로그인</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      {!['/drills', '/arena', '/sparring', '/journal'].includes(location.pathname) && (
        <footer className={`bg-slate-900 border-t border-slate-800 mt-auto ${location.pathname === '/arena' ? 'hidden md:block' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center mb-4">
                  <img src="/logo_v2_final.png" alt="Grapplay" className="h-12 w-auto object-contain" />
                </div>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                  세계 최고의 주짓수 선수들에게 배우는 프리미엄 온라인 클래스.
                  언제 어디서나 당신의 실력을 향상시키세요.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-white mb-4">서비스</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link to="/browse" className="hover:text-blue-600 transition-colors">강좌 둘러보기</Link></li>
                  <li><Link to="/become-creator" className="hover:text-blue-600 transition-colors">인스트럭터 되기</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-4">고객지원</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link to="/contact" className="hover:text-blue-600 transition-colors">문의하기</Link></li>
                  <li><Link to="/terms" className="hover:text-blue-600 transition-colors">이용약관</Link></li>
                  <li><Link to="/privacy" className="hover:text-blue-600 transition-colors">개인정보처리방침</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-800 mt-12 pt-8">
              {/* Business Information */}
              <div className="mb-6 text-xs text-slate-500 space-y-1">
                <p><strong className="text-slate-400">상호명:</strong> 그래플레이</p>
                <p><strong className="text-slate-400">대표자:</strong> 이바름</p>
                <p><strong className="text-slate-400">사업자등록번호:</strong> 111-39-34149</p>
                <p><strong className="text-slate-400">주소:</strong> 서울 동작대로29길 119, 102-1207</p>
                <p><strong className="text-slate-400">이메일:</strong> coach0179@naver.com</p>
                <p><strong className="text-slate-400">전화번호:</strong> 02-599-6315</p>
                <p className="text-slate-600 mt-2">* 통신판매업 신고 진행 중</p>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-slate-500">
                  © 2024 Grapplay. All rights reserved.
                </p>
                <div className="flex space-x-6">
                  {/* Social icons would go here */}
                </div>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Global Modals */}
      {levelUpData && (
        <LevelUpModal
          isOpen={!!levelUpData}
          onClose={() => setLevelUpData(null)}
          oldLevel={levelUpData.oldLevel}
          newLevel={levelUpData.newLevel}
          beltLevel={levelUpData.beltLevel}
        />
      )}

      {titleEarnedData && (
        <TitleEarnedModal
          isOpen={!!titleEarnedData}
          onClose={() => setTitleEarnedData(null)}
          titleName={titleEarnedData.titleName}
          description={titleEarnedData.description}
          rarity={titleEarnedData.rarity}
        />
      )}

      {/* Mobile Bottom Navigation (Global, 5 Tabs) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-slate-900 border-t border-slate-800 pb-safe">
        <div className="grid grid-cols-5 h-16 items-center">
          {/* 1. Class (Home) */}
          <Link
            to="/browse"
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname.startsWith('/browse') || location.pathname.startsWith('/courses')
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            <BookOpen className={`w-5 h-5 ${location.pathname.startsWith('/browse') || location.pathname.startsWith('/courses') ? 'text-indigo-500' : ''}`} />
            <span className="text-[10px] font-bold">클래스</span>
          </Link>

          {/* 2. Drills */}
          <Link
            to="/drills"
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname.startsWith('/drills')
              ? 'text-white'
              : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            <Zap className={`w-5 h-5 ${location.pathname.startsWith('/drills') ? 'text-emerald-500' : ''}`} />
            <span className="text-[10px] font-bold">드릴</span>
          </Link>

          {/* 3. Sparring */}
          <Link
            to="/sparring"
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname.startsWith('/sparring')
              ? 'text-white'
              : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            <Clapperboard className={`w-5 h-5 ${location.pathname.startsWith('/sparring') ? 'text-blue-500' : ''}`} />
            <span className="text-[10px] font-bold">스파링</span>
          </Link>

          {/* 4. Feed (Journal) - NEW */}
          <Link
            to="/journal"
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname.startsWith('/journal')
              ? 'text-white'
              : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            <Users className={`w-5 h-5 ${location.pathname.startsWith('/journal') ? 'text-pink-500' : ''}`} />
            <span className="text-[10px] font-bold">피드</span>
          </Link>

          {/* 5. Arena */}
          <Link
            to="/arena"
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${location.pathname.startsWith('/arena')
              ? 'text-white'
              : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            <Trophy className={`w-5 h-5 ${location.pathname.startsWith('/arena') ? 'text-amber-500' : ''}`} />
            <span className="text-[10px] font-bold">아레나</span>
          </Link>
        </div>
      </div>

    </div>
  );
};
