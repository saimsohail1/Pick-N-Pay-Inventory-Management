import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { salesAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching daily report for date:', startDate);
      let response;
      if (isAdmin() && selectedUserId) {
        // Admin viewing specific user's report
        response = await salesAPI.getDailyReportByUser(startDate, selectedUserId);
      } else {
        // Regular user sees only their sales
        response = await salesAPI.getDailyReportByUser(startDate, user?.id);
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

      setReportData({
        paymentMethods: [
          { label: 'cash', count: cashCount, total: cashTotal },
          { label: 'card', count: cardCount, total: cardTotal },
          { label: 'Total', count: totalCount, total: totalAmount }
        ],
        categories: [
          { category: 'Total', count: totalCount, total: totalAmount }
        ],
        vatInfo: {
          totalVatAmount,
          totalAmountExcludingVat,
          totalAmountIncludingVat: totalAmount
        }
      });

    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Failed to generate report. Please try again.');
      // Show empty report with 0 values on error too
      setReportData({
        paymentMethods: [
          { label: 'cash', count: 0, total: 0 },
          { label: 'card', count: 0, total: 0 },
          { label: 'Total', count: 0, total: 0 }
        ],
        categories: [
          { category: 'Total', count: 0, total: 0 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSearch = () => {
    generateReport();
  };

  const handleUserChange = (userId) => {
    setSelectedUserId(userId);
    // Refresh report when user selection changes
    generateReport();
  };

  // Auto-load report on page load
  useEffect(() => {
    generateReport();
    if (isAdmin()) {
      fetchUsers();
    }
  }, []);

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

  const handlePrintReport = () => {
    // Create a printable Z-report optimized for till paper
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Z-Report - ${startDate}</title>
        <style>
          @media print {
            @page { 
              size: 80mm auto; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 5mm; 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              line-height: 1.2;
              width: 70mm;
            }
          }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            line-height: 1.2; 
            margin: 0; 
            padding: 5mm; 
            width: 70mm;
          }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px; }
          .item { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; }
          .total { border-top: 1px dashed #000; padding-top: 5px; margin-top: 10px; font-weight: bold; }
          .section { margin: 10px 0; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          .center { text-align: center; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="center"><strong>PICKNPAY</strong></div>
          <div class="center"><strong>Z-REPORT</strong></div>
          <div class="center">Date: ${startDate}</div>
          <div class="center">${new Date().toLocaleString()}</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="section">
          <div class="center"><strong>PAYMENT METHODS</strong></div>
          ${reportData.paymentMethods.map(payment => `
            <div class="item">
              <span>${payment.label.toUpperCase()}:</span>
              <span>€${payment.total.toFixed(2)} (${payment.count})</span>
            </div>
          `).join('')}
        </div>
        
        <div class="divider"></div>
        
        <div class="section">
          <div class="center"><strong>VAT SUMMARY</strong></div>
          <div class="item">
            <span>Subtotal (Ex VAT):</span>
            <span>€${reportData.vatInfo.totalAmountExcludingVat.toFixed(2)}</span>
          </div>
          <div class="item">
            <span>Total VAT:</span>
            <span>€${reportData.vatInfo.totalVatAmount.toFixed(2)}</span>
          </div>
          <div class="item">
            <span><strong>Total (Inc VAT):</strong></span>
            <span><strong>€${reportData.vatInfo.totalAmountIncludingVat.toFixed(2)}</strong></span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="footer">
          <div>End of Z-Report</div>
          <div>---</div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(reportContent);
    printWindow.document.close();
    
    // Auto-print without dialog
    setTimeout(() => {
      printWindow.print();
      // Close the window after printing
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 500);
  };

  return (
    <div className="d-flex flex-column vh-100">
      <style jsx>{`
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
      `}</style>

      {/* Print Header */}
      <div className="print-header text-center py-3">
        <h2>PickNPay Daily Report</h2>
        <p>Period: {startDate} to {endDate}</p>
        <p>Generated: {new Date().toLocaleString()}</p>
      </div>

      {/* Main Content - Full Width */}
      <div className="flex-grow-1 p-4">
        {/* Title */}
      <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0 fw-bold text-primary">Daily Report</h2>
          <Button
            variant="primary" 
            onClick={handlePrint}
            className="no-print"
          >
            <i className="bi bi-printer me-2"></i>
            PRINT
          </Button>
        </div>

          {/* Date Range and Search */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex gap-3 align-items-end">
              {isAdmin() && (
                <div>
                  <Form.Label className="small fw-bold">User</Form.Label>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-person me-2 text-primary"></i>
                    <Form.Select
                      value={selectedUserId}
                      onChange={(e) => handleUserChange(e.target.value)}
                      style={{ width: '150px' }}
                    >
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                </div>
              )}
              <div>
                <Form.Label className="small fw-bold">Period Start</Form.Label>
                <div className="d-flex align-items-center">
                  <input
                    type="date"
                    className="date-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <i className="bi bi-calendar ms-2"></i>
                </div>
              </div>
              <div>
                <Form.Label className="small fw-bold">Period End</Form.Label>
                <div className="d-flex align-items-center">
                  <input
                    type="date"
                    className="date-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <i className="bi bi-calendar ms-2"></i>
                </div>
              </div>
            </div>
            <Button 
              variant="primary" 
              onClick={handleSearch}
              disabled={loading}
              className="no-print"
            >
              {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-search me-2"></i>}
              SEARCH
            </Button>
            {reportData && (
              <Button 
                variant="success" 
                onClick={handlePrintReport}
                className="no-print ms-2"
              >
                <i className="bi bi-printer me-2"></i>
                PRINT REPORT
              </Button>
            )}
      </div>

      {error && (
            <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

          {reportData && (
            <div>
              {/* Payment Methods Table - Top */}
              <div className="mb-4">
                <h5 className="mb-3 text-primary">Payment Methods</h5>
                <Table striped bordered hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Label</th>
                      <th>Count</th>
                      <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                    {reportData.paymentMethods.map((payment, index) => (
                      <tr key={index} className={payment.label === 'Total' ? 'table-dark' : ''}>
                        <td className="fw-bold">{payment.label}</td>
                        <td className="text-center">{payment.count}</td>
                        <td className="text-end fw-bold">€ {payment.total.toFixed(2)}</td>
                              </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Categories Table - Bottom */}
              <div className="mb-4">
                <h5 className="mb-3 text-primary">Category Sales</h5>
                <Table striped bordered hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Category</th>
                      <th>Count</th>
                      <th>Total</th>
                              </tr>
                  </thead>
                  <tbody>
                    {reportData.categories.map((category, index) => (
                      <tr key={index} className={category.category === 'Total' ? 'table-dark' : ''}>
                        <td className="fw-bold">{category.category}</td>
                        <td className="text-center">{category.count}</td>
                        <td className="text-end fw-bold">€ {category.total.toFixed(2)}</td>
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
              <div className="card h-100">
                <div className="card-header bg-info text-white">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-percent me-2"></i>
                    VAT Summary
                  </h5>
                </div>
                <div className="card-body">
                  <Table striped bordered hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Description</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="fw-bold">Amount Excluding VAT</td>
                        <td className="text-end fw-bold">€ {reportData.vatInfo.totalAmountExcludingVat.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="fw-bold">Total VAT Amount</td>
                        <td className="text-end fw-bold text-success">€ {reportData.vatInfo.totalVatAmount.toFixed(2)}</td>
                      </tr>
                      <tr className="table-dark">
                        <td className="fw-bold">Total Amount Including VAT</td>
                        <td className="text-end fw-bold">€ {reportData.vatInfo.totalAmountIncludingVat.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              </div>
            </div>
          )}

      </div>
    </div>
  );
};

export default DailyReport;