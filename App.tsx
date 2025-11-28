import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './pages/Home';
import { Browse } from './pages/Browse';
import { VideoDetail } from './pages/VideoDetail';
import { Pricing } from './pages/Pricing';
import { CreatorDashboard } from './pages/creator/CreatorDashboard';
import { UploadDrill } from './pages/creator/UploadDrill';
import { CreateRoutine } from './pages/creator/CreateRoutine';
import { CreatorCourses } from './pages/creator/CreatorCourses';
import { CourseEditor } from './pages/creator/CourseEditor';
import { MyLibrary } from './pages/MyLibrary';
import { Journal } from './pages/Journal';
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
import { TechniqueRoadmapDashboard } from './components/technique/TechniqueRoadmapDashboard';
import { TechniqueDetailPage } from './pages/TechniqueDetail';

import { LandingPage } from './pages/LandingPage';
import { useAuth } from './contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return <LandingPage />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/home" element={<Home />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/videos/:id" element={<VideoDetail />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/creator" element={<CreatorDashboard />} />
              <Route path="/creator-dashboard" element={<CreatorDashboard />} />
              <Route path="/creator/courses" element={<CreatorCourses />} />
              <Route path="/creator/courses/new" element={<CourseEditor />} />
              <Route path="/creator/courses/:id/edit" element={<CourseEditor />} />
              <Route path="/creator/upload" element={<UploadVideo />} />
              <Route path="/creator/drills/new" element={<UploadDrill />} />
              <Route path="/creator/create-routine" element={<CreateRoutine />} />
              <Route path="/become-creator" element={<BecomeCreator />} />
              <Route path="/creator/:id" element={<CreatorProfile />} />
              <Route path="/library" element={<MyLibrary />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/drills" element={<Drills />} />
              <Route path="/drills/:id" element={<DrillDetail />} />
              <Route path="/routines/:id" element={<RoutineDetail />} />
              <Route path="/my-routines/:id" element={<RoutineDetail />} />
              <Route path="/drill-routines/:id" element={<DrillRoutineDetail />} />
              <Route path="/arena" element={<Arena />} />
              <Route path="/technique-roadmap" element={<TechniqueRoadmapDashboard />} />
              <Route path="/technique/:techniqueId" element={<TechniqueDetailPage />} />
              <Route path="/settings" element={<Settings />} />

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

              <Route path="/payment/complete" element={<PaymentComplete />} />
              <Route path="/checkout/:type/:id" element={<Checkout />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
