import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import FoodDetailPage from './pages/FoodDetailPage';

// Receiver pages
import ReceiverDashboard from './pages/receiver/ReceiverDashboard';
import TrackingPage from './pages/receiver/TrackingPage';

// Donor pages
import DonorDashboard from './pages/donor/DonorDashboard';
import AddFoodPage from './pages/donor/AddFoodPage';
import ManageListingsPage from './pages/donor/ManageListingsPage';

// Volunteer pages
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Impact
import ImpactPage from './pages/ImpactPage';

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) {
    const redirects = { DONOR: '/donor', RECEIVER: '/receiver', VOLUNTEER: '/volunteer', ADMIN: '/admin' };
    return <Navigate to={redirects[user?.role] || '/'} replace />;
  }
  return children;
};

// Admin layout — no Navbar
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
};

function App() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { borderRadius: '12px', background: '#1a2e1a', color: '#fff', fontSize: '14px' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
        }}
      />
      {/* Hide Navbar for admin users — they have their own sidebar */}
      {!isAdmin && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/food/:id" element={<FoodDetailPage />} />
        <Route path="/impact" element={<ImpactPage />} />

        {/* Receiver */}
        <Route path="/receiver" element={<ProtectedRoute roles={['RECEIVER']}><ReceiverDashboard /></ProtectedRoute>} />
        <Route path="/track/:claimId" element={<ProtectedRoute roles={['RECEIVER']}><TrackingPage /></ProtectedRoute>} />

        {/* Donor */}
        <Route path="/donor" element={<ProtectedRoute roles={['DONOR']}><DonorDashboard /></ProtectedRoute>} />
        <Route path="/donor/add" element={<ProtectedRoute roles={['DONOR']}><AddFoodPage /></ProtectedRoute>} />
        <Route path="/donor/listings" element={<ProtectedRoute roles={['DONOR']}><ManageListingsPage /></ProtectedRoute>} />

        {/* Volunteer */}
        <Route path="/volunteer" element={<ProtectedRoute roles={['VOLUNTEER']}><VolunteerDashboard /></ProtectedRoute>} />

        {/* Admin — secret route, no Navbar */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
