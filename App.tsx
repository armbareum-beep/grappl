import React from 'react';
// FORCE HMR UPDATE APP - NEW UI TEST
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingScreen } from './components/LoadingScreen';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { BackgroundUploadProvider } from './contexts/BackgroundUploadContext';
import { VideoPreloadProvider } from './contexts/VideoPreloadContext';
import { GlobalUploadProgress } from './components/GlobalUploadProgress';
import { GlobalDrillPreloader } from './components/GlobalDrillPreloader';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { VersionChecker } from './components/VersionChecker';
import { initCacheMonitoring } from './lib/cache-monitor';
import { startConnectionKeepalive, stopConnectionKeepalive } from './lib/connection-manager';
import { clearErrorQueries } from './lib/react-query';

// Lazy load essential pages
const Home = React.lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const History = React.lazy(() => import('./pages/History').then(m => ({ default: m.History })));
const Browse = React.lazy(() => import('./pages/Browse').then(m => ({ default: m.Browse })));
const VideoDetail = React.lazy(() => import('./pages/VideoDetail').then(m => ({ default: m.VideoDetail })));
const Pricing = React.lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const MyLibrary = React.lazy(() => import('./pages/MyLibrary').then(m => ({ default: m.MyLibrary })));
const SavedListView = React.lazy(() => import('./pages/SavedListView').then(m => ({ default: m.SavedListView })));
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const CourseDetail = React.lazy(() => import('./pages/CourseDetail').then(m => ({ default: m.CourseDetail })));
const CreatorProfile = React.lazy(() => import('./pages/CreatorProfile').then(m => ({ default: m.CreatorProfile })));
const Routines = React.lazy(() => import('./pages/Routines').then(m => ({ default: m.Routines })));
const Library = React.lazy(() => import('./pages/Library').then(m => ({ default: m.Library })));
const MyRoutines = React.lazy(() => import('./pages/MyRoutines').then(m => ({ default: m.MyRoutines })));
const DrillDetail = React.lazy(() => import('./pages/DrillDetail').then(m => ({ default: m.DrillDetail })));
const RoutineDetail = React.lazy(() => import('./pages/RoutineDetail').then(m => ({ default: m.RoutineDetail })));
const DrillRoutineDetail = React.lazy(() => import('./pages/DrillRoutineDetail').then(m => ({ default: m.DrillRoutineDetail })));
const TechniqueDetailPage = React.lazy(() => import('./pages/TechniqueDetail').then(m => ({ default: m.TechniqueDetailPage })));
const LessonDetail = React.lazy(() => import('./pages/LessonDetail').then(m => ({ default: m.LessonDetail })));
const Instructors = React.lazy(() => import('./pages/Instructors').then(m => ({ default: m.Instructors })));
const Bundles = React.lazy(() => import('./pages/Bundles').then(m => ({ default: m.Bundles })));
const SparringDetail = React.lazy(() => import('./pages/SparringDetail').then(m => ({ default: m.SparringDetail })));
const SparringFeed = React.lazy(() => import('./pages/SparringFeed'));
const UserProfile = React.lazy(() => import('./pages/UserProfile'));
const MyRoutineSchedule = React.lazy(() => import('./pages/MyRoutineSchedule'));
const DrillReels = React.lazy(() => import('./pages/DrillReels').then(m => ({ default: m.DrillReels })));
const AllCompletedRoutines = React.lazy(() => import('./pages/AllCompletedRoutines').then(m => ({ default: m.AllCompletedRoutines })));
const FeedbackCenter = React.lazy(() => import('./pages/FeedbackCenter').then(m => ({ default: m.FeedbackCenter })));

// Admin pages - lazy loaded
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminCourseList = React.lazy(() => import('./pages/admin/AdminCourseList').then(m => ({ default: m.AdminCourseList })));
const AdminMarketing = React.lazy(() => import('./pages/admin/AdminMarketing').then(m => ({ default: m.AdminMarketing })));
const AdminPayouts = React.lazy(() => import('./pages/admin/AdminPayouts').then(m => ({ default: m.AdminPayouts })));
const AdminUserList = React.lazy(() => import('./pages/admin/AdminUserList').then(m => ({ default: m.AdminUserList })));
const AdminUserDetail = React.lazy(() => import('./pages/admin/AdminUserDetail').then(m => ({ default: m.AdminUserDetail })));
const AdminDrillList = React.lazy(() => import('./pages/admin/AdminDrillList').then(m => ({ default: m.AdminDrillList })));
const AdminRoutineList = React.lazy(() => import('./pages/admin/AdminRoutineList').then(m => ({ default: m.AdminRoutineList })));
const AdminLessonList = React.lazy(() => import('./pages/admin/AdminLessonList').then(m => ({ default: m.AdminLessonList })));
const AdminSparringList = React.lazy(() => import('./pages/admin/AdminSparringList').then(m => ({ default: m.AdminSparringList })));
const AdminSiteSettings = React.lazy(() => import('./pages/admin/AdminSiteSettings').then(m => ({ default: m.AdminSiteSettings })));
const AdminCreatorList = React.lazy(() => import('./pages/admin/AdminCreatorList').then(m => ({ default: m.AdminCreatorList })));
const AdminSupportList = React.lazy(() => import('./pages/admin/AdminSupportList').then(m => ({ default: m.AdminSupportList })));
const AdminContentApproval = React.lazy(() => import('./pages/admin/AdminContentApproval').then(m => ({ default: m.AdminContentApproval })));
const AdminSystemLogs = React.lazy(() => import('./pages/admin/AdminSystemLogs').then(m => ({ default: m.AdminSystemLogs })));
const AdminActivityFeed = React.lazy(() => import('./pages/admin/AdminActivityFeed').then(m => ({ default: m.AdminActivityFeed })));
const AdminNotifications = React.lazy(() => import('./pages/admin/AdminNotifications').then(m => ({ default: m.AdminNotifications })));
const AdminVimeoManagement = React.lazy(() => import('./pages/admin/AdminVimeoManagement').then(m => ({ default: m.AdminVimeoManagement })));
const AdminDurationSync = React.lazy(() => import('./pages/admin/AdminDurationSync').then(m => ({ default: m.AdminDurationSync })));

// Creator pages - lazy loaded
const CreatorDashboard = React.lazy(() => import('./pages/creator/CreatorDashboard').then(m => ({ default: m.CreatorDashboard })));
const UnifiedUploadModal = React.lazy(() => import('./pages/creator/UnifiedUploadModal').then(m => ({ default: m.UnifiedUploadModal })));
const CreateRoutine = React.lazy(() => import('./pages/creator/CreateRoutine').then(m => ({ default: m.CreateRoutine })));
const CreatorCourses = React.lazy(() => import('./pages/creator/CreatorCourses').then(m => ({ default: m.CreatorCourses })));
const CourseEditor = React.lazy(() => import('./pages/creator/CourseEditor').then(m => ({ default: m.CourseEditor })));

// Other pages - lazy loaded
const BecomeCreator = React.lazy(() => import('./pages/BecomeCreator').then(m => ({ default: m.BecomeCreator })));
const NotFound = React.lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const PaymentComplete = React.lazy(() => import('./pages/PaymentComplete').then(m => ({ default: m.PaymentComplete })));
const Checkout = React.lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const Agora = React.lazy(() => import('./pages/Agora').then(m => ({ default: m.Agora })));
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LandingPageV2 = React.lazy(() => import('./pages/LandingPageV2').then(m => ({ default: m.LandingPageV2 })));
const AICoach = React.lazy(() => import('./pages/AICoach').then(m => ({ default: m.AICoach })));
const TechniqueSkillTree = React.lazy(() => import('./components/technique/TechniqueSkillTree').then(m => ({ default: m.TechniqueSkillTree })));
const Terms = React.lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Privacy = React.lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Contact = React.lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const DebugAccess = React.lazy(() => import('./pages/DebugAccess'));

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  const [forceLoad, setForceLoad] = React.useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = React.useState(false);

  React.useEffect(() => {
    // First timeout: Force show landing page after 4s
    const timer = setTimeout(() => {
      setForceLoad(true);
      console.warn('[RootRedirect] Auth loading exceeded 4s, forcing landing page display');
    }, 4000);

    // Second timeout: If still loading after 8s, attempt auto-recovery
    const recoveryTimer = setTimeout(async () => {
      if (loading && !recoveryAttempted) {
        console.warn('[RootRedirect] Auth still loading after 8s, attempting auto-recovery');
        setRecoveryAttempted(true);

        // Check if we already tried recovery recently (10초로 단축, 60초 → 10초)
        const lastRecovery = localStorage.getItem('app_infinite_loading_recovery');
        const now = Date.now();
        if (lastRecovery && now - parseInt(lastRecovery) < 10000) {
          // 10초 내 재시도면 단순 리로드만 (스킵하지 않음)
          console.warn('[RootRedirect] Recovery attempted recently, doing simple reload');
          window.location.reload();
          return;
        }

        try {
          localStorage.setItem('app_infinite_loading_recovery', now.toString());
        } catch { /* Safari Private Mode 예외 무시 */ }

        // Clear auth data and reload
        try {
          // Clear auth-related storage
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('auth') || key.startsWith('user_status'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => {
            try { localStorage.removeItem(k); } catch { }
          });
          try { sessionStorage.clear(); } catch { }

          // Reload after cleanup
          window.location.reload();
        } catch (e) {
          console.error('[RootRedirect] Recovery failed, forcing reload:', e);
          window.location.reload(); // 실패해도 무조건 리로드
        }
      }
    }, 8000);

    return () => {
      clearTimeout(timer);
      clearTimeout(recoveryTimer);
    };
  }, [loading, recoveryAttempted]);

  if (loading && !forceLoad) {
    return <LoadingScreen message="로그인 정보 확인 중..." />;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <LandingPage />;
};

const OAuthRedirectHandler: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hasChecked, setHasChecked] = React.useState(false);

  React.useEffect(() => {
    if (user && !loading && !hasChecked && location.pathname !== '/login') {
      try {
        const savedPath = localStorage.getItem('oauth_redirect_path');
        if (savedPath && savedPath !== '/login' && savedPath !== '/' && savedPath !== location.pathname) {
          localStorage.removeItem('oauth_redirect_path');
          setHasChecked(true);
          setTimeout(() => {
            if (window.location.pathname !== savedPath) {
              window.location.href = savedPath;
            }
          }, 150);
        } else {
          setHasChecked(true);
        }
      } catch (e) {
        console.warn('Failed to restore redirect path:', e);
        setHasChecked(true);
      }
    }
  }, [user, loading, hasChecked, location.pathname]);

  return null;
};

const ScrollToRestore: React.FC = () => {
  const { key } = useLocation();
  const isRestoring = React.useRef(false);

  React.useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      if (isRestoring.current) return;
      try {
        const saved = JSON.parse(sessionStorage.getItem('grapplay_scroll_v3') || '{}');
        saved[key] = window.scrollY;
        sessionStorage.setItem('grapplay_scroll_v3', JSON.stringify(saved));
      } catch (e) { }
    };

    let scrollTimeout: NodeJS.Timeout;
    const throttledScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 150); // Throttle scroll saving
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      clearTimeout(scrollTimeout);
    };
  }, [key]);

  React.useEffect(() => {
    let targetPos = 0;
    try {
      const saved = JSON.parse(sessionStorage.getItem('grapplay_scroll_v3') || '{}');
      targetPos = saved[key] || 0;
    } catch (e) { }

    if (targetPos > 0) {
      isRestoring.current = true;

      // Use requestAnimationFrame for smoother initial scroll
      requestAnimationFrame(() => {
        window.scrollTo(0, targetPos);
      });

      let attempts = 0;
      const checkAndScroll = setInterval(() => {
        const currentHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;

        // Only scroll if content is long enough
        if (currentHeight >= targetPos + (viewportHeight / 2)) {
          window.scrollTo(0, targetPos);
          if (attempts > 2) { // Reduced attempts
            clearInterval(checkAndScroll);
            isRestoring.current = false;
          }
        }

        if (attempts > 10) { // Reduced max attempts
          clearInterval(checkAndScroll);
          isRestoring.current = false;
        }
        attempts++;
      }, 300); // Increased interval to 300ms for less CPU pressure

      return () => {
        clearInterval(checkAndScroll);
        isRestoring.current = false;
      };
    } else {
      window.scrollTo(0, 0);
      isRestoring.current = false;
    }
  }, [key]);

  return null;
};

const CourseRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/courses/${id}`} replace />;
};

const App: React.FC = () => {
  // ✅ 앱 시작 시 에러 상태의 쿼리 클리어 (무한 로딩/에러 복구)
  React.useEffect(() => {
    clearErrorQueries();
  }, []);

  // ✅ 캐시 모니터링 초기화 (프로덕션 로깅 활성화)
  React.useEffect(() => {
    const cleanup = initCacheMonitoring();
    return cleanup;
  }, []);

  // ✅ Supabase 연결 유지 (콜드 스타트 방지)
  React.useEffect(() => {
    startConnectionKeepalive();
    return () => stopConnectionKeepalive();
  }, []);

  return (
    <ErrorBoundary>
      <VersionChecker />
      <ToastProvider>
        <BackgroundUploadProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <VideoPreloadProvider>
              <GlobalDrillPreloader />
              <OAuthRedirectHandler />
              <ScrollToRestore />
              <Layout>
                <React.Suspense fallback={<LoadingScreen />}>
                  <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/v2" element={<LandingPageV2 />} />
                    <Route path="/home" element={
                      <ProtectedRoute guestRedirect="/">
                        <Home />
                      </ProtectedRoute>
                    } />
                    <Route path="/history" element={
                      <ProtectedRoute>
                        <History />
                      </ProtectedRoute>
                    } />
                    <Route path="/browse" element={<Browse />} />
                    <Route path="/bundles" element={<Bundles />} />
                    <Route path="/courses" element={<Browse />} />
                    <Route path="/courses/:id" element={<CourseDetail />} />
                    <Route path="/course/:id" element={<CourseRedirect />} />
                    <Route path="/videos/:id" element={<VideoDetail />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/subscription" element={<Navigate to="/pricing" replace />} />
                    <Route path="/creator" element={<CreatorDashboard />} />
                    <Route path="/creator-dashboard" element={<CreatorDashboard />} />
                    <Route path="/creator/dashboard" element={<CreatorDashboard />} />
                    <Route path="/creator/courses" element={<CreatorCourses />} />
                    <Route path="/creator/courses/new" element={<CourseEditor />} />
                    <Route path="/creator/courses/:id/edit" element={<CourseEditor />} />
                    <Route path="/creator/upload" element={<UnifiedUploadModal />} />
                    <Route path="/creator/drills/new" element={<UnifiedUploadModal initialContentType="drill" />} />
                    <Route path="/creator/drills/:id/edit" element={<UnifiedUploadModal initialContentType="drill" />} />
                    <Route path="/creator/lessons/new" element={<UnifiedUploadModal initialContentType="lesson" />} />
                    <Route path="/creator/lessons/:id/edit" element={<UnifiedUploadModal initialContentType="lesson" />} />
                    <Route path="/creator/create-routine" element={<CreateRoutine />} />
                    <Route path="/creator/routines/:id/edit" element={<CreateRoutine />} />
                    <Route path="/become-creator" element={<BecomeCreator />} />
                    <Route path="/creator/:id" element={<CreatorProfile />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/agora" element={<Agora />} />
                    <Route path="/saved" element={<MyLibrary />} />
                    <Route path="/saved/:type" element={<SavedListView />} />
                    <Route path="/feedback" element={
                      <ProtectedRoute>
                        <FeedbackCenter />
                      </ProtectedRoute>
                    } />
                    <Route path="/my-library" element={<Navigate to="/saved" replace />} />
                    <Route path="/watch" element={<Navigate to="/drills" replace />} />
                    <Route path="/training-routines" element={<MyRoutines />} />
                    <Route path="/drills" element={<DrillReels />} />
                    <Route path="/lessons" element={<Navigate to="/library?tab=classes" replace />} />
                    <Route path="/drills/:id" element={<DrillDetail />} />
                    <Route path="/routines" element={<Routines />} />
                    <Route path="/routines/:id" element={<RoutineDetail />} />
                    <Route path="/my-routines/:id" element={<RoutineDetail />} />
                    <Route path="/my-schedule" element={<MyRoutineSchedule />} />
                    <Route path="/drill-routines/:id" element={<DrillRoutineDetail />} />
                    <Route path="/completed-routines" element={<AllCompletedRoutines />} />
                    <Route path="/sparring/:id" element={<SparringDetail />} />
                    <Route path="/sparring" element={<SparringFeed />} />
                    <Route path="/ai-coach" element={
                      <ProtectedRoute>
                        <AICoach />
                      </ProtectedRoute>
                    } />
                    <Route path="/skill-tree" element={<TechniqueSkillTree />} />
                    <Route path="/creator/sparring/new" element={<UnifiedUploadModal initialContentType="sparring" />} />
                    <Route path="/creator/sparring/:id/edit" element={<UnifiedUploadModal initialContentType="sparring" />} />
                    <Route path="/technique/:techniqueId" element={<TechniqueDetailPage />} />
                    <Route path="/lessons/:id" element={<LessonDetail />} />
                    <Route path="/instructors" element={<Instructors />} />
                    <Route path="/profile/:userId" element={<UserProfile />} />
                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    } />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/debug-access" element={<DebugAccess />} />
                    <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin/courses" element={<AdminRoute><AdminCourseList /></AdminRoute>} />
                    <Route path="/admin/drills" element={<AdminRoute><AdminDrillList /></AdminRoute>} />
                    <Route path="/admin/routines" element={<AdminRoute><AdminRoutineList /></AdminRoute>} />
                    <Route path="/admin/lessons" element={<AdminRoute><AdminLessonList /></AdminRoute>} />
                    <Route path="/admin/sparring" element={<AdminRoute><AdminSparringList /></AdminRoute>} />
                    <Route path="/admin/settings" element={<AdminRoute><AdminSiteSettings /></AdminRoute>} />
                    <Route path="/admin/support" element={<AdminRoute><AdminSupportList /></AdminRoute>} />
                    <Route path="/admin/approval" element={<AdminRoute><AdminContentApproval /></AdminRoute>} />
                    <Route path="/admin/creators" element={<AdminRoute><AdminCreatorList /></AdminRoute>} />
                    <Route path="/admin/marketing" element={<AdminRoute><AdminMarketing /></AdminRoute>} />
                    <Route path="/admin/payouts" element={<AdminRoute><AdminPayouts /></AdminRoute>} />
                    <Route path="/admin/users" element={<AdminRoute><AdminUserList /></AdminRoute>} />
                    <Route path="/admin/users/:id" element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
                    <Route path="/admin/logs" element={<AdminRoute><AdminSystemLogs /></AdminRoute>} />
                    <Route path="/admin/activity" element={<AdminRoute><AdminActivityFeed /></AdminRoute>} />
                    <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
                    <Route path="/admin/vimeo" element={<AdminRoute><AdminVimeoManagement /></AdminRoute>} />
                    <Route path="/admin/vimeo-sync" element={<AdminRoute><AdminDurationSync /></AdminRoute>} />
                    <Route path="/payment/complete" element={<PaymentComplete />} />
                    <Route path="/checkout/:type/:id" element={<Checkout />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </React.Suspense>
              </Layout>
            </VideoPreloadProvider>
          </Router>
          <GlobalUploadProgress />
        </BackgroundUploadProvider>
      </ToastProvider>
      <SpeedInsights />
      <Analytics />
    </ErrorBoundary>
  );
};

export default App;
