import React from 'react';
import { Container, Card } from 'react-bootstrap';

const AttendancePage = () => {
  return (
    <div className="animate-fade-in-up" style={{ backgroundColor: 'transparent', minHeight: '100vh', padding: '2rem 0' }}>
      <Container>
        <Card style={{ 
          backgroundColor: '#1a1a1a', 
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}>
          <Card.Body>
            <div className="text-center">
              <h1 className="page-title" style={{ color: '#ffffff', marginBottom: '1rem' }}>
                <i className="bi bi-calendar-check me-3" style={{ color: '#ffffff' }}></i>
                Attendance
              </h1>
              <p style={{ color: '#ffffff', fontSize: '1.1rem' }}>
                User attendance tracking will be available here in the future.
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default AttendancePage;

