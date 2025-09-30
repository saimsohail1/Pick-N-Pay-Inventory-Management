import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { itemsAPI, salesAPI, companySettingsAPI } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalItems: 0,
    totalSales: 0,
    lowStockItems: 0,
    todaySales: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyName, setCompanyName] = useState('PickNPay');

  useEffect(() => {
    fetchDashboardData();
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [itemsResponse, salesResponse, lowStockResponse] = await Promise.all([
        itemsAPI.getAll(),
        salesAPI.getAll(),
        itemsAPI.getLowStock(10)
      ]);

      // Calculate today's sales
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const todaySalesResponse = await salesAPI.getTotalByDateRange(
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );

      setStats({
        totalItems: itemsResponse.data.length,
        totalSales: salesResponse.data.length,
        lowStockItems: lowStockResponse.data.length,
        todaySales: todaySalesResponse.data || 0
      });
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  const statCards = [
    {
      title: 'Total Items',
      value: stats.totalItems,
      icon: 'bi-box-seam',
      color: 'grey',
      bgColor: 'bg-secondary',
      textColor: 'text-white'
    },
    {
      title: 'Total Sales',
      value: stats.totalSales,
      icon: 'bi-cart-check',
      color: 'yellow',
      bgColor: 'bg-warning',
      textColor: 'text-dark'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: 'bi-exclamation-triangle',
      color: 'grey',
      bgColor: 'bg-secondary',
      textColor: 'text-white'
    },
    {
      title: "Today's Sales",
      value: `€${stats.todaySales.toFixed(2)}`,
      icon: 'bi-graph-up',
      color: 'yellow',
      bgColor: 'bg-warning',
      textColor: 'text-dark'
    }
  ];

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

        {/* Statistics Section */}
        <Card className="animate-fade-in-up">
          <Card.Header className="bg-gradient-primary text-white">
            <h5 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              System Overview
            </h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Row className="g-4">
              {statCards.map((card, index) => (
                <Col xs={12} sm={6} md={3} key={index}>
                  <div className="stats-card text-center p-4">
                    <div className="icon-lg mx-auto mb-3" style={{ 
                      background: `linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)`,
                      color: 'var(--primary-600)'
                    }}>
                      <i className={`${card.icon}`}></i>
                    </div>
                    <h3 className="stats-number text-primary mb-1">{card.value}</h3>
                    <p className="stats-label text-muted mb-0">{card.title}</p>
                  </div>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
