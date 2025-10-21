import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Form, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { format } from 'date-fns';
import { salesAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { printWithElectron, createReceiptHTML } from '../utils/printUtils';

const SalesHistory = () => {
  console.log("Rendering SalesHistory component...");

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

  const isAdminUser = useMemo(() => {
    console.log("Checking admin user:", user, "isAdmin:", isAdmin());
    return isAdmin();
  }, [user]);

  const editCalculations = useMemo(() => {
    console.log("Recomputing editCalculations with items:", editSaleItems);
    if (editSaleItems.length === 0) return { subtotalExcludingVat: 0, totalVat: 0, totalAmount: 0 };

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

    return { subtotalExcludingVat, totalVat, totalAmount };
  }, [editSaleItems]);

  const deleteCalculations = useMemo(() => {
    console.log("Recomputing deleteCalculations with sale:", saleToDelete);
    if (!saleToDelete) return { subtotalExcludingVat: 0, totalVat: 0, totalAmount: 0 };

    const subtotalExcludingVat = saleToDelete.saleItems.reduce((sum, item) => sum + parseFloat(item.priceExcludingVat || 0), 0);
    const totalVat = saleToDelete.saleItems.reduce((sum, item) => sum + parseFloat(item.vatAmount || 0), 0);
    const totalAmount = parseFloat(saleToDelete.totalAmount);

    return { subtotalExcludingVat, totalVat, totalAmount };
  }, [saleToDelete]);

  useEffect(() => {
    console.log("useEffect: Initial fetch today sales...");
    fetchTodaySales();
  }, []);

  useEffect(() => {
    console.log("useEffect: Fetch users when admin changes. user:", user);
    if (isAdminUser) fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    console.log("Fetching users...");
    try {
      const response = await usersAPI.getAll();
      console.log("Users fetched:", response.data);
      setUsers(response.data);
      const adminUser = response.data.find(u => u.role === 'ADMIN');
      if (adminUser) {
        console.log("Defaulting selectedUserId to admin:", adminUser.id);
        setSelectedUserId(adminUser.id);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const fetchSales = async (date) => {
    console.log("Fetching sales for date:", date, "selectedUserId:", selectedUserId, "user:", user);
    try {
      setLoading(true);
      setError(null);
      
      const startDate = date ? new Date(date) : null;
      const endDate = date ? new Date(date) : null;
      if (endDate) endDate.setHours(23, 59, 59, 999);

      let response;
      if (isAdminUser && selectedUserId) {
        response = startDate 
          ? await salesAPI.getSalesByUserIdAndDateRange(selectedUserId, startDate.toISOString(), endDate.toISOString())
          : await salesAPI.getTodaySales(selectedUserId, false);
      } else if (user?.id) {
        response = startDate
          ? await salesAPI.getSalesByUserIdAndDateRange(user.id, startDate.toISOString(), endDate.toISOString())
          : await salesAPI.getTodaySales(user.id, false);
      }

      console.log("Sales response:", response?.data);
      setSales(response?.data || []);
    } catch (err) {
      console.error("Failed to load sales:", err);
      setError("Failed to load sales");
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaySales = () => fetchSales(null);

  const handleSearch = () => {
    console.log("Search clicked. Date:", selectedDate);
    fetchSales(selectedDate);
  };

  const handleUserChange = (userId) => {
    console.log("User changed:", userId);
    setSelectedUserId(userId);
    fetchSales(selectedDate);
  };

  const handleEditSale = (sale) => {
    console.log("Opening edit modal for sale:", sale);
    setSaleToEdit(sale);
    setEditPaymentMethod(sale.paymentMethod);
    setEditSaleItems(sale.saleItems.map(item => ({ ...item })));
    setEditDialogOpen(true);
  };

  const handleDeleteSale = (sale) => {
    console.log("Opening delete modal for sale:", sale);
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const handleDeleteItem = (index) => {
    console.log("Deleting item at index:", index);
    const updatedItems = editSaleItems.filter((_, i) => i !== index);
    setEditSaleItems(updatedItems);
  };

  const confirmEditSale = async () => {
    if (!saleToEdit) return;
    console.log("Confirm edit sale:", saleToEdit);

    setEditing(true);
    try {
      const updatedSaleData = {
        id: saleToEdit.id,
        paymentMethod: editPaymentMethod,
        userId: saleToEdit.userId,
        saleItems: editSaleItems.map(item => {
          const vatRate = item.vatRate || 23.00;
          const totalPriceIncludingVat = item.totalPrice;
          const totalPriceExcludingVat = totalPriceIncludingVat / (1 + vatRate / 100);
          const vatAmount = totalPriceIncludingVat - totalPriceExcludingVat;
          return { ...item, vatRate, vatAmount, priceExcludingVat: totalPriceExcludingVat };
        })
      };
      updatedSaleData.totalAmount = editSaleItems.reduce((sum, item) => sum + item.totalPrice, 0);

      console.log("Sending update payload:", updatedSaleData);
      const res = await salesAPI.update(saleToEdit.id, updatedSaleData);
      console.log("Update response:", res);

      setEditDialogOpen(false);
      setSaleToEdit(null);
      setEditSaleItems([]);
      await fetchSales(selectedDate);

    } catch (err) {
      console.error("Update failed:", err);
      setError("Failed to update sale: " + (err.response?.data || err.message));
    } finally {
      setEditing(false);
    }
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    console.log("Confirm delete sale:", saleToDelete);

    setDeleting(true);
    try {
      const res = await salesAPI.delete(saleToDelete.id);
      console.log("Delete response:", res);

      setDeleteDialogOpen(false);
      setSaleToDelete(null);
      await fetchSales(selectedDate);

    } catch (err) {
      console.error("Delete failed:", err);
      setError("Failed to delete sale");
    } finally {
      setDeleting(false);
    }
  };

  const cancelEditSale = () => {
    console.log("Cancel edit modal");
    setEditDialogOpen(false);
    setSaleToEdit(null);
    setEditSaleItems([]);
    setEditPaymentMethod('');
  };

  const cancelDeleteSale = () => {
    console.log("Cancel delete modal");
    setDeleteDialogOpen(false);
    setSaleToDelete(null);
  };

  const formatTime = (dateString) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch (e) {
      console.error("Bad date for formatTime:", dateString, e);
      return "--:--";
    }
  };

  const getPaymentMethodBadge = (paymentMethod) => {
    if (paymentMethod === 'CASH') return <Badge bg="success">cash</Badge>;
    if (paymentMethod === 'CARD') return <Badge bg="primary">card</Badge>;
    return <Badge bg="secondary">{paymentMethod}</Badge>;
  };

  const handlePrintSale = async (sale) => {
    console.log("Printing sale:", sale);
    try {
      const receiptContent = createReceiptHTML(sale, 'PickNPay');
      await printWithElectron(receiptContent, `Receipt - Sale #${sale.id}`);
    } catch (err) {
      console.error("Print failed:", err);
      alert("Printing failed. Please try again.");
    }
  };

  return (
    <div>
      <h2>Sales History (Debug Enabled)</h2>
      {/* The rest of your JSX unchanged */}
      {/* ... */}
    </div>
  );
};

export default SalesHistory;
