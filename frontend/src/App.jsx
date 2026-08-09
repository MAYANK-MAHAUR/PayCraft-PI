import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import { RealtimeProvider } from './components/RealtimeProvider';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import TransactionDetail from './pages/TransactionDetail';
import ApiKeys from './pages/ApiKeys';
import Webhooks from './pages/Webhooks';
import Settings from './pages/Settings';
import CheckoutPage from './pages/CheckoutPage';
import PayScreen from './pages/PayScreen';
import PIPayments from './pages/PIPayments';
import Docs from './pages/Docs';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div style={{ color: 'var(--text-main)', padding: '40px' }}>Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:id" element={<TransactionDetail />} />
          <Route path="/keys" element={<ApiKeys />} />
          <Route path="/webhooks" element={<Webhooks />} />
          <Route path="/PIPAYMENTS" element={<PIPayments />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/checkout/:sessionId" element={<CheckoutPage />} />
          <Route path="/pay" element={<PayScreen />} />
          <Route path="/docs" element={<Docs />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </RealtimeProvider>
    </AuthProvider>
  );
}
