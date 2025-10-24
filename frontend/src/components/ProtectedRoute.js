import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner, Container } from 'react-bootstrap';
import Layout from './Layout';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  // Redirect to login if not authenticated - don't pass location state
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin()) {
    return (
      <Layout>
        <Container className="py-5">
          <div className="text-center">
            <h3 className="text-danger">Access Denied</h3>
            <p>You don't have permission to access this page.</p>
            <p>Admin privileges required.</p>
          </div>
        </Container>
      </Layout>
    );
  }

  // Render the protected component
  return children;
};

export default ProtectedRoute;
