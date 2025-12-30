import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, BookOpen, DollarSign, Upload, LogOut, Settings, Zap, Trophy, Users, Clapperboard, HelpCircle, Search, Instagram, Youtube } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../contexts/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';

import { LevelUpModal } from './LevelUpModal';
import { TitleEarnedModal } from './TitleEarnedModal';
import { cn } from '../lib/utils';

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
  ];

  const isActive = (path: string) => location.pathname === path;

  const isLandingPage = location.pathname === '/';

  if (isLandingPage) {
    return <>{children}</>;
  }

  // Sidebar is enabled only for specific "Full Screen" / Detail pages
  const isSidebarPage = ['/drills', '/sparring', '/routines', '/my-routines', '/drill-routines'].some(path => location.pathname.startsWith(path)) && !location.search.includes('view=grid');

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">

      {/* ========================================================================================= */}
      {/* FLOATING SIDEBAR ICONS - Visible only on MD+ AND specific pages */}
      {/* ========================================================================================= */}
      {isSidebarPage && (
        <div className="hidden md:flex flex-col fixed left-4 top-1/2 -translate-y-1/2 z-[100]">
          <div className="flex flex-col gap-3 p-2 bg-background/80 backdrop-blur-md border border-border rounded-full shadow-2xl">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href) || location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "p-3 rounded-full transition-all group relative",
                    active
                      ? "bg-primary text-primary-foreground shadow-lg scale-110"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-110"
                  )}
                  title={item.name}
                >
                  <Icon className={cn("w-6 h-6", active && "fill-current")} />

                  {/* Tooltip */}
                  <div className="absolute left-full ml-4 px-2 py-1 bg-popover text-popover-foreground text-xs rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 relative">
            {/* Left Section: Desktop Logo OR Mobile Search */}
            <div className="flex items-center">
              {/* Desktop Logo */}
              <Link to="/" className="hidden md:flex items-center">
                <img src="/logo_v2_final.png" alt="Grapplay" className="h-10 w-auto object-contain" />
              </Link>

              {/* Mobile Search Icon */}
              <div className="md:hidden">
                <Link to="/search" className="p-2 -ml-2 text-muted-foreground hover:text-foreground flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </Link>
              </div>
            </div>

            {/* Center Section: Mobile Logo */}
            <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
              <Link to="/" className="flex items-center pointer-events-auto">
                <img src="/logo_v2_final.png" alt="Grapplay" className="h-8 w-auto object-contain" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "px-2 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 lg:space-x-2 whitespace-nowrap",
                      isActive(item.href)
                        ? "bg-accent text-accent-foreground" // Active State
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground" // Inactive State
                    )}
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
                    <Button variant="outline" size="sm" className="flex items-center space-x-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 whitespace-nowrap px-2 lg:px-3 h-9">
                      <Settings className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden lg:inline">관리자</span>
                    </Button>
                  </Link>
                </>
              )}
              {user && !isCreator && (
                <Link to="/become-creator">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 whitespace-nowrap px-2 lg:px-3 h-9">
                    <Upload className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden lg:inline">인스트럭터 신청</span>
                  </Button>
                </Link>
              )}
              {user && isCreator && (
                <Link to="/creator">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2 whitespace-nowrap px-2 lg:px-3 h-9">
                    <Upload className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden lg:inline">대시보드</span>
                  </Button>
                </Link>
              )}

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 px-2 lg:px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap h-9 text-sm font-medium"
                  >
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden lg:inline">{user.user_metadata?.name || user.email?.split('@')[0]}</span>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-popover rounded-md shadow-md border border-border py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-b border-border mb-1">
                        내 계정
                      </div>
                      <Link
                        to="/library"
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 mx-1"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>내 라이브러리</span>
                      </Link>
                      <Link
                        to="/settings"
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 mx-1"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>설정</span>
                      </Link>
                      <div className="h-px bg-border my-1" />
                      <button
                        onClick={() => {
                          signOut();
                          setUserMenuOpen(false);
                        }}
                        className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-destructive hover:text-destructive-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 mx-1 text-red-500 hover:text-white"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>로그아웃</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login">
                  <Button variant="default" size="sm">로그인</Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-muted-foreground hover:text-foreground p-2"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background animate-in slide-in-from-top-5 duration-200">
            <div className="px-4 pt-4 pb-6 space-y-2">
              {/* Main Navigation removed from Mobile Menu (Moved to Bottom Bar) */}

              {user ? (
                <>
                  {!isCreator && (
                    <Link
                      to="/become-creator"
                      className="block px-3 py-2.5 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center space-x-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Upload className="w-5 h-5" />
                      <span>인스트럭터 신청</span>
                    </Link>
                  )}

                  {isCreator && (
                    <Link
                      to="/creator"
                      className="block px-3 py-2.5 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center space-x-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Upload className="w-5 h-5" />
                      <span>대시보드</span>
                    </Link>
                  )}

                  <Link
                    to="/contact"
                    className="block px-3 py-2.5 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center space-x-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>문의하기</span>
                  </Link>

                  <Link
                    to="/pricing"
                    className="block px-3 py-2.5 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center space-x-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <DollarSign className="w-5 h-5" />
                    <span>요금제</span>
                  </Link>

                  <Link
                    to="/settings"
                    className="block px-3 py-2.5 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center space-x-3"
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
                    className="w-full text-left px-3 py-2.5 rounded-md text-base font-medium text-destructive hover:bg-destructive/10 flex items-center space-x-3"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>로그아웃</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/pricing"
                    className="block px-3 py-2.5 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center space-x-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <DollarSign className="w-5 h-5" />
                    <span>요금제</span>
                  </Link>
                  <Link
                    to="/contact"
                    className="block px-3 py-2.5 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center space-x-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>문의하기</span>
                  </Link>
                  <Link
                    to="/become-creator"
                    className="block px-3 py-2.5 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center space-x-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Upload className="w-5 h-5" />
                    <span>인스트럭터 신청</span>
                  </Link>
                  <div className="pt-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button className="w-full">로그인</Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className={`flex-grow ${isLandingPage ? 'bg-black' : 'bg-background'}`}>
        {children}
      </main>

      {/* Footer */}
      {!['/drills', '/arena', '/sparring', '/journal', '/browse'].some(path => location.pathname.startsWith(path)) &&
        !location.pathname.startsWith('/course') &&
        !location.pathname.startsWith('/routines') && (
          <footer className={`bg-background border-t border-border mt-auto ${location.pathname === '/arena' ? 'hidden md:block' : ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid md:grid-cols-4 gap-8">
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center mb-4">
                    <img src="/logo_v2_final.png" alt="Grapplay" className="h-10 w-auto object-contain" />
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                    세계 최고의 주짓수 선수들에게 배우는 프리미엄 온라인 클래스.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-4">서비스</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link to="/browse" className="hover:text-primary transition-colors">강좌 둘러보기</Link></li>
                    <li><Link to="/pricing" className="hover:text-primary transition-colors">요금제</Link></li>
                    <li><Link to="/become-creator" className="hover:text-primary transition-colors">인스트럭터 신청</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-4">고객지원</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link to="/contact" className="hover:text-primary transition-colors">문의하기</Link></li>
                    <li><Link to="/terms" className="hover:text-primary transition-colors">이용약관</Link></li>
                    <li><Link to="/privacy" className="hover:text-primary transition-colors">개인정보처리방침</Link></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-border mt-12 pt-8">
                <div className="mb-6 text-xs text-muted-foreground space-y-1">
                  <p><strong>상호명:</strong> 그래플레이 | <strong>대표자:</strong> 이바름</p>
                  <p><strong>사업자등록번호:</strong> 111-39-34149</p>
                  <p><strong>주소:</strong> 서울 동작대로29길 119, 102-1207</p>
                  <p><strong>이메일:</strong> coach0179@naver.com | <strong>전화번호:</strong> 02-599-6315</p>
                  <p>* 통신판매업 신고 진행 중</p>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <p className="text-xs text-muted-foreground">
                    © 2024 Grapplay. All rights reserved.
                  </p>
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur border-t border-border pb-safe">
        <div className="grid grid-cols-5 h-16 items-center">
          {[
            { name: '클래스', href: '/browse', icon: BookOpen },
            { name: '드릴', href: '/drills', icon: Zap },
            { name: '스파링', href: '/sparring', icon: Clapperboard },
            { name: '피드', href: '/journal', icon: Users },
            { name: '아레나', href: '/arena', icon: Trophy },
          ].map((item) => {
            const Icon = item.icon;
            // Handle multiple paths for same tab
            let isActive = location.pathname.startsWith(item.href);
            if (item.href === '/browse' && location.pathname.startsWith('/courses')) isActive = true;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "fill-current")} />
                <span className="text-[10px] font-bold">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
};
