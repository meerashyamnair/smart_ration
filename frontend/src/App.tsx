import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Unauthorized } from './pages/Unauthorized';
import { BeneficiaryDashboard } from './pages/BeneficiaryDashboard';
import { ShopkeeperTerminal } from './pages/ShopkeeperTerminal';
import { AdminDashboard } from './pages/AdminDashboard';
import { ReportsAndAnalyticsPage } from './pages/ReportsAndAnalyticsPage';
import { QueuePage } from './pages/QueuePage';
import { ComplaintsPage } from './pages/ComplaintsPage';

import { DigitalReceiptPage } from './pages/DigitalReceiptPage';

const ProtectedLayout: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold">Authenticating Security Credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            path="/beneficiary"
            element={
              <ProtectedLayout allowedRoles={['BENEFICIARY', 'ADMIN']}>
                <BeneficiaryDashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/shopkeeper"
            element={
              <ProtectedLayout allowedRoles={['SHOPKEEPER', 'ADMIN']}>
                <ShopkeeperTerminal />
              </ProtectedLayout>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedLayout allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedLayout allowedRoles={['ADMIN']}>
                <ReportsAndAnalyticsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/queue"
            element={
              <ProtectedLayout allowedRoles={['BENEFICIARY', 'ADMIN']}>
                <QueuePage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/complaints"
            element={
              <ProtectedLayout>
                <ComplaintsPage />
              </ProtectedLayout>
            }
          />
          <Route
            path="/receipts/:receiptId"
            element={
              <ProtectedLayout>
                <DigitalReceiptPage />
              </ProtectedLayout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
