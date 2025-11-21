import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Form, Row, Col, Alert, Spinner, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { salesAPI, usersAPI, companySettingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { directPrint, createZReportHTML } from '../utils/printUtils';

const DailyReport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState({
    paymentMethods: [],
    categories: [],
    vatInfo: {
      totalVatAmount: 0,
      totalAmountExcludingVat: 0,
      totalAmountIncludingVat: 0
    }
  });
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [companySettings, setCompanySettings] = useState({ companyName: 'ADAMS GREEN', address: '' });
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  // Helper function to format date as DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format date range for display
  const formatDateRange = () => {
    if (startDate === endDate) {
      return formatDate(startDate);
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching daily report for date range:', startDate, 'to', endDate);
      console.log('User details:', { 
        isAdmin: isAdmin(), 
        selectedUserId, 
        currentUserId: user?.id,
        startDate, 
        endDate 
      });
      let response;
      
      // Check if it's a date range (different start and end dates)
      const isDateRange = startDate !== endDate;
      console.log('Is date range:', isDateRange);
      
      if (isAdmin() && selectedUserId && selectedUserId !== '') {
        // Admin viewing specific user's report
        console.log('Admin viewing specific user report');
        if (isDateRange) {
          console.log('Calling getDailyReportByUserAndDateRange with:', startDate, endDate, selectedUserId);
          response = await salesAPI.getDailyReportByUserAndDateRange(startDate, endDate, selectedUserId);
        } else {
          console.log('Calling getDailyReportByUser with:', startDate, selectedUserId);
        response = await salesAPI.getDailyReportByUser(startDate, selectedUserId);
        }
      } else if (isAdmin() && (!selectedUserId || selectedUserId === '')) {
        // Admin viewing all users' report
        console.log('Admin viewing all users report');
        if (isDateRange) {
          console.log('Calling getDailyReportByDateRangeForAdmin with:', startDate, endDate);
          response = await salesAPI.getDailyReportByDateRangeForAdmin(startDate, endDate);
        } else {
          console.log('Calling getDailyReport with:', startDate);
          response = await salesAPI.getDailyReport(startDate);
        }
      } else {
        // Regular user sees only their sales
        console.log('Regular user viewing own report');
        if (isDateRange) {
          console.log('Calling getDailyReportByUserAndDateRange with:', startDate, endDate, user?.id);
          response = await salesAPI.getDailyReportByUserAndDateRange(startDate, endDate, user?.id);
        } else {
          console.log('Calling getDailyReportByUser with:', startDate, user?.id);
        response = await salesAPI.getDailyReportByUser(startDate, user?.id);
        }
      }
      console.log('API response:', response);
      const dailyReport = response.data;

      if (!dailyReport) {
        // Show empty report with 0 values
        setReportData({
          paymentMethods: [
            { label: 'cash', count: 0, total: 0 },
            { label: 'card', count: 0, total: 0 },
            { label: 'Total', count: 0, total: 0 }
          ],
          categories: [
            { category: 'Total', count: 0, total: 0 }
          ],
          vatInfo: {
            totalVatAmount: 0,
            totalAmountExcludingVat: 0,
            totalAmountIncludingVat: 0
          }
        });
        return;
      }

      // Use the daily report data directly
      const cashCount = dailyReport.cashSales || 0;
      const cashTotal = parseFloat(dailyReport.cashAmount || 0);
      const cardCount = dailyReport.cardSales || 0;
      const cardTotal = parseFloat(dailyReport.cardAmount || 0);
      
      const totalCount = cashCount + cardCount;
      const totalAmount = cashTotal + cardTotal;
      const totalVatAmount = parseFloat(dailyReport.totalVatAmount || 0);
      const totalAmountExcludingVat = parseFloat(dailyReport.totalAmountExcludingVat || 0);

      // Process categories from API response
      const categoryData = dailyReport.categories || [];
      const processedCategories = categoryData.map(cat => ({
        category: cat.name,
        count: cat.count,
        total: parseFloat(cat.total || 0)
      }));

      setReportData({
        paymentMethods: [
          { label: 'cash', count: cashCount, total: cashTotal },
          { label: 'card', count: cardCount, total: cardTotal },
          { label: 'Total', count: totalCount, total: totalAmount }
        ],
        categories: processedCategories,
        vatInfo: {
          totalVatAmount,
          totalAmountExcludingVat,
          totalAmountIncludingVat: totalAmount
        }
      });

    } catch (err) {
      console.error('Failed to generate report:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        startDate,
        endDate,
        selectedUserId,
        isAdmin: isAdmin(),
        user: user?.id
      });
      setError(`Failed to generate report: ${err.message || 'Please try again.'}`);
      // Show empty report with 0 values on error too
      setReportData({
        paymentMethods: [
          { label: 'cash', count: 0, total: 0 },
          { label: 'card', count: 0, total: 0 },
          { label: 'Total', count: 0, total: 0 }
        ],
        categories: [
          { category: 'Total', count: 0, total: 0 }
        ],
        vatInfo: {
          totalVatAmount: 0,
          totalAmountExcludingVat: 0,
          totalAmountIncludingVat: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };



  const handleUserChange = (userId) => {
    setSelectedUserId(userId);
  };

  // Auto-load report on page load
  useEffect(() => {
    generateReport();
    fetchCompanySettings();
    if (isAdmin()) {
      fetchUsers();
    }
  }, []);

  // Auto-generate report when date or user selection changes
  useEffect(() => {
    generateReport();
  }, [startDate, endDate, selectedUserId]);

  const fetchCompanySettings = async () => {
    try {
      const response = await companySettingsAPI.get();
      // Handle both response.data and direct response
      const settingsData = response.data || response;
      if (settingsData) {
        setCompanySettings({
          companyName: settingsData.companyName || 'ADAMS GREEN',
          address: settingsData.address || ''
        });
        console.log('Company settings fetched:', settingsData);
      }
    } catch (err) {
      console.error('Failed to fetch company settings:', err);
      // Keep default values on error
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data);
      // Set admin user as default selection
      const adminUser = response.data.find(u => u.role === 'ADMIN');
      if (adminUser) {
        setSelectedUserId(adminUser.id);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handlePrintReport = async () => {
    try {
      // Ensure we have the latest company settings before printing
      let currentCompanySettings = companySettings;
      try {
        const response = await companySettingsAPI.get();
        const settingsData = response.data || response;
        if (settingsData) {
          currentCompanySettings = {
            companyName: settingsData.companyName || 'ADAMS GREEN',
            address: settingsData.address || ''
          };
        }
      } catch (err) {
        console.error('Failed to fetch company settings for print, using cached:', err);
      }
      
      // Create Z-report HTML using utility with company settings
      const dateRangeText = startDate === endDate ? startDate : `${startDate} to ${endDate}`;
      const reportContent = createZReportHTML(
        reportData, 
        currentCompanySettings.companyName || 'PickNPay', 
        dateRangeText,
        currentCompanySettings.address || '',
        '' // Phone field removed as it doesn't exist in CompanySettings
      );
      
      // Z-Report is for standard paper (not thermal), but we'll use direct print
      // Note: This will use the default printer. If your thermal printer is default,
      // it may trigger the drawer. Consider setting a different default printer for reports.
      try {
        await directPrint(reportContent, `Z-Report - ${dateRangeText}`);
      } catch (printError) {
        console.log('Direct print failed, trying Safari-compatible method');
        // Fallback: open in new window for printing (Safari compatible)
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
          printWindow.document.write(reportContent);
          printWindow.document.close();
          printWindow.focus();
          // Wait a moment for content to load
          setTimeout(() => {
            printWindow.print();
            // Close window after printing
            setTimeout(() => printWindow.close(), 1000);
          }, 500);
        } else {
          throw new Error('Popup blocked. Please allow popups for this site.');
        }
      }
      
    } catch (error) {
      console.error('Print error:', error);
      alert('Printing failed. Please check your printer connection and allow popups for this site.');
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: '#000000' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; }
        }
        .print-header { display: none; }
        .date-input {
          width: 120px;
          border: 1px solid #ccc;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .report-container {
          background-color: #f8f9fa;
          min-height: 100vh;
        }
      `}</style>

      {/* Print Header */}
      <div className="print-header text-center py-3">
        <h2>ADAMS GREEN Daily Report</h2>
        <p>Period: {formatDateRange()}</p>
        <p>Generated: {new Date().toLocaleString()}</p>
      </div>

      {/* Main Content - Full Width */}
      <div className="flex-grow-1 report-container" style={{ backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
        <Card className="shadow-sm" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <Card.Header style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #333333', color: '#ffffff' }}>
            <div className="d-flex justify-content-between align-items-center">
              <h1 className="mb-0 fw-bold" style={{ color: '#ffffff', fontSize: '1.75rem' }}>
                <i className="bi bi-file-earmark-text me-2" style={{ color: '#ffffff' }}></i>
              {startDate === endDate ? 'Daily Report' : 'Date Range Report'}
              </h1>
          <Button
            onClick={handlePrintReport}
            className="no-print"
                style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
          >
            <i className="bi bi-printer me-2"></i>
            PRINT
          </Button>
        </div>
          </Card.Header>
          <Card.Body className="p-0">
            {/* Filters Container - Grey with Outline */}
            <div className="p-3 border-bottom" style={{ backgroundColor: '#2a2a2a' }}>
              <p className="mb-3" style={{ fontSize: '0.95rem', color: '#aaaaaa' }}>
                <i className="bi bi-calendar3 me-1"></i>
                {formatDateRange()}
              </p>

          {/* Date Range and Search */}
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex gap-3 align-items-end">
              {isAdmin() && (
                <div>
                  <label className="form-label fw-semibold" style={{ color: '#ffffff' }}>
                    <i className="bi bi-person me-1"></i>
                    Select User
                  </label>
                    <Form.Select
                      value={selectedUserId}
                      onChange={(e) => handleUserChange(e.target.value)}
                    className="form-select-lg"
                    style={{ borderRadius: '10px', width: '200px', backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
                    >
                    <option value="">All Users</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                        </option>
                      ))}
                    </Form.Select>
                </div>
              )}
              <div>
                <label className="form-label fw-semibold" style={{ color: '#ffffff' }}>
                  <i className="bi bi-calendar3 me-1"></i>
                  Period Start
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-control form-control-lg"
                  style={{ borderRadius: '10px', width: '200px', backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
                />
              </div>
              <div>
                <label className="form-label fw-semibold" style={{ color: '#ffffff' }}>
                  <i className="bi bi-calendar3 me-1"></i>
                  Period End
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-control form-control-lg"
                  style={{ borderRadius: '10px', width: '200px', backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
                />
              </div>
              </div>
            </div>
      </div>

      {error && (
            <Alert variant="danger" className="mb-3" style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>
          {error}
        </Alert>
      )}

          {reportData && (
            <div>
              {/* Payment Methods Table - Top */}
              <div className="mb-4 p-4 rounded" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}>
                <h5 className="mb-3" style={{ color: '#ffffff' }}>Payment Methods</h5>
                <Table striped bordered hover className="mb-0">
                  <thead style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                    <tr>
                      <th style={{ color: '#ffffff' }}>Label</th>
                      <th style={{ color: '#ffffff' }}>Count</th>
                      <th style={{ color: '#ffffff' }}>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                    {reportData.paymentMethods.map((payment, index) => (
                      <tr key={index} style={{ backgroundColor: payment.label === 'Total' ? '#3a3a3a' : '#2a2a2a', color: '#ffffff' }}>
                        <td className="fw-bold" style={{ color: '#ffffff' }}>{payment.label}</td>
                        <td className="text-center" style={{ color: '#ffffff' }}>{payment.count}</td>
                        <td className="text-end fw-bold" style={{ color: '#ffffff' }}>€ {payment.total.toFixed(2)}</td>
                              </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Categories Table - Bottom */}
              <div className="mb-4 p-4 rounded" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}>
                <h5 className="mb-3" style={{ color: '#ffffff' }}>Category Sales</h5>
                <Table striped bordered hover className="mb-0">
                  <thead style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                    <tr>
                      <th style={{ color: '#ffffff' }}>Category</th>
                      <th style={{ color: '#ffffff' }}>Count</th>
                      <th style={{ color: '#ffffff' }}>Total</th>
                              </tr>
                  </thead>
                  <tbody>
                    {reportData.categories.map((category, index) => (
                      <tr key={index} style={{ backgroundColor: category.category === 'Total' ? '#3a3a3a' : '#2a2a2a', color: '#ffffff' }}>
                        <td className="fw-bold" style={{ color: '#ffffff' }}>{category.category}</td>
                        <td className="text-center" style={{ color: '#ffffff' }}>{category.count}</td>
                        <td className="text-end fw-bold" style={{ color: '#ffffff' }}>€ {category.total.toFixed(2)}</td>
                              </tr>
                    ))}
                            </tbody>
                          </Table>
              </div>
            </div>
          )}

          {/* VAT Summary Section */}
          {reportData && reportData.vatInfo && (
            <div className="col-md-6 mb-4">
              <div className="card h-100" style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333' }}>
                <div className="card-header" style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #333333', color: '#ffffff' }}>
                  <h5 className="card-title mb-0" style={{ color: '#ffffff' }}>
                    <i className="bi bi-percent me-2" style={{ color: '#ffffff' }}></i>
                    VAT Summary
                  </h5>
                </div>
                <div className="card-body" style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                  <Table striped bordered hover className="mb-0">
                    <thead style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                      <tr>
                        <th style={{ color: '#ffffff' }}>Description</th>
                        <th style={{ color: '#ffffff' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                        <td className="fw-bold" style={{ color: '#ffffff' }}>Amount Excluding VAT</td>
                        <td className="text-end fw-bold" style={{ color: '#ffffff' }}>€ {reportData.vatInfo.totalAmountExcludingVat.toFixed(2)}</td>
                      </tr>
                      <tr style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                        <td className="fw-bold" style={{ color: '#ffffff' }}>Total VAT Amount</td>
                        <td className="text-end fw-bold" style={{ color: '#ffffff' }}>€ {reportData.vatInfo.totalVatAmount.toFixed(2)}</td>
                      </tr>
                      <tr style={{ backgroundColor: '#3a3a3a', color: '#ffffff' }}>
                        <td className="fw-bold" style={{ color: '#ffffff' }}>Total Amount Including VAT</td>
                        <td className="text-end fw-bold" style={{ color: '#ffffff' }}>€ {reportData.vatInfo.totalAmountIncludingVat.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default DailyReport;