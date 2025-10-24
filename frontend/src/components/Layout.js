import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, Dropdown } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { companySettingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FullscreenIndicator from './FullscreenIndicator';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [companyName, setCompanyName] = useState('PickNPay');
  const { user, logout, isAuthenticated } = useAuth();

  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: 'bi-speedometer2' },
    { path: '/users', label: 'Users', icon: 'bi-people' },
  ];

  useEffect(() => {
    fetchCompanyName();
  }, []);

  // Listen for company name update events
  useEffect(() => {
    const handleCompanyNameUpdate = (event) => {
      setCompanyName(event.detail.companyName);
    };

    window.addEventListener('companyNameUpdated', handleCompanyNameUpdate);
    return () => window.removeEventListener('companyNameUpdated', handleCompanyNameUpdate);
  }, []);

  const fetchCompanyName = async () => {
    try {
      const response = await companySettingsAPI.get();
      setCompanyName(response.data.companyName);
    } catch (error) {
      console.error('Failed to fetch company name:', error);
      // Keep default name if fetch fails
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-vh-100 bg-light">
      <style>{`
        .navbar-nav {
          flex-wrap: nowrap;
        }
        .navbar-nav .nav-link {
          white-space: nowrap;
          padding: 0.5rem 1rem;
          font-size: 1rem;
        }
        .navbar-brand {
          font-size: 1.2rem;
        }
        .navbar {
          padding: 0.5rem 0;
        }
        .container-fluid {
          padding-left: 1rem;
          padding-right: 1rem;
        }
      `}</style>
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-modern-lg" style={{ 
        background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%)',
        minHeight: '80px',
        boxShadow: 'var(--shadow-xl)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Container fluid>
          <Navbar.Brand 
            onClick={() => navigate('/')} 
            className="fw-bold text-white" 
            style={{ 
              fontSize: '1.5rem',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              letterSpacing: '0.025em',
              cursor: 'pointer'
            }}
            title="Go to Dashboard"
          >
            <i className="bi bi-shop me-3" style={{ fontSize: '1.75rem' }}></i>
            <span className="text-white">{companyName}</span>
              </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
              <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="ms-auto">
                  {navigationItems.map((item) => (
                    <Nav.Link
                      key={item.path}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.path);
                      }}
                  className={`d-flex align-items-center hover-lift ${
                        location.pathname === item.path ? 'active' : ''
                      }`}
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.75rem 1.25rem',
                    margin: '0 0.25rem',
                    fontWeight: '500',
                    transition: 'all var(--transition-fast)',
                    background: location.pathname === item.path ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    color: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid transparent'
                  }}
                >
                  <i className={`${item.icon} me-2`} style={{ fontSize: '1.1rem' }}></i>
                      {item.label}
                    </Nav.Link>
                  ))}
              
              {/* User Dropdown */}
              {isAuthenticated() && (
                <Dropdown align="end" className="ms-3">
                  <Dropdown.Toggle 
                    variant="outline-light" 
                    id="user-dropdown" 
                    className="d-flex align-items-center hover-lift"
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      padding: '0.75rem 1.25rem',
                      fontWeight: '500',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <i className="bi bi-person-circle me-2" style={{ fontSize: '1.25rem' }}></i>
                    <span className="d-none d-md-inline">{user?.fullName || user?.username}</span>
                    <i className="bi bi-caret-down ms-1"></i>
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Header>
                      <div className="text-muted small">
                        <div>Logged in as: <strong>{user?.username}</strong></div>
                        <div>Role: <span className={`badge ${user?.role === 'ADMIN' ? 'bg-danger' : 'bg-primary'}`}>
                          {user?.role}
                        </span></div>
                      </div>
                    </Dropdown.Header>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={() => {
                      // Check if running in Electron
                      if (window && window.require) {
                        try {
                          const { ipcRenderer } = window.require('electron');
                          ipcRenderer.send('app-closing');
                        } catch (error) {
                          console.error('Error closing app:', error);
                        }
                      } else {
                        // If not in Electron, just logout
                        handleLogout();
                      }
                    }}>
                      <i className="bi bi-power me-2"></i>
                      Close App
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}

              {/* Close App Button */}
              <button
                className="btn btn-outline-light d-flex align-items-center hover-lift ms-3"
                onClick={() => {
                  // Check if running in Electron
                  if (window && window.require) {
                    try {
                      const { ipcRenderer } = window.require('electron');
                      ipcRenderer.send('app-closing');
                    } catch (error) {
                      console.error('Error closing app:', error);
                    }
                  } else {
                    // If not in Electron, just logout
                    handleLogout();
                  }
                }}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.75rem 1.25rem',
                  fontWeight: '500',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(10px)'
                }}
                title="Close Application"
              >
                <i className="bi bi-power" style={{ fontSize: '1.25rem' }}></i>
              </button>
                </Nav>
              </Navbar.Collapse>
        </Container>
      </Navbar>
      
      <Container className="py-4">
        {children}
      </Container>
      
      {/* Fullscreen indicator */}
      <FullscreenIndicator />
    </div>
  );
};

export default Layout;
