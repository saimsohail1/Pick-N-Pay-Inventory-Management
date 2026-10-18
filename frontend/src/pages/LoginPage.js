import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container, Row, Col, Card, Button, Form, Alert, Spinner
} from 'react-bootstrap';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      username: '',
      password: ''
    }
  });

  // Redirect if already authenticated - always go to dashboard
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await login(data.username, data.password);
      
      if (result.success) {
        // Always redirect to dashboard after successful login
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.message);
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const sendElectron = (channel) => {
    if (window && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send(channel);
        return true;
      } catch (error) {
        console.error(`Error sending ${channel}:`, error);
      }
    }
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send(channel);
      return true;
    }
    return false;
  };

  const handleMinimizeApp = () => {
    sendElectron('app-minimize');
  };

  const handleToggleFullscreen = () => {
    sendElectron('toggle-fullscreen');
  };

  const handleCloseApp = () => {
    if (!sendElectron('app-closing') && window.close) {
      window.close();
    }
  };

  const windowBtnStyle = {
    width: '55px',
    height: '55px',
    padding: '0',
    backgroundColor: '#3a3a3a',
    color: '#ffffff'
  };

  const scrollFieldIntoView = (event) => {
    const field = event?.target;
    if (field && typeof field.scrollIntoView === 'function') {
      setTimeout(() => field.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
      position: 'relative'
    }}>
      <div className="d-flex align-items-center justify-content-end gap-2" style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        minHeight: '70px',
        padding: '0.5rem 1rem',
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #2a2a2a'
      }}>
        <Button
          className="d-flex align-items-center justify-content-center"
          onClick={handleMinimizeApp}
          style={windowBtnStyle}
          title="Minimize Application"
        >
          <i className="bi bi-dash-lg" style={{ fontSize: '1.5rem' }}></i>
        </Button>
        <Button
          className="d-flex align-items-center justify-content-center"
          onClick={handleToggleFullscreen}
          style={windowBtnStyle}
          title="Toggle Fullscreen"
        >
          <i className="bi bi-fullscreen" style={{ fontSize: '1.5rem' }}></i>
        </Button>
        <Button
          className="d-flex align-items-center justify-content-center"
          onClick={handleCloseApp}
          style={windowBtnStyle}
          title="Close Application"
        >
          <i className="bi bi-power" style={{ fontSize: '1.5rem' }}></i>
        </Button>
      </div>

      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        opacity: 0.5,
        pointerEvents: 'none'
      }}></div>
      
      <Container style={{ position: 'relative', zIndex: 1, paddingTop: '2rem', paddingBottom: '8rem' }}>
        <Row className="justify-content-center">
          <Col xs={12} sm={8} md={6} lg={4}>
            <Card className="shadow-2xl border-0 animate-fade-in-up" style={{ 
              borderRadius: 'var(--radius-2xl)',
              backdropFilter: 'blur(20px)',
              background: 'rgba(255, 255, 255, 0.95)'
            }}>
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div className="icon-xl mx-auto mb-3" style={{ 
                    background: 'linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)',
                    color: 'var(--primary-600)'
                  }}>
                    <i className="bi bi-shield-lock"></i>
                  </div>
                  <h2 className="fw-bold text-primary mb-2 gradient-text">
                    ADAMS GREEN
                  </h2>
                  <p className="text-muted fs-5">Sign in to your account</p>
                </div>

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit(handleLogin)}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Username</Form.Label>
                    <Controller
                      name="username"
                      control={control}
                      rules={{
                        required: 'Username is required',
                        minLength: { value: 3, message: 'Username must be at least 3 characters' }
                      }}
                      render={({ field }) => (
                        <Form.Control
                          type="text"
                          placeholder="Enter username"
                          {...field}
                          isInvalid={!!errors.username}
                          className="form-control-lg"
                          onFocus={(e) => {
                            if (typeof field.onFocus === 'function') field.onFocus(e);
                            scrollFieldIntoView(e);
                          }}
                        />
                      )}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.username && errors.username.message}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">Password</Form.Label>
                    <Controller
                      name="password"
                      control={control}
                      rules={{
                        required: 'Password is required',
                        minLength: { value: 6, message: 'Password must be at least 6 characters' }
                      }}
                      render={({ field }) => (
                        <Form.Control
                          type="password"
                          placeholder="Enter password"
                          {...field}
                          isInvalid={!!errors.password}
                          className="form-control-lg"
                          onFocus={(e) => {
                            if (typeof field.onFocus === 'function') field.onFocus(e);
                            scrollFieldIntoView(e);
                          }}
                        />
                      )}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.password && errors.password.message}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <div className="d-grid">
                    <Button
                      variant="primary"
                      type="submit"
                      size="lg"
                      disabled={loading}
                      className="fw-bold"
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Signing In...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-box-arrow-in-right me-2"></i>
                          Sign In
                        </>
                      )}
                    </Button>
                  </div>
                </Form>

                <div className="text-center mt-4">
                  <small className="text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    Contact administrator for account access
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LoginPage;
