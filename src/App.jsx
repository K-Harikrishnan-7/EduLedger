import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MockBlockchainProvider, useBlockchain } from './context/AppContext';
import { Web3Provider } from './context/Web3Context';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ForgotUserId from './pages/ForgotUserId';

import UniversityDashboard from './pages/university/UniversityDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import CompanyDashboard from './pages/company/CompanyDashboard';

// Route Guard: redirects to login if not authenticated or wrong role
const ProtectedRoute = ({ children, allowedRole }) => {
  const { currentUser } = useBlockchain();
  if (!currentUser) return <Navigate to="/login" />;
  if (currentUser.role !== allowedRole) return <Navigate to="/login" />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<MainLayout />}>
      <Route index element={<Home />} />
      <Route path="login" element={<Login />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="reset-password" element={<ResetPassword />} />
      <Route path="forgot-userid" element={<ForgotUserId />} />

      <Route path="student/*" element={
        <ProtectedRoute allowedRole="student">
          <StudentDashboard />
        </ProtectedRoute>
      } />

      <Route path="university/*" element={
        <ProtectedRoute allowedRole="university">
          <UniversityDashboard />
        </ProtectedRoute>
      } />

      <Route path="company/*" element={
        <ProtectedRoute allowedRole="company">
          <CompanyDashboard />
        </ProtectedRoute>
      } />
    </Route>
  </Routes>
);

function App() {
  return (
    <Web3Provider>
      <MockBlockchainProvider>
        <Router>
          <AppRoutes />
        </Router>
      </MockBlockchainProvider>
    </Web3Provider>
  );
}

export default App;
