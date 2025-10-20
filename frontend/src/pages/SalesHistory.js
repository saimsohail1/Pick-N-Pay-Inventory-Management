import React, { useState, useEffect, useMemo } from 'react';
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
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editSaleItems, setEditSaleItems] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const { user, isAdmin } = useAuth();

  // Memoize admin status to prevent unnecessary re-renders
  const isAdminUser = useMemo(() => isAdmin(), [isAdmin]);

  // Memoized calculations for edit modal to prevent performance issues
  const editCalculations = useMemo(() => {
    if (editSaleItems.length === 0) {
      return {
        subtotalExcludingVat: 0,
        totalVat: 0,
        totalAmount: 0
      };
    }

    const subtotalExcludingVat = editSaleItems.reduce((sum, item) => {
      const vatRate = item.vatRate || 23.00;
      const totalPriceExcludingVat = item.totalPrice / (1 + vatRate / 100);
      return sum + totalPriceExcludingVat;
    }, 0);

    const totalVat = editSaleItems.reduce((sum, item) => {
      const vatRate = item.vatRate || 23.00;
      const totalPriceExcludingVat = item.totalPrice / (1 + vatRate / 100);
      const vatAmount = item.totalPrice - totalPriceExcludingVat;
      return sum + vatAmount;
    }, 0);

    const totalAmount = editSaleItems.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      subtotalExcludingVat,
      totalVat,
      totalAmount
    };
  }, [editSaleItems]);

  useEffect(() => {
    fetchTodaySales();
  }, []);

  useEffect(() => {
    if (isAdminUser) {
      fetchUsers();
    }
  }, [user]);

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
      
      const currentUser = user;
      const currentSelectedUserId = selectedUserId;
      const isAdminUser = isAdmin();
      
      if (isAdminUser && currentSelectedUserId) {
        // Admin viewing specific user's sales
        const response = await salesAPI.getTodaySales(currentSelectedUserId, false);
        setSales(response.data);
      } else if (currentUser?.id) {
        // Regular user viewing their own sales
        const response = await salesAPI.getTodaySales(currentUser.id, false);
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

      const currentUser = user;
      const currentSelectedUserId = selectedUserId;
      const isAdminUser = isAdmin();

      let response;
      if (isAdminUser && currentSelectedUserId) {
        // Admin viewing specific user's sales for a date
        response = await salesAPI.getSalesByUserIdAndDateRange(
          currentSelectedUserId,
          startDate.toISOString(),
          endDate.toISOString()
        );
      } else if (currentUser?.id) {
        // Regular user viewing their own sales for a date
        response = await salesAPI.getSalesByUserIdAndDateRange(
          currentUser.id,
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


  const handleEditSale = (sale) => {
    setSaleToEdit(sale);
    setEditPaymentMethod(sale.paymentMethod);
    setEditSaleItems(sale.saleItems.map(item => ({ ...item })));
    setEditDialogOpen(true);
  };

  const handleDeleteSale = (sale) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };


  const handleDeleteItem = (index) => {
    const updatedItems = editSaleItems.filter((_, i) => i !== index);
    setEditSaleItems(updatedItems);
  };

  const confirmEditSale = async () => {
    if (!saleToEdit) return;
    
    // Validate data before sending
    if (editSaleItems.length === 0) {
      setError('Cannot save sale with no items. Please delete the entire sale instead.');
      return;
    }
    
    setEditing(true);
    try {
      // Create clean updated sale data - only send what's needed
      const updatedSaleData = {
        id: saleToEdit.id,
        paymentMethod: editPaymentMethod,
        userId: saleToEdit.userId,
        saleItems: editSaleItems.map(item => {
          // Recalculate VAT for each item
          const vatRate = item.vatRate || 23.00;
          const totalPriceIncludingVat = item.totalPrice;
          const totalPriceExcludingVat = totalPriceIncludingVat / (1 + vatRate / 100);
          const vatAmount = totalPriceIncludingVat - totalPriceExcludingVat;
          
          return {
            itemId: item.itemId,
            itemName: item.itemName,
            itemBarcode: item.itemBarcode,
            batchId: item.batchId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            vatRate: vatRate,
            vatAmount: vatAmount,
            priceExcludingVat: totalPriceExcludingVat
          };
        })
      };
      
      // Calculate new total amount
      updatedSaleData.totalAmount = editSaleItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      await salesAPI.update(saleToEdit.id, updatedSaleData);
      setError(null);
      setEditDialogOpen(false);
      setSaleToEdit(null);
      setEditSaleItems([]);
      // Refresh the sales list
      await fetchTodaySales();
    } catch (err) {
      setError('Failed to update sale: ' + (err.response?.data || err.message));
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
    setEditSaleItems([]);
    setEditPaymentMethod('');
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

  const handlePrintSale = (sale) => {
    // Create a printable receipt optimized for till paper
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - Sale #${sale.id}</title>
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
          .vat-info { margin: 5px 0; font-size: 10px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          .center { text-align: center; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="center"><strong>PICKNPAY</strong></div>
          <div class="center">Receipt #${sale.id}</div>
          <div class="center">${new Date(sale.saleDate).toLocaleString()}</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="items">
          ${sale.saleItems.map(item => `
            <div class="item">
              <span>${item.itemName}</span>
              <span>€${parseFloat(item.totalPrice).toFixed(2)}</span>
            </div>
            <div class="item" style="font-size: 10px; color: #666;">
              <span>${item.quantity} x €${parseFloat(item.unitPrice).toFixed(2)}</span>
              <span>${item.vatRate || 23}% VAT</span>
            </div>
          `).join('')}
        </div>
        
        <div class="divider"></div>
        
        <div class="vat-info">
          <div class="item">
            <span>Subtotal (Ex VAT):</span>
            <span>€${sale.saleItems.reduce((sum, item) => sum + parseFloat(item.priceExcludingVat || 0), 0).toFixed(2)}</span>
          </div>
          <div class="item">
            <span>Total VAT:</span>
            <span>€${sale.saleItems.reduce((sum, item) => sum + parseFloat(item.vatAmount || 0), 0).toFixed(2)}</span>
          </div>
        </div>
        
        <div class="total">
          <div class="item">
            <span><strong>TOTAL:</strong></span>
            <span><strong>€${parseFloat(sale.totalAmount).toFixed(2)}</strong></span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="footer">
          <div>Payment: ${sale.paymentMethod}</div>
          <div>Thank you for your business!</div>
          <div>---</div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    
    // Auto-print without dialog - optimized for till paper
    const printTimeout = setTimeout(() => {
      printWindow.print();
      // Close the window after printing
      const closeTimeout = setTimeout(() => {
        printWindow.close();
      }, 1000);
      
      // Store closeTimeout for potential cleanup
      printWindow._closeTimeout = closeTimeout;
    }, 100);
    
    // Store printTimeout for potential cleanup
    printWindow._printTimeout = printTimeout;
  };

  return (
    <div>
      <style>{`
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
          {isAdminUser && (
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
                <th>Sr No</th>
                <th>Hour</th>
                <th>Payment Methods</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale, index) => (
                <tr key={sale.id} className="table-row">
                  <td className="fw-bold">{index + 1}</td>
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
                      {isAdminUser && (
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
      <Modal show={editDialogOpen} onHide={cancelEditSale} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Sale #{saleToEdit?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {saleToEdit && (
            <div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Date:</strong> {format(new Date(saleToEdit.saleDate), 'dd/MM/yyyy HH:mm')}
                </div>
                <div className="col-md-6">
                  <label className="form-label"><strong>Payment Method:</strong></label>
                  <select 
                    className="form-select" 
                    value={editPaymentMethod} 
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
              </div>
              
              <h5>Sale Items:</h5>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>VAT Rate</th>
                    <th>VAT Amount</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {editSaleItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.itemName}</td>
                      <td>
                        <span className="fw-bold">{item.quantity}</span>
                      </td>
                      <td>
                        <span className="fw-bold">€{item.totalPrice.toFixed(2)}</span>
                      </td>
                      <td>{item.vatRate || 23}%</td>
                      <td>€{parseFloat(item.vatAmount || 0).toFixed(2)}</td>
                      <td>€{parseFloat(item.totalPrice).toFixed(2)}</td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteItem(index)}
                          title="Delete Item"
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              
              <div className="row">
                <div className="col-md-6">
                  <strong>Subtotal (Excluding VAT):</strong> €{editCalculations.subtotalExcludingVat.toFixed(2)}
                </div>
                <div className="col-md-6">
                  <strong>Total VAT:</strong> €{editCalculations.totalVat.toFixed(2)}
                </div>
              </div>
              <div className="mt-2">
                <strong>Total Amount:</strong> €{editCalculations.totalAmount.toFixed(2)}
              </div>
              
              <Alert variant="warning" className="mt-3">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Admin Only:</strong> You can only change the payment method and delete individual items. Quantities and prices are fixed.
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
          <Modal.Title>Delete Sale #{saleToDelete?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {saleToDelete && (
            <div>
              <p><strong>Are you sure you want to delete this sale?</strong></p>
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Date:</strong> {format(new Date(saleToDelete.saleDate), 'dd/MM/yyyy HH:mm')}
                </div>
                <div className="col-md-6">
                  <strong>Payment Method:</strong> {saleToDelete.paymentMethod}
                </div>
              </div>
              
              <div className="mb-3">
                <strong>Items:</strong>
                <ul className="list-unstyled mt-1">
                  {saleToDelete.saleItems.map((item, index) => (
                    <li key={index} className="ms-3">
                      • {item.itemName} x{item.quantity} = €{parseFloat(item.totalPrice).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="row">
                <div className="col-md-6">
                  <strong>Subtotal (Excluding VAT):</strong> €{saleToDelete.saleItems.reduce((sum, item) => sum + parseFloat(item.priceExcludingVat || 0), 0).toFixed(2)}
                </div>
                <div className="col-md-6">
                  <strong>Total VAT:</strong> €{saleToDelete.saleItems.reduce((sum, item) => sum + parseFloat(item.vatAmount || 0), 0).toFixed(2)}
                </div>
              </div>
              <div className="mt-2">
                <strong>Total Amount:</strong> €{parseFloat(saleToDelete.totalAmount).toFixed(2)}
              </div>
              
              <Alert variant="danger" className="mt-3">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Admin Only:</strong> This action cannot be undone. Once items are sold, they're gone from inventory.
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