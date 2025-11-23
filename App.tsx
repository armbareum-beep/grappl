import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './pages/Home';
import { Browse } from './pages/Browse';
import { VideoDetail } from './pages/VideoDetail';
import { Pricing } from './pages/Pricing';
import { CreatorDashboard } from './pages/creator/CreatorDashboard';
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
import { AdminRoute } from './components/AdminRoute';
import { CourseDetail } from './pages/CourseDetail';
import { CreatorProfile } from './pages/CreatorProfile';
import { BecomeCreator } from './pages/BecomeCreator';
import { NotFound } from './pages/NotFound';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/videos/:id" element={<VideoDetail />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/creator" element={<CreatorDashboard />} />
            <Route path="/creator-dashboard" element={<CreatorDashboard />} />
            <Route path="/creator/courses" element={<CreatorCourses />} />
            <Route path="/creator/courses/new" element={<CourseEditor />} />
            <Route path="/creator/courses/:id/edit" element={<CourseEditor />} />
            <Route path="/become-creator" element={<BecomeCreator />} />
            <Route path="/creator/:id" element={<CreatorProfile />} />
            <Route path="/library" element={<MyLibrary />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin/courses" element={
              <AdminRoute>
                <AdminCourseList />
              </AdminRoute>
            } />
            <Route path="/admin/creators" element={
              <AdminRoute>
                <CreatorApprovalList />
              </AdminRoute>
            } />
            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <AdminDashboard />
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
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
