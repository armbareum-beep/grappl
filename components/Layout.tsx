import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, BookOpen, DollarSign, Upload, LogOut, Settings, Clapperboard, HelpCircle, Network, Dumbbell, Home, Bookmark } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../contexts/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';

import { LevelUpModal } from './LevelUpModal';
import { TitleEarnedModal } from './TitleEarnedModal';
import { GlobalSearch } from '../pages/GlobalSearch';
import { cn } from '../lib/utils';
import { getSiteSettings } from '../lib/api-admin';
import { SiteSettings } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [searchModalOpen, setSearchModalOpen] = React.useState(false);
  const location = useLocation();
  const { user, signOut, isCreator, isAdmin } = useAuth();

  // Global Modals State
  const [levelUpData, setLevelUpData] = React.useState<{ oldLevel: number; newLevel: number; beltLevel: number } | null>(null);
  const [titleEarnedData, setTitleEarnedData] = React.useState<{ titleName: string; description?: string; rarity?: 'common' | 'rare' | 'epic' | 'legendary' } | null>(null);
  const [siteSettings, setSiteSettings] = React.useState<SiteSettings | null>(null);

  React.useEffect(() => {
    getSiteSettings().then(res => {
      if (res.data) setSiteSettings(res.data);
    }).catch(err => console.error('Failed to fetch site settings for footer:', err));
  }, []);

  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const mobileMenuRef = React.useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = React.useRef<HTMLButtonElement>(null);

  // Close menus when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // User Menu
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }

      // Mobile Menu
      // Check if click is outside both the menu and the toggle button
      if (mobileMenuOpen &&
        mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
        mobileMenuButtonRef.current && !mobileMenuButtonRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen, mobileMenuOpen]);

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

  // Close search and mobile menu on route change
  React.useEffect(() => {
    setSearchModalOpen(false);
    setMobileMenuOpen(false);
  }, [location]);

  const navigation = React.useMemo(() => {
    const nav = [
      { name: '홈', href: '/home', icon: Home },
      { name: '라이브러리', href: '/library', icon: BookOpen },
      { name: '피드', href: '/watch', icon: Clapperboard },
      { name: '스킬 로드맵', href: '/skill-tree', icon: Network },
      { name: '훈련 루틴', href: '/training-routines', icon: Dumbbell },
    ];

    if (isAdmin) {
      nav.push({ name: '관리자', href: '/admin/dashboard', icon: Settings });
    }

    return nav;
  }, [isAdmin]);

  const isActive = (path: string) => {
    const searchParams = new URLSearchParams(location.search);
    const hrefPath = path.split('?')[0];
    const hrefTab = new URLSearchParams(path.split('?')[1]).get('tab');

    if (hrefTab) {
      return location.pathname === hrefPath && searchParams.get('tab') === hrefTab;
    }
    if (hrefPath === '/library') {
      return location.pathname === hrefPath && (!searchParams.get('tab') || searchParams.get('tab') === 'classes');
    }
    return location.pathname === hrefPath || (hrefPath !== '/' && location.pathname.startsWith(hrefPath));
  };

  const isLandingPage = location.pathname === '/';

  if (isLandingPage && !isAdmin) {
    return <>{children}</>;
  }

  // Check for explicit fullscreen query param
  const isQueryFullScreen = new URLSearchParams(location.search).get('fullscreen') === 'true';

  // Define which pages hide the top header and mobile bottom nav
  const isFullScreenMode = isQueryFullScreen || [
    '/watch',
    // '/skill-tree',
    '/drills',
    '/sparring',
    '/routines/',
    '/my-routines/'
  ].some(path => location.pathname.startsWith(path));

  // Pages that need fixed viewport (no window scroll, internal scroll or canvas)
  const isFixedLayout = isQueryFullScreen || [
    '/skill-tree'
  ].some(path => location.pathname.startsWith(path));

  // Define which pages show the sidebar
  const isSidebarPage = [
    '/watch'
  ].some(path => location.pathname.startsWith(path));

  // If it's a "classic" full screen (like a detail page with no sidebar needed either)
  // we might still want to keep it simple. But user wants Sidebar on /watch and /skill-tree.

  return (
    <div className={cn(
      "flex flex-col bg-background text-foreground font-sans",
      isFixedLayout ? "h-screen overflow-hidden" : "min-h-screen"
    )}>
      {/* ========================================================================================= */}
      {/* FLOATING SIDEBAR ICONS - Visible only on MD+ AND specific pages */}
      {/* ========================================================================================= */}
      {isSidebarPage && (
        <div className="sidebar hidden md:flex flex-col fixed left-4 top-1/2 -translate-y-1/2 z-[40]">
          <div className="flex flex-col gap-3 p-2 bg-zinc-950/50 backdrop-blur-xl border border-zinc-900 rounded-full shadow-2xl">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href) || location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "p-3 rounded-full transition-all group relative hover:scale-110",
                    active
                      ? "text-violet-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.6)]"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                  title={item.name}
                >
                  <Icon className="w-6 h-6" />

                  {/* Tooltip */}
                  <div className="absolute left-full ml-4 px-2 py-1 bg-zinc-900 text-zinc-100 text-[10px] font-bold uppercase tracking-wider rounded border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      {!isFullScreenMode && (
        <nav className={cn(
          "sticky top-0 w-full transition-all duration-300",
          mobileMenuOpen ? "z-[99999]" : "z-[11000]",
          location.pathname === '/pricing'
            ? "bg-zinc-950"
            : (isLandingPage && isAdmin)
              ? "bg-black/80 backdrop-blur-xl border-b border-zinc-800/50"
              : "border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/60 shadow-lg shadow-black/20"
        )}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20 relative">
              {/* Left Section: Desktop Logo OR Mobile Search */}
              <div className="flex items-center">
                {/* Desktop Logo */}
                <Link to={user ? "/home" : "/"} className="hidden md:flex items-center group transition-transform hover:scale-105">
                  <span className="text-2xl font-black text-white tracking-tighter transition-colors group-hover:text-violet-400">
                    Grapplay
                  </span>
                </Link>

                {/* Mobile Saved Icon */}
                <div className="md:hidden">
                  <Link to="/saved" className={cn(
                    "p-2 -ml-2 transition-colors flex items-center justify-center",
                    location.pathname === '/saved' ? "text-violet-400" : "text-muted-foreground hover:text-foreground"
                  )}>
                    <Bookmark className="w-6 h-6" fill={location.pathname === '/saved' ? "currentColor" : "none"} />
                  </Link>
                </div>
              </div>

              {/* Center Section: Mobile Logo */}
              <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
                <Link to={user ? "/home" : "/"} className="flex items-center pointer-events-auto">
                  <span className="text-xl font-black text-white tracking-tighter">
                    Grapplay
                  </span>
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
                        "px-3 lg:px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center space-x-1.5 lg:space-x-2 whitespace-nowrap",
                        isActive(item.href)
                          ? "bg-violet-600/20 text-violet-400 shadow-lg shadow-violet-900/20 border border-violet-500/30" // Active State
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent" // Inactive State
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


                {user && isCreator && (
                  <Link to="/creator">
                    <Button variant="outline" size="sm" className="flex items-center space-x-2 whitespace-nowrap px-3 lg:px-4 h-9 rounded-xl border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 hover:border-zinc-600 font-bold transition-all duration-300">
                      <Upload className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden lg:inline">대시보드</span>
                    </Button>
                  </Link>
                )}

                {user ? (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-2 px-3 lg:px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-all duration-300 whitespace-nowrap h-9 text-sm font-bold shadow-lg shadow-violet-900/30"
                    >

                      <span className="">{
                        (user.user_metadata?.name && !user.user_metadata.name.includes('@'))
                          ? user.user_metadata.name
                          : user.email?.split('@')[0]
                      }</span>
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-800/50 py-2 z-[11001] animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-4 py-3 border-b border-zinc-800/50 mb-1">
                          <p className="text-sm font-bold text-white truncate">{
                            (user.user_metadata?.name && !user.user_metadata.name.includes('@'))
                              ? user.user_metadata.name
                              : user.email?.split('@')[0]
                          }</p>
                          <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                        </div>

                        {isAdmin && (
                          <Link
                            to="/admin/dashboard"
                            className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-sm outline-none transition-all duration-200 hover:bg-violet-500/10 text-violet-400 hover:text-violet-300 mx-2 font-medium"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            <span>관리자 대시보드</span>
                          </Link>
                        )}

                        {isCreator && (
                          <Link
                            to="/creator"
                            className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-sm outline-none transition-all duration-200 hover:bg-zinc-800/50 text-zinc-300 hover:text-white mx-2 font-medium"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            <span>인스트럭터 대시보드</span>
                          </Link>
                        )}

                        <div className="h-px bg-zinc-800/50 my-1 mx-2" />

                        <Link
                          to="/saved"
                          className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-sm outline-none transition-all duration-200 hover:bg-zinc-800/50 text-zinc-300 hover:text-white mx-2 font-medium"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Bookmark className="mr-2 h-4 w-4" />
                          <span>저장됨</span>
                        </Link>
                        <Link
                          to="/pricing"
                          className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-sm outline-none transition-all duration-200 hover:bg-zinc-800/50 text-zinc-300 hover:text-white mx-2 font-medium"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          <span>요금제</span>
                        </Link>
                        <Link
                          to="/contact"
                          className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-sm outline-none transition-all duration-200 hover:bg-zinc-800/50 text-zinc-300 hover:text-white mx-2 font-medium"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <HelpCircle className="mr-2 h-4 w-4" />
                          <span>문의하기</span>
                        </Link>
                        <Link
                          to="/settings"
                          className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-sm outline-none transition-all duration-200 hover:bg-zinc-800/50 text-zinc-300 hover:text-white mx-2 font-medium"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          <span>설정</span>
                        </Link>

                        <div className="h-px bg-zinc-800/50 my-2 mx-2" />

                        <button
                          onClick={() => {
                            signOut();
                            setUserMenuOpen(false);
                          }}
                          className="relative flex w-full cursor-pointer select-none items-center rounded-xl px-3 py-2 text-sm outline-none transition-all duration-200 hover:bg-red-500/10 text-red-400 hover:text-red-300 mx-2 font-medium"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>로그아웃</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link to="/login" className="text-zinc-400 hover:text-white text-sm font-bold transition-all duration-300 px-4 py-2 rounded-xl hover:bg-zinc-800/50">
                    로그인
                  </Link>
                )}
              </div>

              {/* Mobile menu button and notifications */}
              <div className="md:hidden flex items-center space-x-1">
                {user && <NotificationDropdown />}
                <button
                  ref={mobileMenuButtonRef}
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
            <div
              ref={mobileMenuRef}
              className="md:hidden border-t border-border bg-background animate-in slide-in-from-top-5 duration-200 relative z-[99999]"
            >
              <div className="px-4 pt-4 pb-6 space-y-2">
                {/* Main Navigation removed from Mobile Menu (Moved to Bottom Bar) */}

                {user ? (
                  <>
                    <div className="px-3 py-3 border-b border-zinc-800/50 mb-2">
                      <p className="text-sm font-bold text-white truncate">{
                        (user.user_metadata?.name && !user.user_metadata.name.includes('@'))
                          ? user.user_metadata.name
                          : user.email?.split('@')[0]
                      }</p>
                      <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    </div>

                    {isAdmin && (
                      <Link
                        to="/admin/dashboard"
                        className="block px-3 py-2.5 rounded-md text-base font-medium text-violet-400 hover:bg-violet-500/10 flex items-center space-x-3"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Settings className="w-5 h-5" />
                        <span>관리자 대시보드</span>
                      </Link>
                    )}

                    {isCreator && (
                      <Link
                        to="/creator"
                        className="block px-3 py-2.5 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center space-x-3"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Upload className="w-5 h-5" />
                        <span>인스트럭터 대시보드</span>
                      </Link>
                    )}

                    <div className="h-px bg-zinc-800/50 my-2 mx-3" />

                    <Link
                      to="/saved"
                      className="block px-3 py-2.5 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center space-x-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Bookmark className="w-5 h-5" />
                      <span>저장됨</span>
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
                      to="/contact"
                      className="block px-3 py-2.5 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center space-x-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <HelpCircle className="w-5 h-5" />
                      <span>문의하기</span>
                    </Link>

                    <Link
                      to="/settings"
                      className="block px-3 py-2.5 rounded-md text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center space-x-3"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="w-5 h-5" />
                      <span>설정</span>
                    </Link>

                    <div className="h-px bg-zinc-800/50 my-2 mx-3" />

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

                    <div className="pt-2">
                      <Link
                        to="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block w-full py-3 text-center rounded-xl border border-zinc-800 text-zinc-100 font-bold hover:bg-zinc-900 transition-colors"
                      >
                        로그인
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </nav>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-grow",
        isLandingPage ? "bg-black" : "bg-background",
        isFixedLayout && "flex flex-col h-full overflow-hidden"
      )}>
        {children}
      </main>

      {/* Footer */}
      {!['/drills', '/training-routines', '/sparring', '/browse', '/skill-tree', '/routines', '/my-routines', '/drill-routines', '/my-schedule', '/library'].some(path => location.pathname.startsWith(path)) &&
        !location.pathname.startsWith('/course') && (
          <footer className="bg-zinc-950 border-t border-zinc-900 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="grid md:grid-cols-4 gap-12 md:gap-8">
                <div className="col-span-1 md:col-span-2 space-y-6">
                  <div className="flex items-center">
                    <span className="text-2xl font-black text-white tracking-tighter">
                      Grapplay
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
                    세계 최고의 주짓수 선수들에게 배우는 프리미엄 온라인 클래스.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-100 mb-6">서비스</h4>
                  <ul className="space-y-4 text-sm">
                    <li><Link to="/browse" className="text-zinc-400 hover:text-violet-400 transition-colors">강좌 둘러보기</Link></li>
                    <li><Link to="/pricing" className="text-zinc-400 hover:text-violet-400 transition-colors">요금제</Link></li>

                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-100 mb-6">고객지원</h4>
                  <ul className="space-y-4 text-sm">
                    <li><Link to="/contact" className="text-zinc-400 hover:text-violet-400 transition-colors">문의하기</Link></li>
                    <li><Link to="/terms" className="text-zinc-400 hover:text-violet-400 transition-colors">이용약관</Link></li>
                    <li><Link to="/privacy" className="text-zinc-400 hover:text-violet-400 transition-colors">개인정보처리방침</Link></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-zinc-900 mt-16 pt-10">
                <div className="mb-8 text-[11px] text-zinc-600 space-y-1.5 leading-relaxed">
                  <p><strong>상호명:</strong> {siteSettings?.footer?.companyName || '그래플레이'} | <strong>대표자:</strong> {siteSettings?.footer?.representative || '이바름'}</p>
                  <p><strong>사업자등록번호:</strong> {siteSettings?.footer?.registrationNumber || '111-39-34149'} | <strong>통신판매업 신고번호:</strong> {siteSettings?.footer?.mailOrderNumber || '진행 중'}</p>
                  <p><strong>주소:</strong> {siteSettings?.footer?.address || '서울 동작구 동작대로29길 119, 102-1207'}</p>
                  <p><strong>이메일:</strong> {siteSettings?.footer?.email || 'coach0179@naver.com'} | <strong>전화번호:</strong> {siteSettings?.footer?.phone || '02-599-6315'}</p>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <p className="text-xs text-zinc-700">
                    © 2025 Grapplay. All rights reserved.
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

      {/* Mobile Bottom Navigation (Global, 5 Tabs) - Adjusted Z to stay top of everything */}
      {!isLandingPage && !isFullScreenMode && (
        <div className="bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-[99999] bg-zinc-950/85 backdrop-blur-xl border-t border-zinc-800/50 shadow-[0_-1px_10px_rgba(0,0,0,0.3)] h-16 safe-area-pb">
          <div className="grid grid-cols-5 h-full items-center relative">
            {[
              { name: '라이브러리', href: '/library', icon: BookOpen },
              { name: '피드', href: '/watch', icon: Clapperboard },
              { name: '홈', href: '/home', icon: Home, isSpecial: true },
              { name: '스킬 로드맵', href: '/skill-tree', icon: Network },
              { name: '훈련 루틴', href: '/training-routines', icon: Dumbbell },
            ].map((item) => {
              const Icon = item.icon;
              const searchParams = new URLSearchParams(location.search);
              const hrefPath = item.href.split('?')[0];
              const hrefTab = new URLSearchParams(item.href.split('?')[1]).get('tab');

              let isActive = location.pathname === hrefPath;

              if (hrefTab) {
                isActive = isActive && searchParams.get('tab') === hrefTab;
                if (location.pathname.startsWith('/routines') || location.pathname.startsWith('/my-routines')) isActive = true;
              } else if (hrefPath === '/library') {
                isActive = isActive && (!searchParams.get('tab') || searchParams.get('tab') === 'classes');
                if (location.pathname.startsWith('/browse') || location.pathname.startsWith('/course')) isActive = true;
              }

              if (item.href === '/watch' && (location.pathname.startsWith('/drills'))) isActive = true;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full relative transition-all duration-300",
                    item.isSpecial
                      ? "text-violet-400"
                      : isActive
                        ? "text-violet-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.6)]"
                        : "text-zinc-500 active:text-zinc-300"
                  )}
                >
                  <Icon className={cn(
                    "transition-all duration-300",
                    item.isSpecial
                      ? "w-6 h-6"
                      : isActive ? "w-5 h-5 scale-110" : "w-5 h-5 scale-100"
                  )} />

                  <span className={cn(
                    "text-[10px] mt-1 font-medium transition-all duration-300",
                    isActive ? "opacity-100" : "opacity-80"
                  )}>
                    {item.name}
                  </span>

                  {/* Active Indicator Dot */}
                  {isActive && (
                    <div className="absolute bottom-1.5 w-1 h-1 bg-violet-400 rounded-full shadow-[0_0_8px_rgba(167,139,250,0.6)] animate-in zoom-in duration-300" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      <GlobalSearch isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />

    </div>
  );
};
