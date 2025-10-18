import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { format } from 'date-fns';
import { salesAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SalesHistory = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [barcodeFilter, setBarcodeFilter] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState(null);
  const [editing, setEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    fetchTodaySales();
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

  const fetchTodaySales = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isAdmin() && selectedUserId) {
        // Admin viewing specific user's sales
        const response = await salesAPI.getTodaySales(selectedUserId, false);
        setSales(response.data);
      } else {
        // Regular user viewing their own sales
        const response = await salesAPI.getTodaySales(user?.id, false);
      setSales(response.data);
      }
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
      endDate.setHours(23, 59, 59, 999);

      let response;
      if (isAdmin() && selectedUserId) {
        // Admin viewing specific user's sales for a date
        response = await salesAPI.getSalesByUserIdAndDateRange(
          selectedUserId,
          startDate.toISOString(),
          endDate.toISOString()
        );
      } else {
        // Regular user viewing their own sales for a date
        response = await salesAPI.getSalesByUserIdAndDateRange(
          user?.id,
        startDate.toISOString(),
        endDate.toISOString()
      );
      }
      
      setSales(response.data);
    } catch (err) {
      setError('Failed to load sales for selected date');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (selectedDate) {
      fetchSalesByDate(selectedDate);
    } else {
      fetchTodaySales();
    }
  };

  const handleUserChange = (userId) => {
    setSelectedUserId(userId);
    // Refresh data when user selection changes
    if (selectedDate) {
      fetchSalesByDate(selectedDate);
    } else {
      fetchTodaySales();
    }
  };

  const handlePrintSale = (sale) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Sale Receipt - ${sale.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .sale-info { margin-bottom: 20px; }
            .items { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; font-size: 1.2em; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>PickNPay</h2>
            <h3>Sale Receipt</h3>
          </div>
          <div class="sale-info">
            <p><strong>Sale ID:</strong> ${sale.id}</p>
            <p><strong>Date:</strong> ${format(new Date(sale.saleDate), 'dd/MM/yyyy HH:mm')}</p>
            <p><strong>Payment Method:</strong> ${sale.paymentMethod}</p>
          </div>
          <div class="items">
            <table>
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
                    <td>${item.itemName}</td>
                    <td>${item.quantity}</td>
                    <td>€${item.unitPrice.toFixed(2)}</td>
                    <td>€${item.totalPrice.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="total">
            <p><strong>Total: €${sale.totalAmount.toFixed(2)}</strong></p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleEditSale = (sale) => {
    setSaleToEdit(sale);
    setEditDialogOpen(true);
  };

  const handleDeleteSale = (sale) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const confirmEditSale = async () => {
    if (!saleToEdit) return;
    
    setEditing(true);
    try {
      // For now, we'll just show a success message
      // The actual edit functionality would require a form to modify sale details
      // await salesAPI.update(saleToEdit.id, updatedSaleData);
      setError(null);
      setEditDialogOpen(false);
      setSaleToEdit(null);
      // Refresh the sales list
      await fetchTodaySales();
    } catch (err) {
      setError('Failed to update sale');
    } finally {
      setEditing(false);
    }
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;

    setDeleting(true);
    try {
      await salesAPI.delete(saleToDelete.id);
      setError(null);
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
      // Refresh the sales list
      await fetchTodaySales();
    } catch (err) {
      setError('Failed to delete sale');
    } finally {
      setDeleting(false);
    }
  };

  const cancelEditSale = () => {
    setEditDialogOpen(false);
    setSaleToEdit(null);
  };

  const cancelDeleteSale = () => {
    setDeleteDialogOpen(false);
    setSaleToDelete(null);
  };

  const formatTime = (dateString) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const getPaymentMethodBadge = (paymentMethod) => {
    if (paymentMethod === 'CASH') {
      return <Badge bg="success">cash</Badge>;
    } else if (paymentMethod === 'CARD') {
      return <Badge bg="primary">card</Badge>;
    }
    return <Badge bg="secondary">{paymentMethod}</Badge>;
  };

  return (
    <div>
      <style jsx>{`
        .date-input {
          width: 120px;
          border: 1px solid #ccc;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .barcode-input {
          width: 150px;
          border: 1px solid #ccc;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .table-row:hover {
          background-color: #f8f9fa;
        }
      `}</style>

      {/* Main Content */}
      <div className="p-4">
        {/* Title */}
        <div className="mb-4">
          <h2 className="mb-0 fw-bold text-primary">Sales History</h2>
        </div>

        {/* Sales Count Tab */}
        <div className="mb-4">
          <Badge bg="primary" className="px-3 py-2" style={{ fontSize: '0.9rem' }}>
            {sales.length} Sales
          </Badge>
      </div>

        {/* Filters */}
        <div className="d-flex gap-3 align-items-end mb-4">
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
            <Form.Label className="small fw-bold">Date</Form.Label>
            <div className="d-flex align-items-center">
              <input
                    type="date"
                className="date-input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
              <i className="bi bi-calendar ms-2"></i>
            </div>
                </div>
          <div>
            <Form.Label className="small fw-bold">Barcode</Form.Label>
            <input
              type="text"
              className="barcode-input"
              placeholder="Enter barcode"
              value={barcodeFilter}
              onChange={(e) => setBarcodeFilter(e.target.value)}
            />
                </div>
          <Button 
            variant="primary" 
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-search me-2"></i>}
            SEARCH
                  </Button>
                </div>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

      {/* Sales Table */}
        <div className="bg-white rounded shadow-sm">
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Id</th>
                <th>Hour</th>
                <th>Payment Methods</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="table-row">
                  <td className="fw-bold">{sale.id}</td>
                  <td>
                    <i className="bi bi-clock me-1"></i>
                    {formatTime(sale.saleDate)}
                  </td>
                  <td>{getPaymentMethodBadge(sale.paymentMethod)}</td>
                  <td className="fw-bold">€ {parseFloat(sale.totalAmount).toFixed(2)}</td>
                  <td>
                    <div className="d-flex gap-1">
                        <Button
                          variant="outline-primary"
                          size="sm"
                        onClick={() => handlePrintSale(sale)}
                        title="Print Receipt"
                      >
                        <i className="bi bi-printer"></i>
                      </Button>
                      {isAdmin() && (
                        <>
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
                        </>
                      )}
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </Table>
          
          {sales.length === 0 && !loading && (
            <div className="text-center py-5">
              <i className="bi bi-receipt fs-1 text-muted mb-3"></i>
              <h5 className="text-muted">No Sales Found</h5>
              <p className="text-muted">No sales found for the selected criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Sale Modal */}
      <Modal show={editDialogOpen} onHide={cancelEditSale}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Sale</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {saleToEdit && (
            <div>
              <p><strong>Sale ID:</strong> {saleToEdit.id}</p>
              <p><strong>Date:</strong> {format(new Date(saleToEdit.saleDate), 'dd/MM/yyyy HH:mm')}</p>
              <p><strong>Payment Method:</strong> {saleToEdit.paymentMethod}</p>
              <p><strong>Total Amount:</strong> €{parseFloat(saleToEdit.totalAmount).toFixed(2)}</p>
              <Alert variant="info">
                Edit functionality will be implemented in the next version.
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelEditSale}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmEditSale} disabled={editing}>
            {editing ? <Spinner animation="border" size="sm" className="me-2" /> : null}
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Sale Modal */}
      <Modal show={deleteDialogOpen} onHide={cancelDeleteSale}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Sale</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {saleToDelete && (
            <div>
              <p>Are you sure you want to delete this sale?</p>
              <p><strong>Sale ID:</strong> {saleToDelete.id}</p>
              <p><strong>Date:</strong> {format(new Date(saleToDelete.saleDate), 'dd/MM/yyyy HH:mm')}</p>
              <p><strong>Total Amount:</strong> €{parseFloat(saleToDelete.totalAmount).toFixed(2)}</p>
              <Alert variant="warning">
                This action cannot be undone.
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelDeleteSale}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteSale} disabled={deleting}>
            {deleting ? <Spinner animation="border" size="sm" className="me-2" /> : null}
                Delete Sale
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SalesHistory;