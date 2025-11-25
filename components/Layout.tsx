import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, Video, BookOpen, DollarSign, Upload, LogOut, Settings, Zap, Trophy } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../contexts/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const location = useLocation();
  const { user, signOut, isCreator, isAdmin } = useAuth();

  const navigation = [
    { name: '홈', href: '/', icon: Video },
    { name: '둘러보기', href: '/browse', icon: BookOpen },
    { name: '드릴 & 루틴', href: '/drills', icon: Zap },
    { name: '수련 일지', href: '/journal', icon: BookOpen },
    { name: '아레나', href: '/arena', icon: Trophy },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="Grapplay" className="w-10 h-10 object-contain" />
              <span className="text-2xl font-black text-slate-900">Grapplay</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${isActive(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right side buttons */}
            <div className="hidden md:flex items-center space-x-3">
              {user && <NotificationDropdown />}
              {user && isAdmin && (
                <>
                  <Link to="/admin/dashboard">
                    <Button variant="outline" size="sm" className="flex items-center space-x-2 border-purple-600 text-purple-600 hover:bg-purple-50">
                      <Settings className="w-4 h-4" />
                      <span>관리자 관리</span>
                    </Button>
                  </Link>
                </>
              )}
              {user && !isCreator && (
                <Link to="/become-creator">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>인스트럭터 되기</span>
                  </Button>
                </Link>
              )}
              {user && isCreator && (
                <Link to="/creator">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>인스트럭터</span>
                  </Button>
                </Link>
              )}

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="font-medium">{user.user_metadata?.name || user.email?.split('@')[0]}</span>
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50">
                      <Link
                        to="/library"
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-4 h-4" />
                          <span>내 라이브러리</span>
                        </div>
                      </Link>
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
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
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 ${isActive(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              {user && !isCreator && (
                <Link
                  to="/become-creator"
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Upload className="w-5 h-5" />
                  <span>인스트럭터 되기</span>
                </Link>
              )}
              {user && isCreator && (
                <Link
                  to="/creator"
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-2"
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
                    className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>내 라이브러리</span>
                  </Link>
                  <Link
                    to="/settings"
                    className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-2"
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
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2"
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
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <img src="/logo.png" alt="Grapplay" className="w-8 h-8 object-contain" />
                <span className="text-xl font-black text-slate-900">Grapplay</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                세계 최고의 주짓수 선수들에게 배우는 프리미엄 온라인 클래스.
                언제 어디서나 당신의 실력을 향상시키세요.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">서비스</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link to="/browse" className="hover:text-blue-600 transition-colors">강좌 둘러보기</Link></li>
                <li><Link to="/pricing" className="hover:text-blue-600 transition-colors">요금제</Link></li>
                <li><Link to="/creator" className="hover:text-blue-600 transition-colors">인스트럭터 되기</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">고객지원</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">자주 묻는 질문</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">문의하기</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">이용약관</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">개인정보처리방침</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-400">
              © 2024 Grapplay. All rights reserved.
            </p>
            <div className="flex space-x-6">
              {/* Social icons would go here */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
