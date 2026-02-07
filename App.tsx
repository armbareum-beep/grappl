import React from 'react';
// FORCE HMR UPDATE APP - NEW UI TEST
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingScreen } from './components/LoadingScreen';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { BackgroundUploadProvider } from './contexts/BackgroundUploadContext';
import { GlobalUploadProgress } from './components/GlobalUploadProgress';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { VersionChecker } from './components/VersionChecker';

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
const Watch = React.lazy(() => import('./pages/Watch').then(m => ({ default: m.Watch })));
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
const UserProfile = React.lazy(() => import('./pages/UserProfile'));
const MyRoutineSchedule = React.lazy(() => import('./pages/MyRoutineSchedule'));
const DrillReels = React.lazy(() => import('./pages/DrillReels').then(m => ({ default: m.DrillReels })));
const LessonReels = React.lazy(() => import('./pages/LessonReels').then(m => ({ default: m.LessonReels })));
const AllCompletedRoutines = React.lazy(() => import('./pages/AllCompletedRoutines').then(m => ({ default: m.AllCompletedRoutines })));

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
const AdminNotifications = React.lazy(() => import('./pages/admin/AdminNotifications').then(m => ({ default: m.AdminNotifications })));
const AdminVimeoManagement = React.lazy(() => import('./pages/admin/AdminVimeoManagement').then(m => ({ default: m.AdminVimeoManagement })));
const AdminDurationSync = React.lazy(() => import('./pages/admin/AdminDurationSync').then(m => ({ default: m.AdminDurationSync })));

// Non-lazy components (small footprint or critical for above-the-fold)
import { CreatorDashboard } from './pages/creator/CreatorDashboard';
import { UnifiedUploadModal } from './pages/creator/UnifiedUploadModal';
import { CreateRoutine } from './pages/creator/CreateRoutine';
import { CreatorCourses } from './pages/creator/CreatorCourses';
import { CourseEditor } from './pages/creator/CourseEditor';
import { BecomeCreator } from './pages/BecomeCreator';
import { NotFound } from './pages/NotFound';
import { PaymentComplete } from './pages/PaymentComplete';
import { Checkout } from './pages/Checkout';
import { Agora } from './pages/Agora';
import { LandingPage } from './pages/LandingPage';
import { LandingPageV2 } from './pages/LandingPageV2';
import { AICoach } from './pages/AICoach';
import { TechniqueSkillTree } from './components/technique/TechniqueSkillTree';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { Contact } from './pages/Contact';
import DebugAccess from './pages/DebugAccess';

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  const [forceLoad, setForceLoad] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setForceLoad(true);
      console.warn('[RootRedirect] Auth loading exceeded 4s, forcing landing page display');
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

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

          console.log('OAuth redirect to:', savedPath);
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

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [key]);

  React.useEffect(() => {
    let targetPos = 0;
    try {
      const saved = JSON.parse(sessionStorage.getItem('grapplay_scroll_v3') || '{}');
      targetPos = saved[key] || 0;
    } catch (e) { }

    if (targetPos > 0) {
      isRestoring.current = true;
      window.scrollTo(0, targetPos);

      let attempts = 0;
      const checkAndScroll = setInterval(() => {
        const currentHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;

        if (currentHeight >= targetPos + (viewportHeight / 2)) {
          window.scrollTo(0, targetPos);
          if (attempts > 3) {
            clearInterval(checkAndScroll);
            isRestoring.current = false;
          }
        }

        if (attempts > 15) {
          clearInterval(checkAndScroll);
          isRestoring.current = false;
        }
        attempts++;
      }, 200);

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
  return (
    <ErrorBoundary>
      <VersionChecker />
      <ToastProvider>
        <BackgroundUploadProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                  <Route path="/my-library" element={<Navigate to="/saved" replace />} />
                  <Route path="/watch" element={<Watch />} />
                  <Route path="/training-routines" element={<MyRoutines />} />
                  <Route path="/drills" element={<DrillReels />} />
                  <Route path="/lessons" element={<LessonReels />} />
                  <Route path="/drills/:id" element={<DrillDetail />} />
                  <Route path="/routines" element={<Routines />} />
                  <Route path="/routines/:id" element={<RoutineDetail />} />
                  <Route path="/my-routines/:id" element={<RoutineDetail />} />
                  <Route path="/my-schedule" element={<MyRoutineSchedule />} />
                  <Route path="/drill-routines/:id" element={<DrillRoutineDetail />} />
                  <Route path="/completed-routines" element={<AllCompletedRoutines />} />
                  <Route path="/sparring/:id" element={<SparringDetail />} />
                  <Route path="/sparring" element={<Navigate to={`/watch${window.location.search}`} replace />} />
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
          </Router>
          <GlobalUploadProgress />
        </BackgroundUploadProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
