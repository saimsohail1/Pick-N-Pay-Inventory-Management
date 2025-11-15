import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import SalesPage from './pages/SalesPage';
import InventoryPage from './pages/InventoryPage';
import SalesHistory from './pages/SalesHistory';
import DailyReport from './pages/DailyReport';
import CompanyPage from './pages/CompanyPage';
import CategoryPage from './pages/CategoryPage';
import UserPage from './pages/UserPage';
import CustomerDisplay from './pages/CustomerDisplay';

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/sales" element={
            <ProtectedRoute>
              <SalesPage />
            </ProtectedRoute>
          } />
          <Route path="/inventory" element={
            <ProtectedRoute>
              <Layout>
                <InventoryPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/sales-history" element={
            <ProtectedRoute>
              <Layout>
                <SalesHistory />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/daily-report" element={
            <ProtectedRoute requireAdmin={true}>
              <Layout>
                <DailyReport />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/company" element={
            <ProtectedRoute>
              <Layout>
                <CompanyPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/categories" element={
            <ProtectedRoute>
              <Layout>
                <CategoryPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute requireAdmin={true}>
              <Layout>
                <UserPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/customer-display" element={<CustomerDisplay />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
