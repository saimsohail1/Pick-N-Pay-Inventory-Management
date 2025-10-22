import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Form, Alert, Modal, Spinner } from "react-bootstrap";
import { format } from "date-fns";
import { salesAPI, usersAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const SalesHistory = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedUserId, setSelectedUserId] = useState(user?.id || "");
  const isAdminUser = user?.role === "ADMIN";

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState(null);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [removingItem, setRemovingItem] = useState(false);

  // ✅ Safe fetch with cleanup
  const fetchSales = useCallback(async (date, userId) => {
    console.log("[SalesHistory] fetchSales start", { date, userId });
    setLoading(true);
    setError(null);

    let isMounted = true;
    try {
      const response = await salesAPI.getTodaySales(userId, isAdminUser);
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
  }, [isAdminUser]);

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

  const formatTime = (date) => format(new Date(date), "HH:mm");

  const getPaymentMethodBadge = (method) => {
    if (!method) return "-";
    return <span className="badge bg-info">{method}</span>;
  };

  return (
    <div className="p-4">
      <h2 className="mb-4 fw-bold text-primary">Sales History</h2>

      {/* Filters */}
      <div className="d-flex gap-3 align-items-end mb-4">
        {isAdminUser && (
          <Form.Select
            value={selectedUserId}
            onChange={(e) => handleUserChange(e.target.value)}
          >
            {Array.isArray(users) && users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </Form.Select>
        )}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <Button onClick={() => fetchSales(selectedDate, selectedUserId)}>
          Search
        </Button>
      </div>

      {/* Error */}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Loading */}
      {loading && <Spinner animation="border" />}

      {/* Table */}
      <Table hover>
        <thead>
          <tr>
            <th>#</th>
            <th>Hour</th>
            <th>Payment</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(sales) && sales.map((sale, index) => (
            <tr key={sale.id}>
              <td>{index + 1}</td>
              <td>{formatTime(sale.saleDate)}</td>
              <td>{getPaymentMethodBadge(sale.paymentMethod)}</td>
              <td>€{sale.totalAmount}</td>
              <td>
                <Button size="sm" onClick={() => handleEditSale(sale)}>
                  Edit
                </Button>{" "}
                <Button size="sm" onClick={() => handleDeleteSale(sale)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Edit Modal */}
      <Modal show={editDialogOpen} onHide={cancelEditSale} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Sale #{saleToEdit?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {saleToEdit && (
            <div>
              <div className="mb-3">
                <strong>Sale Date:</strong> {new Date(saleToEdit.saleDate).toLocaleString()}
              </div>
              <div className="mb-3">
                <strong>Payment Method:</strong> {saleToEdit.paymentMethod}
              </div>
              <div className="mb-3">
                <strong>Total Amount:</strong> €{saleToEdit.totalAmount}
              </div>
              
              <h6 className="mb-3">Items in this sale:</h6>
              <div className="table-responsive">
                <Table striped hover size="sm">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(saleToEdit.saleItems) && saleToEdit.saleItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.itemName}</td>
                        <td>{item.quantity}</td>
                        <td>€{item.unitPrice}</td>
                        <td>€{item.totalPrice}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleRemoveItem(saleToEdit.id, item.id)}
                            disabled={removingItem}
                          >
                            {removingItem ? <Spinner size="sm" /> : "Remove"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {Array.isArray(saleToEdit.saleItems) && saleToEdit.saleItems.length === 0 && (
                <div className="text-center text-muted py-3">
                  No items in this sale
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={cancelEditSale}>Close</Button>
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
