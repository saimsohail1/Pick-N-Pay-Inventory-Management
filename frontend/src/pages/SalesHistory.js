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
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ✅ Safe fetch with cleanup
  const fetchSales = useCallback(async (date, userId) => {
    console.log("[SalesHistory] fetchSales start", { date, userId });
    setLoading(true);
    setError(null);

    let isMounted = true;
    try {
      const data = await salesAPI.getSales(date, userId);
      if (isMounted) {
        setSales(data);
        console.log("[SalesHistory] fetchSales success", data);
      }
    } catch (err) {
      if (isMounted) {
        console.error("[SalesHistory] fetchSales error", err);
        setError(err.message || "Failed to fetch sales");
      }
    } finally {
      if (isMounted) setLoading(false);
    }

    return () => {
      console.log("[SalesHistory] cleanup fetchSales");
      isMounted = false;
    };
  }, []);

  // ✅ Fetch sales when filters change
  useEffect(() => {
    const cleanup = fetchSales(selectedDate, selectedUserId);
    return cleanup; // cancel pending updates if unmounted
  }, [fetchSales, selectedDate, selectedUserId]);

  // ✅ Load users once for admin
  useEffect(() => {
    let isMounted = true;
    if (isAdminUser) {
      usersAPI
        .getUsers()
        .then((data) => {
          if (isMounted) setUsers(data);
        })
        .catch((err) => {
          if (isMounted) setError("Failed to fetch users");
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

  const confirmEditSale = async () => {
    if (!saleToEdit) return;
    setEditing(true);
    try {
      await salesAPI.updateSale(saleToEdit.id, saleToEdit);
      await fetchSales(selectedDate, selectedUserId);
      cancelEditSale();
    } catch (err) {
      console.error("Edit failed", err);
      setError("Failed to update sale");
    } finally {
      setEditing(false);
    }
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    setDeleting(true);
    try {
      await salesAPI.deleteSale(saleToDelete.id);
      await fetchSales(selectedDate, selectedUserId);
      cancelDeleteSale();
    } catch (err) {
      console.error("Delete failed", err);
      setError("Failed to delete sale");
    } finally {
      setDeleting(false);
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
            {users.map((u) => (
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
          {sales.map((sale, index) => (
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
      <Modal show={editDialogOpen} onHide={cancelEditSale}>
        <Modal.Header closeButton>Edit Sale</Modal.Header>
        <Modal.Body>
          {saleToEdit && <div>Editing sale #{saleToEdit.id}</div>}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={cancelEditSale}>Cancel</Button>
          <Button onClick={confirmEditSale} disabled={editing}>
            Save
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
