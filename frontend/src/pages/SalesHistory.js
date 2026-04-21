import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Form, Alert, Modal, Spinner, Card } from "react-bootstrap";
import { format } from "date-fns";
import { salesAPI, usersAPI, companySettingsAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { directPrint, createReceiptHTML, createSalesHistoryHTML, printReceiptRaw } from '../utils/printUtils';

const SalesHistory = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use LOCAL date components, never UTC (toISOString would shift across DST).
  const todayLocalISO = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();
  const [selectedDate, setSelectedDate] = useState(todayLocalISO);
  const [selectedUserId, setSelectedUserId] = useState("");
  const isAdminUser = user?.role === "ADMIN";

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState(null);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [removingItem, setRemovingItem] = useState(false);
  const [companySettings, setCompanySettings] = useState({ companyName: "ADAMS GREEN", address: '' });

  // Payment method filter: "ALL" | "CASH" | "CARD"
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  // Admin-only multi-select / bulk delete
  const [selectedSaleIds, setSelectedSaleIds] = useState([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  // ✅ Safe fetch with cleanup - now properly filters by date and user
  const fetchSales = useCallback(async (date, userId) => {
    console.log("[SalesHistory] fetchSales start", { date, userId, isAdminUser });
      setLoading(true);
      setError(null);

    let isMounted = true;
    try {
      let response;

      // Build the day window as LOCAL wall-clock ISO (no timezone suffix).
      // The backend binds these to `LocalDateTime` (no TZ) and stores `sale_date`
      // as local wall-clock, so we MUST NOT go through UTC here — doing so
      // shifts the window by the offset (±1h in Irish summer / BST) and causes
      // Sales History to show the wrong day's transactions.
      // `date` arrives as "YYYY-MM-DD" from the <input type="date"> control.
      const startDateISO = `${date}T00:00:00.000`;
      const endDateISO = `${date}T23:59:59.999`;
      
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
        let salesData = Array.isArray(response) ? response : (response.data || []);
        
        // Ensure sales are sorted by date descending (most recent first)
        salesData = salesData.sort((a, b) => {
          const dateA = new Date(a.saleDate);
          const dateB = new Date(b.saleDate);
          return dateB - dateA; // Descending order (newest first)
        });
        
        // For normal users, limit to last 5 transactions (most recent)
        if (!isAdminUser && salesData.length > 5) {
          salesData = salesData.slice(0, 5);
        }
        
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

  // ✅ Fetch company settings on mount
  const fetchCompanySettings = async () => {
    try {
      const response = await companySettingsAPI.get();
      // Handle both response.data and direct response
      const settingsData = response.data || response;
      if (settingsData) {
        setCompanySettings({
          companyName: settingsData.companyName || "ADAMS GREEN",
          address: settingsData.address || ''
        });
      }
    } catch (err) {
      console.error("Failed to fetch company settings:", err);
      // Keep default values on error
    }
  };

  // ✅ Load users once for admin
  useEffect(() => {
    let isMounted = true;
    fetchCompanySettings();
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
      // Fetch latest company settings before printing
      let currentCompanySettings = companySettings;
      try {
        const response = await companySettingsAPI.get();
        const settingsData = response.data || response;
        if (settingsData) {
          currentCompanySettings = {
            companyName: settingsData.companyName || "ADAMS GREEN",
            address: settingsData.address || '',
            vatNumber: settingsData.vatNumber || '',
            phone: settingsData.phone || '',
            website: settingsData.website || '',
            eircode: settingsData.eircode || ''
          };
        }
    } catch (err) {
        console.error("Failed to fetch company settings for print:", err);
        // Use existing state if fetch fails
      }
      
      // ALWAYS use raw ESC/POS printing (bypasses print spooler - NO drawer opening)
      if (window.electron && window.electron.ipcRenderer) {
        try {
          console.log('🖨️ Printing receipt using raw ESC/POS (no drawer will open)');
          // Use logged-in user's name as cashier when printing from SalesHistory
          const cashierName = user?.username || null;
          await printReceiptRaw(
        sale, 
        currentCompanySettings.companyName, 
            currentCompanySettings.address,
            null, // printerName
            cashierName, // cashierName - overrides sale.user?.username
            currentCompanySettings.vatNumber,
            currentCompanySettings.phone, // phone
            currentCompanySettings.website, // website
            currentCompanySettings.eircode // eircode
          );
          return;
        } catch (rawPrintError) {
          console.error('❌ Raw ESC/POS print failed:', rawPrintError);
          alert(`Print failed: ${rawPrintError.message || 'Please check printer connection'}`);
          return;
        }
      } else {
        alert('Receipt printing is only available in Electron app');
      }
    } catch (error) {
      console.error('Print error:', error);
      alert('Printing failed. Please check your printer connection and allow popups for this site.');
    }
  };

  const formatTime = (date) => format(new Date(date), "HH:mm");

  // Derived: sales filtered by the selected payment method
  const displayedSales = Array.isArray(sales)
    ? (paymentFilter === "ALL"
        ? sales
        : sales.filter((s) => (s.paymentMethod || "").toUpperCase() === paymentFilter))
    : [];

  // Reset selection whenever the underlying list / filters change
  useEffect(() => {
    setSelectedSaleIds((prev) => prev.filter((id) => displayedSales.some((s) => s.id === id)));
  }, [sales, paymentFilter, selectedDate, selectedUserId]);

  const isSaleSelected = (id) => selectedSaleIds.includes(id);

  const toggleSaleSelection = (id) => {
    setSelectedSaleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allDisplayedSelected =
    displayedSales.length > 0 && displayedSales.every((s) => selectedSaleIds.includes(s.id));

  const toggleSelectAll = () => {
    if (allDisplayedSelected) {
      setSelectedSaleIds([]);
    } else {
      setSelectedSaleIds(displayedSales.map((s) => s.id));
    }
  };

  const openBulkDeleteDialog = () => {
    if (selectedSaleIds.length === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const cancelBulkDelete = () => {
    if (bulkDeleting) return;
    setBulkDeleteDialogOpen(false);
  };

  const confirmBulkDelete = async () => {
    if (selectedSaleIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        selectedSaleIds.map((id) => salesAPI.delete(id))
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        console.error("[SalesHistory] bulk delete partial failures", failed);
        setError(`Failed to delete ${failed.length} of ${selectedSaleIds.length} sales`);
      }
      setSelectedSaleIds([]);
      setBulkDeleteDialogOpen(false);
      await fetchSales(selectedDate, selectedUserId);
    } catch (err) {
      console.error("[SalesHistory] bulk delete failed", err);
      setError("Failed to delete selected sales");
    } finally {
      setBulkDeleting(false);
    }
  };

  const getPaymentMethodBadge = (method) => {
    if (!method) return "-";
    const isCash = method === 'CASH';
    return (
      <span 
        className={`badge px-3 py-2 rounded-pill fw-semibold`}
        style={{ fontSize: '0.85rem', backgroundColor: '#2a2a2a', color: '#ffffff' }}
      >
        <i className={`bi ${isCash ? 'bi-cash' : 'bi-credit-card'} me-1`}></i>
        {method}
      </span>
    );
  };

  return (
    <div style={{ backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
      <Card className="shadow-sm" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
        <Card.Header style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #333333', color: '#ffffff' }}>
          <h1 className="mb-0 fw-bold" style={{ color: '#ffffff', fontSize: '1.75rem' }}>
            <i className="bi bi-graph-up me-2" style={{ color: '#ffffff' }}></i>
            Sales History
          </h1>
        </Card.Header>
        <Card.Body className="p-0">
      {/* Filters */}
          <div className="p-3 border-bottom" style={{ backgroundColor: '#2a2a2a' }}>
              <div className="row g-3">
                {isAdminUser && (
                  <div className="col-md-4">
                    <label className="form-label fw-semibold" style={{ color: '#ffffff' }}>
                      <i className="bi bi-person me-1"></i>
                      Select User
                    </label>
                    <Form.Select
                      value={selectedUserId}
                      onChange={(e) => handleUserChange(e.target.value)}
                      className="form-select-lg"
                      style={{ borderRadius: '10px', backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
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
                    <label className="form-label fw-semibold" style={{ color: '#ffffff' }}>
                      <i className="bi bi-person me-1"></i>
                      User
                    </label>
                    <Form.Control
                      type="text"
                      value={user?.username || "Current User"}
                      className="form-control-lg"
                      style={{ borderRadius: '10px', backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
                      disabled
                    />
                  </div>
                )}
                <div className="col-md-4">
                  <label className="form-label fw-semibold" style={{ color: '#ffffff' }}>
                    <i className="bi bi-calendar3 me-1"></i>
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="form-control form-control-lg"
                    style={{ borderRadius: '10px', backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
                  />
          </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold" style={{ color: '#ffffff' }}>
                    <i className="bi bi-credit-card me-1"></i>
                    Payment Method
                  </label>
                  <Form.Select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="form-select-lg"
                    style={{ borderRadius: '10px', backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
                  >
                    <option value="ALL">All Payments</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                  </Form.Select>
                </div>
        </div>
      </div>

      {/* Error */}
          {error && <Alert variant="danger" className="m-3" style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>{error}</Alert>}

      {/* Loading */}
          {loading && <div className="text-center p-3"><Spinner animation="border" style={{ color: '#ffffff' }} /></div>}


      {/* No Sales Message */}
      {!loading && displayedSales.length === 0 && (
            <div className="text-center py-5" style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
              <i className="bi bi-inbox" style={{ fontSize: '4rem', color: '#aaaaaa' }}></i>
              <h5 className="mt-3 mb-2" style={{ color: '#aaaaaa' }}>No Sales Found</h5>
              <p className="mb-0" style={{ color: '#aaaaaa' }}>
              {sales.length === 0
                ? "No sales transactions found for the selected date and user."
                : `No ${paymentFilter === 'CASH' ? 'cash' : 'card'} transactions for the selected date and user.`}
            </p>
        </div>
      )}

      {/* Table */}
          <div className="p-3" style={{ backgroundColor: '#2a2a2a' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0" style={{ color: '#ffffff' }}>
              <i className="bi bi-list-ul me-2"></i>
              Sales Transactions
              {paymentFilter !== "ALL" && (
                <span className="ms-2 badge rounded-pill px-3 py-2 fw-semibold" style={{ backgroundColor: '#3a3a3a', color: '#ffffff', fontSize: '0.75rem' }}>
                  <i className={`bi ${paymentFilter === 'CASH' ? 'bi-cash' : 'bi-credit-card'} me-1`}></i>
                  {paymentFilter}
                </span>
              )}
            </h6>
              <div className="d-flex align-items-center gap-3">
                {isAdminUser && selectedSaleIds.length > 0 && (
                  <Button
                    onClick={openBulkDeleteDialog}
                    disabled={bulkDeleting}
                    style={{
                      backgroundColor: '#3a3a3a',
                      border: '1px solid #ffffff',
                      color: '#ffffff',
                      borderRadius: '8px'
                    }}
                  >
                    <i className="bi bi-trash me-1"></i>
                    Delete Selected ({selectedSaleIds.length})
                  </Button>
                )}
                <small style={{ color: '#aaaaaa' }}>
                  <i className="bi bi-calendar3 me-1"></i>
                  {formatDate(selectedDate)}
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
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                <tr>
                  {isAdminUser && (
                    <th className="border-0 py-3 px-4 fw-semibold text-center" style={{ color: '#ffffff', width: '50px' }}>
                      <Form.Check
                        type="checkbox"
                        checked={allDisplayedSelected}
                        onChange={toggleSelectAll}
                        disabled={displayedSales.length === 0}
                        title="Select all"
                      />
                    </th>
                  )}
                  <th className="border-0 py-3 px-4 fw-semibold" style={{ color: '#ffffff' }}>#</th>
                  <th className="border-0 py-3 px-4 fw-semibold" style={{ color: '#ffffff' }}>
                    <i className="bi bi-clock me-1"></i>
                    Time
                  </th>
                  <th className="border-0 py-3 px-4 fw-semibold" style={{ color: '#ffffff' }}>
                    <i className="bi bi-credit-card me-1"></i>
                    Payment
                  </th>
                  <th className="border-0 py-3 px-4 fw-semibold" style={{ color: '#ffffff' }}>
                    <i className="bi bi-currency-euro me-1"></i>
                    Total
                  </th>
                  <th className="border-0 py-3 px-4 fw-semibold" style={{ color: '#ffffff' }}>
                    <i className="bi bi-sticky me-1"></i>
                    Notes
                  </th>
                  <th className="border-0 py-3 px-4 fw-semibold text-center" style={{ color: '#ffffff' }}>
                    <i className="bi bi-gear me-1"></i>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedSales.map((sale, index) => (
                  <tr key={sale.id} className="border-bottom" style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                    {isAdminUser && (
                      <td className="py-3 px-4 text-center">
                        <Form.Check
                          type="checkbox"
                          checked={isSaleSelected(sale.id)}
                          onChange={() => toggleSaleSelection(sale.id)}
                          title="Select sale"
                        />
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <span className="badge rounded-pill px-3 py-2 fw-semibold" style={{ backgroundColor: '#3a3a3a', color: '#ffffff' }}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-clock me-2" style={{ color: '#aaaaaa' }}></i>
                        <span className="fw-medium" style={{ color: '#ffffff' }}>{formatTime(sale.saleDate)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{getPaymentMethodBadge(sale.paymentMethod)}</td>
                    <td className="py-3 px-4">
                      <span className="fw-bold fs-5" style={{ color: '#ffffff' }}>€{parseFloat(sale.totalAmount || 0).toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4">
                      {sale.notes ? (
                        <div className="d-flex align-items-start">
                          <i className="bi bi-sticky-fill me-2" style={{ color: '#ffffff', fontSize: '1.2rem', marginTop: '2px' }}></i>
                          <span className="fw-bold" style={{ color: '#ffffff', fontSize: '1rem', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{sale.notes}</span>
                        </div>
                      ) : (
                        <span className="text-muted" style={{ color: '#aaaaaa' }}>-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="btn-group" role="group">
                        {isAdminUser && (
                          <Button 
                            onClick={() => handleEditSale(sale)}
                            className="me-1"
                            style={{ 
                              width: '60px',
                              height: '60px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0',
                              backgroundColor: '#3a3a3a',
                              border: '1px solid #ffffff',
                              color: '#ffffff'
                            }}
                            title="Edit Sale"
                          >
                            <i className="bi bi-pencil" style={{ fontSize: '20px' }}></i>
                          </Button>
                        )}
                        <Button 
                          onClick={() => handlePrintSale(sale)}
                          className="me-1"
                          style={{ 
                            width: '60px',
                            height: '60px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0',
                            backgroundColor: '#3a3a3a',
                            border: '1px solid #ffffff',
                            color: '#ffffff'
                          }}
                          title="Print Receipt"
                        >
                          <i className="bi bi-printer" style={{ fontSize: '20px' }}></i>
                        </Button>
                        {isAdminUser && (
                          <Button 
                            onClick={() => handleDeleteSale(sale)}
                            style={{ 
                              width: '60px',
                              height: '60px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0',
                              backgroundColor: '#3a3a3a',
                              border: '1px solid #ffffff',
                              color: '#ffffff'
                            }}
                            title="Delete Sale"
                          >
                            <i className="bi bi-trash" style={{ fontSize: '20px' }}></i>
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
        </Card.Body>
      </Card>

      {/* Edit Modal */}
      <Modal show={editDialogOpen} onHide={cancelEditSale} size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', color: '#ffffff' }}>
          <Modal.Title style={{ color: '#ffffff' }}>
            <i className="bi bi-pencil-square me-2" style={{ color: '#ffffff' }}></i>
            Edit Sale #{saleToEdit?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          {saleToEdit && (
            <div>
              <div className="row mb-4">
                <div className="col-md-4">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-calendar3 me-2" style={{ color: '#ffffff' }}></i>
                    <strong style={{ color: '#ffffff' }}>Sale Date:</strong>
                  </div>
                  <p className="ms-4 mb-0" style={{ color: '#ffffff' }}>{formatDate(saleToEdit.saleDate)} {formatTime(saleToEdit.saleDate)}</p>
                </div>
                <div className="col-md-4">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-credit-card me-2" style={{ color: '#ffffff' }}></i>
                    <strong style={{ color: '#ffffff' }}>Payment Method:</strong>
                  </div>
                  <p className="ms-4 mb-0" style={{ color: '#ffffff' }}>{saleToEdit.paymentMethod}</p>
                </div>
                <div className="col-md-4">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-currency-euro me-2" style={{ color: '#ffffff' }}></i>
                    <strong style={{ color: '#ffffff' }}>Total Amount:</strong>
                  </div>
                  <p className="ms-4 mb-0 fw-bold fs-5" style={{ color: '#ffffff' }}>€{parseFloat(saleToEdit.totalAmount || 0).toFixed(2)}</p>
                </div>
              </div>
              
              {saleToEdit.notes && (
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="p-3 rounded" style={{ backgroundColor: '#3a3a3a', border: '2px solid #555555' }}>
                      <div className="d-flex align-items-center mb-2">
                        <i className="bi bi-sticky-fill me-2" style={{ color: '#ffffff', fontSize: '1.3rem' }}></i>
                        <strong style={{ color: '#ffffff', fontSize: '1.1rem' }}>Sale Notes:</strong>
                      </div>
                      <p className="mb-0 ms-4 fw-bold" style={{ color: '#ffffff', fontSize: '1.1rem', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{saleToEdit.notes}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="d-flex align-items-center mb-3">
                <i className="bi bi-list-ul me-2" style={{ color: '#ffffff' }}></i>
                <h6 className="mb-0" style={{ color: '#ffffff' }}>Items in this sale:</h6>
              </div>
              <div className="table-responsive">
                <Table striped hover size="sm">
                  <thead style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                    <tr>
                      <th className="border-0 py-3 px-4 fw-semibold" style={{ color: '#ffffff' }}>
                        <i className="bi bi-box me-1"></i>
                        Item
                      </th>
                      <th className="border-0 py-3 px-4 fw-semibold" style={{ color: '#ffffff' }}>
                        <i className="bi bi-hash me-1"></i>
                        Quantity
                      </th>
                      <th className="border-0 py-3 px-4 fw-semibold" style={{ color: '#ffffff' }}>
                        <i className="bi bi-tag me-1"></i>
                        Price
                      </th>
                      <th className="border-0 py-3 px-4 fw-semibold" style={{ color: '#ffffff' }}>
                        <i className="bi bi-currency-euro me-1"></i>
                        Total
                      </th>
                      <th className="border-0 py-3 px-4 fw-semibold text-center" style={{ color: '#ffffff' }}>
                        <i className="bi bi-gear me-1"></i>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(saleToEdit.saleItems) && saleToEdit.saleItems.map((item) => (
                      <tr key={item.id} className="border-bottom" style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                        <td className="py-3 px-4">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-box me-2" style={{ color: '#aaaaaa' }}></i>
                            <span className="fw-medium" style={{ color: '#ffffff' }}>{item.itemName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="badge rounded-pill px-3 py-2 fw-semibold" style={{ backgroundColor: '#3a3a3a', color: '#ffffff' }}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="fw-medium" style={{ color: '#ffffff' }}>€{parseFloat(item.unitPrice || 0).toFixed(2)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="fw-bold" style={{ color: '#ffffff' }}>€{parseFloat(item.totalPrice || 0).toFixed(2)}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
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
                              padding: '0',
                              backgroundColor: '#3a3a3a',
                              border: '1px solid #ffffff',
                              color: '#ffffff'
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
                <div className="text-center py-4" style={{ color: '#aaaaaa' }}>
                  <i className="bi bi-inbox fs-1 mb-3 d-block" style={{ color: '#aaaaaa' }}></i>
                  <p className="mb-0" style={{ color: '#aaaaaa' }}>No items in this sale</p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a' }}>
          <Button onClick={cancelEditSale} style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>
            <i className="bi bi-x-circle me-1"></i>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Modal */}
      <Modal show={deleteDialogOpen} onHide={cancelDeleteSale}>
        <Modal.Header closeButton style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', color: '#ffffff' }}>
          <Modal.Title style={{ color: '#ffffff' }}>Delete Sale</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          {saleToDelete && <div style={{ color: '#ffffff' }}>Delete sale #{saleToDelete.id}?</div>}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a' }}>
          <Button onClick={cancelDeleteSale} style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>Cancel</Button>
          <Button onClick={confirmDeleteSale} disabled={deleting} style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Delete Modal (admin only) */}
      <Modal show={bulkDeleteDialogOpen} onHide={cancelBulkDelete}>
        <Modal.Header closeButton style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', color: '#ffffff' }}>
          <Modal.Title style={{ color: '#ffffff' }}>
            <i className="bi bi-exclamation-triangle me-2"></i>
            Delete Selected Sales
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          <div style={{ color: '#ffffff' }}>
            Are you sure you want to delete <strong>{selectedSaleIds.length}</strong> selected sale{selectedSaleIds.length === 1 ? '' : 's'}?
            <div className="mt-2" style={{ color: '#aaaaaa', fontSize: '0.9rem' }}>
              This action cannot be undone.
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a' }}>
          <Button onClick={cancelBulkDelete} disabled={bulkDeleting} style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>
            Cancel
          </Button>
          <Button onClick={confirmBulkDelete} disabled={bulkDeleting} style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>
            {bulkDeleting ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Deleting...
              </>
            ) : (
              <>
                <i className="bi bi-trash me-1"></i>
                Delete {selectedSaleIds.length}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SalesHistory;
