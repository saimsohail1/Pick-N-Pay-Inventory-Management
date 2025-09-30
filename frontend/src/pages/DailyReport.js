import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Form,
  Alert,
  Spinner,
  Modal,
  Badge,
  Table
} from 'react-bootstrap';
import { format } from 'date-fns';
import { salesAPI, companySettingsAPI } from '../services/api';

const DailyReport = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingField, setEditingField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editedReport, setEditedReport] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);

  useEffect(() => {
    fetchReport();
    fetchCompanySettings();
  }, [selectedDate]);

  const fetchCompanySettings = async () => {
    try {
      const response = await companySettingsAPI.get();
      setCompanySettings(response.data);
    } catch (err) {
      console.error('Failed to load company settings:', err);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesAPI.getDailyReport(selectedDate);
      setReport(response.data);
      setEditedReport(response.data);
    } catch (err) {
      setError('Failed to load daily report');
      console.error('Report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleEdit = (field) => {
    setEditingField(field);
    setEditValue(editedReport[field]?.toString() || '0');
    setEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    const newValue = parseFloat(editValue) || 0;
    setEditedReport(prev => ({
      ...prev,
      [editingField]: newValue
    }));
    setEditModalOpen(false);
    setEditingField('');
    setEditValue('');
  };

  const handlePrint = () => {
    const printContent = document.getElementById('report-content');
    const originalContent = document.body.innerHTML;
    
    // Create a print-friendly version with company header
    let printHTML = '';
    if (companySettings) {
      printHTML += `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0d6efd; padding-bottom: 20px;">
          <h2 style="color: #0d6efd; margin-bottom: 10px;">${companySettings.companyName}</h2>
          ${companySettings.address ? `<p style="color: #666; margin: 0;">${companySettings.address}</p>` : ''}
        </div>
      `;
    }
    printHTML += printContent.innerHTML;
    
    document.body.innerHTML = printHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const formatCurrency = (amount) => {
    return `€${amount?.toFixed(2) || '0.00'}`;
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'EEEE, MMMM do, yyyy');
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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0 fw-bold">
          <i className="bi bi-file-earmark-text me-2"></i>
          Daily Report
        </h1>
        <div className="d-flex align-items-center me-3">
          <span className="badge bg-primary me-2 fs-6">
            {report ? report.totalSales : 0} Sales
          </span>
          <span className="badge bg-primary fs-6">
            €{report ? report.totalAmount.toFixed(2) : '0.00'}
          </span>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant={editMode ? "success" : "outline-primary"}
            onClick={() => setEditMode(!editMode)}
          >
            <i className={`bi bi-${editMode ? 'check' : 'pencil'} me-2`}></i>
            {editMode ? 'Done Editing' : 'Edit Report'}
          </Button>
          <Button variant="outline-secondary" onClick={handlePrint}>
            <i className="bi bi-printer me-2"></i>
            Print Report
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      <Row className="g-4">
        {/* Date Selection */}
        <Col xs={12}>
          <Card className="shadow-sm">
            <Card.Header>
              <h5 className="mb-0">
                <i className="bi bi-calendar3 me-2"></i>
                Select Date
              </h5>
            </Card.Header>
            <Card.Body>
              <Form.Group>
                <Form.Label>Report Date</Form.Label>
                <Form.Control
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  style={{ maxWidth: '300px' }}
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>

        {/* Company Information */}
        {companySettings && (
          <Col xs={12}>
            <Card className="shadow-sm mb-4">
              <Card.Body className="text-center">
                <h3 className="fw-bold text-primary mb-2">
                  <i className="bi bi-building me-2"></i>
                  {companySettings.companyName}
                </h3>
                {companySettings.address && (
                  <p className="text-muted mb-0">
                    <i className="bi bi-geo-alt me-1"></i>
                    {companySettings.address}
                  </p>
                )}
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Report Content */}
        {report && (
          <Col xs={12}>
            <div id="report-content">
              <Card className="shadow-sm">
                <Card.Header className="bg-primary text-white">
                  <h4 className="mb-0">
                    <i className="bi bi-graph-up me-2"></i>
                    Daily Sales Report - {formatDate(selectedDate)}
                  </h4>
                </Card.Header>
                <Card.Body>
                  <Row className="g-4">
                    {/* Summary Cards */}
                    <Col xs={12} md={6} lg={3}>
                      <Card className="h-100" style={{ borderColor: '#0d6efd' }}>
                        <Card.Body className="text-center">
                          <i className="bi bi-cart-check text-secondary display-4 mb-3"></i>
                          <h5 className="text-muted">Total Sales</h5>
                          <h2 className="text-secondary mb-0">
                            {editMode ? (
                              <Button
                                variant="link"
                                className="p-0 text-decoration-none"
                                onClick={() => handleEdit('totalSales')}
                              >
                                {editedReport.totalSales}
                                <i className="bi bi-pencil ms-2"></i>
                              </Button>
                            ) : (
                              editedReport.totalSales
                            )}
                          </h2>
                          <small className="text-muted">transactions</small>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col xs={12} md={6} lg={3}>
                      <Card className="h-100" style={{ borderColor: '#ffff00' }}>
                        <Card.Body className="text-center">
                          <i className="bi bi-currency-euro text-warning display-4 mb-3"></i>
                          <h5 className="text-muted">Total Amount</h5>
                          <h2 className="text-warning mb-0">
                            {editMode ? (
                              <Button
                                variant="link"
                                className="p-0 text-decoration-none"
                                onClick={() => handleEdit('totalAmount')}
                              >
                                {formatCurrency(editedReport.totalAmount)}
                                <i className="bi bi-pencil ms-2"></i>
                              </Button>
                            ) : (
                              formatCurrency(editedReport.totalAmount)
                            )}
                          </h2>
                          <small className="text-muted">revenue</small>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col xs={12} md={6} lg={3}>
                      <Card className="h-100" style={{ borderColor: '#0d6efd' }}>
                        <Card.Body className="text-center">
                          <i className="bi bi-cash-coin text-secondary display-4 mb-3"></i>
                          <h5 className="text-muted">Cash Sales</h5>
                          <h2 className="text-secondary mb-0">
                            {editMode ? (
                              <Button
                                variant="link"
                                className="p-0 text-decoration-none"
                                onClick={() => handleEdit('cashAmount')}
                              >
                                {formatCurrency(editedReport.cashAmount)}
                                <i className="bi bi-pencil ms-2"></i>
                              </Button>
                            ) : (
                              formatCurrency(editedReport.cashAmount)
                            )}
                          </h2>
                          <small className="text-muted">
                            {editedReport.cashSales} transactions
                          </small>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col xs={12} md={6} lg={3}>
                      <Card className="h-100" style={{ borderColor: '#ffff00' }}>
                        <Card.Body className="text-center">
                          <i className="bi bi-credit-card text-warning display-4 mb-3"></i>
                          <h5 className="text-muted">Card Sales</h5>
                          <h2 className="text-warning mb-0">
                            {editMode ? (
                              <Button
                                variant="link"
                                className="p-0 text-decoration-none"
                                onClick={() => handleEdit('cardAmount')}
                              >
                                {formatCurrency(editedReport.cardAmount)}
                                <i className="bi bi-pencil ms-2"></i>
                              </Button>
                            ) : (
                              formatCurrency(editedReport.cardAmount)
                            )}
                          </h2>
                          <small className="text-muted">
                            {editedReport.cardSales} transactions
                          </small>
                        </Card.Body>
                      </Card>
                    </Col>

                    {/* Detailed Breakdown */}
                    <Col xs={12}>
                      <Card className="mt-4">
                        <Card.Header>
                          <h5 className="mb-0">
                            <i className="bi bi-list-ul me-2"></i>
                            Payment Method Breakdown
                          </h5>
                        </Card.Header>
                        <Card.Body>
                          <Table responsive striped hover>
                            <thead>
                              <tr>
                                <th>Payment Method</th>
                                <th className="text-center">Transactions</th>
                                <th className="text-end">Amount</th>
                                <th className="text-end">Percentage</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <Badge bg="warning" className="me-2">
                                    <i className="bi bi-cash-coin me-1"></i>
                                    Cash
                                  </Badge>
                                </td>
                                <td className="text-center">
                                  {editMode ? (
                                    <Button
                                      variant="link"
                                      className="p-0 text-decoration-none"
                                      onClick={() => handleEdit('cashSales')}
                                    >
                                      {editedReport.cashSales}
                                      <i className="bi bi-pencil ms-2"></i>
                                    </Button>
                                  ) : (
                                    editedReport.cashSales
                                  )}
                                </td>
                                <td className="text-end">
                                  {editMode ? (
                                    <Button
                                      variant="link"
                                      className="p-0 text-decoration-none"
                                      onClick={() => handleEdit('cashAmount')}
                                    >
                                      {formatCurrency(editedReport.cashAmount)}
                                      <i className="bi bi-pencil ms-2"></i>
                                    </Button>
                                  ) : (
                                    formatCurrency(editedReport.cashAmount)
                                  )}
                                </td>
                                <td className="text-end">
                                  {editedReport.totalAmount > 0 
                                    ? `${((editedReport.cashAmount / editedReport.totalAmount) * 100).toFixed(1)}%`
                                    : '0%'
                                  }
                                </td>
                              </tr>
                              <tr>
                                <td>
                                  <Badge bg="info" className="me-2">
                                    <i className="bi bi-credit-card me-1"></i>
                                    Card
                                  </Badge>
                                </td>
                                <td className="text-center">
                                  {editMode ? (
                                    <Button
                                      variant="link"
                                      className="p-0 text-decoration-none"
                                      onClick={() => handleEdit('cardSales')}
                                    >
                                      {editedReport.cardSales}
                                      <i className="bi bi-pencil ms-2"></i>
                                    </Button>
                                  ) : (
                                    editedReport.cardSales
                                  )}
                                </td>
                                <td className="text-end">
                                  {editMode ? (
                                    <Button
                                      variant="link"
                                      className="p-0 text-decoration-none"
                                      onClick={() => handleEdit('cardAmount')}
                                    >
                                      {formatCurrency(editedReport.cardAmount)}
                                      <i className="bi bi-pencil ms-2"></i>
                                    </Button>
                                  ) : (
                                    formatCurrency(editedReport.cardAmount)
                                  )}
                                </td>
                                <td className="text-end">
                                  {editedReport.totalAmount > 0 
                                    ? `${((editedReport.cardAmount / editedReport.totalAmount) * 100).toFixed(1)}%`
                                    : '0%'
                                  }
                                </td>
                              </tr>
                              <tr className="table-primary fw-bold">
                                <td>Total</td>
                                <td className="text-center">
                                  {editMode ? (
                                    <Button
                                      variant="link"
                                      className="p-0 text-decoration-none"
                                      onClick={() => handleEdit('totalSales')}
                                    >
                                      {editedReport.totalSales}
                                      <i className="bi bi-pencil ms-2"></i>
                                    </Button>
                                  ) : (
                                    editedReport.totalSales
                                  )}
                                </td>
                                <td className="text-end">
                                  {editMode ? (
                                    <Button
                                      variant="link"
                                      className="p-0 text-decoration-none"
                                      onClick={() => handleEdit('totalAmount')}
                                    >
                                      {formatCurrency(editedReport.totalAmount)}
                                      <i className="bi bi-pencil ms-2"></i>
                                    </Button>
                                  ) : (
                                    formatCurrency(editedReport.totalAmount)
                                  )}
                                </td>
                                <td className="text-end">100%</td>
                              </tr>
                            </tbody>
                          </Table>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </div>
          </Col>
        )}
      </Row>

      {/* Edit Modal */}
      <Modal show={editModalOpen} onHide={() => setEditModalOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit {editingField}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>New Value</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter new value"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DailyReport;
