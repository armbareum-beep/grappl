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
import { CreatorCourses } from './pages/creator/CreatorCourses';
import { CourseEditor } from './pages/creator/CourseEditor';
import { MyLibrary } from './pages/MyLibrary';
// import { CommunityFeed } from './pages/CommunityFeed';
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
import { Routines } from './pages/Routines';
import { Library } from './pages/Library';
import { Agora } from './pages/Agora';
import { Watch } from './pages/Watch';
import { MyRoutines } from './pages/MyRoutines';
import { DrillDetail } from './pages/DrillDetail';
import { RoutineDetail } from './pages/RoutineDetail';
import { DrillRoutineDetail } from './pages/DrillRoutineDetail';
// Arena removed
import { AICoach } from './pages/AICoach';
import { TechniqueSkillTree } from './components/technique/TechniqueSkillTree';
import { TechniqueDetailPage } from './pages/TechniqueDetail';
import { LessonDetail } from './pages/LessonDetail';
import { Instructors } from './pages/Instructors';
import { Bundles } from './pages/Bundles';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { Contact } from './pages/Contact';
// import { GlobalSearch } from './pages/GlobalSearch';
import UserProfile from './pages/UserProfile';
import MyRoutineSchedule from './pages/MyRoutineSchedule';
import { DrillReels } from './pages/DrillReels';

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

// OAuth 리다이렉트 핸들러 - 모든 페이지에서 실행
const OAuthRedirectHandler: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hasChecked, setHasChecked] = React.useState(false);

  React.useEffect(() => {
    // 로그인 완료되고, 아직 체크하지 않았으며, 로그인 페이지가 아닐 때만 실행
    if (user && !loading && !hasChecked && location.pathname !== '/login') {
      setHasChecked(true);

      try {
        const savedPath = localStorage.getItem('oauth_redirect_path');
        if (savedPath && savedPath !== '/login' && savedPath !== '/' && savedPath !== location.pathname) {
          localStorage.removeItem('oauth_redirect_path');
          console.log('OAuth redirect to:', savedPath);
          // 약간의 지연을 두어 인증 상태가 완전히 설정된 후 리다이렉트
          setTimeout(() => {
            window.location.href = savedPath;
          }, 100);
        }
      } catch (e) {
        console.warn('Failed to restore redirect path:', e);
      }
    }
  }, [user, loading, hasChecked, location.pathname]);

  return null;
};

// Scroll Restoration Component
const ScrollToTop: React.FC = () => {
  const { key } = useLocation();
  const isRestoring = React.useRef(false);
  const scrollMap = React.useRef<Record<string, number>>({});

  // 1. 전역 설정: 브라우저 자동 스크롤 기능 강제 종료
  React.useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // 2. 실시간 기록: 사용자가 스크롤할 때마다 메모리와 세션에 즉시 저장
  React.useEffect(() => {
    const handleScroll = () => {
      if (isRestoring.current) return;
      const pos = window.scrollY;
      scrollMap.current[key] = pos;

      // 세션 저장 (디바운스 없이 즉시 - 뒤로가기 대응력 극대화)
      try {
        const saved = JSON.parse(sessionStorage.getItem('grapplay_scroll_v3') || '{}');
        saved[key] = pos;
        sessionStorage.setItem('grapplay_scroll_v3', JSON.stringify(saved));
      } catch (e) { }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [key]);

  // 3. 끈질긴 복원: 페이지가 다 그려질 때까지 반복해서 위치를 잡음
  React.useEffect(() => {
    let targetPos = 0;
    try {
      const saved = JSON.parse(sessionStorage.getItem('grapplay_scroll_v3') || '{}');
      targetPos = saved[key] || 0;
    } catch (e) { }

    if (targetPos > 0) {
      isRestoring.current = true;

      // 즉시 이동 시도
      window.scrollTo(0, targetPos);

      let attempts = 0;
      const checkAndScroll = setInterval(() => {
        const currentHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;

        // 보던 위치가 화면에 나타날 수 있을 만큼 페이지가 길어졌는지 확인
        if (currentHeight >= targetPos + (viewportHeight / 2)) {
          window.scrollTo(0, targetPos);
          // 안정을 위해 조금 더 확인 후 종료
          if (attempts > 5) {
            clearInterval(checkAndScroll);
            isRestoring.current = false;
          }
        }

        // 너무 오래 걸리면(8초) 포기
        if (attempts > 80) {
          clearInterval(checkAndScroll);
          isRestoring.current = false;
        }
        attempts++;
      }, 100);

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
          <GlobalUploadProgress />
          <Router>
            <OAuthRedirectHandler />
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
                <Route path="/library" element={<Library />} />
                <Route path="/agora" element={<Agora />} />
                <Route path="/my-library" element={<MyLibrary />} />
                <Route path="/watch-test" element={<div className="h-screen w-full bg-green-500 flex items-center justify-center text-white text-4xl">WATCH TEST ROUTE WORKS</div>} />
                <Route path="/watch" element={<Watch />} />
                <Route path="/training-routines" element={<MyRoutines />} />

                {/* Legacy / Direct Links */}
                <Route path="/saved" element={<Navigate to="/my-library" replace />} />
                <Route path="/drills" element={<DrillReels />} />
                <Route path="/drills/:id" element={<DrillDetail />} />
                <Route path="/routines" element={<Routines />} />
                <Route path="/routines/:id" element={<RoutineDetail />} />
                <Route path="/my-routines/:id" element={<RoutineDetail />} />
                <Route path="/my-schedule" element={<MyRoutineSchedule />} />
                <Route path="/drill-routines/:id" element={<DrillRoutineDetail />} />
                <Route path="/sparring" element={<Navigate to="/watch" replace />} />
                <Route path="/ai-coach" element={
                  <ProtectedRoute>
                    <AICoach />
                  </ProtectedRoute>
                } />
                <Route path="/skill-tree" element={<TechniqueSkillTree />} />
                <Route path="/creator/sparring/new" element={<UploadSparring />} />

                <Route path="/technique/:techniqueId" element={<TechniqueDetailPage />} />
                <Route path="/lessons/:id" element={<LessonDetail />} />
                <Route path="/instructors" element={<Instructors />} />
                <Route path="/profile/:userId" element={<UserProfile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/contact" element={<Contact />} />
                {/* <Route path="/search" element={<GlobalSearch />} /> */}

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
