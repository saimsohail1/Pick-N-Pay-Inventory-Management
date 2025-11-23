import React, { useState, useEffect } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { companySettingsAPI } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("Pick'N'Pay");

  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        const response = await companySettingsAPI.get();
        setCompanyName(response.data.companyName);
      } catch (error) {
        console.error('Failed to fetch company name:', error);
        // Keep default name if fetch fails
      }
    };
    
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




  const navigationCards = [
    {
      title: 'Company',
      icon: 'bi-building',
      path: '/company',
      color: '#000000'
    },
    {
      title: 'User',
      icon: 'bi-person',
      path: '/users',
      color: '#000000'
    },
    {
      title: 'Product',
      icon: 'bi-box-seam',
      path: '/inventory',
      color: '#000000'
    },
    {
      title: 'Category',
      icon: 'bi-tags',
      path: '/categories',
      color: '#000000'
    },
    {
      title: 'Stock Management',
      icon: 'bi-box-arrow-down',
      path: '/inventory',
      color: '#000000'
    },
    {
      title: 'Sale',
      icon: 'bi-cart-check',
      path: '/sales',
      color: '#000000'
    },
    {
      title: 'Sales History',
      icon: 'bi-clock-history',
      path: '/sales-history',
      color: '#000000'
    },
    {
      title: 'Z-Report',
      icon: 'bi-file-earmark-text',
      path: '/daily-report',
      color: '#000000'
    }
  ];

  return (
    <div 
      className="animate-fade-in-up" 
      style={{ backgroundColor: 'transparent', minHeight: '100vh', padding: '2rem 0' }}
    >
      <style>{`
        /* 3D Container Effect - Similar to Dashboard stats-card */
        .container-3d {
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          border: 1px solid #333333 !important;
        }
        
        .container-3d::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #4a4a4a 0%, #3a3a3a 100%);
          z-index: 1;
        }
        
        .container-3d:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(255, 255, 255, 0.15), 0 4px 8px rgba(0, 0, 0, 0.3);
          border-color: #4a4a4a !important;
        }
        
        .container-3d:hover::before {
          background: linear-gradient(90deg, #5a5a5a 0%, #4a4a4a 100%);
        }
      `}</style>
      {/* Welcome Section */}
      <div className="mb-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col">
              <div className="container-3d" style={{ 
                backgroundColor: '#1a1a1a', 
                borderRadius: '12px',
                padding: '2rem',
                position: 'relative'
              }}>
                <div className="text-center">
                  <h1 className="page-title" style={{ color: '#ffffff', margin: 0 }}>
                    <i className="bi bi-speedometer2 me-3" style={{ color: '#ffffff' }}></i>
                Welcome to {companyName}
              </h1>
                  <p className="page-subtitle" style={{ color: '#ffffff', marginTop: '0.5rem', marginBottom: 0 }}>Modern Point of Sale System</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ backgroundColor: 'transparent' }}>
        {/* Menu Options Container */}
        <div style={{ 
          backgroundColor: '#1a1a1a', 
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}>
        {/* Navigation Cards Grid */}
          <Row className="g-4 mb-0">
          {navigationCards.map((card, index) => (
            <Col xs={12} sm={6} md={4} lg={3} key={index}>
              <Card 
                className="h-100 stats-card hover-lift" 
                style={{ 
                  cursor: 'pointer',
                    animationDelay: `${index * 0.1}s`,
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #333333',
                    color: '#ffffff'
                }}
                onClick={() => navigate(card.path)}
              >
                  <Card.Body className="d-flex flex-column justify-content-center align-items-center py-4" style={{ backgroundColor: '#2a2a2a' }}>
                  <div 
                    className="icon-xl mx-auto mb-3"
                    style={{ 
                        background: `linear-gradient(135deg, #4a4a4a 0%, #3a3a3a 100%)`,
                        color: '#ffffff'
                    }}
                  >
                      <i className={`${card.icon}`} style={{ color: '#ffffff' }}></i>
                  </div>
                    <Card.Title className="mb-0 fw-bold text-center" style={{ color: '#ffffff' }}>
                    {card.title}
                  </Card.Title>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
