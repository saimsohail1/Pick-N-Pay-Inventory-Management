import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Button, Form, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { attendanceAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTimeoutManager } from '../hooks/useTimeoutManager';

const AttendancePage = () => {
  const { user, isAdmin } = useAuth();
  const { addTimeout } = useTimeoutManager();
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [users, setUsers] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportStartDate, setReportStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeReport, setEmployeeReport] = useState([]);
  const [showEmployeeReport, setShowEmployeeReport] = useState(false);
  
  // Fetch users on mount
  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, [isAdmin]);
  
  // Fetch attendances when date changes
  useEffect(() => {
    if (selectedDate && isAdmin()) {
      fetchAttendancesForDate(selectedDate);
    }
  }, [selectedDate, isAdmin]);
  
  // No longer need week start calculation
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getActive();
      setUsers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      // Handle both string and object error responses
      let errorMessage = 'Failed to load users. Please try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAttendancesForDate = async (date) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching attendances for date:', date);
      const response = await attendanceAPI.getByDate(date);
      console.log('Attendances response:', response.data);
      setAttendances(response.data || []);
    } catch (err) {
      console.error('Failed to fetch attendances:', err);
      // Handle both string and object error responses
      let errorMessage = 'Failed to load attendance data. Please try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setAttendances([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };
  
  
  const handleMarkTimeIn = async (userId) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const now = new Date();
      const timeIn = now.toTimeString().split(' ')[0]; // HH:MM:SS format
      
      await attendanceAPI.markTimeIn(userId, selectedDate, timeIn);
      setSuccess('Time-in marked successfully!');
      fetchAttendancesForDate(selectedDate);
    } catch (err) {
      console.error('Failed to mark time-in:', err);
      // Handle both string and object error responses
      let errorMessage = 'Failed to mark time-in. Please try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      addTimeout(() => setSuccess(null), 3000);
      addTimeout(() => setError(null), 5000);
    }
  };
  
  const handleMarkTimeOut = async (userId) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const now = new Date();
      const timeOut = now.toTimeString().split(' ')[0]; // HH:MM:SS format
      
      await attendanceAPI.markTimeOut(userId, selectedDate, timeOut);
      setSuccess('Time-out marked successfully!');
      fetchAttendancesForDate(selectedDate);
    } catch (err) {
      console.error('Failed to mark time-out:', err);
      // Handle both string and object error responses
      let errorMessage = 'Failed to mark time-out. Please try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      addTimeout(() => setSuccess(null), 3000);
      addTimeout(() => setError(null), 5000);
    }
  };
  
  const handleGenerateEmployeeReport = async () => {
    if (!reportStartDate || !reportEndDate) {
      setError('Please select both start and end dates.');
      return;
    }
    
    if (new Date(reportStartDate) > new Date(reportEndDate)) {
      setError('Start date cannot be after end date.');
      return;
    }
    
    // Allow same date for single day report (no additional validation needed)
    
    setLoading(true);
    setError(null);
    try {
      const response = await attendanceAPI.getEmployeeReportByDateRange(reportStartDate, reportEndDate);
      setEmployeeReport(response.data);
      setShowEmployeeReport(true);
    } catch (err) {
      console.error('Failed to generate employee report:', err);
      // Handle both string and object error responses
      let errorMessage = 'Failed to generate employee report. Please try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const getAttendancesForUser = (userId) => {
    return attendances.filter(a => a.userId === userId).sort((a, b) => {
      // Sort by time-in, earliest first
      if (a.timeIn && b.timeIn) {
        return a.timeIn.localeCompare(b.timeIn);
      }
      return 0;
    });
  };
  
  const getLatestOpenAttendance = (userId) => {
    const userAttendances = getAttendancesForUser(userId);
    // Find the latest entry without time-out
    return userAttendances.find(a => !a.timeOut) || null;
  };
  
  const getTotalHoursForUser = (userId) => {
    const userAttendances = getAttendancesForUser(userId);
    const total = userAttendances.reduce((sum, a) => {
      return sum + (parseFloat(a.totalHours) || 0);
    }, 0);
    return total.toFixed(2);
  };
  
  const getFirstTimeIn = (userId) => {
    const userAttendances = getAttendancesForUser(userId);
    if (userAttendances.length === 0) return null;
    return userAttendances[0].timeIn;
  };
  
  const getLastTimeOut = (userId) => {
    const userAttendances = getAttendancesForUser(userId);
    if (userAttendances.length === 0) return null;
    // Find the last completed entry (with time-out)
    const completedEntries = userAttendances.filter(a => a.timeOut);
    if (completedEntries.length > 0) {
      return completedEntries[completedEntries.length - 1].timeOut;
    }
    // If no completed entries, check if there's an open entry
    const openEntry = userAttendances.find(a => !a.timeOut);
    return openEntry ? null : null; // Return null to show "Open" badge
  };
  
  const hasOpenEntry = (userId) => {
    return getLatestOpenAttendance(userId) !== null;
  };
  
  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };
  
  const formatHours = (hours) => {
    if (!hours) return '-';
    return parseFloat(hours).toFixed(2) + 'h';
  };
  
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '€0.00';
    return '€' + parseFloat(amount).toFixed(2);
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  // Only show page if user is admin
  if (!isAdmin()) {
    return (
      <div className="animate-fade-in-up" style={{ backgroundColor: '#000000', minHeight: '100vh', padding: '2rem 0' }}>
        <Container className="py-5">
          <div className="text-center" style={{ color: '#ffffff' }}>
            <div className="mb-4">
              <i className="bi bi-shield-x" style={{ fontSize: '4rem', color: '#aaaaaa' }}></i>
            </div>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>Access Denied</h3>
            <p style={{ color: '#aaaaaa' }}>You don't have permission to access this page.</p>
            <p style={{ color: '#aaaaaa' }}>Admin privileges required.</p>
          </div>
        </Container>
      </div>
    );
  }
  
  return (
    <>
      <style>{`
        /* Ensure date picker calendar is visible */
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          z-index: 1001;
        }
        
        /* Prevent date picker from being clipped */
        .date-picker-container {
          position: relative;
          z-index: 1000;
        }
        
        /* Ensure calendar dropdown appears above other elements */
        input[type="date"] {
          position: relative;
          z-index: 1000;
        }
      `}</style>
      <div className="animate-fade-in-up" style={{ backgroundColor: 'transparent', minHeight: '100vh', padding: '2rem 0', overflow: 'visible' }}>
        <Container style={{ position: 'relative', overflow: 'visible' }}>
          {/* Header */}
        <Card className="mb-4 shadow-sm" style={{ 
          backgroundColor: '#1a1a1a', 
          border: '1px solid #2a2a2a'
        }}>
          <Card.Header style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #333333', color: '#ffffff' }}>
            <h1 className="mb-0 fw-bold" style={{ color: '#ffffff', fontSize: '1.75rem' }}>
              <i className="bi bi-calendar-check me-2" style={{ color: '#ffffff' }}></i>
              Employee Attendance
            </h1>
          </Card.Header>
        </Card>
        
        {/* Toast Notifications */}
        {success && (
          <Alert 
            variant="success"
            onClose={() => setSuccess(null)} 
            dismissible
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              minWidth: '300px',
              maxWidth: '400px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              backgroundColor: '#28a745',
              border: '1px solid #1e7e34',
              color: '#ffffff'
            }}
          >
            <i className="bi bi-check-circle me-2"></i>
            {success}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" className="mb-3" style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>
            {error}
          </Alert>
        )}
        
        {/* Date Selection */}
        <Card className="mb-4" style={{ 
          backgroundColor: '#1a1a1a', 
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}>
          <Card.Body>
            <Row className="align-items-center">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Select Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Daily Attendance Table */}
        <Card className="mb-4" style={{ 
          backgroundColor: '#1a1a1a', 
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}>
          <Card.Body>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>Daily Attendance - {formatDate(selectedDate)}</h3>
            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" variant="light" />
              </div>
            ) : (
              <Table striped bordered hover variant="dark" responsive>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Username</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Total Hours (Day)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center">No users found</td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const userAttendances = getAttendancesForUser(user.id);
                      const totalHours = getTotalHoursForUser(user.id);
                      const firstTimeIn = getFirstTimeIn(user.id);
                      const lastTimeOut = getLastTimeOut(user.id);
                      const hasOpen = hasOpenEntry(user.id);
                      
                      return (
                        <tr key={user.id}>
                          <td>{user.fullName}</td>
                          <td>{user.username}</td>
                          <td>{firstTimeIn ? formatTime(firstTimeIn) : '-'}</td>
                          <td>
                            {hasOpen ? (
                              <Badge bg="warning">Open</Badge>
                            ) : lastTimeOut ? (
                              formatTime(lastTimeOut)
                            ) : (
                              '-'
                            )}
                          </td>
                          <td style={{ fontWeight: 'bold' }}>{totalHours}h</td>
                          <td>
                            {hasOpen ? (
                              <Button
                                variant="warning"
                                size="sm"
                                onClick={() => handleMarkTimeOut(user.id)}
                                disabled={loading}
                              >
                                <i className="bi bi-clock-history me-1"></i>
                                Time Out
                              </Button>
                            ) : (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleMarkTimeIn(user.id)}
                                disabled={loading}
                              >
                                <i className="bi bi-clock-history me-1"></i>
                                Time In
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
        
        {/* Employee Report Section */}
        <Card style={{ 
          backgroundColor: '#1a1a1a', 
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}>
          <Card.Body style={{ paddingBottom: '150px', position: 'relative', zIndex: 1000 }}>
            <Row className="mb-3">
              <Col>
                <h3 style={{ color: '#ffffff' }}>Employee Report</h3>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group className="date-picker-container" style={{ position: 'relative', zIndex: 1001 }}>
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    style={{ 
                      backgroundColor: '#2a2a2a', 
                      border: '1px solid #333333', 
                      color: '#ffffff',
                      position: 'relative',
                      zIndex: 1001
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="date-picker-container" style={{ position: 'relative', zIndex: 1001 }}>
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    style={{ 
                      backgroundColor: '#2a2a2a', 
                      border: '1px solid #333333', 
                      color: '#ffffff',
                      position: 'relative',
                      zIndex: 1001
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={4} className="d-flex align-items-end">
                <Button
                  variant="primary"
                  onClick={handleGenerateEmployeeReport}
                  disabled={loading || !reportStartDate || !reportEndDate}
                  style={{ width: '100%' }}
                >
                  <i className="bi bi-file-earmark-text me-1"></i>
                  Generate Employee Report
                </Button>
              </Col>
            </Row>
            
            {showEmployeeReport && employeeReport.length > 0 && (
              <Table striped bordered hover variant="dark" responsive>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Total Hours</th>
                    <th>Hourly Rate</th>
                    <th>Total Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeReport.map((report) => (
                    <tr key={report.userId}>
                      <td>{report.fullName}</td>
                      <td>{formatHours(report.totalHours)}</td>
                      <td>{report.hourlyPayRate ? formatCurrency(report.hourlyPayRate) : 'Not Set'}</td>
                      <td style={{ fontWeight: 'bold' }}>
                        {report.hourlyPayRate && report.hourlyPayRate > 0 
                          ? formatCurrency(report.totalPay) 
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            
            {showEmployeeReport && employeeReport.length === 0 && (
              <Alert variant="info">
                No attendance records found for the selected date range.
              </Alert>
            )}
          </Card.Body>
        </Card>
        </Container>
      </div>
    </>
  );
};

export default AttendancePage;
