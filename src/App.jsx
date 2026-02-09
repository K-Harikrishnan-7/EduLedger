import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MockBlockchainProvider, useBlockchain } from './context/MockBlockchainContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Login from './pages/Login';

// Placeholder components until we implement them
import UniversityDashboard from './pages/university/UniversityDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import CompanyDashboard from './pages/company/CompanyDashboard';

// Route Guard to protect routes based on role
const ProtectedRoute = ({ children, allowedRole }) => {
  const { currentUser } = useBlockchain();

  if (!currentUser) return <Navigate to="/" />;
  if (currentUser.role !== allowedRole) return <Navigate to="/" />;

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />

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
};

function App() {
  return (
    <MockBlockchainProvider>
      <Router>
        <AppRoutes />
      </Router>
    </MockBlockchainProvider>
  );
}

export default App;
