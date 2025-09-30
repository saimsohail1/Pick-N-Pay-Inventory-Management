import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Table,
  Modal,
  Alert,
  Spinner,
  Form,
  Badge,
  Accordion
} from 'react-bootstrap';
import { format } from 'date-fns';
import { salesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SalesHistory = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState(null);
  const [editing, setEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [filterMode, setFilterMode] = useState('today'); // 'today', 'single'
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    fetchTodaySales();
  }, []);

  const fetchTodaySales = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await salesAPI.getTodaySales(user?.id, isAdmin());
      setSales(response.data);
      setFilterMode('today');
    } catch (err) {
      setError('Failed to load today\'s sales');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesByDate = async (date) => {
    if (!date) return;

    try {
      setLoading(true);
      setError(null);
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999); // End of day

      let response;
      if (isAdmin()) {
        response = await salesAPI.getSalesByDateRangeForAdmin(
          startDate.toISOString(),
          endDate.toISOString()
        );
      } else {
        response = await salesAPI.getSalesByUserIdAndDateRange(
          user?.id,
          startDate.toISOString(),
          endDate.toISOString()
        );
      }
      
      setSales(response.data);
      setFilterMode('single');
    } catch (err) {
      setError('Failed to load sales for selected date');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    if (date) {
      fetchSalesByDate(date);
    } else {
      fetchTodaySales();
    }
  };

  const handleViewDetails = (sale) => {
    setSelectedSale(sale);
    setDetailDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailDialogOpen(false);
    setSelectedSale(null);
  };

  const clearFilters = () => {
    setSelectedDate('');
    setFilterMode('today');
    fetchTodaySales();
  };

  const handleDeleteSale = (sale) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;

    try {
      setDeleting(true);
      await salesAPI.delete(saleToDelete.id);
      
      // Remove the sale from the local state
      setSales(sales.filter(sale => sale.id !== saleToDelete.id));
      
      // Close the dialog
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
      
      // Show success message
      setError(null);
    } catch (err) {
      setError('Failed to delete sale: ' + (err.response?.data || err.message));
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteSale = () => {
    setDeleteDialogOpen(false);
    setSaleToDelete(null);
  };

  const handlePrintSale = (sale) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintContent(sale);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleEditSale = (sale) => {
    setSaleToEdit(sale);
    setEditDialogOpen(true);
  };

  const confirmEditSale = async () => {
    if (!saleToEdit) return;

    try {
      setEditing(true);
      // For now, just show a success message
      // In a real implementation, you would call the API to update the sale
      alert(`Sale #${saleToEdit.id} would be updated here.`);
      
      // Close the dialog
      setEditDialogOpen(false);
      setSaleToEdit(null);
      
      // Show success message
      setError(null);
    } catch (err) {
      setError('Failed to update sale: ' + (err.response?.data || err.message));
    } finally {
      setEditing(false);
    }
  };

  const cancelEditSale = () => {
    setEditDialogOpen(false);
    setSaleToEdit(null);
  };

  const generatePrintContent = (sale) => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - Sale #${sale.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .receipt-info { margin-bottom: 20px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th, .items-table td { border: 1px solid #000; padding: 8px; text-align: left; }
          .items-table th { background-color: #f0f0f0; }
          .total { font-weight: bold; font-size: 18px; text-align: right; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>PickNPay Store</h2>
          <p>Receipt</p>
        </div>
        
        <div class="receipt-info">
          <p><strong>Sale ID:</strong> #${sale.id}</p>
          <p><strong>Date:</strong> ${format(new Date(sale.saleDate), 'MMM dd, yyyy')}</p>
          <p><strong>Time:</strong> ${format(new Date(sale.saleDate), 'HH:mm:ss')}</p>
          <p><strong>Payment Method:</strong> ${sale.paymentMethod}</p>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.saleItems.map(item => `
              <tr>
                <td>${item.itemName || 'Quick Sale'}</td>
                <td>${item.quantity}</td>
                <td>€${item.unitPrice.toFixed(2)}</td>
                <td>€${item.totalPrice.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          <p>Total: €${sale.totalAmount.toFixed(2)}</p>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Printed on: ${currentDate} at ${currentTime}</p>
        </div>
      </body>
      </html>
    `;
  };

  const calculateTotalSales = () => {
    return sales.reduce((total, sale) => total + sale.totalAmount, 0);
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getDisplayTitle = () => {
    if (filterMode === 'today') {
      return `Today's Sales - ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`;
    } else if (filterMode === 'single' && selectedDate) {
      return `Sales for ${new Date(selectedDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`;
    }
    return 'Sales History';
  };

  const getUserDisplayName = (userId) => {
    // For now, just show the user ID. In a real app, you'd fetch user details
    return `User #${userId}`;
  };

  return (
    <div className="animate-fade-in-up">
      {/* Page Header */}
      <div className="page-header mb-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col">
              <h1 className="page-title">
                <i className="bi bi-clock-history me-3"></i>
                Sales History
              </h1>
              <p className="page-subtitle">Track and manage your sales records</p>
            </div>
            <div className="col-auto">
              <div className="d-flex align-items-center gap-3">
                <span className="badge bg-success fs-6 px-3 py-2">
                  <i className="bi bi-graph-up me-2"></i>
                  {sales.length} Sales
                </span>
                <span className="badge bg-primary fs-6 px-3 py-2">
                  <i className="bi bi-currency-euro me-2"></i>
                  €{calculateTotalSales().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4 animate-fade-in-down">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {/* Filter Section */}
        <Card className="mb-4 animate-fade-in-up">
          <Card.Header className="bg-gradient-primary text-white">
            <h5 className="mb-0">
              <i className="bi bi-calendar-range me-2"></i>
              View Sales
            </h5>
          </Card.Header>
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col xs={12} sm={6} md={4}>
              <Form.Group>
                <Form.Label>Select Date</Form.Label>
                <Form.Control
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  max={getCurrentDate()}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <div className="d-flex gap-2">
                <Button 
                  variant={filterMode === 'today' ? 'primary' : 'outline-primary'} 
                  onClick={fetchTodaySales}
                >
                  <i className="bi bi-calendar-day me-1"></i>
                  Today's Sales
                </Button>
                <Button variant="outline-secondary" onClick={clearFilters}>
                  <i className="bi bi-x-circle me-1"></i>
                  Clear
                </Button>
              </div>
            </Col>
            <Col xs={12} md={4}>
              <div className="alert alert-info mb-0">
                <i className="bi bi-info-circle me-2"></i>
                <small>
                  {isAdmin() 
                    ? "Showing all users' sales" 
                    : "Showing only your sales"
                  }
                </small>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Summary Section */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col xs={12} sm={6}>
              <h5 className="text-secondary mb-0">
                Total Sales: <strong>{sales.length}</strong>
              </h5>
            </Col>
            <Col xs={12} sm={6}>
              <h5 className="text-secondary mb-0">
                Total Amount: <strong>€{calculateTotalSales().toFixed(2)}</strong>
              </h5>
            </Col>
          </Row>
          <Row className="mt-2">
            <Col xs={12}>
              <div className="alert alert-info mb-0">
                <i className="bi bi-calendar-event me-2"></i>
                {getDisplayTitle()}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Sales Table */}
      <Card>
        <Card.Body className="p-0">
          <Table responsive>
            <thead>
              <tr>
                <th>Sale ID</th>
                <th>Date & Time</th>
                {isAdmin() && <th>User</th>}
                <th>Items</th>
                <th>Payment Method</th>
                <th className="text-end">Total Amount</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin() ? 7 : 6} className="text-center py-4">
                    <Spinner animation="border" />
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin() ? 7 : 6} className="text-center py-4 text-muted">
                    No sales found for the selected date
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>#{sale.id}</td>
                    <td>
                      {format(new Date(sale.saleDate), 'MMM dd, yyyy HH:mm')}
                    </td>
                    {isAdmin() && (
                      <td>
                        <Badge bg="secondary">
                          {getUserDisplayName(sale.userId)}
                        </Badge>
                      </td>
                    )}
                    <td>
                      <Badge bg="primary">{sale.saleItems.length} items</Badge>
                    </td>
                    <td>
                      <Badge bg={sale.paymentMethod === 'CASH' ? 'success' : 'info'}>
                        <i className={`bi bi-${sale.paymentMethod === 'CASH' ? 'cash-coin' : 'credit-card'} me-1`}></i>
                        {sale.paymentMethod}
                      </Badge>
                    </td>
                    <td className="text-end">
                      <strong>€{sale.totalAmount.toFixed(2)}</strong>
                    </td>
                    <td className="text-center">
                      <div className="d-flex gap-1 justify-content-center flex-wrap">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleViewDetails(sale)}
                          title="View Details"
                        >
                          <i className="bi bi-eye"></i>
                        </Button>
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => handlePrintSale(sale)}
                          title="Print Receipt"
                        >
                          <i className="bi bi-printer"></i>
                        </Button>
                        <Button
                          variant="outline-warning"
                          size="sm"
                          onClick={() => handleEditSale(sale)}
                          title="Edit Sale"
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteSale(sale)}
                          title="Delete Sale"
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Sale Details Modal */}
      <Modal show={detailDialogOpen} onHide={handleCloseDetails} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Sale Details - #{selectedSale?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSale && (
            <div>
              <Row className="mb-3">
                <Col xs={6}>
                  <small className="text-muted">Sale Date</small>
                  <p className="mb-0">
                    {format(new Date(selectedSale.saleDate), 'MMM dd, yyyy HH:mm')}
                  </p>
                </Col>
                <Col xs={6}>
                  <small className="text-muted">Payment Method</small>
                  <p className="mb-0">
                    <Badge bg={selectedSale.paymentMethod === 'CASH' ? 'success' : 'info'}>
                      <i className={`bi bi-${selectedSale.paymentMethod === 'CASH' ? 'cash-coin' : 'credit-card'} me-1`}></i>
                      {selectedSale.paymentMethod}
                    </Badge>
                  </p>
                </Col>
              </Row>
              
              {isAdmin() && (
                <Row className="mb-3">
                  <Col xs={12}>
                    <small className="text-muted">Sold By</small>
                    <p className="mb-0">
                      <Badge bg="secondary">
                        {getUserDisplayName(selectedSale.userId)}
                      </Badge>
                    </p>
                  </Col>
                </Row>
              )}
              
              <Row className="mb-3">
                <Col xs={12}>
                  <small className="text-muted">Total Amount</small>
                  <h4 className="text-secondary mb-0">
                    €{selectedSale.totalAmount.toFixed(2)}
                  </h4>
                </Col>
              </Row>

              <h6 className="mb-3">Items Sold</h6>
              
              {selectedSale.saleItems.map((item, index) => (
                <Accordion key={index} className="mb-2">
                  <Accordion.Item eventKey={index.toString()}>
                    <Accordion.Header>
                      <div className="d-flex justify-content-between w-100 me-3">
                        <span>{item.itemName}</span>
                        <span className="text-warning fw-bold">
                          €{item.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </Accordion.Header>
                    <Accordion.Body>
                      <Row>
                        <Col xs={6}>
                          <small className="text-muted">Barcode</small>
                          <p className="mb-0">{item.itemBarcode || 'N/A'}</p>
                        </Col>
                        <Col xs={3}>
                          <small className="text-muted">Quantity</small>
                          <p className="mb-0">{item.quantity}</p>
                        </Col>
                        <Col xs={3}>
                          <small className="text-muted">Unit Price</small>
                          <p className="mb-0">€{item.unitPrice.toFixed(2)}</p>
                        </Col>
                      </Row>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDetails}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={deleteDialogOpen} onHide={cancelDeleteSale} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Confirm Delete Sale
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {saleToDelete && (
            <div>
              <p className="mb-3">
                Are you sure you want to delete this sale? This action cannot be undone.
              </p>
              <div className="bg-light p-3 rounded">
                <Row>
                  <Col xs={6}>
                    <small className="text-muted">Sale ID</small>
                    <p className="mb-0 fw-bold">#{saleToDelete.id}</p>
                  </Col>
                  <Col xs={6}>
                    <small className="text-muted">Date</small>
                    <p className="mb-0">
                      {format(new Date(saleToDelete.saleDate), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </Col>
                </Row>
                <Row className="mt-2">
                  <Col xs={6}>
                    <small className="text-muted">Payment Method</small>
                    <p className="mb-0">
                      <Badge bg={saleToDelete.paymentMethod === 'CASH' ? 'success' : 'info'}>
                        {saleToDelete.paymentMethod}
                      </Badge>
                    </p>
                  </Col>
                  <Col xs={6}>
                    <small className="text-muted">Total Amount</small>
                    <p className="mb-0 fw-bold text-danger">
                      €{saleToDelete.totalAmount.toFixed(2)}
                    </p>
                  </Col>
                </Row>
              </div>
              <Alert variant="warning" className="mt-3 mb-0">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Note:</strong> This will also restore the stock quantities for any items in this sale.
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelDeleteSale} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteSale} disabled={deleting}>
            {deleting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              <>
                <i className="bi bi-trash me-2"></i>
                Delete Sale
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Sale Modal */}
      <Modal show={editDialogOpen} onHide={cancelEditSale} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="text-warning">
            <i className="bi bi-pencil me-2"></i>
            Edit Sale
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {saleToEdit && (
            <div>
              <p className="mb-3">
                Edit the details of this sale. Changes will be saved immediately.
              </p>
              <div className="bg-light p-3 rounded">
                <Row>
                  <Col xs={6}>
                    <small className="text-muted">Sale ID</small>
                    <p className="mb-0 fw-bold">#{saleToEdit.id}</p>
                  </Col>
                  <Col xs={6}>
                    <small className="text-muted">Date</small>
                    <p className="mb-0">
                      {format(new Date(saleToEdit.saleDate), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </Col>
                </Row>
                <Row className="mt-2">
                  <Col xs={6}>
                    <small className="text-muted">Payment Method</small>
                    <p className="mb-0">
                      <Badge bg={saleToEdit.paymentMethod === 'CASH' ? 'success' : 'info'}>
                        {saleToEdit.paymentMethod}
                      </Badge>
                    </p>
                  </Col>
                  <Col xs={6}>
                    <small className="text-muted">Total Amount</small>
                    <p className="mb-0 fw-bold text-success">
                      €{saleToEdit.totalAmount.toFixed(2)}
                    </p>
                  </Col>
                </Row>
              </div>
              <Alert variant="info" className="mt-3 mb-0">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Note:</strong> This is a simplified edit interface. In a full implementation, 
                you would be able to modify items, quantities, and payment methods.
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelEditSale} disabled={editing}>
            Cancel
          </Button>
          <Button variant="warning" onClick={confirmEditSale} disabled={editing}>
            {editing ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Updating...
              </>
            ) : (
              <>
                <i className="bi bi-pencil me-2"></i>
                Update Sale
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      </div>
    </div>
  );
};

export default SalesHistory;