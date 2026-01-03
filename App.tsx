import React from 'react';
// FORCE HMR UPDATE APP - NEW UI TEST
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingScreen } from './components/LoadingScreen';
import { Home } from './pages/Home';
import { Browse } from './pages/Browse';
import { VideoDetail } from './pages/VideoDetail';
import { Pricing } from './pages/Pricing';
import { CreatorDashboard } from './pages/creator/CreatorDashboard';
import { UploadDrill } from './pages/creator/UploadDrill';
import { UploadLesson } from './pages/creator/UploadLesson';
import { CreateRoutine } from './pages/creator/CreateRoutine';
import { UploadSparring } from './pages/creator/UploadSparring';
import { SparringFeed } from './pages/SparringFeed';
import { CreatorCourses } from './pages/creator/CreatorCourses';
import { CourseEditor } from './pages/creator/CourseEditor';
import { MyLibrary } from './pages/MyLibrary';
import { CommunityFeed } from './pages/CommunityFeed';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { AdminCourseList } from './pages/admin/AdminCourseList';
import { CreatorApprovalList } from './pages/admin/CreatorApprovalList';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { FeaturedContent } from './pages/admin/FeaturedContent';
import { AdminMarketing } from './pages/admin/AdminMarketing';
import { AdminPayouts } from './pages/admin/AdminPayouts';
import { AdminUserList } from './pages/admin/AdminUserList';
import { AdminDrillList } from './pages/admin/AdminDrillList';
import { AdminRoutineList } from './pages/admin/AdminRoutineList';
import { AdminReportList } from './pages/admin/AdminReportList';
import { AdminTournamentList } from './pages/admin/AdminTournamentList';
import { AdminSupportList } from './pages/admin/AdminSupportList';
import { AdminTestimonials } from './pages/admin/AdminTestimonials';
import { AdminRoute } from './components/AdminRoute';
import { CourseDetail } from './pages/CourseDetail';
import { CreatorProfile } from './pages/CreatorProfile';
import { BecomeCreator } from './pages/BecomeCreator';
import { UploadVideo } from './pages/UploadVideo';
import { NotFound } from './pages/NotFound';
import { PaymentComplete } from './pages/PaymentComplete';
import { Checkout } from './pages/Checkout';
import { Drills } from './pages/Drills';
import { DrillDetail } from './pages/DrillDetail';
import { RoutineDetail } from './pages/RoutineDetail';
import { DrillRoutineDetail } from './pages/DrillRoutineDetail';
import { Arena } from './pages/Arena';
import { AICoach } from './pages/AICoach';
import { TechniqueRoadmapDashboard } from './components/technique/TechniqueRoadmapDashboard';
import { TechniqueDetailPage } from './pages/TechniqueDetail';
import { LessonDetail } from './pages/LessonDetail';
import { Instructors } from './pages/Instructors';
import { Bundles } from './pages/Bundles';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { Contact } from './pages/Contact';
import { GlobalSearch } from './pages/GlobalSearch';
import UserProfile from './pages/UserProfile';
import MyRoutineSchedule from './pages/MyRoutineSchedule';

import { LandingPage } from './pages/LandingPage';
import { useAuth } from './contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { BackgroundUploadProvider } from './contexts/BackgroundUploadContext';
import { GlobalUploadProgress } from './components/GlobalUploadProgress';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LandingPageV2 } from './pages/LandingPageV2';

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  const [forceLoad, setForceLoad] = React.useState(false);

  React.useEffect(() => {
    // Fail-safe: If Auth loading takes > 1.5s, force show Landing
    const timer = setTimeout(() => setForceLoad(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // OAuth 로그인 후 리다이렉트 처리
  React.useEffect(() => {
    if (user && !loading) {
      try {
        const savedPath = localStorage.getItem('oauth_redirect_path');
        if (savedPath && savedPath !== '/login' && savedPath !== '/') {
          localStorage.removeItem('oauth_redirect_path');
          // 약간의 지연을 두어 인증 상태가 완전히 설정된 후 리다이렉트
          setTimeout(() => {
            window.location.href = savedPath;
          }, 100);
        }
      } catch (e) {
        console.warn('Failed to restore redirect path:', e);
      }
    }
  }, [user, loading]);

  if (loading && !forceLoad) {
    return <LoadingScreen message="로그인 정보 확인 중..." />;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <LandingPage />;
};

import { useParams } from 'react-router-dom';
import { VersionChecker } from './components/VersionChecker';
import { useLocation } from 'react-router-dom';

// Scroll Restoration Component
const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();
  const prevPathnameRef = React.useRef<string>(pathname + search);
  const isNavigatingRef = React.useRef(false);

  React.useEffect(() => {
    const currentPath = pathname + search;
    const SCROLL_KEY = 'grapplay_scroll_positions';

    // sessionStorage에서 스크롤 위치 불러오기
    const loadScrollPositions = (): Record<string, number> => {
      try {
        const saved = sessionStorage.getItem(SCROLL_KEY);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    };

    // sessionStorage에 스크롤 위치 저장
    const saveScrollPositions = (positions: Record<string, number>) => {
      try {
        sessionStorage.setItem(SCROLL_KEY, JSON.stringify(positions));
      } catch (e) {
        console.warn('Failed to save scroll position:', e);
      }
    };

    // 이전 페이지의 스크롤 위치 저장
    if (prevPathnameRef.current !== currentPath && !isNavigatingRef.current) {
      const positions = loadScrollPositions();
      positions[prevPathnameRef.current] = window.scrollY;
      saveScrollPositions(positions);
    }

    // 현재 페이지로 이동 시 스크롤 위치 복원 또는 맨 위로 이동
    if (prevPathnameRef.current !== currentPath) {
      isNavigatingRef.current = true;

      // 약간의 지연을 두어 DOM이 렌더링된 후 스크롤
      requestAnimationFrame(() => {
        const positions = loadScrollPositions();
        const savedPosition = positions[currentPath];

        if (savedPosition !== undefined) {
          // 저장된 위치로 복원 (뒤로가기)
          window.scrollTo(0, savedPosition);
        } else {
          // 새로운 페이지는 맨 위로
          window.scrollTo(0, 0);
        }

        isNavigatingRef.current = false;
      });

      prevPathnameRef.current = currentPath;
    }
  }, [pathname, search]);

  // 페이지 언로드 시 현재 스크롤 위치 저장
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      const SCROLL_KEY = 'grapplay_scroll_positions';
      try {
        const saved = sessionStorage.getItem(SCROLL_KEY);
        const positions = saved ? JSON.parse(saved) : {};
        positions[pathname + search] = window.scrollY;
        sessionStorage.setItem(SCROLL_KEY, JSON.stringify(positions));
      } catch (e) {
        console.warn('Failed to save scroll position on unload:', e);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pathname, search]);

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
          <GlobalUploadProgress />
          <Router>
            <ScrollToTop />
            <Layout>

              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/v2" element={<LandingPageV2 />} />
                <Route path="/home" element={<Home />} />
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
                <Route path="/creator/upload" element={<UploadVideo />} />
                <Route path="/creator/drills/new" element={<UploadDrill />} />
                <Route path="/creator/drills/:id/edit" element={<UploadDrill />} />
                <Route path="/creator/lessons/new" element={<UploadLesson />} />
                <Route path="/creator/lessons/:id/edit" element={<UploadLesson />} />
                <Route path="/creator/create-routine" element={<CreateRoutine />} />
                <Route path="/creator/routines/:id/edit" element={<CreateRoutine />} />
                <Route path="/become-creator" element={<BecomeCreator />} />
                <Route path="/creator/:id" element={<CreatorProfile />} />
                <Route path="/library" element={<MyLibrary />} />
                <Route path="/journal" element={<CommunityFeed />} />
                <Route path="/drills" element={<Drills />} />
                <Route path="/drills/:id" element={<DrillDetail />} />
                <Route path="/routines/:id" element={<RoutineDetail />} />
                <Route path="/my-routines/:id" element={<RoutineDetail />} />
                <Route path="/my-schedule" element={<MyRoutineSchedule />} />
                <Route path="/drill-routines/:id" element={<DrillRoutineDetail />} />
                <Route path="/arena" element={<Arena />} />
                <Route path="/ai-coach" element={
                  <ProtectedRoute>
                    <AICoach />
                  </ProtectedRoute>
                } />
                <Route path="/technique-roadmap" element={<TechniqueRoadmapDashboard />} />

                <Route path="/sparring" element={<SparringFeed />} />
                <Route path="/creator/sparring/new" element={<UploadSparring />} />

                <Route path="/technique/:techniqueId" element={<TechniqueDetailPage />} />
                <Route path="/lessons/:id" element={<LessonDetail />} />
                <Route path="/instructors" element={<Instructors />} />
                <Route path="/profile/:userId" element={<UserProfile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/search" element={<GlobalSearch />} />

                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />
                <Route path="/admin" element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } />
                <Route path="/admin/courses" element={
                  <AdminRoute>
                    <AdminCourseList />
                  </AdminRoute>
                } />
                <Route path="/admin/drills" element={
                  <AdminRoute>
                    <AdminDrillList />
                  </AdminRoute>
                } />
                <Route path="/admin/routines" element={
                  <AdminRoute>
                    <AdminRoutineList />
                  </AdminRoute>
                } />
                <Route path="/admin/reports" element={
                  <AdminRoute>
                    <AdminReportList />
                  </AdminRoute>
                } />
                <Route path="/admin/tournaments" element={
                  <AdminRoute>
                    <AdminTournamentList />
                  </AdminRoute>
                } />
                <Route path="/admin/support" element={
                  <AdminRoute>
                    <AdminSupportList />
                  </AdminRoute>
                } />
                <Route path="/admin/creators" element={
                  <AdminRoute>
                    <CreatorApprovalList />
                  </AdminRoute>
                } />
                <Route path="/admin/featured" element={
                  <AdminRoute>
                    <FeaturedContent />
                  </AdminRoute>
                } />
                <Route path="/admin/marketing" element={
                  <AdminRoute>
                    <AdminMarketing />
                  </AdminRoute>
                } />
                <Route path="/admin/payouts" element={
                  <AdminRoute>
                    <AdminPayouts />
                  </AdminRoute>
                } />
                <Route path="/admin/users" element={
                  <AdminRoute>
                    <AdminUserList />
                  </AdminRoute>
                } />
                <Route path="/admin/testimonials" element={
                  <AdminRoute>
                    <AdminTestimonials />
                  </AdminRoute>
                } />

                <Route path="/payment/complete" element={<PaymentComplete />} />
                <Route path="/checkout/:type/:id" element={<Checkout />} />
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </Router>
        </BackgroundUploadProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
