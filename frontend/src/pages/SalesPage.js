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
  Container,
  InputGroup
} from 'react-bootstrap';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { itemsAPI, salesAPI, categoriesAPI, companySettingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import BarcodeScanner from '../components/BarcodeScanner';
import SimpleBarcodeScanner from '../components/SimpleBarcodeScanner';

const SalesPage = () => {
  const [cart, setCart] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companyName, setCompanyName] = useState('PickNPay');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [simpleScannerOpen, setSimpleScannerOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [quickPrice, setQuickPrice] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [selectedNotes, setSelectedNotes] = useState({});
  const [cashConfirmDialogOpen, setCashConfirmDialogOpen] = useState(false);
  const [changeDue, setChangeDue] = useState(0);
  const [itemNotFoundDialogOpen, setItemNotFoundDialogOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [registerItemDialogOpen, setRegisterItemDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    barcode: '',
    price: '',
    stockQuantity: '',
    categoryId: ''
  });
  const [selectedCartItem, setSelectedCartItem] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [currentView, setCurrentView] = useState('categories'); // 'categories' or 'categoryItems'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryItems, setCategoryItems] = useState([]);
  const [heldTransactions, setHeldTransactions] = useState([]);
  const [showHeldTransactions, setShowHeldTransactions] = useState(false);
  const [selectedHeldTransaction, setSelectedHeldTransaction] = useState(null);
  const lastClickRef = React.useRef({});

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      itemId: '',
      quantity: 1,
      unitPrice: 0,
    },
  });

  const selectedItemId = watch('itemId');
  const quickSalePrices = [0.10, 0.20, 0.50, 1, 2, 3, 4, 5, 6, 7, 8, 10, 13, 15, 20, 40];

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchCompanyName();
    // Focus on barcode input when component mounts
    const handleKeyDown = (event) => {
      // Only process if a barcode scanner is likely being used (e.g., Enter key)
      if (event.key === 'Enter' && barcodeInput) {
        event.preventDefault(); // Prevent form submission
        processBarcode(barcodeInput);
        setBarcodeInput(''); // Clear input after processing
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [barcodeInput]);



  useEffect(() => {
    if (selectedItemId) {
      const selectedItem = items.find(item => item.id === parseInt(selectedItemId));
      if (selectedItem) {
        reset({
          itemId: selectedItemId,
          quantity: 1,
          unitPrice: selectedItem.price
        });
      }
    }
  }, [selectedItemId, items, reset]);

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.getAvailable();
      setItems(response.data);
    } catch (err) {
      setError('Failed to load items');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      // Filter categories to only show those with displayOnPos = true (or null for backward compatibility)
      const posCategories = response.data.filter(category => category.displayOnPos !== false);
      setCategories(posCategories);
    } catch (err) {
      console.error('Failed to load categories:', err);
      // Set default categories if API fails
      setCategories([
        { id: 1, name: 'No Category' },
        { id: 2, name: 'Tobacco' },
        { id: 3, name: 'Vape' },
        { id: 4, name: 'Drinks' },
        { id: 5, name: 'Snacks' },
        { id: 6, name: 'Mobile Accessories' },
        { id: 7, name: 'Pick & Mix' }
      ]);
    }
  };

  const fetchCompanyName = async () => {
    try {
      const response = await companySettingsAPI.get();
      setCompanyName(response.data.companyName);
    } catch (error) {
      console.error('Failed to fetch company name:', error);
      // Keep default name if fetch fails
    }
  };

  // Helper function to add or update item in cart
  const addOrUpdateCartItem = (newItem, quantity = 1) => {
    setCart(currentCart => {
      const existingItemIndex = currentCart.findIndex(cartItem => 
        cartItem.itemId === newItem.itemId || 
        (newItem.barcode && cartItem.itemBarcode === newItem.barcode && newItem.barcode !== 'N/A')
      );

      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        const updatedCart = [...currentCart];
        updatedCart[existingItemIndex].quantity += 1;
        updatedCart[existingItemIndex].totalPrice =
          updatedCart[existingItemIndex].unitPrice * updatedCart[existingItemIndex].quantity;
        return updatedCart;
      } else {
        // Add new item to cart
        return [...currentCart, newItem];
      }
    });
  };

  // Helper function for quick sale items (special case)
  const addOrUpdateQuickSaleItem = (price) => {
    console.log('addOrUpdateQuickSaleItem called with price:', price);
    
    setCart(currentCart => {
      console.log('Current cart before update:', currentCart);
      const existingItemIndex = currentCart.findIndex(
        item => item.itemId === null && item.unitPrice === price
      );

      console.log('Existing item index:', existingItemIndex);

      if (existingItemIndex >= 0) {
        // Update quantity of existing quick sale item
        const updatedCart = [...currentCart];
        updatedCart[existingItemIndex].quantity += 1;
        updatedCart[existingItemIndex].totalPrice = 
          updatedCart[existingItemIndex].unitPrice * updatedCart[existingItemIndex].quantity;
        console.log('Updated existing item, new quantity:', updatedCart[existingItemIndex].quantity);
        return updatedCart;
      } else {
        // Add new quick sale item
        const quickSaleItem = {
          id: Date.now() + Math.random(),
          itemId: null,
          itemName: `Quick Sale (€${price.toFixed(2)})`,
          itemBarcode: 'N/A',
          quantity: 1,
          unitPrice: price,
          totalPrice: price
        };
        console.log('Adding new quick sale item:', quickSaleItem);
        return [...currentCart, quickSaleItem];
      }
    });
  };

  const processBarcode = async (barcode) => {
    try {
      const response = await itemsAPI.getByBarcode(barcode);
      const item = response.data;

        const newCartItem = {
        id: Date.now() + Math.random(),
          itemId: item.id,
          itemName: item.name,
          itemBarcode: item.barcode,
          quantity: 1,
          unitPrice: item.price,
          totalPrice: item.price
        };

      addOrUpdateCartItem(newCartItem);

      setScannerOpen(false);
      setSimpleScannerOpen(false);
      setSuccess(`Item "${item.name}" added to cart.`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error processing barcode:', err);
      // Show dialog to register new item
      setScannedBarcode(barcode);
      setItemNotFoundDialogOpen(true);
    }
  };

  const handleAddItemToCart = (data) => {
    const item = items.find(i => i.id === parseInt(data.itemId));
    if (!item) {
      setError('Selected item not found.');
      setTimeout(() => setError(null), 3000);
      return;
    }

      const newCartItem = {
      id: Date.now() + Math.random(),
        itemId: item.id,
        itemName: item.name,
        itemBarcode: item.barcode,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice: data.unitPrice * data.quantity,
      };

    addOrUpdateCartItem(newCartItem, data.quantity);
    
    setAddItemDialogOpen(false);
    reset();
    setSuccess(`Added ${data.quantity} x ${item.name} to cart.`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const updateCartItemQuantity = (cartItemId, change) => {
    setCart(currentCart => {
      const updatedCart = currentCart.map(item => {
        if (item.id === cartItemId) {
          const newQuantity = item.quantity + change;
          if (newQuantity > 0) {
            return { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity };
          }
        }
        return item;
      }).filter(item => item.quantity > 0); // Remove if quantity drops to 0
      
      // Update selectedCartItem if it was modified
      if (selectedCartItem && selectedCartItem.id === cartItemId) {
        const updatedItem = updatedCart.find(item => item.id === cartItemId);
        if (updatedItem) {
          setSelectedCartItem(updatedItem);
        } else {
          // Item was removed, clear selection
          setSelectedCartItem(null);
        }
      }
      
      return updatedCart;
    });
  };

  const removeCartItem = (cartItemId) => {
    setCart(currentCart => currentCart.filter(item => item.id !== cartItemId));
    
    // Clear selection if the selected item was removed
    if (selectedCartItem && selectedCartItem.id === cartItemId) {
      setSelectedCartItem(null);
    }
    
    setSuccess('Item removed from cart.');
    setTimeout(() => setSuccess(null), 2000);
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setError('Cart is empty. Add items before checkout.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setCashAmount('');
    setSelectedNotes({});
    setCheckoutDialogOpen(true);
  };

  const handleNoteSelection = (noteValue) => {
    setSelectedNotes(prev => ({
      ...prev,
      [noteValue]: (prev[noteValue] || 0) + 1
    }));
    
    // Update cash amount
    const currentAmount = parseFloat(cashAmount || 0);
    setCashAmount((currentAmount + noteValue).toFixed(2));
  };

  const calculateChange = () => {
    const total = calculateTotal();
    const paid = parseFloat(cashAmount || 0);
    // If no cash amount entered, assume exact payment (no change)
    if (paid === 0) {
      return 0;
    }
    return Math.max(0, paid - total);
  };

  const calculateChangeNotes = (changeAmount) => {
    const notes = [200, 100, 50, 20, 10, 5];
    const changeNotes = {};
    let remaining = changeAmount;

    notes.forEach(note => {
      if (remaining >= note) {
        const count = Math.floor(remaining / note);
        changeNotes[note] = count;
        remaining -= count * note;
      }
    });

    return changeNotes;
  };

  const handleConfirmCheckout = async (selectedPaymentMethod) => {
              if (selectedPaymentMethod === 'CASH') {
                // For cash payment, show confirmation dialog with change calculation
                const change = calculateChange();
                setChangeDue(change);
                
                // Only show dialog if there's change due
                if (change > 0) {
                  setCashConfirmDialogOpen(true);
                  
                  // Auto-close after 5 seconds
                  setTimeout(() => {
                    setCashConfirmDialogOpen(false);
                    processCashPayment();
                  }, 5000);
                } else {
                  // No change due, proceed directly
                  processCashPayment();
                }
              } else {
                processCardPayment();
              }
            };

  const processCashPayment = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setCheckoutDialogOpen(false);

    try {
      const saleItems = cart.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      const saleData = {
        totalAmount: calculateTotal(),
        paymentMethod: 'CASH',
        saleItems: saleItems,
        userId: user?.id,
        cashAmount: parseFloat(cashAmount || 0),
        changeDue: parseFloat(cashAmount || 0) > 0 ? calculateChange() : 0
      };

      await salesAPI.create(saleData);
      setCart([]);
      setCashAmount('');
      setSelectedNotes({});
      setSuccess('Cash payment completed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to complete sale. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const processCardPayment = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setCheckoutDialogOpen(false);

    try {
      const saleItems = cart.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));

      const saleData = {
        totalAmount: calculateTotal(),
        paymentMethod: 'CARD',
        saleItems: saleItems,
        userId: user?.id,
      };

      await salesAPI.create(saleData);
      setCart([]);
      setSuccess('Card payment completed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to complete sale. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPriceSale = (price, e) => {
    // Use the same logic as plus button
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('handleQuickPriceSale called with price:', price);
    addOrUpdateQuickSaleItem(price);
    setSuccess(`Quick sale of €${price.toFixed(2)} added to cart.`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleCustomQuickPrice = () => {
    const price = parseFloat(quickPrice);
    if (!isNaN(price) && price > 0) {
      handleQuickPriceSale(price);
      setQuickPrice('');
    } else {
      setError('Please enter a valid price for quick sale.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCategoryClick = async (category) => {
    if (category.name === 'Quick Sale') {
      setCurrentView('quickSale');
    } else {
      try {
        setLoading(true);
        const response = await itemsAPI.getItemsByCategory(category.id);
        setCategoryItems(response.data);
        setSelectedCategory(category);
        setCurrentView('categoryItems');
      } catch (err) {
        console.error('Failed to load category items:', err);
        setError('Failed to load category items. Please try again.');
        setTimeout(() => setError(null), 3000);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBackToCategories = () => {
    setCurrentView('categories');
    setSelectedCategory(null);
    setCategoryItems([]);
  };

  const handleCategoryItemClick = (item) => {
    // Debounce: prevent duplicate clicks within 500ms
    const clickKey = `item_${item.id}`;
    const now = Date.now();
    if (lastClickRef.current[clickKey] && now - lastClickRef.current[clickKey] < 500) {
      console.log('Duplicate click detected, ignoring');
      return; // Ignore this click
    }
    lastClickRef.current[clickKey] = now;

    const cartItem = {
      id: Date.now() + Math.random(),
      itemId: item.id,
      itemName: item.name,
      itemBarcode: item.barcode || 'N/A',
      quantity: 1,
      unitPrice: parseFloat(item.price),
      totalPrice: parseFloat(item.price)
    };

    addOrUpdateCartItem(cartItem);
    setSuccess(`${item.name} added to cart.`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleCartItemClick = (item) => {
    setSelectedCartItem(item);
    setSuccess(`Selected: ${item.itemName}`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleIncrementSelectedItem = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Increment button clicked');
    console.log('Selected cart item:', selectedCartItem);
    
    if (!selectedCartItem) {
      setError('Please select an item from the cart first.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    console.log('Incrementing item with ID:', selectedCartItem.id);
    updateCartItemQuantity(selectedCartItem.id, 1);
    setSuccess(`Increased quantity for ${selectedCartItem.itemName}`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleDecrementSelectedItem = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedCartItem) {
      setError('Please select an item from the cart first.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // If quantity is 1, show confirmation dialog
    if (selectedCartItem.quantity === 1) {
      setItemToDelete(selectedCartItem);
      setDeleteConfirmOpen(true);
    } else {
      updateCartItemQuantity(selectedCartItem.id, -1);
      setSuccess(`Decreased quantity for ${selectedCartItem.itemName}`);
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  const handleEditSelectedItem = () => {
    if (!selectedCartItem) {
      setError('Please select an item from the cart first.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    // For now, just show a message - we'll implement the edit page later
    setSuccess(`Edit functionality for ${selectedCartItem.itemName} will be implemented soon.`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      removeCartItem(itemToDelete.id);
      setSuccess(`Removed ${itemToDelete.itemName} from cart.`);
      setTimeout(() => setSuccess(null), 2000);
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleHoldTransaction = () => {
    if (cart.length === 0) {
      setError('Cart is empty. Nothing to hold.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const heldTransaction = {
      id: Date.now(),
      items: [...cart],
      total: calculateTotal(),
      timestamp: new Date().toLocaleString(),
      customerName: 'Walk-in Customer'
    };

    setHeldTransactions(prev => [...prev, heldTransaction]);
    setCart([]);
    setSuccess('Transaction held successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleLoadHeldTransaction = (heldTransaction) => {
    setCart(heldTransaction.items);
    setShowHeldTransactions(false);
    setSuccess('Held transaction loaded!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteHeldTransaction = (transactionId) => {
    setHeldTransactions(prev => prev.filter(t => t.id !== transactionId));
    setSuccess('Held transaction deleted!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleCheckoutHeldTransaction = (heldTransaction) => {
    setSelectedHeldTransaction(heldTransaction);
    setCart(heldTransaction.items);
    setShowHeldTransactions(false);
    setCheckoutDialogOpen(true);
  };

  return (
    <div className="sales-page-container d-flex flex-column vh-100" style={{ backgroundColor: '#f8f9fa', margin: 0, padding: 0 }}>
      <style jsx>{`
        .sales-page-container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .sales-header {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .table th {
          background-color: #e9ecef !important;
          border-bottom: 2px solid #dee2e6;
          font-weight: 600;
        }
        .btn-outline-primary {
          border-color: #0d6efd;
          color: #0d6efd;
        }
        .btn-outline-primary:hover {
          background-color: #0d6efd;
          border-color: #0d6efd;
        }
        .numeric-keypad .btn {
          min-height: 40px;
          font-size: 1.1rem;
        }
        .category-btn {
          min-height: 35px;
          font-size: 0.85rem;
        }
        .quick-sale-btn {
          min-height: 40px;
          font-size: 0.9rem;
        }
        .cart-item-selected {
          background-color: #b8dacc !important;
          border-left: 5px solid #198754 !important;
          box-shadow: 0 3px 6px rgba(25, 135, 84, 0.4) !important;
          font-weight: bold !important;
        }
        .cart-item-row:hover {
          background-color: #f8f9fa !important;
        }
        .cart-item-row:hover.cart-item-selected {
          background-color: #a8d5ba !important;
          box-shadow: 0 4px 8px rgba(25, 135, 84, 0.5) !important;
        }
      `}</style>
      {/* Compact Header */}
      <div className="bg-gradient-primary text-white py-2 px-3" style={{ minHeight: '60px', margin: 0, padding: '0.5rem 1rem' }}>
        <div className="d-flex align-items-center justify-content-between w-100">
        <div className="d-flex align-items-center">
            <div 
              className="icon-lg me-2" 
              style={{ 
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/')}
              title="Go to Dashboard"
            >
              <i className="bi bi-shop"></i>
          </div>
            <div>
              <h4 className="mb-0 fw-bold">{companyName} Sales Terminal</h4>
              <small className="opacity-75">Quick & Easy Sales Management</small>
        </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Badge bg="success" className="px-2 py-1">
              <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.4rem' }}></i>
              In Progress
            </Badge>
            <div className="d-flex align-items-center gap-2">
              <Button 
                variant="outline-light" 
                size="sm" 
                onClick={() => setShowHeldTransactions(!showHeldTransactions)}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                title="Hold Transactions"
              >
                <i className="bi bi-pause-circle me-1"></i>
                Hold ({heldTransactions.length})
              </Button>
              <i className="bi bi-tablet fs-5 text-white hover-lift" style={{ cursor: 'pointer' }} title="Tablet Mode"></i>
              <i className="bi bi-gear fs-5 text-white hover-lift" style={{ cursor: 'pointer' }} onClick={() => navigate('/company')} title="Settings"></i>
              <i className="bi bi-box-arrow-right fs-5 text-white hover-lift" style={{ cursor: 'pointer' }} onClick={() => { localStorage.removeItem('token'); navigate('/login'); }} title="Logout"></i>
              <i className="bi bi-power fs-5 text-white hover-lift" style={{ cursor: 'pointer' }} title="Power"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow-1 d-flex" style={{ overflow: 'hidden', margin: 0, padding: 0 }}>
          {/* Main Content Area */}
        <div className="d-flex flex-column" style={{ width: '65%', padding: 0 }}>
          {showHeldTransactions ? (
            /* Held Transactions View */
            <div className="bg-white" style={{ height: '100%', overflowY: 'auto', padding: '1rem' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">Held Transactions ({heldTransactions.length})</h4>
                <Button variant="outline-secondary" onClick={() => setShowHeldTransactions(false)}>
                  <i className="bi bi-arrow-left me-1"></i>
                  Back to Sales
                </Button>
              </div>
              
              {heldTransactions.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-pause-circle fs-1 text-muted"></i>
                  <h5 className="text-muted mt-3">No Held Transactions</h5>
                  <p className="text-muted">Transactions you hold will appear here</p>
                </div>
              ) : (
                <div className="row g-3">
                  {heldTransactions.map((transaction) => (
                    <div key={transaction.id} className="col-md-6 col-lg-4">
                      <div className="card h-100">
                        <div className="card-header d-flex justify-content-between align-items-center">
                          <small className="text-muted">{transaction.timestamp}</small>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => handleDeleteHeldTransaction(transaction.id)}
                            title="Delete Transaction"
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                        <div className="card-body">
                          <h6 className="card-title">{transaction.customerName}</h6>
                          <p className="card-text">
                            <strong>{transaction.items.length}</strong> items
                          </p>
                          <div className="mb-2">
                            {transaction.items.slice(0, 2).map((item, index) => (
                              <div key={index} className="small text-muted">
                                {item.itemName} x{item.quantity}
                              </div>
                            ))}
                            {transaction.items.length > 2 && (
                              <div className="small text-muted">
                                +{transaction.items.length - 2} more items
                              </div>
                            )}
                          </div>
                          <h5 className="text-primary mb-3">€{transaction.total.toFixed(2)}</h5>
                        </div>
                        <div className="card-footer d-grid gap-2">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => handleLoadHeldTransaction(transaction)}
                          >
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Load
                          </Button>
                          <Button 
                            variant="success" 
                            size="sm"
                            onClick={() => handleCheckoutHeldTransaction(transaction)}
                          >
                            <i className="bi bi-credit-card me-1"></i>
                            Checkout
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Normal Sales View */
            <>
            {/* Sales Cart Table with Control Buttons */}
            <div className="d-flex">
              {/* Cart Table */}
              <div className="bg-white flex-grow-1" style={{ height: '350px', overflowY: 'auto', padding: '0.5rem' }}>
              {cart.length === 0 ? (
                  <div className="text-center py-2">
                    <i className="bi bi-cart fs-3 text-muted"></i>
                    <p className="text-muted mt-1 mb-0" style={{ fontSize: '0.7rem' }}>Cart is empty</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped hover className="mb-0" size="sm">
                      <thead className="table-primary" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                          <th style={{ width: '8%', fontSize: '1rem', padding: '0.6rem' }}>Id</th>
                          <th style={{ width: '40%', fontSize: '1rem', padding: '0.6rem' }}>Item</th>
                          <th className="text-end" style={{ width: '12%', fontSize: '1rem', padding: '0.6rem' }}>Price</th>
                          <th className="text-center" style={{ width: '10%', fontSize: '1rem', padding: '0.6rem' }}>Qty</th>
                          <th className="text-end" style={{ width: '10%', fontSize: '1rem', padding: '0.6rem' }}>Disc</th>
                          <th className="text-end" style={{ width: '20%', fontSize: '1rem', padding: '0.6rem' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, index) => (
                        <tr 
                          key={index} 
                          onClick={() => handleCartItemClick(item)}
                          className={`cart-item-row ${selectedCartItem && selectedCartItem.id === item.id ? 'cart-item-selected' : ''}`}
                          style={{ cursor: 'pointer' }}
                        >
                            <td style={{ fontSize: '1rem', padding: '0.6rem' }}>{index + 1}</td>
                            <td style={{ fontSize: '1rem', padding: '0.6rem' }}>
                            <div>
                                <strong style={{ fontSize: '1.1rem' }}>{item.itemName}</strong>
                                {item.itemBarcode && item.itemBarcode !== 'N/A' && (
                                  <small className="d-block text-muted" style={{ fontSize: '0.8rem' }}>
                                    <i className="bi bi-upc" style={{ fontSize: '0.7rem' }}></i> {item.itemBarcode}
                                </small>
                              )}
                            </div>
                          </td>
                            <td className="text-end" style={{ fontSize: '1rem', padding: '0.6rem' }}>€{item.unitPrice.toFixed(2)}</td>
                            <td className="text-center" style={{ fontSize: '1rem', padding: '0.6rem' }}>
                              <span className="fw-bold">{item.quantity}</span>
                            </td>
                            <td className="text-end" style={{ fontSize: '1rem', padding: '0.6rem' }}>€0.00</td>
                            <td className="text-end fw-bold" style={{ fontSize: '1rem', padding: '0.6rem' }}>€{item.totalPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
              
              {/* Fixed Control Buttons */}
              <div className="bg-light d-flex flex-column" style={{ width: '90px', padding: '0.3rem', borderLeft: '1px solid #dee2e6' }}>
                <div className="d-flex flex-column h-100">
                              <Button
                    variant={selectedCartItem ? "success" : "outline-secondary"}
                    size="lg"
                    onClick={handleIncrementSelectedItem}
                    disabled={!selectedCartItem}
                    className="flex-fill"
                    style={{ fontSize: '1.6rem', padding: '1.2rem', width: '100%', minHeight: '110px' }}
                    title="Increase quantity"
                  >
                    <i className="bi bi-plus"></i>
                  </Button>
                  <Button
                    variant={selectedCartItem ? "warning" : "outline-secondary"}
                    size="lg"
                    onClick={handleDecrementSelectedItem}
                    disabled={!selectedCartItem}
                    className="flex-fill"
                    style={{ fontSize: '1.6rem', padding: '1.2rem', width: '100%', minHeight: '110px' }}
                    title="Decrease quantity"
                              >
                                <i className="bi bi-dash"></i>
                              </Button>
                              <Button
                    variant={selectedCartItem ? "info" : "outline-secondary"}
                    size="lg"
                    onClick={handleEditSelectedItem}
                    disabled={!selectedCartItem}
                    className="flex-fill"
                    style={{ fontSize: '1.6rem', padding: '1.2rem', width: '100%', minHeight: '110px' }}
                    title="Edit item"
                  >
                    <i className="bi bi-pencil"></i>
                              </Button>
                            </div>
                </div>
            </div>

            {/* Action Buttons Row */}
            <div className="bg-white" style={{ padding: '0.4rem' }}>
              <div className="d-flex gap-2 justify-content-between">
              <div className="d-flex gap-2">
                  <Button variant="outline-primary" size="lg" style={{ fontSize: '1.1rem', padding: '0.6rem 1rem', minHeight: '45px' }}>
                    <i className="bi bi-pencil me-2"></i>
                  EDIT
                </Button>
                  <Button variant="outline-primary" size="lg" style={{ fontSize: '1.1rem', padding: '0.6rem 1rem', minHeight: '45px' }}>
                    <i className="bi bi-eye me-2"></i>
                  STOCK
                </Button>
                  <Button variant="outline-danger" size="lg" onClick={() => setCart([])} style={{ fontSize: '1.1rem', padding: '0.6rem 1rem', minHeight: '45px' }}>
                    <i className="bi bi-cart-x me-2"></i>
                  CLEAR CART
                </Button>
                </div>
              </div>
            </div>

            {/* Sales Summary */}
            <div className="bg-primary text-white" style={{ padding: '0.5rem' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="d-block" style={{ fontSize: '0.9rem' }}>Subtotal: €{calculateTotal().toFixed(2)}</div>
                  <div className="d-block" style={{ fontSize: '0.9rem' }}>Discount: €0.00</div>
                </div>
                <div className="text-end">
                  <h4 className="mb-0 fw-bold" style={{ fontSize: '1.8rem' }}>Total: €{calculateTotal().toFixed(2)}</h4>
                </div>
              </div>
            </div>

            {/* Bottom Control Panel */}
            <div className="bg-light text-dark" style={{ padding: '0.5rem' }}>
              <div className="d-flex align-items-center justify-content-between">
                  <div className="d-grid gap-2" style={{ width: '30%' }}>
                  <Button variant="primary" size="lg" className="fw-bold" style={{ padding: '0.8rem', fontSize: '1.1rem', minHeight: '50px' }}>
                      <i className="bi bi-percent me-2"></i>
                      Discount
                    </Button>
                  <Button variant="secondary" size="lg" className="fw-bold" style={{ padding: '0.8rem', fontSize: '1.1rem', minHeight: '50px' }}>
                      <i className="bi bi-x-circle me-2"></i>
                      Exit
                    </Button>
                  </div>
                <div className="d-grid gap-2 numeric-keypad" style={{ gridTemplateColumns: 'repeat(3, 1fr)', width: '40%', maxWidth: '280px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <Button key={num} variant="outline-secondary" size="lg" className="fw-bold" style={{ padding: '0.8rem', fontSize: '1.2rem', minHeight: '50px' }} onClick={() => setBarcodeInput(prev => prev + num.toString())}>
                        {num}
                      </Button>
                    ))}
                  <Button variant="outline-secondary" size="lg" className="fw-bold" style={{ padding: '0.8rem', fontSize: '1.2rem', minHeight: '50px' }} onClick={() => setBarcodeInput('')}>C</Button>
                  <Button variant="outline-secondary" size="lg" className="fw-bold" style={{ padding: '0.8rem', fontSize: '1.2rem', minHeight: '50px' }} onClick={() => setBarcodeInput(prev => prev + '0')}>0</Button>
                  <Button variant="outline-secondary" size="lg" className="fw-bold" style={{ padding: '0.8rem', fontSize: '1.2rem', minHeight: '50px' }} onClick={() => setBarcodeInput(prev => prev.slice(0, -1))}>
                      <i className="bi bi-backspace"></i>
                    </Button>
                  </div>
                <div className="d-grid gap-2" style={{ width: '30%' }}>
                  <Button variant="success" size="lg" className="fw-bold" style={{ padding: '1.2rem', fontSize: '1.3rem', minHeight: '70px' }} onClick={handleCheckout} disabled={loading}>
                      {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-check-circle me-2"></i>}
                      Checkout
                    </Button>
                  <Button variant="warning" size="lg" className="fw-bold" style={{ padding: '1.2rem', fontSize: '1.3rem', minHeight: '70px' }} onClick={handleHoldTransaction}>
                      <i className="bi bi-pause-circle me-2"></i>
                      On Hold
                    </Button>
                  <Button variant="info" size="lg" className="fw-bold" style={{ padding: '1.2rem', fontSize: '1.3rem', minHeight: '70px' }}>
                      <i className="bi bi-cash-stack me-2"></i>
                      Open Till
                    </Button>
                  </div>
            </div>
            </div>
            </>
          )}
        </div>

          {/* Right Sidebar */}
        <div className="bg-white d-flex flex-column" style={{ width: '35%', padding: 0 }}>
            {/* Selected Item Display */}
            {selectedCartItem && (
              <div className="mb-1 p-1 bg-light rounded border">
                <h6 className="mb-1 fw-bold text-primary small">Selected Item:</h6>
                <p className="mb-1 small">{selectedCartItem.itemName}</p>
                <p className="mb-0 small text-muted">Qty: {selectedCartItem.quantity} × €{selectedCartItem.unitPrice.toFixed(2)}</p>
              </div>
            )}

            {/* Barcode Input */}
            <div className="mb-2" style={{ padding: '0.5rem' }}>
              <h5 className="fw-bold mb-2">Barcode Read</h5>
              <InputGroup size="lg">
                <InputGroup.Text>
                  <i className="bi bi-upc-scan fs-5"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Scan or enter barcode"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      processBarcode(barcodeInput);
                      setBarcodeInput('');
                    }
                  }}
                  style={{ fontSize: '1rem' }}
                />
              </InputGroup>
            </div>

            {/* Categories / Category Items Navigation */}
            <div className="mb-1 flex-grow-1" style={{ padding: '0.5rem' }}>
              {currentView === 'categories' ? (
                <>
                  <h5 className="fw-bold mb-3">Categories</h5>
                  <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {categories.map((category) => (
                  <Button 
                    key={category.id} 
                    variant={category.name === 'Quick Sale' ? 'primary' : 'outline-primary'} 
                    size="lg"
                    className="fw-bold category-btn"
                        onClick={() => handleCategoryClick(category)}
                        style={{ padding: '1rem', fontSize: '1.1rem', minHeight: '60px' }}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
                </>
              ) : currentView === 'quickSale' ? (
                <>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h5 className="fw-bold mb-0">Quick Sale</h5>
                    <Button 
                      variant="outline-secondary" 
                      size="lg" 
                      onClick={handleBackToCategories}
                      title="Back to Categories"
                      style={{ fontSize: '0.9rem', padding: '0.4rem' }}
                    >
                      <i className="bi bi-arrow-left me-2"></i>
                      Back
                    </Button>
            </div>
              <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {quickSalePrices.map((price, index) => (
                  <Button
                    key={`quick-sale-${price}`}
                    variant="outline-primary"
                    onClick={(e) => handleQuickPriceSale(price, e)}
                        className="fw-bold quick-sale-btn"
                    size="lg"
                    style={{ padding: '1rem', fontSize: '1.2rem', minHeight: '65px' }}
                  >
                    €{price.toFixed(2)}
                  </Button>
                ))}
              </div>
                </>
              ) : (
                <>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <h6 className="fw-bold small mb-0">{selectedCategory?.name}</h6>
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      className="py-1 px-2"
                      onClick={handleBackToCategories}
                      title="Back to Categories"
                    >
                      <i className="bi bi-arrow-left me-1"></i>
                      Back
                    </Button>
            </div>
                  {loading ? (
                    <div className="text-center py-3">
                      <Spinner animation="border" size="sm" />
                      <span className="ms-2 small">Loading items...</span>
                    </div>
                  ) : (
                    <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      {categoryItems.map((item) => (
                        <Button
                          key={item.id}
                          variant="outline-primary"
                          onClick={() => handleCategoryItemClick(item)}
                          className="py-2 fw-bold category-item-btn"
                          size="lg"
                          style={{ minHeight: '70px', fontSize: '1.1rem' }}
                        >
                          <div className="text-start">
                            <div className="fw-bold">{item.name}</div>
                            <div className="small text-muted">€{parseFloat(item.price).toFixed(2)}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
        </div>
      </div>

      {/* Modals */}
      {/* Add Item Dialog */}
      <Modal show={addItemDialogOpen} onHide={() => setAddItemDialogOpen(false)} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-plus-circle me-2"></i>
            Add Item to Cart
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit(handleAddItemToCart)}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Item</Form.Label>
              <Controller
                name="itemId"
                control={control}
                rules={{ required: 'Please select an item' }}
                render={({ field }) => (
                  <Form.Select {...field} isInvalid={!!errors.itemId}>
                    <option value="">Select an item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (€{item.price.toFixed(2)})
                      </option>
                    ))}
                  </Form.Select>
                )}
              />
              <Form.Control.Feedback type="invalid">
                {errors.itemId && errors.itemId.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Quantity</Form.Label>
              <Controller
                name="quantity"
                control={control}
                rules={{
                  required: 'Quantity is required',
                  min: { value: 1, message: 'Quantity must be at least 1' },
                  validate: (value) =>
                    parseInt(value) <=
                    (items.find((item) => item.id === parseInt(selectedItemId))?.stockQuantity || 0) ||
                    'Not enough stock available',
                }}
                render={({ field }) => (
                  <Form.Control
                    type="number"
                    placeholder="Enter quantity"
                    {...field}
                    isInvalid={!!errors.quantity}
                  />
                )}
              />
              <Form.Control.Feedback type="invalid">
                {errors.quantity && errors.quantity.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Unit Price</Form.Label>
              <Controller
                name="unitPrice"
                control={control}
                rules={{
                  required: 'Unit price is required',
                  min: { value: 0.01, message: 'Unit price must be greater than 0' },
                }}
                render={({ field }) => (
                  <Form.Control
                    type="number"
                    step="0.01"
                    placeholder="Enter unit price"
                    {...field}
                    isInvalid={!!errors.unitPrice}
                  />
                )}
              />
              <Form.Control.Feedback type="invalid">
                {errors.unitPrice && errors.unitPrice.message}
              </Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setAddItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-plus-circle me-2"></i>}
              Add to Cart
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <BarcodeScanner
        show={scannerOpen}
        onHide={() => setScannerOpen(false)}
        onBarcodeScanned={processBarcode}
      />

      <SimpleBarcodeScanner
        show={simpleScannerOpen}
        onHide={() => setSimpleScannerOpen(false)}
        onBarcodeScanned={processBarcode}
      />

      {/* Unified Payment Dialog */}
      <Modal show={checkoutDialogOpen} onHide={() => setCheckoutDialogOpen(false)} centered size="xl" style={{ maxWidth: '90vw', width: '1200px', transform: 'translateX(8%)' }}>
        <Modal.Body className="p-0">
          <div className="row g-0">
            {/* Top Section - Transaction Summary */}
            <div className="col-12">
              <div className="row g-0 bg-light border-bottom p-4">
                <div className="col-4 text-center">
                  <h5 className="mb-2 text-muted">Balance Due</h5>
                  <h1 className="fw-bold text-primary">€{calculateTotal().toFixed(2)}</h1>
          </div>
                <div className="col-4 text-center">
                  <h5 className="mb-2 text-muted">Paid</h5>
                  <h3 className="fw-bold text-success">€{parseFloat(cashAmount || 0).toFixed(2)}</h3>
                </div>
                <div className="col-4 text-center">
                  <h5 className="mb-2 text-muted">Change Due</h5>
                  <h1 className={`fw-bold ${calculateChange() >= 0 ? 'text-success' : 'text-danger'}`}>
                    €{calculateChange().toFixed(2)}
                  </h1>
                </div>
              </div>
            </div>

            {/* Middle Section - Input and Banknote Selection */}
            <div className="col-12">
              <div className="row g-0">
                {/* Left Column - Smaller Banknote Selection */}
                <div className="col-4 p-4">
                  <div className="d-flex flex-column gap-3">
                    {[5, 10, 20].map(amount => (
                      <Button
                        key={amount}
                        variant="outline-secondary"
                        className="p-4 d-flex flex-column align-items-center"
                        onClick={() => handleNoteSelection(amount)}
                        style={{ 
                          height: '100px',
                          background: '#f8f9fa',
                          color: '#212529',
                          border: '2px solid #dee2e6',
                          fontSize: '1.2rem'
                        }}
                      >
                        <div className="fw-bold fs-3">€{amount}</div>
                        <small className="fs-6">Note</small>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Center Column - Numeric Keypad */}
                <div className="col-4 p-4">
                  <div className="row g-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <div className="col-4" key={num}>
                        <Button
                          variant="outline-secondary"
                          className="w-100 py-4"
                          onClick={() => setCashAmount(prev => prev + num.toString())}
                          style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                        >
                          {num}
                        </Button>
                      </div>
                    ))}
                    <div className="col-4">
                      <Button
                        variant="outline-secondary"
                        className="w-100 py-4"
                        onClick={() => setCashAmount(prev => prev + '0')}
                        style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                      >
                        0
                      </Button>
                    </div>
                    <div className="col-4">
                      <Button
                        variant="outline-secondary"
                        className="w-100 py-4"
                        onClick={() => setCashAmount(prev => prev + '.')}
                        style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                      >
                        .
                      </Button>
                    </div>
                    <div className="col-4">
                      <Button
                        variant="outline-danger"
                        className="w-100 py-4"
                        onClick={() => {
                          setCashAmount('');
                          setSelectedNotes({});
                        }}
                        style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                      >
                        C
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Column - Larger Banknote Selection */}
                <div className="col-4 p-4">
                  <div className="d-flex flex-column gap-3">
                    {[50, 100, 200].map(amount => (
                      <Button
                        key={amount}
                        variant="outline-secondary"
                        className="p-4 d-flex flex-column align-items-center"
                        onClick={() => handleNoteSelection(amount)}
                        style={{ 
                          height: '100px',
                          background: '#f8f9fa',
                          color: '#212529',
                          border: '2px solid #dee2e6',
                          fontSize: '1.2rem'
                        }}
                      >
                        <div className="fw-bold fs-3">€{amount}</div>
                        <small className="fs-6">Note</small>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section - Action Buttons */}
            <div className="col-12">
              <div className="row g-0">
                <div className="col-3">
                  <Button
                    variant="danger"
                    className="w-100 py-3 rounded-0"
                    onClick={() => setCheckoutDialogOpen(false)}
                    style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                  >
                    CANCEL
                  </Button>
                </div>
                <div className="col-3">
            <Button
              variant="success"
                    className="w-100 py-3 rounded-0"
                    onClick={() => {
                      handleConfirmCheckout('CASH');
                    }}
              disabled={loading}
                    style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
            >
                    CASH €{calculateTotal().toFixed(2)}
            </Button>
                </div>
                <div className="col-3">
            <Button
                    variant="warning"
                    className="w-100 py-3 rounded-0"
                    onClick={() => {
                      handleConfirmCheckout('CARD');
                      setCheckoutDialogOpen(false);
                    }}
              disabled={loading}
                    style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
            >
                    CARD €{calculateTotal().toFixed(2)}
            </Button>
                </div>
                <div className="col-3">
                  <Button
                    variant="danger"
                    className="w-100 py-3 rounded-0"
                    onClick={() => {
                      setCashAmount('');
                      setSelectedNotes({});
                    }}
                    style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                  >
                    CLEAR PAYMENTS
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* Item Not Found Dialog */}
      <Modal show={itemNotFoundDialogOpen} onHide={() => setItemNotFoundDialogOpen(false)} centered>
        <Modal.Body className="text-center p-4">
          <div className="mb-3">
            <i className="bi bi-barcode text-primary" style={{ fontSize: '2.5rem' }}></i>
          </div>
          <h5 className="mb-3 text-primary">Register this item?</h5>
          <p className="text-muted mb-4">Barcode: {scannedBarcode}</p>
          <div className="d-flex gap-3 justify-content-center">
            <Button 
              variant="outline-secondary" 
              size="lg" 
              onClick={() => setItemNotFoundDialogOpen(false)}
              className="px-4"
            >
              No
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setItemNotFoundDialogOpen(false);
                setNewItem({
                  name: '',
                  barcode: scannedBarcode,
                  price: '',
                  stockQuantity: '',
                  categoryId: ''
                });
                setRegisterItemDialogOpen(true);
              }}
              className="px-4"
            >
              Yes
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Register New Item Dialog */}
      <Modal show={registerItemDialogOpen} onHide={() => setRegisterItemDialogOpen(false)} centered size="lg">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-plus-circle me-2"></i>
            Register New Item
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Item Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter item name"
                value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Barcode *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter barcode"
                value={newItem.barcode}
                onChange={(e) => setNewItem(prev => ({ ...prev, barcode: e.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Price (€) *</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                placeholder="Enter price"
                value={newItem.price}
                onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Stock Quantity *</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter stock quantity"
                value={newItem.stockQuantity}
                onChange={(e) => setNewItem(prev => ({ ...prev, stockQuantity: e.target.value }))}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={newItem.categoryId}
                onChange={(e) => setNewItem(prev => ({ ...prev, categoryId: e.target.value }))}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRegisterItemDialogOpen(false)}>
            Cancel
          </Button>
            <Button 
              variant="primary" 
              onClick={async () => {
              try {
                const itemData = {
                  name: newItem.name,
                  barcode: newItem.barcode,
                  price: parseFloat(newItem.price),
                  stockQuantity: parseInt(newItem.stockQuantity),
                  categoryId: parseInt(newItem.categoryId)
                };
                
                await itemsAPI.create(itemData);
                setSuccess('Item registered successfully!');
                setTimeout(() => setSuccess(null), 3000);
                setRegisterItemDialogOpen(false);
                
                // Reset form
                setNewItem({
                  name: '',
                  barcode: '',
                  price: '',
                  stockQuantity: '',
                  categoryId: ''
                });
                
                // Refresh items list
                fetchItems();
              } catch (error) {
                setError('Failed to register item. Please try again.');
                setTimeout(() => setError(null), 3000);
              }
            }}
            disabled={!newItem.name || !newItem.barcode || !newItem.price || !newItem.stockQuantity}
          >
            Register Item
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Cash Payment Confirmation Dialog */}
      <Modal show={cashConfirmDialogOpen} onHide={() => setCashConfirmDialogOpen(false)} centered>
        <Modal.Body className="text-center p-4">
          <div className="mb-4">
            <i className="bi bi-cash-coin text-success" style={{ fontSize: '3rem' }}></i>
          </div>
          <h4 className="mb-3 text-success">Cash Payment</h4>
          <p className="mb-3">Payment received successfully!</p>
          <div className="alert alert-info mb-4">
            <h5 className="mb-2">Change Due</h5>
            <h3 className="text-primary mb-0">€{changeDue.toFixed(2)}</h3>
          </div>
          <p className="text-muted mb-4">This dialog will close automatically in 5 seconds...</p>
          <Button 
            variant="success" 
            size="lg" 
            onClick={() => {
              setCashConfirmDialogOpen(false);
              processCashPayment();
            }}
            className="px-5"
          >
            OK
          </Button>
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={deleteConfirmOpen} onHide={handleCancelDelete} centered>
        <Modal.Body className="text-center p-4">
          <div className="mb-3">
            <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '2.5rem' }}></i>
          </div>
          <h5 className="mb-3">Remove Item from Cart?</h5>
          {itemToDelete && (
            <p className="text-muted mb-4">
                    <strong>{itemToDelete.itemName}</strong>
              <br />
              <small>€{itemToDelete.totalPrice.toFixed(2)}</small>
            </p>
          )}
          <div className="d-flex gap-3 justify-content-center">
            <Button 
              variant="outline-secondary" 
              onClick={handleCancelDelete}
              className="px-4"
            >
            Cancel
          </Button>
            <Button 
              variant="danger" 
              onClick={handleConfirmDelete}
              className="px-4"
            >
              Remove
          </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default SalesPage;