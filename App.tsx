import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Browse } from './pages/Browse';
import { VideoDetail } from './pages/VideoDetail';
import { Pricing } from './pages/Pricing';
import { CreatorDashboard } from './pages/CreatorDashboard';
import { MyLibrary } from './pages/MyLibrary';
import { Login } from './pages/Login';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/videos/:id" element={<VideoDetail />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/creator-dashboard" element={<CreatorDashboard />} />
          <Route path="/library" element={<MyLibrary />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
