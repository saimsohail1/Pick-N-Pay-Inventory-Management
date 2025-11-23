import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, Dropdown } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { companySettingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FullscreenIndicator from './FullscreenIndicator';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [companyName, setCompanyName] = useState('ADAMS GREEN');
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
    <div className="min-vh-100" style={{ paddingTop: 0, backgroundColor: '#000000' }}>
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
        .layout-content-container {
          margin-top: 80px;
          min-height: calc(100vh - 80px);
          background-color: #000000;
        }
        @media (max-width: 991px) {
          .layout-content-container {
            margin-top: 80px;
          }
        }
        
        /* 3D Button Effect for Navbar - Similar to Dashboard stats-card */
        .btn-3d-nav {
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          border: 1px solid #333333 !important;
        }
        
        .btn-3d-nav::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #4a4a4a 0%, #3a3a3a 100%);
          z-index: 1;
        }
        
        .btn-3d-nav:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(255, 255, 255, 0.15), 0 4px 8px rgba(0, 0, 0, 0.3);
          border-color: #4a4a4a !important;
        }
        
        .btn-3d-nav:hover::before {
          background: linear-gradient(90deg, #5a5a5a 0%, #4a4a4a 100%);
        }
        
        .btn-3d-nav:active {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(255, 255, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .nav-link.btn-3d-nav {
          border: 1px solid #333333 !important;
        }
        
        /* 3D Icon Effect for Home Icon */
        .icon-3d-nav {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          border: 1px solid #333333;
          background: #3a3a3a;
          cursor: pointer;
        }
        
        .icon-3d-nav::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #4a4a4a 0%, #3a3a3a 100%);
          z-index: 1;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        }
        
        .icon-3d-nav:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(255, 255, 255, 0.15), 0 4px 8px rgba(0, 0, 0, 0.3);
          border-color: #4a4a4a;
        }
        
        .icon-3d-nav:hover::before {
          background: linear-gradient(90deg, #5a5a5a 0%, #4a4a4a 100%);
        }
        
        .icon-3d-nav:active {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(255, 255, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        /* Override navbar background */
        .navbar-custom {
          background-color: #1a1a1a !important;
          background: #1a1a1a !important;
        }
      `}</style>
      {/* Navbar Container - Fixed at top */}
      <Navbar bg="dark" variant="dark" expand="lg" fixed="top" className="shadow-modern-lg navbar-custom" style={{ 
        background: '#1a1a1a !important',
        backgroundColor: '#1a1a1a !important',
        minHeight: '80px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        borderBottom: '2px solid #2a2a2a',
        zIndex: 1030
      }}>
        <Container fluid>
          <button
            onClick={() => navigate('/')} 
            className="btn btn-3d-nav fw-bold text-white d-flex align-items-center"
            style={{ 
              fontSize: '1.2rem',
              padding: '0.75rem 1.25rem',
              fontWeight: '500',
              background: '#3a3a3a',
              color: 'white',
              border: 'none'
            }}
            title="Go to Dashboard"
          >
            <i className="bi bi-house me-2" style={{ fontSize: '1rem' }}></i>
            {companyName}
          </button>
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
                  className={`d-flex align-items-center hover-lift btn-3d-nav ${
                        location.pathname === item.path ? 'active' : ''
                      }`}
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.75rem 1.25rem',
                    margin: '0 0.25rem',
                    fontWeight: '500',
                    transition: 'all var(--transition-fast)',
                    background: location.pathname === item.path ? 'rgba(255, 255, 255, 0.15)' : '#3a3a3a',
                    color: 'rgba(255, 255, 255, 0.9)'
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
                    className="d-flex align-items-center hover-lift btn-3d-nav"
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      padding: '0.75rem 1.25rem',
                      fontWeight: '500',
                      background: '#3a3a3a',
                      color: 'white'
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
                    <Dropdown.Item onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i>
                      Logout
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}

              {/* Minimize App Button */}
              <button
                className="btn btn-outline-light d-flex align-items-center hover-lift btn-3d-nav ms-3"
                onClick={() => {
                  // Check if running in Electron
                  if (window && window.require) {
                    try {
                      const { ipcRenderer } = window.require('electron');
                      ipcRenderer.send('app-minimize');
                    } catch (error) {
                      console.error('Error minimizing app:', error);
                    }
                  } else if (window.electron && window.electron.ipcRenderer) {
                    window.electron.ipcRenderer.send('app-minimize');
                  }
                }}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.75rem 1.25rem',
                  fontWeight: '500',
                  background: '#3a3a3a',
                  color: 'white'
                }}
                title="Minimize Application"
              >
                <i className="bi bi-dash-lg" style={{ fontSize: '1.25rem' }}></i>
              </button>

              {/* Fullscreen Toggle Button */}
              <button
                className="btn btn-outline-light d-flex align-items-center hover-lift btn-3d-nav ms-3"
                onClick={() => {
                  // Check if running in Electron
                  if (window && window.require) {
                    try {
                      const { ipcRenderer } = window.require('electron');
                      ipcRenderer.send('toggle-fullscreen');
                    } catch (error) {
                      console.error('Error toggling fullscreen:', error);
                    }
                  } else if (window.electron && window.electron.ipcRenderer) {
                    window.electron.ipcRenderer.send('toggle-fullscreen');
                  }
                }}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.75rem 1.25rem',
                  fontWeight: '500',
                  background: '#3a3a3a',
                  color: 'white'
                }}
                title="Toggle Fullscreen"
              >
                <i className="bi bi-fullscreen" style={{ fontSize: '1.25rem' }}></i>
              </button>

              {/* Close App Button */}
              <button
                className="btn btn-outline-light d-flex align-items-center hover-lift btn-3d-nav ms-3"
                onClick={() => {
                  console.log('Power button clicked - attempting to close app');
                  
                  // Check if running in Electron
                  if (window && window.require) {
                    try {
                      const { ipcRenderer } = window.require('electron');
                      console.log('Sending app-closing signal to main process');
                      ipcRenderer.send('app-closing');
                      
                      // Add a small delay to ensure the message is sent
                      setTimeout(() => {
                        console.log('Force closing app if still running');
                        window.close();
                      }, 100);
                    } catch (error) {
                      console.error('Error closing app:', error);
                      // Fallback: try to close the window
                      window.close();
                    }
                  } else {
                    console.log('Not in Electron environment, closing window');
                    // If not in Electron, close the window
                    window.close();
                  }
                }}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.75rem 1.25rem',
                  fontWeight: '500',
                  background: '#3a3a3a',
                  color: 'white'
                }}
                title="Close Application"
              >
                <i className="bi bi-power" style={{ fontSize: '1.25rem' }}></i>
              </button>
                </Nav>
              </Navbar.Collapse>
        </Container>
      </Navbar>
      
      {/* Content Container - Separate from navbar, starts below it */}
      <div className="layout-content-container" style={{ backgroundColor: '#000000' }}>
        <Container fluid className="py-4" style={{ paddingTop: '2rem', paddingBottom: '2rem', backgroundColor: '#000000' }}>
        {children}
      </Container>
      </div>
      
      {/* Fullscreen indicator */}
      <FullscreenIndicator />
    </div>
  );
};

export default Layout;
