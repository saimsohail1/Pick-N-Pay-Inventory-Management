import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { companySettingsAPI } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('PickNPay');

  const fetchCompanyName = useCallback(async () => {
    try {
      const response = await companySettingsAPI.get();
      setCompanyName(response.data.companyName);
    } catch (error) {
      console.error('Failed to fetch company name:', error);
      // Keep default name if fetch fails
    }
  }, []);

  useEffect(() => {
    fetchCompanyName();
  }, [fetchCompanyName]);

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
      color: '#0d6efd'
    },
    {
      title: 'User',
      icon: 'bi-person',
      path: '/users',
      color: '#0d6efd'
    },
    {
      title: 'Product',
      icon: 'bi-box-seam',
      path: '/inventory',
      color: '#0d6efd'
    },
    {
      title: 'Category',
      icon: 'bi-tags',
      path: '/categories',
      color: '#0d6efd'
    },
    {
      title: 'Stock Management',
      icon: 'bi-box-arrow-down',
      path: '/inventory',
      color: '#0d6efd'
    },
    {
      title: 'Sale',
      icon: 'bi-cart-check',
      path: '/sales',
      color: '#0d6efd'
    },
    {
      title: 'Sales History',
      icon: 'bi-clock-history',
      path: '/sales-history',
      color: '#0d6efd'
    },
    {
      title: 'Z-Report',
      icon: 'bi-file-earmark-text',
      path: '/daily-report',
      color: '#0d6efd'
    }
  ];

  return (
    <div className="animate-fade-in-up">
      {/* Welcome Section */}
      <div className="page-header mb-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col text-center">
              <h1 className="page-title">
                <i className="bi bi-speedometer2 me-3"></i>
                Welcome to {companyName}
              </h1>
              <p className="page-subtitle">Modern Inventory Management System</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container">

        {/* Navigation Cards Grid */}
        <Row className="g-4 mb-5">
          {navigationCards.map((card, index) => (
            <Col xs={12} sm={6} md={4} lg={3} key={index}>
              <Card 
                className="h-100 stats-card hover-lift" 
                style={{ 
                  cursor: 'pointer',
                  animationDelay: `${index * 0.1}s`
                }}
                onClick={() => navigate(card.path)}
              >
                <Card.Body className="d-flex flex-column justify-content-center align-items-center py-4">
                  <div 
                    className="icon-xl mx-auto mb-3"
                    style={{ 
                      background: `linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)`,
                      color: 'var(--primary-600)'
                    }}
                  >
                    <i className={`${card.icon}`}></i>
                  </div>
                  <Card.Title className="mb-0 fw-bold text-dark text-center">
                    {card.title}
                  </Card.Title>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

      </div>
    </div>
  );
};

export default Dashboard;
