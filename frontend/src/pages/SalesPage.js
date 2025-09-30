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
import { itemsAPI, salesAPI, categoriesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import BarcodeScanner from '../components/BarcodeScanner';
import SimpleBarcodeScanner from '../components/SimpleBarcodeScanner';

const SalesPage = () => {
  const [cart, setCart] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const { user } = useAuth();
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
  const [selectedCartItem, setSelectedCartItem] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [currentView, setCurrentView] = useState('categories'); // 'categories' or 'categoryItems'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryItems, setCategoryItems] = useState([]);

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

  // Ensure all cart items have unique IDs
  useEffect(() => {
    setCart(currentCart => 
      currentCart.map(item => 
        item.id ? item : { ...item, id: Date.now() + Math.random() }
      )
    );
  }, []);

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
      setCategories(response.data);
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

  const processBarcode = async (barcode) => {
    try {
      const response = await itemsAPI.getByBarcode(barcode);
      const item = response.data;

      // Check if item is already in cart
      const existingItemIndex = cart.findIndex(cartItem => cartItem.itemId === item.id);

      if (existingItemIndex >= 0) {
        // Update quantity
        const updatedCart = [...cart];
        updatedCart[existingItemIndex].quantity += 1;
        updatedCart[existingItemIndex].totalPrice =
          updatedCart[existingItemIndex].unitPrice * updatedCart[existingItemIndex].quantity;
        setCart(updatedCart);
      } else {
        // Add new item
        const newCartItem = {
          itemId: item.id,
          itemName: item.name,
          itemBarcode: item.barcode,
          quantity: 1,
          unitPrice: item.price,
          totalPrice: item.price
        };
        setCart([...cart, newCartItem]);
      }

      setScannerOpen(false);
      setSimpleScannerOpen(false);
      setSuccess(`Item "${item.name}" added to cart.`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Error processing barcode:', err);
      setError('Item not found or error adding to cart.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddItemToCart = (data) => {
    const item = items.find(i => i.id === parseInt(data.itemId));
    if (!item) {
      setError('Selected item not found.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const existingItemIndex = cart.findIndex(cartItem => cartItem.itemId === item.id);

    if (existingItemIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += data.quantity;
      updatedCart[existingItemIndex].totalPrice =
        updatedCart[existingItemIndex].unitPrice * updatedCart[existingItemIndex].quantity;
      setCart(updatedCart);
    } else {
      const newCartItem = {
        id: Date.now() + Math.random(), // Unique identifier for each cart item
        itemId: item.id,
        itemName: item.name,
        itemBarcode: item.barcode,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice: data.unitPrice * data.quantity,
      };
      setCart([...cart, newCartItem]);
    }
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
    setCheckoutDialogOpen(true);
  };

  const handleConfirmCheckout = async (selectedPaymentMethod) => {
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
        paymentMethod: selectedPaymentMethod,
        saleItems: saleItems,
        userId: user?.id,
      };

      await salesAPI.create(saleData);
      setCart([]);
      setSuccess('Sale completed successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to complete sale. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPriceSale = (price) => {
    const quickSaleItem = {
      id: Date.now() + Math.random(), // Unique identifier for each cart item
      itemId: null,
      itemName: `Quick Sale (€${price.toFixed(2)})`,
      itemBarcode: 'N/A',
      quantity: 1,
      unitPrice: price,
      totalPrice: price
    };
    setCart(currentCart => [...currentCart, quickSaleItem]);
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
    const cartItem = {
      id: item.id,
      itemName: item.name,
      quantity: 1,
      unitPrice: parseFloat(item.price),
      totalPrice: parseFloat(item.price)
    };
    setCart(currentCart => [...currentCart, cartItem]);
    setSuccess(`${item.name} added to cart.`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleCartItemClick = (item) => {
    setSelectedCartItem(item);
    setSuccess(`Selected: ${item.itemName}`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleIncrementSelectedItem = () => {
    if (!selectedCartItem) {
      setError('Please select an item from the cart first.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    updateCartItemQuantity(selectedCartItem.id, 1);
    setSuccess(`Increased quantity for ${selectedCartItem.itemName}`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleDecrementSelectedItem = () => {
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

  return (
    <div className="sales-page-container d-flex flex-column vh-100" style={{ backgroundColor: '#f8f9fa' }}>
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
          background-color: #e3f2fd !important;
          border-left: 4px solid #0d6efd !important;
          box-shadow: 0 2px 4px rgba(13, 110, 253, 0.2) !important;
        }
        .cart-item-row:hover {
          background-color: #f8f9fa !important;
        }
        .cart-item-row:hover.cart-item-selected {
          background-color: #e3f2fd !important;
        }
      `}</style>
      {/* Compact Header */}
      <div className="bg-gradient-primary text-white py-2 px-3" style={{ minHeight: '60px' }}>
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col">
              <div className="d-flex align-items-center">
                <div className="icon-lg me-2" style={{ 
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white'
                }}>
                  <i className="bi bi-shop"></i>
                </div>
                <div>
                  <h4 className="mb-0 fw-bold">PickNPay Sales Terminal</h4>
                  <small className="opacity-75">Quick & Easy Sales Management</small>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="d-flex align-items-center gap-2">
                <Badge bg="success" className="px-2 py-1">
                  <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.4rem' }}></i>
                  In Progress
                </Badge>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-tablet fs-5 text-white hover-lift" style={{ cursor: 'pointer' }} title="Tablet Mode"></i>
                  <i className="bi bi-gear fs-5 text-white hover-lift" style={{ cursor: 'pointer' }} title="Settings"></i>
                  <i className="bi bi-box-arrow-right fs-5 text-white hover-lift" style={{ cursor: 'pointer' }} title="Logout"></i>
                  <i className="bi bi-power fs-5 text-white hover-lift" style={{ cursor: 'pointer' }} title="Power"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Container fluid className="p-0 flex-grow-1">
        <Row className="g-0 h-100">
          {/* Main Content Area */}
          <Col xs={12} lg={8} className="d-flex flex-column">
            {/* Sales Cart Table */}
            <div className="bg-white p-2" style={{ height: '200px', overflowY: 'auto' }}>
              {cart.length === 0 ? (
                <div className="text-center py-3">
                  <i className="bi bi-cart fs-1 text-muted"></i>
                  <p className="text-muted mt-2 mb-0 small">Your cart is empty. Add items to proceed.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped hover className="mb-0" size="sm">
                    <thead className="table-primary">
                      <tr>
                        <th style={{ width: '8%', fontSize: '0.8rem' }}>Id</th>
                        <th style={{ width: '30%', fontSize: '0.8rem' }}>Item</th>
                        <th className="text-end" style={{ width: '12%', fontSize: '0.8rem' }}>Price</th>
                        <th className="text-center" style={{ width: '15%', fontSize: '0.8rem' }}>Quantity</th>
                        <th className="text-end" style={{ width: '10%', fontSize: '0.8rem' }}>Discount</th>
                        <th className="text-end" style={{ width: '15%', fontSize: '0.8rem' }}>Total</th>
                        <th className="text-center" style={{ width: '10%', fontSize: '0.8rem' }}>Actions</th>
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
                          <td style={{ fontSize: '0.8rem' }}>{index + 1}</td>
                          <td style={{ fontSize: '0.8rem' }}>
                            <div>
                              <strong>{item.itemName}</strong>
                              {item.itemBarcode && (
                                <small className="d-block text-muted">
                                  <i className="bi bi-upc me-1"></i>
                                  {item.itemBarcode}
                                </small>
                              )}
                            </div>
                          </td>
                          <td className="text-end" style={{ fontSize: '0.8rem' }}>€{item.unitPrice.toFixed(2)}</td>
                          <td className="text-center" style={{ fontSize: '0.8rem' }}>
                            <span className="fw-bold">{item.quantity}</span>
                          </td>
                          <td className="text-end" style={{ fontSize: '0.8rem' }}>€0.00</td>
                          <td className="text-end fw-bold" style={{ fontSize: '0.8rem' }}>€{item.totalPrice.toFixed(2)}</td>
                          <td className="text-center">
                            <div className="d-flex gap-1 justify-content-center">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCartItemQuantity(item.id, 1);
                                }}
                                style={{ width: '20px', height: '20px', padding: '0', fontSize: '0.6rem' }}
                                title="Increase quantity"
                              >
                                <i className="bi bi-plus"></i>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCartItemClick(item);
                                }}
                                style={{ width: '20px', height: '20px', padding: '0', fontSize: '0.6rem' }}
                                title="Edit item"
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.quantity === 1) {
                                    setItemToDelete(item);
                                    setDeleteConfirmOpen(true);
                                  } else {
                                    updateCartItemQuantity(item.id, -1);
                                  }
                                }}
                                style={{ width: '20px', height: '20px', padding: '0', fontSize: '0.6rem' }}
                                title="Decrease quantity"
                              >
                                <i className="bi bi-dash"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="bg-white p-2 border-top">
              <div className="d-flex gap-2">
                <Button variant="outline-primary" size="sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>
                  <i className="bi bi-pencil me-1"></i>
                  EDIT
                </Button>
                <Button variant="outline-primary" size="sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>
                  <i className="bi bi-eye me-1"></i>
                  STOCK
                </Button>
                <Button variant="outline-danger" size="sm" onClick={() => setCart([])} style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>
                  <i className="bi bi-cart-x me-1"></i>
                  CLEAR
                </Button>
              </div>
            </div>

            {/* Sales Summary */}
            <div className="bg-primary text-white p-2">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <small className="d-block">Subtotal: €{calculateTotal().toFixed(2)}</small>
                  <small className="d-block">Discount: €0.00</small>
                </div>
                <div className="text-end">
                  <h4 className="mb-0 fw-bold">€{calculateTotal().toFixed(2)}</h4>
                </div>
              </div>
            </div>

            {/* Bottom Control Panel */}
            <div className="bg-light text-dark p-2 flex-grow-1">
              <Row className="align-items-center h-100">
                <Col md={4}>
                  <div className="d-grid gap-1">
                    <Button variant="primary" size="sm" className="fw-bold">
                      <i className="bi bi-percent me-1"></i>
                      Discount
                    </Button>
                    <Button variant="secondary" size="sm" className="fw-bold">
                      <i className="bi bi-x-circle me-1"></i>
                      Exit
                    </Button>
                  </div>
                </Col>
                <Col md={4}>
                  {/* Numeric Keypad */}
                  <div className="d-grid gap-1 numeric-keypad" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: '180px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <Button key={num} variant="outline-secondary" size="sm" className="fw-bold py-1">
                        {num}
                      </Button>
                    ))}
                    <Button variant="outline-secondary" size="sm" className="fw-bold py-1">C</Button>
                    <Button variant="outline-secondary" size="sm" className="fw-bold py-1">0</Button>
                    <Button variant="outline-secondary" size="sm" className="fw-bold py-1">
                      <i className="bi bi-backspace"></i>
                    </Button>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="d-grid gap-1">
                    <Button variant="success" size="sm" className="fw-bold py-2" onClick={handleCheckout} disabled={loading}>
                      {loading ? <Spinner animation="border" size="sm" className="me-1" /> : <i className="bi bi-check-circle me-1"></i>}
                      Checkout
                    </Button>
                    <Button variant="warning" size="sm" className="fw-bold py-2">
                      <i className="bi bi-pause-circle me-1"></i>
                      On Hold
                    </Button>
                    <Button variant="info" size="sm" className="fw-bold py-2">
                      <i className="bi bi-cash-stack me-1"></i>
                      Open Till
                    </Button>
                  </div>
                </Col>
              </Row>
            </div>
          </Col>

          {/* Right Sidebar */}
          <Col xs={12} lg={4} className="bg-white p-2 d-flex flex-column">
            {/* Selected Item Display */}
            {selectedCartItem && (
              <div className="mb-1 p-2 bg-light rounded border">
                <h6 className="mb-1 fw-bold text-primary small">Selected Item:</h6>
                <p className="mb-1 small">{selectedCartItem.itemName}</p>
                <p className="mb-0 small text-muted">Qty: {selectedCartItem.quantity} × €{selectedCartItem.unitPrice.toFixed(2)}</p>
              </div>
            )}

            {/* Barcode Input */}
            <div className="mb-1">
              <h6 className="fw-bold mb-1 small">Barcode Read</h6>
              <InputGroup size="sm">
                <InputGroup.Text>
                  <i className="bi bi-upc-scan"></i>
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
                />
              </InputGroup>
            </div>

            {/* Categories / Category Items Navigation */}
            <div className="mb-1">
              {currentView === 'categories' ? (
                <>
                  <h6 className="fw-bold mb-1 small">Categories</h6>
                  <div className="d-grid gap-1" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    {categories.map((category) => (
                      <Button 
                        key={category.id} 
                        variant={category.name === 'Quick Sale' ? 'primary' : 'outline-primary'} 
                        size="sm"
                        className="fw-bold category-btn py-1"
                        onClick={() => handleCategoryClick(category)}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </>
              ) : currentView === 'quickSale' ? (
                <>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <h6 className="fw-bold small mb-0">Quick Sale</h6>
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
                  <div className="d-grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {quickSalePrices.slice(0, 12).map((price, index) => (
                      <Button
                        key={index}
                        variant="outline-primary"
                        onClick={() => handleQuickPriceSale(price)}
                        className="py-1 fw-bold quick-sale-btn"
                        size="sm"
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
                    <div className="d-grid gap-1" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      {categoryItems.map((item) => (
                        <Button
                          key={item.id}
                          variant="outline-primary"
                          onClick={() => handleCategoryItemClick(item)}
                          className="py-1 fw-bold category-item-btn"
                          size="sm"
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
          </Col>
        </Row>
      </Container>

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

      {/* Checkout Payment Dialog */}
      <Modal show={checkoutDialogOpen} onHide={() => setCheckoutDialogOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-credit-card me-2"></i>
            Select Payment Method
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <div className="mb-4">
            <h5>Total Amount: <span className="text-primary fw-bold">€{calculateTotal().toFixed(2)}</span></h5>
            <p className="text-muted">Choose payment method to complete the sale</p>
          </div>
          <div className="d-grid gap-3">
            <Button
              variant="success"
              size="lg"
              className="py-3"
              onClick={() => handleConfirmCheckout('CASH')}
              disabled={loading}
            >
              <i className="bi bi-cash-coin me-2"></i>
              Cash Payment
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="py-3"
              onClick={() => handleConfirmCheckout('CARD')}
              disabled={loading}
            >
              <i className="bi bi-credit-card me-2"></i>
              Card Payment
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setCheckoutDialogOpen(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={deleteConfirmOpen} onHide={handleCancelDelete} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Remove Item from Cart
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {itemToDelete && (
            <div>
              <p className="mb-3">
                Are you sure you want to remove this item from the cart?
              </p>
              <div className="bg-light p-3 rounded">
                <Row>
                  <Col xs={8}>
                    <strong>{itemToDelete.itemName}</strong>
                    {itemToDelete.itemBarcode && itemToDelete.itemBarcode !== 'N/A' && (
                      <small className="d-block text-muted">
                        <i className="bi bi-upc me-1"></i>
                        {itemToDelete.itemBarcode}
                      </small>
                    )}
                  </Col>
                  <Col xs={4} className="text-end">
                    <div className="text-muted small">Quantity</div>
                    <div className="fw-bold">{itemToDelete.quantity}</div>
                  </Col>
                </Row>
                <Row className="mt-2">
                  <Col xs={6}>
                    <div className="text-muted small">Unit Price</div>
                    <div>€{itemToDelete.unitPrice.toFixed(2)}</div>
                  </Col>
                  <Col xs={6} className="text-end">
                    <div className="text-muted small">Total</div>
                    <div className="fw-bold text-danger">€{itemToDelete.totalPrice.toFixed(2)}</div>
                  </Col>
                </Row>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelDelete}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            <i className="bi bi-trash me-2"></i>
            Remove Item
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SalesPage;