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
  const [selectedWeekStart, setSelectedWeekStart] = useState('');
  const [weeklyReport, setWeeklyReport] = useState([]);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  
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
  
  // Calculate week start when component mounts or date changes
  useEffect(() => {
    if (selectedDate && isAdmin()) {
      calculateWeekStart(selectedDate);
    }
  }, [selectedDate, isAdmin]);
  
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
  
  const calculateWeekStart = async (date) => {
    try {
      console.log('Calculating week start for date:', date);
      const response = await attendanceAPI.getWeekStart(date);
      const weekStart = response.data.weekStart;
      console.log('Week start calculated:', weekStart);
      setSelectedWeekStart(weekStart);
    } catch (err) {
      console.error('Failed to calculate week start:', err);
      // Don't show error for week start calculation failure
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
  
  const handleGenerateWeeklyReport = async () => {
    if (!selectedWeekStart) {
      setError('Please select a date first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await attendanceAPI.getAllUsersWeeklyReport(selectedWeekStart);
      setWeeklyReport(response.data);
      setShowWeeklyReport(true);
    } catch (err) {
      console.error('Failed to generate weekly report:', err);
      setError('Failed to generate weekly report. Please try again.');
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
  
  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };
  
  const formatHours = (hours) => {
    if (!hours) return '-';
    return parseFloat(hours).toFixed(2) + 'h';
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
    <div className="animate-fade-in-up" style={{ backgroundColor: 'transparent', minHeight: '100vh', padding: '2rem 0' }}>
      <Container>
        {/* Header */}
        <Card className="mb-4" style={{ 
          backgroundColor: '#1a1a1a', 
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}>
          <Card.Body>
            <h1 className="page-title" style={{ color: '#ffffff', marginBottom: '1rem' }}>
              <i className="bi bi-calendar-check me-3" style={{ color: '#ffffff' }}></i>
              Employee Attendance
            </h1>
          </Card.Body>
        </Card>
        
        {/* Alerts */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            {success}
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
                  <Form.Label style={{ color: '#ffffff' }}>Select Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                  />
                </Form.Group>
              </Col>
              <Col md={8}>
                <div style={{ color: '#ffffff', paddingTop: '2rem' }}>
                  <strong>Selected Date:</strong> {formatDate(selectedDate)}
                  {selectedWeekStart && (
                    <span className="ms-3">
                      <strong>Week Start:</strong> {formatDate(selectedWeekStart)}
                    </span>
                  )}
                </div>
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
                    <th>Hours</th>
                    <th>Total Hours</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center">No users found</td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const userAttendances = getAttendancesForUser(user.id);
                      const latestOpen = getLatestOpenAttendance(user.id);
                      const totalHours = getTotalHoursForUser(user.id);
                      const hasOpenEntry = latestOpen !== null;
                      
                      if (userAttendances.length === 0) {
                        // No attendance records, show single row with Time In button
                        return (
                          <tr key={user.id}>
                            <td>{user.fullName}</td>
                            <td>{user.username}</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td style={{ fontWeight: 'bold' }}>0.00h</td>
                            <td>
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleMarkTimeIn(user.id)}
                                disabled={loading}
                              >
                                <i className="bi bi-clock-history me-1"></i>
                                Time In
                              </Button>
                            </td>
                          </tr>
                        );
                      }
                      
                      // Show all entries for this user
                      return userAttendances.map((attendance, index) => {
                        const isFirstRow = index === 0;
                        const isLastRow = index === userAttendances.length - 1;
                        const isOpenEntry = !attendance.timeOut;
                        
                        return (
                          <tr key={`${user.id}-${attendance.id}`}>
                            {isFirstRow && (
                              <>
                                <td rowSpan={userAttendances.length}>{user.fullName}</td>
                                <td rowSpan={userAttendances.length}>{user.username}</td>
                              </>
                            )}
                            <td>{formatTime(attendance.timeIn)}</td>
                            <td>{attendance.timeOut ? formatTime(attendance.timeOut) : <Badge bg="warning">Open</Badge>}</td>
                            <td>{attendance.totalHours ? formatHours(attendance.totalHours) : '-'}</td>
                            {isFirstRow && (
                              <td rowSpan={userAttendances.length} style={{ fontWeight: 'bold' }}>
                                {totalHours}h
                              </td>
                            )}
                            {isLastRow && (
                              <td>
                                {hasOpenEntry ? (
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
                            )}
                            {!isLastRow && <td></td>}
                          </tr>
                        );
                      });
                    })
                  )}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
        
        {/* Weekly Report Section */}
        <Card style={{ 
          backgroundColor: '#1a1a1a', 
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}>
          <Card.Body>
            <Row className="mb-3">
              <Col>
                <h3 style={{ color: '#ffffff' }}>Weekly Report</h3>
              </Col>
              <Col xs="auto">
                <Button
                  variant="primary"
                  onClick={handleGenerateWeeklyReport}
                  disabled={loading || !selectedWeekStart}
                >
                  <i className="bi bi-file-earmark-text me-1"></i>
                  Generate Weekly Report
                </Button>
              </Col>
            </Row>
            
            {showWeeklyReport && weeklyReport.length > 0 && (
              <Table striped bordered hover variant="dark" responsive>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Total Hours (Week)</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyReport.map((report) => (
                    <tr key={report.userId}>
                      <td>{report.fullName}</td>
                      <td>{formatHours(report.totalHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            
            {showWeeklyReport && weeklyReport.length === 0 && (
              <Alert variant="info">
                No attendance records found for this week.
              </Alert>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default AttendancePage;
