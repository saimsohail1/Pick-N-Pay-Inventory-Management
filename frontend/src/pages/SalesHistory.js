import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Form, Alert, Modal, Spinner } from "react-bootstrap";
import { format } from "date-fns";
import { salesAPI, usersAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { directPrint, createReceiptHTML } from '../utils/printUtils';

const SalesHistory = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const isAdminUser = user?.role === "ADMIN";

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState(null);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [removingItem, setRemovingItem] = useState(false);

  // ✅ Safe fetch with cleanup - now properly filters by date and user
  const fetchSales = useCallback(async (date, userId) => {
    console.log("[SalesHistory] fetchSales start", { date, userId, isAdminUser });
      setLoading(true);
      setError(null);

    let isMounted = true;
    try {
      let response;
      
      // Create date range for the selected date (start and end of day)
      const selectedDate = new Date(date);
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
      
      const startDateISO = startDate.toISOString();
      const endDateISO = endDate.toISOString();
      
      if (isAdminUser && userId && userId !== "") {
        // Admin viewing specific user's sales for selected date
        response = await salesAPI.getSalesByUserIdAndDateRange(userId, startDateISO, endDateISO);
      } else if (isAdminUser && (!userId || userId === "")) {
        // Admin viewing all users' sales for selected date
        response = await salesAPI.getSalesByDateRangeForAdmin(startDateISO, endDateISO);
      } else {
        // Regular user viewing their own sales for selected date
        response = await salesAPI.getSalesByUserIdAndDateRange(user?.id, startDateISO, endDateISO);
      }
      
      if (isMounted) {
        // Handle both direct array and response.data structure
        const salesData = Array.isArray(response) ? response : (response.data || []);
        setSales(salesData);
        console.log("[SalesHistory] fetchSales success", salesData);
      }
    } catch (err) {
      if (isMounted) {
        console.error("[SalesHistory] fetchSales error", err);
        setError(err.message || "Failed to fetch sales");
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }, [isAdminUser, user?.id]);

  // ✅ Fetch sales when filters change
  useEffect(() => {
    fetchSales(selectedDate, selectedUserId);
  }, [fetchSales, selectedDate, selectedUserId]);

  // ✅ Load users once for admin
  useEffect(() => {
    let isMounted = true;
    if (isAdminUser) {
      usersAPI
        .getAll()
        .then((response) => {
          if (isMounted) {
            // Handle both direct array and response.data structure
            const usersData = Array.isArray(response) ? response : (response.data || []);
            setUsers(usersData);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error("Failed to fetch users:", err);
            setError("Failed to fetch users");
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isAdminUser]);

  // ✅ Clean modal state when leaving the page
  useEffect(() => {
    return () => {
      console.log("[SalesHistory] cleanup modals");
      setEditDialogOpen(false);
      setDeleteDialogOpen(false);
      setSaleToEdit(null);
      setSaleToDelete(null);
    };
  }, []);

  // --- Handlers ---
  const handleUserChange = (id) => {
    setSelectedUserId(id);
  };

  const handleEditSale = (sale) => {
    console.log("[SalesHistory] handleEditSale", sale);
    setSaleToEdit(sale);
    setEditDialogOpen(true);
  };

  const handleDeleteSale = (sale) => {
    console.log("[SalesHistory] handleDeleteSale", sale);
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const cancelEditSale = () => {
    setSaleToEdit(null);
    setEditDialogOpen(false);
  };

  const cancelDeleteSale = () => {
    setSaleToDelete(null);
    setDeleteDialogOpen(false);
  };


  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    setDeleting(true);
    try {
      await salesAPI.delete(saleToDelete.id);
      await fetchSales(selectedDate, selectedUserId);
      cancelDeleteSale();
    } catch (err) {
      console.error("Delete failed", err);
      setError("Failed to delete sale");
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveItem = async (saleId, itemId) => {
    if (!saleToEdit || saleToEdit.id !== saleId) return;
    
    setRemovingItem(true);
    try {
      // Create updated sale with item removed
      const updatedSale = {
        ...saleToEdit,
        saleItems: saleToEdit.saleItems.filter(item => item.id !== itemId),
        totalAmount: saleToEdit.saleItems
          .filter(item => item.id !== itemId)
          .reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)
      };
      
      await salesAPI.update(saleId, updatedSale);
      await fetchSales(selectedDate, selectedUserId);
      
      // Update the sale in edit dialog
      setSaleToEdit(updatedSale);
    } catch (err) {
      console.error("Remove item failed", err);
      setError("Failed to remove item");
    } finally {
      setRemovingItem(false);
    }
  };

  const handlePrintSale = async (sale) => {
    try {
      const companyName = 'PickNPay';
      const receiptContent = createReceiptHTML(sale, companyName);
      try {
        await directPrint(receiptContent, `Receipt - Sale #${sale.id}`);
      } catch (printError) {
        console.log('Direct print failed, trying Safari-compatible method');
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        if (printWindow) {
          printWindow.document.write(receiptContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
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

  const formatTime = (date) => format(new Date(date), "HH:mm");

  const getPaymentMethodBadge = (method) => {
    if (!method) return "-";
    const isCash = method === 'CASH';
    return (
      <span 
        className={`badge ${isCash ? 'bg-success' : 'bg-primary'} px-3 py-2 rounded-pill fw-semibold`}
        style={{ fontSize: '0.85rem' }}
      >
        <i className={`bi ${isCash ? 'bi-cash' : 'bi-credit-card'} me-1`}></i>
        {method}
      </span>
    );
  };

  return (
    <div className="p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div className="d-flex align-items-center mb-4">
        <div className="bg-primary rounded-circle p-3 me-3">
          <i className="bi bi-graph-up text-white fs-4"></i>
        </div>
        <div>
          <h2 className="mb-0 fw-bold text-primary">Sales History</h2>
          <p className="text-muted mb-0">View and manage your sales transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h6 className="card-title text-muted mb-3">
                <i className="bi bi-funnel me-2"></i>
                Filter Sales
              </h6>
              <div className="row g-3">
                {isAdminUser && (
                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-dark">
                      <i className="bi bi-person me-1"></i>
                      Select User
                    </label>
                    <Form.Select
                      value={selectedUserId}
                      onChange={(e) => handleUserChange(e.target.value)}
                      className="form-select-lg border-2"
                      style={{ borderRadius: '10px' }}
                    >
                      <option value="">All Users</option>
                      {Array.isArray(users) && users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                )}
                {!isAdminUser && (
                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-dark">
                      <i className="bi bi-person me-1"></i>
                      User
                    </label>
                    <Form.Control
                      type="text"
                      value={user?.username || "Current User"}
                      className="form-control-lg border-2"
                      style={{ borderRadius: '10px' }}
                      disabled
                    />
                  </div>
                )}
                <div className="col-md-4">
                  <label className="form-label fw-semibold text-dark">
                    <i className="bi bi-calendar3 me-1"></i>
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="form-control form-control-lg border-2"
                    style={{ borderRadius: '10px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Loading */}
      {loading && <Spinner animation="border" />}


      {/* No Sales Message */}
      {!loading && sales.length === 0 && (
        <div className="card shadow-sm border-0">
          <div className="card-body text-center py-5">
            <i className="bi bi-inbox text-muted" style={{ fontSize: '4rem' }}></i>
            <h5 className="text-muted mt-3 mb-2">No Sales Found</h5>
            <p className="text-muted mb-0">
              No sales transactions found for the selected date and user.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white border-0 pb-0">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="card-title text-muted mb-0">
              <i className="bi bi-list-ul me-2"></i>
              Sales Transactions
            </h6>
            <div className="text-end">
              <small className="text-muted">
                <i className="bi bi-calendar3 me-1"></i>
                {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                {isAdminUser && selectedUserId && (
                  <span className="ms-2">
                    <i className="bi bi-person me-1"></i>
                    {users.find(u => u.id == selectedUserId)?.username || 'Selected User'}
                  </span>
                )}
                {isAdminUser && !selectedUserId && (
                  <span className="ms-2">
                    <i className="bi bi-people me-1"></i>
                    All Users
                  </span>
                )}
              </small>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th className="border-0 py-3 px-4 fw-semibold text-dark">#</th>
                  <th className="border-0 py-3 px-4 fw-semibold text-dark">
                    <i className="bi bi-clock me-1"></i>
                    Time
                  </th>
                  <th className="border-0 py-3 px-4 fw-semibold text-dark">
                    <i className="bi bi-credit-card me-1"></i>
                    Payment
                  </th>
                  <th className="border-0 py-3 px-4 fw-semibold text-dark">
                    <i className="bi bi-currency-euro me-1"></i>
                    Total
                  </th>
                  <th className="border-0 py-3 px-4 fw-semibold text-dark text-center">
                    <i className="bi bi-gear me-1"></i>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(sales) && sales.map((sale, index) => (
                  <tr key={sale.id} className="border-bottom">
                    <td className="py-3 px-4">
                      <span className="badge bg-light text-dark rounded-pill px-3 py-2 fw-semibold">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-clock text-muted me-2"></i>
                        <span className="fw-medium">{formatTime(sale.saleDate)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{getPaymentMethodBadge(sale.paymentMethod)}</td>
                    <td className="py-3 px-4">
                      <span className="fw-bold text-success fs-5">€{sale.totalAmount}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="btn-group" role="group">
                        {isAdminUser && (
                          <Button 
                            size="sm" 
                            onClick={() => handleEditSale(sale)}
                            className="btn btn-light me-1"
                            style={{ 
                              borderRadius: '8px',
                              borderWidth: '2px',
                              borderColor: '#007bff',
                              width: '45px',
                              height: '45px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0',
                              backgroundColor: '#f8f9fa'
                            }}
                            title="Edit Sale"
                          >
                            <i className="bi bi-pencil text-primary" style={{ fontSize: '16px' }}></i>
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          onClick={() => handlePrintSale(sale)}
                          className="btn btn-light me-1"
                          style={{ 
                            borderRadius: '8px',
                            borderWidth: '2px',
                            borderColor: '#28a745',
                            width: '45px',
                            height: '45px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0',
                            backgroundColor: '#f8f9fa'
                          }}
                          title="Print Receipt"
                        >
                          <i className="bi bi-printer text-success" style={{ fontSize: '16px' }}></i>
                        </Button>
                        {isAdminUser && (
                          <Button 
                            size="sm" 
                            onClick={() => handleDeleteSale(sale)}
                            className="btn btn-light"
                            style={{ 
                              borderRadius: '8px',
                              borderWidth: '2px',
                              borderColor: '#dc3545',
                              width: '45px',
                              height: '45px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0',
                              backgroundColor: '#f8f9fa'
                            }}
                            title="Delete Sale"
                          >
                            <i className="bi bi-trash text-danger" style={{ fontSize: '16px' }}></i>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal show={editDialogOpen} onHide={cancelEditSale} size="lg">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-pencil-square me-2"></i>
            Edit Sale #{saleToEdit?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {saleToEdit && (
            <div>
              <div className="row mb-4">
                <div className="col-md-4">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-calendar3 text-primary me-2"></i>
                    <strong>Sale Date:</strong>
                  </div>
                  <p className="ms-4 mb-0">{new Date(saleToEdit.saleDate).toLocaleString()}</p>
                </div>
                <div className="col-md-4">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-credit-card text-primary me-2"></i>
                    <strong>Payment Method:</strong>
                  </div>
                  <p className="ms-4 mb-0">{saleToEdit.paymentMethod}</p>
                </div>
                <div className="col-md-4">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-currency-euro text-primary me-2"></i>
                    <strong>Total Amount:</strong>
                  </div>
                  <p className="ms-4 mb-0 fw-bold text-success fs-5">€{saleToEdit.totalAmount}</p>
                </div>
              </div>
              
              <div className="d-flex align-items-center mb-3">
                <i className="bi bi-list-ul text-primary me-2"></i>
                <h6 className="mb-0">Items in this sale:</h6>
              </div>
              <div className="table-responsive">
                <Table striped hover size="sm">
                  <thead className="table-light">
                    <tr>
                      <th className="border-0 py-3 px-4 fw-semibold text-dark">
                        <i className="bi bi-box me-1"></i>
                        Item
                      </th>
                      <th className="border-0 py-3 px-4 fw-semibold text-dark">
                        <i className="bi bi-hash me-1"></i>
                        Quantity
                      </th>
                      <th className="border-0 py-3 px-4 fw-semibold text-dark">
                        <i className="bi bi-tag me-1"></i>
                        Price
                      </th>
                      <th className="border-0 py-3 px-4 fw-semibold text-dark">
                        <i className="bi bi-currency-euro me-1"></i>
                        Total
                      </th>
                      <th className="border-0 py-3 px-4 fw-semibold text-dark text-center">
                        <i className="bi bi-gear me-1"></i>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(saleToEdit.saleItems) && saleToEdit.saleItems.map((item) => (
                      <tr key={item.id} className="border-bottom">
                        <td className="py-3 px-4">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-box text-muted me-2"></i>
                            <span className="fw-medium">{item.itemName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="badge bg-light text-dark rounded-pill px-3 py-2 fw-semibold">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="fw-medium">€{item.unitPrice}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="fw-bold text-success">€{item.totalPrice}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleRemoveItem(saleToEdit.id, item.id)}
                            disabled={removingItem}
                            style={{ 
                              borderRadius: '8px',
                              borderWidth: '2px',
                              width: '40px',
                              height: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0'
                            }}
                            title="Remove Item"
                          >
                            {removingItem ? (
                              <Spinner size="sm" />
                            ) : (
                              <i className="bi bi-trash" style={{ fontSize: '14px' }}></i>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {Array.isArray(saleToEdit.saleItems) && saleToEdit.saleItems.length === 0 && (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
                  <p className="mb-0">No items in this sale</p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button onClick={cancelEditSale} variant="secondary">
            <i className="bi bi-x-circle me-1"></i>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Modal */}
      <Modal show={deleteDialogOpen} onHide={cancelDeleteSale}>
        <Modal.Header closeButton>Delete Sale</Modal.Header>
        <Modal.Body>
          {saleToDelete && <div>Delete sale #{saleToDelete.id}?</div>}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={cancelDeleteSale}>Cancel</Button>
          <Button onClick={confirmDeleteSale} disabled={deleting}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SalesHistory;
