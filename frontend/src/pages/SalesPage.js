import React, { useState, useEffect, useRef } from 'react';
import { useTimeoutManager } from '../hooks/useTimeoutManager';
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
import FullscreenIndicator from '../components/FullscreenIndicator';
import SimpleBarcodeScanner from '../components/SimpleBarcodeScanner';
import EditItemDialog from '../components/EditItemDialog';
import JsBarcode from 'jsbarcode';
import { directPrint, createReceiptHTML } from '../utils/printUtils';

const SalesPage = () => {
  const [cart, setCart] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companyName, setCompanyName] = useState('ADAMS GREEN');
  const [companyAddress, setCompanyAddress] = useState('');
  const [lastSale, setLastSale] = useState(null);
  const { user, logout } = useAuth();
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
  const barcodeInputRef = useRef(null);
  const paymentInProgressRef = useRef(false);
  const cashPaymentTimeoutRef = useRef(null);
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
    vatRate: '23.00', // Default 23% VAT
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
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [customDiscountAmount, setCustomDiscountAmount] = useState('');
  const [outOfStockDialogOpen, setOutOfStockDialogOpen] = useState(false);
  const [outOfStockItem, setOutOfStockItem] = useState(null);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [printLabelDialogOpen, setPrintLabelDialogOpen] = useState(false);
  const [itemToPrint, setItemToPrint] = useState(null);
  const [itemFormCache, setItemFormCache] = useState({}); // Cache for item registration forms by barcode
  const lastClickRef = React.useRef({});
  const { addTimeout } = useTimeoutManager();

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      itemId: '',
      quantity: 1,
      unitPrice: 0,
    },
  });

  const selectedItemId = watch('itemId');
  const quickSalePrices = [0.05, 0.10, 0.20, 0.50, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 15, 20, 40];

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchCompanyName();
  }, []);

  // Broadcast cart updates to customer display window
  useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
      const discountAmount = appliedDiscount 
        ? (appliedDiscount.type === 'percentage' 
          ? (subtotal * appliedDiscount.value) / 100 
          : Math.min(appliedDiscount.value, subtotal))
        : 0;
      const total = Math.max(0, subtotal - discountAmount);
      
      const cartData = {
        cart: cart,
        subtotal: subtotal,
        discountAmount: discountAmount,
        total: total
      };
      
      window.electron.ipcRenderer.send('cart-updated', cartData);
    }
  }, [cart, appliedDiscount, customDiscountAmount]);

  // Auto-focus barcode input on mount and keep it focused
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Refocus barcode input after modals close, cart operations, etc.
  useEffect(() => {
    if (!scannerOpen && !simpleScannerOpen && !addItemDialogOpen && !itemNotFoundDialogOpen && 
        !registerItemDialogOpen && !checkoutDialogOpen && !cashConfirmDialogOpen && 
        !outOfStockDialogOpen && !editItemDialogOpen && !printLabelDialogOpen) {
      // Small delay to ensure modal is fully closed
      const timer = setTimeout(() => {
        if (barcodeInputRef.current && document.activeElement !== barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scannerOpen, simpleScannerOpen, addItemDialogOpen, itemNotFoundDialogOpen, 
      registerItemDialogOpen, checkoutDialogOpen, cashConfirmDialogOpen, 
      outOfStockDialogOpen, editItemDialogOpen, printLabelDialogOpen]);

  // Keep barcode input focused continuously (when no modals are open)
  useEffect(() => {
    if (!scannerOpen && !simpleScannerOpen && !addItemDialogOpen && !itemNotFoundDialogOpen && 
        !registerItemDialogOpen && !checkoutDialogOpen && !cashConfirmDialogOpen && 
        !outOfStockDialogOpen && !editItemDialogOpen && !printLabelDialogOpen) {
      const handleFocusLoss = () => {
        // Only refocus if user clicked outside an input/button or on the document
        setTimeout(() => {
          if (barcodeInputRef.current && 
              document.activeElement !== barcodeInputRef.current && 
              document.activeElement?.tagName !== 'INPUT' && 
              document.activeElement?.tagName !== 'BUTTON' &&
              document.activeElement?.tagName !== 'SELECT') {
            barcodeInputRef.current.focus();
          }
        }, 100);
      };
      
      // Listen for clicks that might steal focus
      document.addEventListener('click', handleFocusLoss);
      document.addEventListener('focusin', handleFocusLoss);
      
      return () => {
        document.removeEventListener('click', handleFocusLoss);
        document.removeEventListener('focusin', handleFocusLoss);
      };
    }
  }, [scannerOpen, simpleScannerOpen, addItemDialogOpen, itemNotFoundDialogOpen, 
      registerItemDialogOpen, checkoutDialogOpen, cashConfirmDialogOpen, 
      outOfStockDialogOpen, editItemDialogOpen, printLabelDialogOpen]);

  useEffect(() => {
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

  // Helper function to save form data to cache
  const saveFormToCache = (barcode, formData) => {
    if (barcode && barcode.trim() !== '') {
      setItemFormCache(prev => ({
        ...prev,
        [barcode]: { ...formData }
      }));
    }
  };

  // Helper function to load form data from cache
  const loadFormFromCache = (barcode) => {
    if (barcode && barcode.trim() !== '' && itemFormCache[barcode]) {
      return { ...itemFormCache[barcode] };
    }
    return null;
  };

  // Helper function to clear form cache for a specific barcode
  const clearFormCache = (barcode) => {
    if (barcode && barcode.trim() !== '') {
      setItemFormCache(prev => {
        const newCache = { ...prev };
        delete newCache[barcode];
        return newCache;
      });
    }
  };

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
      
      // Sort categories to put "Quick Sale" first, then alphabetically
      const sortedCategories = posCategories.sort((a, b) => {
        if (a.name === 'Quick Sale') return -1;
        if (b.name === 'Quick Sale') return 1;
        return a.name.localeCompare(b.name);
      });
      
      setCategories(sortedCategories);
    } catch (err) {
      console.error('Failed to load categories:', err);
      // Set empty categories if API fails - only Quick Sale will be available
      setCategories([]);
    }
  };

  const fetchCompanyName = async () => {
    try {
      const response = await companySettingsAPI.get();
      setCompanyName(response.data.companyName || 'ADAMS GREEN');
      setCompanyAddress(response.data.address || '');
    } catch (error) {
      console.error('Failed to fetch company name:', error);
      // Keep default name if fetch fails
    }
  };
  
  const handlePrintLastSale = async () => {
    if (!lastSale) {
      setError('No recent sale to print');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    try {
      // Fetch latest company settings before printing
      let currentCompanySettings = { companyName: companyName, address: companyAddress };
      try {
        const response = await companySettingsAPI.get();
        const settingsData = response.data || response;
        if (settingsData) {
          currentCompanySettings = {
            companyName: settingsData.companyName || 'ADAMS GREEN',
            address: settingsData.address || ''
          };
        }
      } catch (err) {
        console.error("Failed to fetch company settings for print:", err);
        // Use existing state if fetch fails
      }
      
      const receiptContent = createReceiptHTML(
        lastSale, 
        currentCompanySettings.companyName, 
        currentCompanySettings.address
      );
      try {
        await directPrint(receiptContent, `Receipt - Sale #${lastSale.id}`);
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
        // Add new item to cart at the beginning (latest first)
        return [newItem, ...currentCart];
      }
    });
  };

  // Helper function for quick sale items (special case)
  const addOrUpdateQuickSaleItem = (price) => {
    setCart(currentCart => {
      const existingItemIndex = currentCart.findIndex(
        item => item.itemId === null && item.unitPrice === price
      );

      if (existingItemIndex >= 0) {
        // Update quantity of existing quick sale item
        const updatedCart = [...currentCart];
        updatedCart[existingItemIndex].quantity += 1;
        updatedCart[existingItemIndex].totalPrice = 
          updatedCart[existingItemIndex].unitPrice * updatedCart[existingItemIndex].quantity;
        return updatedCart;
      } else {
        // Add new quick sale item at the beginning (latest first)
        const quickSaleItem = {
          id: Date.now() + Math.random(),
          itemId: null,
          itemName: `Quick Sale (€${price.toFixed(2)})`,
          itemBarcode: 'N/A',
          quantity: 1,
          unitPrice: price,
          totalPrice: price
        };
        return [quickSaleItem, ...currentCart];
      }
    });
  };

  const processBarcode = async (barcode) => {
    try {
      const response = await itemsAPI.getByBarcode(barcode);
      const item = response.data;

      // Check if item is out of stock
      if (item.stockQuantity <= 0) {
        setOutOfStockItem(item);
        setOutOfStockDialogOpen(true);
        setScannerOpen(false);
        setSimpleScannerOpen(false);
        return;
      }

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
      addTimeout(() => setError(null), 3000);
      return;
    }

    // Check if item is out of stock
    if (item.stockQuantity <= 0) {
      setOutOfStockItem(item);
      setOutOfStockDialogOpen(true);
      setAddItemDialogOpen(false);
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

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const calculateDiscountAmount = () => {
    if (!appliedDiscount) return 0;
    
    const subtotal = calculateSubtotal();
    if (appliedDiscount.type === 'percentage') {
      return (subtotal * appliedDiscount.value) / 100;
    } else {
      return Math.min(appliedDiscount.value, subtotal); // Don't discount more than the total
    }
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    return Math.max(0, subtotal - discountAmount);
  };

  const handleDiscountSelect = (discount) => {
    setAppliedDiscount(discount);
    setDiscountDialogOpen(false);
  };

  const handleCustomDiscountApply = () => {
    const amount = parseFloat(customDiscountAmount);
    if (amount > 0 && amount <= calculateSubtotal()) {
      setAppliedDiscount({ type: 'fixed', value: amount });
      setCustomDiscountAmount('');
      setDiscountDialogOpen(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setCustomDiscountAmount('');
  };

  const calculateDiscountedItemPrice = (item) => {
    if (!appliedDiscount) return item.totalPrice;
    
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    const discountRatio = discountAmount / subtotal;
    
    return item.totalPrice * (1 - discountRatio);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setError('Cart is empty. Add items before checkout.');
      addTimeout(() => setError(null), 3000);
      return;
    }
    setCashAmount('');
    setSelectedNotes({});
    setCheckoutDialogOpen(true);
  };

  const handleCloseCheckoutDialog = () => {
    // Clear any pending payment timeout
    if (cashPaymentTimeoutRef.current) {
      clearTimeout(cashPaymentTimeoutRef.current);
      cashPaymentTimeoutRef.current = null;
    }
    // Reset payment state if not in progress
    if (!paymentInProgressRef.current) {
      setCashAmount('');
      setSelectedNotes({});
    }
    setCheckoutDialogOpen(false);
    setCashConfirmDialogOpen(false);
  };

  const handleNoteSelection = (noteValue) => {
    // Prevent note selection from triggering checkout if payment is in progress
    if (paymentInProgressRef.current) {
      return;
    }
    
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
              // Prevent double-click or multiple submissions
              if (paymentInProgressRef.current || loading) {
                return;
              }
              
              if (selectedPaymentMethod === 'CASH') {
                // For cash payment, show confirmation dialog with change calculation
                const change = calculateChange();
                setChangeDue(change);
                
                // Only show dialog if there's change due
                if (change > 0) {
                  setCashConfirmDialogOpen(true);
                  
                  // Clear any existing timeout
                  if (cashPaymentTimeoutRef.current) {
                    clearTimeout(cashPaymentTimeoutRef.current);
                  }
                  
                  // Auto-close after 5 seconds
                  cashPaymentTimeoutRef.current = setTimeout(() => {
                    cashPaymentTimeoutRef.current = null;
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
    // Prevent duplicate payment processing
    if (paymentInProgressRef.current) {
      return;
    }
    
    // Clear any pending timeout
    if (cashPaymentTimeoutRef.current) {
      clearTimeout(cashPaymentTimeoutRef.current);
      cashPaymentTimeoutRef.current = null;
    }
    
    paymentInProgressRef.current = true;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setCheckoutDialogOpen(false);

    try {
      const saleItems = cart.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: calculateDiscountedItemPrice(item)
      }));

      const saleData = {
        totalAmount: calculateTotal(),
        subtotalAmount: calculateSubtotal(),
        discountAmount: calculateDiscountAmount(),
        discountType: appliedDiscount?.type || null,
        discountValue: appliedDiscount?.value || null,
        paymentMethod: 'CASH',
        saleItems: saleItems,
        userId: user?.id || null,
        cashAmount: parseFloat(cashAmount || 0),
        changeDue: parseFloat(cashAmount || 0) > 0 ? calculateChange() : 0
      };

      const response = await salesAPI.create(saleData);
      
      // Store the last sale for printing
      setLastSale(response.data);
      
      setCart([]);
      setCashAmount('');
      setSelectedNotes({});
      setAppliedDiscount(null); // Clear discount after sale
      setSelectedCartItem(null); // Clear selected item after sale
      setCustomDiscountAmount('');
      setSuccess('Cash payment completed successfully!');
      addTimeout(() => setSuccess(null), 3000);
      // Refocus barcode input after payment
      setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 200);
    } catch (err) {
      console.error('Error creating sale:', err);
      console.error('Error response:', err.response?.data);
      setError(`Failed to complete sale: ${err.response?.data || err.message}`);
      setTimeout(() => setError(null), 5000);
      // Refocus barcode input even on error
      setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 200);
    } finally {
      setLoading(false);
      paymentInProgressRef.current = false;
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
        totalPrice: calculateDiscountedItemPrice(item)
      }));

      const saleData = {
        totalAmount: calculateTotal(),
        subtotalAmount: calculateSubtotal(),
        discountAmount: calculateDiscountAmount(),
        discountType: appliedDiscount?.type || null,
        discountValue: appliedDiscount?.value || null,
        paymentMethod: 'CARD',
        saleItems: saleItems,
        userId: user?.id || null,
      };

      const response = await salesAPI.create(saleData);
      
      // Store the last sale for printing
      setLastSale(response.data);
      
      setCart([]);
      setAppliedDiscount(null); // Clear discount after sale
      setCustomDiscountAmount('');
      setSelectedCartItem(null); // Clear selected item after sale
      setSuccess('Card payment completed successfully!');
      addTimeout(() => setSuccess(null), 3000);
      // Refocus barcode input after payment
      setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 200);
    } catch (err) {
      console.error('Error creating sale:', err);
      console.error('Error response:', err.response?.data);
      setError(`Failed to complete sale: ${err.response?.data || err.message}`);
      setTimeout(() => setError(null), 5000);
      // Refocus barcode input even on error
      setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 200);
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
      addTimeout(() => setError(null), 3000);
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
        addTimeout(() => setError(null), 3000);
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
      return; // Ignore this click
    }
    lastClickRef.current[clickKey] = now;

    // Check if item is out of stock
    if (item.stockQuantity <= 0) {
      setOutOfStockItem(item);
      setOutOfStockDialogOpen(true);
      return;
    }

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
    
    if (!selectedCartItem) {
      setError('Please select an item from the cart first.');
      addTimeout(() => setError(null), 3000);
      return;
    }
    
    updateCartItemQuantity(selectedCartItem.id, 1);
    setSuccess(`Increased quantity for ${selectedCartItem.itemName}`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleDecrementSelectedItem = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedCartItem) {
      setError('Please select an item from the cart first.');
      addTimeout(() => setError(null), 3000);
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

  const handleEditSelectedItem = async () => {
    if (!selectedCartItem) {
      setError('Please select an item from the cart first.');
      addTimeout(() => setError(null), 3000);
      return;
    }
    
    // Fetch the full item data from database to get actual stock quantity and category
    try {
      setLoading(true);
      const response = await itemsAPI.getById(selectedCartItem.itemId);
      const fullItemData = response.data || response;
      
      // Merge cart item data with database item data
      const itemToEditData = {
        ...selectedCartItem,
        stockQuantity: fullItemData.stockQuantity, // Use actual DB stock quantity
        categoryId: fullItemData.categoryId, // Use actual DB category
        generalExpiryDate: fullItemData.generalExpiryDate,
        batchId: fullItemData.batchId,
        description: fullItemData.description,
        vatRate: fullItemData.vatRate
      };
      
      setItemToEdit(itemToEditData);
      setEditItemDialogOpen(true);
    } catch (error) {
      console.error('Error fetching item details:', error);
      setError('Failed to load item details. Please try again.');
      addTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };


  const handleItemDiscountChange = (itemId, discountValue) => {
    const discountAmount = parseFloat(discountValue) || 0;
    
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === itemId) {
          const originalPrice = item.originalPrice || item.unitPrice;
          const newUnitPrice = Math.max(0, originalPrice - discountAmount);
          const newTotalPrice = newUnitPrice * item.quantity;
          
          return {
            ...item,
            unitPrice: newUnitPrice,
            totalPrice: newTotalPrice,
            originalPrice: originalPrice,
            discountAmount: discountAmount,
            discountApplied: discountAmount > 0
          };
        }
        return item;
      })
    );
  };

  const handleSaveEditedItem = async (formData) => {
    if (!itemToEdit) return;

    setLoading(true);
    try {
      // Prepare item data for database update
      const itemData = {
        ...formData,
        price: parseFloat(formData.price),
        stockQuantity: parseInt(formData.stockQuantity),
        vatRate: parseFloat(formData.vatRate)
      };

      // Update the item in the database
      await itemsAPI.update(itemToEdit.itemId, itemData);

      // Update the item in the cart
      const updatedCart = cart.map(item => {
        if (item.id === itemToEdit.id) {
          const updatedItem = {
            ...item,
            itemName: formData.name || item.itemName,
            unitPrice: parseFloat(formData.price),
            quantity: parseInt(formData.stockQuantity),
            totalPrice: parseFloat(formData.price) * parseInt(formData.stockQuantity),
            itemBarcode: formData.barcode || item.itemBarcode,
            description: formData.description || item.description,
            categoryId: formData.categoryId || item.categoryId,
            vatRate: parseFloat(formData.vatRate) || item.vatRate,
            batchId: formData.batchId || item.batchId,
            generalExpiryDate: formData.generalExpiryDate || item.generalExpiryDate
          };
          return updatedItem;
        }
        return item;
      });

      setCart(updatedCart);
      setEditItemDialogOpen(false);
      setSuccess(`Updated ${formData.name || itemToEdit.itemName} in cart and database.`);
    addTimeout(() => setSuccess(null), 3000);
      
      // Show print label dialog
      setItemToPrint({
        name: formData.name,
        barcode: formData.barcode,
        price: parseFloat(formData.price)
      });
      setPrintLabelDialogOpen(true);
      setItemToEdit(null);
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('Failed to update item. Please try again.');
      addTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintItemLabel = () => {
    if (!itemToPrint) return;
    
    // Generate barcode SVG
    let barcodeDataURL = '';
    if (itemToPrint.barcode) {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, itemToPrint.barcode, {
          format: 'CODE128',
          width: 1,
          height: 40,
          displayValue: false,
          margin: 0
        });
        barcodeDataURL = canvas.toDataURL('image/png');
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
    
    const labelHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Item Label - ${itemToPrint.name}</title>
        <meta charset="UTF-8">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          @media print {
            @page { 
              size: 2in 4in;
              margin: 0.01in;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          
          body {
            font-family: 'Arial', sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 4in;
            padding: 0.01in;
            font-weight: bold;
          }
          
          .label-container {
            text-align: center;
            width: 100%;
            padding: 0;
          }
          
          .item-name {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 8px;
            word-wrap: break-word;
            line-height: 1.2;
          }
          
          .barcode-container {
            margin: 8px 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          
          .barcode-image {
            max-width: 100%;
            height: auto;
          }
          
          .item-price {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin-top: 5px;
          }
          
          .price-symbol {
            font-size: 18px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="item-name">${itemToPrint.name}</div>
          ${barcodeDataURL ? `
            <div class="barcode-container">
              <img src="${barcodeDataURL}" alt="Barcode" class="barcode-image" />
            </div>
          ` : ''}
          <div class="item-price">
            <span class="price-symbol">€</span>${itemToPrint.price.toFixed(2)}
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Create hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(labelHTML);
    doc.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
    
    setPrintLabelDialogOpen(false);
    setItemToPrint(null);
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
      addTimeout(() => setError(null), 3000);
      return;
    }

    const heldTransaction = {
      id: Date.now(),
      items: [...cart],
      total: calculateTotal(),
      subtotal: calculateSubtotal(),
      discountAmount: calculateDiscountAmount(),
      discountType: appliedDiscount?.type || null,
      discountValue: appliedDiscount?.value || null,
      timestamp: new Date().toLocaleString(),
      customerName: 'Walk-in Customer'
    };

    setHeldTransactions(prev => [...prev, heldTransaction]);
    setCart([]);
    setSelectedCartItem(null); // Clear selected item when holding transaction
    setSuccess('Transaction held successfully!');
    addTimeout(() => setSuccess(null), 3000);
    // Refocus barcode input after holding transaction
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 200);
  };

  const handleLoadHeldTransaction = (heldTransaction) => {
    setCart(heldTransaction.items);
    // Restore discount if it was applied to the held transaction
    if (heldTransaction.discountType && heldTransaction.discountValue) {
      setAppliedDiscount({
        type: heldTransaction.discountType,
        value: heldTransaction.discountValue
      });
    } else {
      setAppliedDiscount(null);
    }
    setCustomDiscountAmount(''); // Clear custom discount amount
    setShowHeldTransactions(false);
    setSuccess('Held transaction loaded!');
    addTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteHeldTransaction = (transactionId) => {
    setHeldTransactions(prev => prev.filter(t => t.id !== transactionId));
    setSuccess('Held transaction deleted!');
    addTimeout(() => setSuccess(null), 3000);
  };

  const handleCheckoutHeldTransaction = (heldTransaction) => {
    setSelectedHeldTransaction(heldTransaction);
    setCart(heldTransaction.items);
    setShowHeldTransactions(false);
    setCheckoutDialogOpen(true);
  };

  return (
    <div className="sales-page-container" style={{ backgroundColor: '#000000', margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'auto', position: 'relative' }}>
      <style>{`
        .sales-page-container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          overflow-x: auto;
          overflow-y: auto;
          width: 100vw;
          height: 100vh;
          position: relative;
          box-sizing: border-box;
        }
        
        /* Enable scrolling for all child containers when zoomed */
        .sales-page-container > * {
          min-width: 0;
          box-sizing: border-box;
        }
        
        /* Make tables and cards scrollable when content overflows */
        .sales-page-container .table-responsive,
        .sales-page-container .table {
          overflow-x: auto;
          overflow-y: visible;
        }
        
        /* Ensure containers don't prevent scrolling */
        .sales-page-container .container-fluid,
        .sales-page-container .row {
          min-width: 0;
          overflow: visible;
        }
        
        .sales-header {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          flex-shrink: 0;
          position: relative;
        }
        .table th {
          background-color: #2a2a2a !important;
          border-bottom: 2px solid #333333;
          font-weight: 600;
          color: #ffffff !important;
        }
        .btn-outline-primary {
          border-color: #ffffff;
          color: #ffffff;
          background-color: transparent;
        }
        .btn-outline-primary:hover {
          background: #3a3a3a;
          border-color: #ffffff;
          color: #ffffff;
        }
        .numeric-keypad .btn {
          min-height: 40px;
          font-size: 1.1rem;
          transition: all 0.2s ease;
        }
        .numeric-keypad .btn:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .category-btn {
          min-height: 35px;
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }
        .category-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .quick-sale-btn {
          min-height: 40px;
          font-size: 0.9rem;
        }
        .cart-item-selected {
          background-color: #3a3a3a !important;
          border-left: 5px solid #ffffff !important;
          box-shadow: 0 3px 6px rgba(255, 255, 255, 0.2) !important;
          font-weight: bold !important;
        }
        .cart-item-row:hover {
          background-color: #3a3a3a !important;
        }
        .cart-item-row:hover.cart-item-selected {
          background-color: #4a4a4a !important;
          box-shadow: 0 4px 8px rgba(255, 255, 255, 0.3) !important;
        }
        
        /* 3D Button Effect - Similar to Dashboard stats-card */
        .btn-3d {
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          border: 1px solid #333333 !important;
        }
        
        .btn-3d::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #4a4a4a 0%, #3a3a3a 100%);
          z-index: 1;
        }
        
        .btn-3d:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(255, 255, 255, 0.15), 0 4px 8px rgba(0, 0, 0, 0.3);
          border-color: #4a4a4a !important;
        }
        
        .btn-3d:hover::before {
          background: linear-gradient(90deg, #5a5a5a 0%, #4a4a4a 100%);
        }
        
        .btn-3d:active {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(255, 255, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .btn-3d:disabled {
          transform: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
          opacity: 0.5;
        }
      `}</style>
      {/* Compact Header */}
      <div className="text-white py-2 px-3" style={{ minHeight: '60px', margin: 0, padding: '0.5rem 1rem', backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a' }}>
        <div className="d-flex align-items-center justify-content-between w-100">
        <div className="d-flex align-items-center">
            <button
              onClick={() => navigate('/')}
              className="btn btn-3d fw-bold text-white d-flex align-items-center"
              style={{
                fontSize: '1.2rem',
                padding: '0.75rem 1.25rem',
                fontWeight: '500',
                background: '#3a3a3a',
                color: 'white',
                border: 'none'
              }}
              title="Go to Dashboard"
            >
              <i className="bi bi-house me-2" style={{ fontSize: '1rem' }}></i>
              {companyName}
            </button>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
              <Button 
                size="sm" 
                className="btn-3d"
                onClick={() => setShowHeldTransactions(!showHeldTransactions)}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', backgroundColor: '#3a3a3a', color: '#ffffff' }}
                title="Hold Transactions"
              >
                <i className="bi bi-pause-circle me-1"></i>
                Hold ({heldTransactions.length})
              </Button>
              <Button
                className="btn-3d d-flex align-items-center justify-content-center"
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  padding: '0',
                  backgroundColor: '#3a3a3a', 
                  color: '#ffffff'
                }}
                title="Tablet Mode"
              >
                <i className="bi bi-tablet" style={{ fontSize: '1.1rem' }}></i>
              </Button>
              <Button
                className="btn-3d d-flex align-items-center justify-content-center"
                onClick={() => navigate('/company')}
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  padding: '0',
                  backgroundColor: '#3a3a3a', 
                  color: '#ffffff'
                }}
                title="Settings"
              >
                <i className="bi bi-gear" style={{ fontSize: '1.1rem' }}></i>
              </Button>
              <Button
                className="btn-3d d-flex align-items-center justify-content-center"
                onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  padding: '0',
                  backgroundColor: '#3a3a3a', 
                  color: '#ffffff'
                }}
                title="Logout"
              >
                <i className="bi bi-box-arrow-right" style={{ fontSize: '1.1rem' }}></i>
              </Button>
              <Button
                className="btn-3d d-flex align-items-center justify-content-center"
                onClick={() => {
                  // Check if running in Electron
                  if (window && window.require) {
                    try {
                      const { ipcRenderer } = window.require('electron');
                      ipcRenderer.send('app-minimize');
                    } catch (error) {
                      console.error('Error minimizing app:', error);
                    }
                  } else if (window.electron && window.electron.ipcRenderer) {
                    window.electron.ipcRenderer.send('app-minimize');
                  }
                }}
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  padding: '0',
                  backgroundColor: '#3a3a3a', 
                  color: '#ffffff'
                }}
                title="Minimize Application"
              >
                <i className="bi bi-dash-lg" style={{ fontSize: '1.1rem' }}></i>
              </Button>
              <Button
                className="btn-3d d-flex align-items-center justify-content-center"
                onClick={() => {
                  // Check if running in Electron
                  if (window && window.require) {
                    try {
                      const { ipcRenderer } = window.require('electron');
                      ipcRenderer.send('app-closing');
                    } catch (error) {
                      console.error('Error closing app:', error);
                    }
                  } else {
                    // If not in Electron, just logout
                    logout();
                    navigate('/login');
                  }
                }}
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  padding: '0',
                  backgroundColor: '#3a3a3a', 
                  color: '#ffffff'
                }}
                title="Close Application"
              >
                <i className="bi bi-power" style={{ fontSize: '1.1rem' }}></i>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Success and Error Messages - Fixed Position */}
      {success && (
        <Alert 
          onClose={() => setSuccess(null)} 
          dismissible
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            minWidth: '400px',
            maxWidth: '600px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backgroundColor: '#3a3a3a',
            border: '1px solid #ffffff',
            color: '#ffffff'
          }}
        >
          <i className="bi bi-check-circle me-2"></i>
          {success}
        </Alert>
      )}
      {error && (
        <Alert 
          onClose={() => setError(null)} 
          dismissible
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            minWidth: '400px',
            maxWidth: '600px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backgroundColor: '#3a3a3a',
            border: '1px solid #ffffff',
            color: '#ffffff'
          }}
        >
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="d-flex" style={{ margin: 0, padding: '0.5rem', gap: '0.5rem', minWidth: 'fit-content', minHeight: 'fit-content' }}>
          {/* Left Panel - Items Grid (70%) */}
        <div className="d-flex flex-column" style={{ width: '70%', padding: 0, backgroundColor: '#2a2a2a', borderRadius: '8px', overflow: 'hidden', color: '#ffffff', border: '1px solid #333333' }}>
          {showHeldTransactions ? (
            /* Held Transactions View */
            <div className="bg-dark" style={{ height: '100%', overflowY: 'auto', padding: '1rem', backgroundColor: '#2a2a2a', color: '#ffffff' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">Held Transactions ({heldTransactions.length})</h4>
                <Button onClick={() => setShowHeldTransactions(false)} style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>
                  <i className="bi bi-x-circle me-1"></i>
                  Back to Sales
                </Button>
              </div>
              
              {heldTransactions.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-pause-circle fs-1" style={{ color: '#aaaaaa' }}></i>
                  <h5 className="mt-3" style={{ color: '#aaaaaa' }}>No Held Transactions</h5>
                  <p style={{ color: '#aaaaaa' }}>Transactions you hold will appear here</p>
                </div>
              ) : (
                <div className="row g-3">
                  {heldTransactions.map((transaction) => (
                    <div key={transaction.id} className="col-md-6 col-lg-4">
                      <div className="card h-100" style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}>
                        <div className="card-header d-flex justify-content-between align-items-center" style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #333333', color: '#ffffff' }}>
                          <small style={{ color: '#aaaaaa' }}>{transaction.timestamp}</small>
                          <Button 
                            size="sm" 
                            onClick={() => handleDeleteHeldTransaction(transaction.id)}
                            title="Delete Transaction"
                            style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                        <div className="card-body" style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                          <h6 className="card-title" style={{ color: '#ffffff' }}>{transaction.customerName}</h6>
                          <p className="card-text" style={{ color: '#ffffff' }}>
                            <strong>{transaction.items.length}</strong> items
                          </p>
                          <div className="mb-2">
                            {transaction.items.slice(0, 2).map((item, index) => (
                              <div key={index} className="small" style={{ color: '#aaaaaa' }}>
                                {item.itemName} x{item.quantity}
                              </div>
                            ))}
                            {transaction.items.length > 2 && (
                              <div className="small" style={{ color: '#aaaaaa' }}>
                                +{transaction.items.length - 2} more items
                              </div>
                            )}
                          </div>
                          <h5 className="mb-3" style={{ color: '#ffffff' }}>€{transaction.total.toFixed(2)}</h5>
                        </div>
                        <div className="card-footer d-grid gap-2" style={{ backgroundColor: '#2a2a2a', borderTop: '1px solid #333333' }}>
                          <Button 
                            size="sm"
                            onClick={() => handleLoadHeldTransaction(transaction)}
                            style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
                          >
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Load
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleCheckoutHeldTransaction(transaction)}
                            style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
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
              <div className="bg-dark flex-grow-1" style={{ height: '350px', overflowY: 'auto', padding: '0.5rem', backgroundColor: '#2a2a2a', border: '1px solid #333333', borderRadius: '8px', color: '#ffffff' }}>
              {cart.length === 0 ? (
                  <div className="text-center py-2">
                    <i className="bi bi-cart fs-3" style={{ color: '#aaaaaa' }}></i>
                    <p className="mt-1 mb-0" style={{ fontSize: '0.7rem', color: '#aaaaaa' }}>Cart is empty</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped hover className="mb-0" size="sm">
                      <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                        <tr>
                          <th style={{ width: '8%', fontSize: '1rem', padding: '0.6rem' }}>ID</th>
                          <th style={{ width: '40%', fontSize: '1rem', padding: '0.6rem' }}>Item</th>
                          <th className="text-end" style={{ width: '12%', fontSize: '1rem', padding: '0.6rem' }}>Price</th>
                          <th className="text-center" style={{ width: '10%', fontSize: '1rem', padding: '0.6rem' }}>Quantity</th>
                          <th className="text-end" style={{ width: '10%', fontSize: '1rem', padding: '0.6rem' }}>Discount</th>
                          <th className="text-end" style={{ width: '20%', fontSize: '1rem', padding: '0.6rem' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, index) => (
                        <tr 
                          key={index} 
                          onClick={() => handleCartItemClick(item)}
                          className={`cart-item-row ${selectedCartItem && selectedCartItem.id === item.id ? 'cart-item-selected' : ''}`}
                          style={{ cursor: 'pointer', backgroundColor: '#2a2a2a', color: '#ffffff' }}
                        >
                            <td style={{ fontSize: '1rem', padding: '0.6rem' }}>{index + 1}</td>
                            <td style={{ fontSize: '1rem', padding: '0.6rem' }}>
                            <div>
                                <strong style={{ fontSize: '1.1rem' }}>{item.itemName}</strong>
                                {item.itemBarcode && item.itemBarcode !== 'N/A' && (
                                  <small className="d-block" style={{ fontSize: '0.8rem', color: '#aaaaaa' }}>
                                    <i className="bi bi-upc" style={{ fontSize: '0.7rem' }}></i> {item.itemBarcode}
                                </small>
                              )}
                                {item.discountApplied && (
                                  <small className="d-block" style={{ fontSize: '0.8rem', color: '#ffffff' }}>
                                    <i className="bi bi-percent" style={{ fontSize: '0.7rem' }}></i> Discount Applied
                                </small>
                              )}
                            </div>
                          </td>
                            <td className="text-end" style={{ fontSize: '1rem', padding: '0.6rem' }}>
                              {item.discountApplied ? (
                                <div>
                                  <div className="text-decoration-line-through" style={{ fontSize: '0.9rem', color: '#aaaaaa' }}>
                                    €{item.originalPrice.toFixed(2)}
                                  </div>
                                  <div className="fw-bold" style={{ color: '#ffffff' }}>
                                    €{item.unitPrice.toFixed(2)}
                                  </div>
                                </div>
                              ) : (
                                <span>€{item.unitPrice.toFixed(2)}</span>
                              )}
                            </td>
                            <td className="text-center" style={{ fontSize: '1rem', padding: '0.6rem' }}>
                              <span className="fw-bold">{item.quantity}</span>
                            </td>
                            <td className="text-end" style={{ fontSize: '1rem', padding: '0.6rem' }}>
                              <Form.Control
                                type="text"
                                size="sm"
                                placeholder="€0.00"
                                value={item.discountAmount || ''}
                                onChange={(e) => handleItemDiscountChange(item.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{ width: '60px', fontSize: '0.9rem', backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
                              />
                            </td>
                            <td className="text-end fw-bold" style={{ fontSize: '1rem', padding: '0.6rem' }}>€{item.totalPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </div>
              
              {/* Fixed Control Buttons */}
              <div className="bg-dark d-flex flex-column" style={{ width: '90px', padding: '0.3rem', borderLeft: '1px solid #333333', backgroundColor: '#2a2a2a', borderRadius: '0 8px 8px 0', color: '#ffffff' }}>
                <div className="d-flex flex-column h-100">
                              <Button
                    size="lg"
                    onClick={handleIncrementSelectedItem}
                    disabled={!selectedCartItem}
                    className="flex-fill btn-3d"
                    style={{ fontSize: '1.4rem', padding: '0.8rem', width: '100%', minHeight: '80px', backgroundColor: selectedCartItem ? '#3a3a3a' : '#2a2a2a', color: '#ffffff' }}
                    title="Increase quantity"
                  >
                    <i className="bi bi-plus"></i>
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleDecrementSelectedItem}
                    disabled={!selectedCartItem}
                    className="flex-fill btn-3d"
                    style={{ fontSize: '1.4rem', padding: '0.8rem', width: '100%', minHeight: '80px', backgroundColor: selectedCartItem ? '#3a3a3a' : '#2a2a2a', color: '#ffffff' }}
                    title="Decrease quantity"
                              >
                                <i className="bi bi-dash"></i>
                              </Button>
                              <Button
                    size="lg"
                    onClick={handleEditSelectedItem}
                    disabled={!selectedCartItem}
                    className="flex-fill btn-3d"
                    style={{ fontSize: '1.4rem', padding: '0.8rem', width: '100%', minHeight: '80px', backgroundColor: selectedCartItem ? '#3a3a3a' : '#2a2a2a', color: '#ffffff' }}
                    title="Edit item"
                  >
                    <i className="bi bi-pencil"></i>
                              </Button>
                            </div>
                </div>
            </div>

            {/* Action Buttons Row */}
            <div className="bg-dark" style={{ padding: '0.4rem', border: '1px solid #333333', borderRadius: '8px', marginTop: '0.5rem', backgroundColor: '#2a2a2a', color: '#ffffff' }}>
              <div className="d-flex gap-2 justify-content-between">
              <div className="d-flex gap-2">
                  <Button 
                    size="lg" 
                    className="btn-3d"
                    onClick={() => navigate('/inventory')}
                    style={{ fontSize: '1.1rem', padding: '0.6rem 1rem', minHeight: '45px', backgroundColor: '#3a3a3a', color: '#ffffff' }}
                  >
                    <i className="bi bi-eye me-2"></i>
                  STOCK
                </Button>
                  <Button size="lg" className="btn-3d" onClick={() => {
                    setCart([]); 
                    setAppliedDiscount(null); 
                    setCustomDiscountAmount(''); 
                    setSelectedCartItem(null);
                    // Refocus barcode input after clearing cart
                    setTimeout(() => {
                      if (barcodeInputRef.current) {
                        barcodeInputRef.current.focus();
                      }
                    }, 100);
                  }} style={{ fontSize: '1.1rem', padding: '0.6rem 1rem', minHeight: '45px', backgroundColor: '#3a3a3a', color: '#ffffff' }}>
                    <i className="bi bi-cart-x me-2"></i>
                  CLEAR CART
                </Button>
                {lastSale && (
                  <Button 
                    size="lg" 
                    className="btn-3d"
                    onClick={handlePrintLastSale}
                    title={`Print last sale #${lastSale.id}`}
                    style={{ fontSize: '1.1rem', padding: '0.6rem 1rem', minHeight: '45px', backgroundColor: '#3a3a3a', color: '#ffffff' }}
                  >
                    <i className="bi bi-printer me-2"></i>
                    PRINT LAST SALE
                  </Button>
                )}
                </div>
              </div>
            </div>


            {/* Sales Summary */}
            <div className="bg-dark text-white" style={{ padding: '0.5rem', borderRadius: '8px', marginTop: '0.5rem', backgroundColor: '#2a2a2a', border: '1px solid #333333' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="d-block" style={{ fontSize: '0.9rem' }}>Subtotal: €{calculateSubtotal().toFixed(2)}</div>
                  {appliedDiscount && (
                    <div className="d-block" style={{ fontSize: '0.9rem' }}>
                      Discount: -€{calculateDiscountAmount().toFixed(2)} 
                      <span className="ms-1" style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                        ({appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : `€${appliedDiscount.value}`})
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-end">
                  <h4 className="mb-0 fw-bold" style={{ fontSize: '1.8rem' }}>Total: €{calculateTotal().toFixed(2)}</h4>
                </div>
              </div>
            </div>

            {/* Bottom Control Panel */}
            <div className="bg-dark text-white" style={{ padding: '0.8rem', borderRadius: '8px', marginTop: '0.5rem', backgroundColor: '#2a2a2a', border: '1px solid #333333' }}>
              <div className="d-flex align-items-center justify-content-between gap-3">
                  {/* Discount and Exit Buttons - Moved up and made more prominent */}
                  <div className="d-flex flex-column gap-3" style={{ width: '25%' }}>
                    <Button 
                      size="lg" 
                      className="fw-bold btn-3d" 
                      style={{ padding: '1.2rem', fontSize: '1.3rem', minHeight: '70px', marginTop: '-1rem', backgroundColor: '#3a3a3a', color: '#ffffff' }}
                      onClick={() => setDiscountDialogOpen(true)}
                    >
                      <i className="bi bi-percent me-2"></i>
                      Discount
                        {appliedDiscount && (
                          <Badge className="ms-2" style={{ fontSize: '0.8rem', backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                            {appliedDiscount.type === 'percentage' ? `${appliedDiscount.value}%` : `€${appliedDiscount.value}`}
                          </Badge>
                        )}
                    </Button>
                  <Button 
                    size="lg" 
                    className="fw-bold btn-3d" 
                      style={{ padding: '1.2rem', fontSize: '1.3rem', minHeight: '70px', backgroundColor: '#3a3a3a', color: '#ffffff' }}
                    onClick={() => {
                      // Check if running in Electron
                      if (window && window.require) {
                        try {
                          const { ipcRenderer } = window.require('electron');
                          ipcRenderer.send('app-closing');
                        } catch (error) {
                          console.error('Error closing app:', error);
                        }
                      } else {
                        // If not in Electron, just logout
                        logout();
                        navigate('/login');
                      }
                    }}
                  >
                      <i className="bi bi-power me-2"></i>
                      Exit
                    </Button>
                  </div>
                  
                  {/* Numeric Keypad - Centered and optimized */}
                  <div className="d-grid gap-2 numeric-keypad" style={{ gridTemplateColumns: 'repeat(3, 1fr)', width: '35%', maxWidth: '300px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <Button key={num} size="lg" className="fw-bold btn-3d" style={{ padding: '1rem', fontSize: '1.3rem', minHeight: '60px', backgroundColor: '#3a3a3a', color: '#ffffff' }} onClick={() => setBarcodeInput(prev => prev + num.toString())}>
                        {num}
                      </Button>
                    ))}
                    <Button size="lg" className="fw-bold btn-3d" style={{ padding: '1rem', fontSize: '1.3rem', minHeight: '60px', backgroundColor: '#3a3a3a', color: '#ffffff' }} onClick={() => setBarcodeInput('')}>C</Button>
                    <Button size="lg" className="fw-bold btn-3d" style={{ padding: '1rem', fontSize: '1.3rem', minHeight: '60px', backgroundColor: '#3a3a3a', color: '#ffffff' }} onClick={() => setBarcodeInput(prev => prev + '0')}>0</Button>
                    <Button size="lg" className="fw-bold btn-3d" style={{ padding: '1rem', fontSize: '1.3rem', minHeight: '60px', backgroundColor: '#3a3a3a', color: '#ffffff' }} onClick={() => setBarcodeInput(prev => prev.slice(0, -1))}>
                      <i className="bi bi-backspace"></i>
                    </Button>
                  </div>
                  
                  {/* Action Buttons - Right side, optimized */}
                  <div className="d-flex flex-column gap-2" style={{ width: '40%' }}>
                    <Button size="lg" className="fw-bold btn-3d" style={{ padding: '1.2rem', fontSize: '1.4rem', minHeight: '70px', backgroundColor: '#3a3a3a', color: '#ffffff' }} onClick={handleCheckout} disabled={loading}>
                      {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-check-circle me-2"></i>}
                      Checkout
                    </Button>
                    <Button size="lg" className="fw-bold btn-3d" style={{ padding: '1.2rem', fontSize: '1.4rem', minHeight: '70px', backgroundColor: '#3a3a3a', color: '#ffffff' }} onClick={handleHoldTransaction}>
                      <i className="bi bi-pause-circle me-2"></i>
                      On Hold
                    </Button>
                    <Button size="lg" className="fw-bold btn-3d" style={{ padding: '1.2rem', fontSize: '1.4rem', minHeight: '70px', backgroundColor: '#3a3a3a', color: '#ffffff' }}>
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
        <div className="d-flex flex-column" style={{ width: '35%', padding: 0, borderRadius: '8px', border: '1px solid #333333', backgroundColor: '#2a2a2a', color: '#ffffff' }}>
            {/* Selected Item Display */}
            {selectedCartItem && (
              <div className="mb-1 p-1 bg-dark rounded border" style={{ backgroundColor: '#2a2a2a', borderColor: '#333333', color: '#ffffff' }}>
                <h6 className="mb-1 fw-bold small" style={{ color: '#ffffff' }}>Selected Item:</h6>
                <p className="mb-1 small">{selectedCartItem.itemName}</p>
                <p className="mb-0 small" style={{ color: '#aaaaaa' }}>Qty: {selectedCartItem.quantity} × €{selectedCartItem.unitPrice.toFixed(2)}</p>
              </div>
            )}

            {/* Barcode Input */}
            <div className="mb-2" style={{ padding: '0.5rem' }}>
              <h5 className="fw-bold mb-2 text-center" style={{ color: '#ffffff' }}>Barcode Read</h5>
              <InputGroup size="lg">
                <InputGroup.Text style={{ backgroundColor: '#2a2a2a', borderColor: '#333333', color: '#ffffff' }}>
                  <i className="bi bi-upc-scan fs-5" style={{ color: '#ffffff' }}></i>
                </InputGroup.Text>
                <Form.Control
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scan or enter barcode"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      processBarcode(barcodeInput);
                      setBarcodeInput('');
                      // Refocus after processing
                      setTimeout(() => {
                        if (barcodeInputRef.current) {
                          barcodeInputRef.current.focus();
                        }
                      }, 100);
                    }
                  }}
                  autoFocus
                  style={{ fontSize: '1rem', borderColor: '#333333', backgroundColor: '#2a2a2a', color: '#ffffff' }}
                />
              </InputGroup>
            </div>

            {/* Categories / Category Items Navigation */}
            <div className="mb-1 flex-grow-1 d-flex flex-column" style={{ padding: '0.5rem', overflow: 'hidden' }}>
              {currentView === 'categories' ? (
                <>
                  {/* Categories Header with Blue Background */}
                  <div className="text-center py-2 mb-3 rounded" style={{ fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: '#2a2a2a', borderBottom: '1px solid #333333', color: '#ffffff' }}>
                    Categories
                  </div>
                  {/* Scrollable Categories Container */}
                  <div 
                    style={{ 
                      flex: '1',
                      overflowY: 'auto',
                      paddingRight: '8px'
                    }}
                    className="scrollable-categories"
                  >
                  <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {categories.map((category) => (
                  <Button 
                    key={category.id} 
                    size="lg"
                    className="fw-bold category-btn btn-3d"
                        onClick={() => handleCategoryClick(category)}
                          style={{ 
                            padding: '1rem', 
                            fontSize: '1.1rem', 
                            minHeight: '60px',
                            backgroundColor: category.name === 'Quick Sale' ? '#1a1a1a' : '#3a3a3a',
                            color: '#ffffff'
                          }}
                  >
                    {category.name}
                  </Button>
                ))}
                    </div>
              </div>
                </>
              ) : currentView === 'quickSale' ? (
                <>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h5 className="fw-bold mb-0">Quick Sale</h5>
                    <Button 
                      size="lg" 
                      onClick={handleBackToCategories}
                      title="Back to Categories"
                    style={{ fontSize: '0.9rem', padding: '0.4rem', backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
                    >
                      <i className="bi bi-x-circle me-2"></i>
                      Back
                    </Button>
            </div>
                  {/* Scrollable Quick Sale Container */}
                  <div 
                    style={{ 
                      flex: '1',
                      overflowY: 'auto',
                      paddingRight: '8px'
                    }}
                    className="scrollable-quick-sale"
                  >
              <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {quickSalePrices.map((price, index) => (
                  <Button
                    key={`quick-sale-${price}`}
                    onClick={(e) => handleQuickPriceSale(price, e)}
                        className="fw-bold quick-sale-btn btn-3d"
                    size="lg"
                          style={{ 
                            padding: '1rem', 
                            fontSize: '1.2rem', 
                            minHeight: '65px',
                            backgroundColor: '#3a3a3a',
                            color: '#ffffff'
                          }}
                  >
                    €{price.toFixed(2)}
                  </Button>
                ))}
                    </div>
              </div>
                </>
              ) : (
                <>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <h6 className="fw-bold small mb-0" style={{ color: '#ffffff' }}>{selectedCategory?.name}</h6>
                    <Button 
                      size="sm" 
                      className="py-1 px-2"
                      onClick={handleBackToCategories}
                      title="Back to Categories"
                    style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Back
                    </Button>
            </div>
                  {loading ? (
                    <div className="text-center py-3">
                      <Spinner animation="border" size="sm" />
                      <span className="ms-2 small">Loading items...</span>
                    </div>
                  ) : (
                    /* Scrollable Category Items Container */
                    <div 
                      style={{ 
                        flex: '1',
                        overflowY: 'auto',
                        paddingRight: '8px'
                      }}
                      className="scrollable-category-items"
                    >
                    <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      {categoryItems.map((item) => (
                        <Button
                          key={item.id}
                          onClick={() => handleCategoryItemClick(item)}
                          className="py-2 fw-bold category-item-btn btn-3d"
                          size="lg"
                            style={{ 
                              minHeight: '70px', 
                              fontSize: '1.1rem',
                              backgroundColor: '#3a3a3a',
                              color: '#ffffff'
                            }}
                        >
                          <div className="text-start">
                            <div className="fw-bold">{item.name}</div>
                            <div className="small" style={{ color: '#aaaaaa' }}>€{parseFloat(item.price).toFixed(2)}</div>
                          </div>
                        </Button>
                      ))}
                      </div>
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
        <Modal.Header closeButton style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', color: '#ffffff' }}>
          <Modal.Title style={{ color: '#ffffff' }}>
            <i className="bi bi-plus-circle me-2" style={{ color: '#ffffff' }}></i>
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
              <Form.Label>Price</Form.Label>
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
            <Button onClick={() => setAddItemDialogOpen(false)} style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>
              Cancel
            </Button>
            <Button style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }} type="submit" disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-plus-circle me-2"></i>}
              Add to Cart
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onBarcodeScanned={processBarcode}
      />

      <SimpleBarcodeScanner
        open={simpleScannerOpen}
        onClose={() => setSimpleScannerOpen(false)}
        onBarcodeScanned={processBarcode}
      />

      {/* Unified Payment Dialog */}
      <Modal show={checkoutDialogOpen} onHide={handleCloseCheckoutDialog} centered size="xl" style={{ maxWidth: '90vw', width: '1200px', transform: 'translateX(8%)' }}>
        <Modal.Body className="p-0" style={{ backgroundColor: '#1a1a1a' }}>
          <div className="row g-0">
            {/* Top Section - Transaction Summary */}
            <div className="col-12">
              <div className="row g-0 border-bottom p-4" style={{ backgroundColor: '#2a2a2a' }}>
                <div className="col-4 text-center">
                  <h5 className="mb-2" style={{ color: '#aaaaaa' }}>Balance Due</h5>
                  <h1 className="fw-bold" style={{ color: '#ffffff' }}>€{calculateTotal().toFixed(2)}</h1>
          </div>
                <div className="col-4 text-center">
                  <h5 className="mb-2" style={{ color: '#aaaaaa' }}>Paid</h5>
                  <h3 className="fw-bold" style={{ color: '#ffffff' }}>€{parseFloat(cashAmount || 0).toFixed(2)}</h3>
                </div>
                <div className="col-4 text-center">
                  <h5 className="mb-2" style={{ color: '#aaaaaa' }}>Change Due</h5>
                  <h1 className="fw-bold" style={{ color: '#ffffff' }}>
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
                        className="p-4 d-flex flex-column align-items-center btn-3d"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleNoteSelection(amount);
                        }}
                        disabled={paymentInProgressRef.current || loading}
                        style={{ 
                          height: '100px',
                          background: '#3a3a3a',
                          color: '#ffffff',
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
                          className="w-100 py-4 btn-3d"
                          onClick={() => setCashAmount(prev => prev + num.toString())}
                          style={{ fontSize: '1.5rem', fontWeight: 'bold', backgroundColor: '#3a3a3a', color: '#ffffff' }}
                        >
                          {num}
                        </Button>
                      </div>
                    ))}
                    <div className="col-4">
                      <Button
                        className="w-100 py-4 btn-3d"
                        onClick={() => setCashAmount(prev => prev + '0')}
                        style={{ fontSize: '1.5rem', fontWeight: 'bold', backgroundColor: '#3a3a3a', color: '#ffffff' }}
                      >
                        0
                      </Button>
                    </div>
                    <div className="col-4">
                      <Button
                        className="w-100 py-4 btn-3d"
                        onClick={() => setCashAmount(prev => prev + '.')}
                        style={{ fontSize: '1.5rem', fontWeight: 'bold', backgroundColor: '#3a3a3a', color: '#ffffff' }}
                      >
                        .
                      </Button>
                    </div>
                    <div className="col-4">
                      <Button
                        className="w-100 py-4 btn-3d"
                        onClick={() => {
                          setCashAmount('');
                          setSelectedNotes({});
                        }}
                        style={{ fontSize: '1.5rem', fontWeight: 'bold', backgroundColor: '#3a3a3a', color: '#ffffff' }}
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
                        className="p-4 d-flex flex-column align-items-center btn-3d"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleNoteSelection(amount);
                        }}
                        disabled={paymentInProgressRef.current || loading}
                        style={{ 
                          height: '100px',
                          background: '#3a3a3a',
                          color: '#ffffff',
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
                    className="w-100 py-3 rounded-0 btn-3d"
                    onClick={handleCloseCheckoutDialog}
                    style={{ fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: '#3a3a3a', color: '#ffffff' }}
                  >
                    CANCEL
                  </Button>
                </div>
                <div className="col-3">
            <Button
                    className="w-100 py-3 rounded-0 btn-3d"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleConfirmCheckout('CASH');
                    }}
              disabled={loading || paymentInProgressRef.current}
                    style={{ fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: '#3a3a3a', color: '#ffffff' }}
            >
                    CASH €{calculateTotal().toFixed(2)}
            </Button>
                </div>
                <div className="col-3">
            <Button
                    className="w-100 py-3 rounded-0 btn-3d"
                    onClick={() => {
                      handleConfirmCheckout('CARD');
                      setCheckoutDialogOpen(false);
                    }}
              disabled={loading}
                    style={{ fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: '#3a3a3a', color: '#ffffff' }}
            >
                    CARD €{calculateTotal().toFixed(2)}
            </Button>
                </div>
                <div className="col-3">
                  <Button
                    className="w-100 py-3 rounded-0 btn-3d"
                    onClick={() => {
                      setCashAmount('');
                      setSelectedNotes({});
                    }}
                    style={{ fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: '#3a3a3a', color: '#ffffff' }}
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
        <Modal.Body className="text-center p-4" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          <div className="mb-3">
            <i className="bi bi-barcode" style={{ fontSize: '2.5rem', color: '#ffffff' }}></i>
          </div>
          <h5 className="mb-3" style={{ color: '#ffffff' }}>Register this item?</h5>
          <p className="mb-4" style={{ color: '#aaaaaa' }}>Barcode: {scannedBarcode}</p>
          <div className="d-flex gap-3 justify-content-center">
            <Button 
              size="lg" 
              onClick={() => setItemNotFoundDialogOpen(false)}
              className="px-4"
              style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
            >
              No
            </Button>
            <Button
              style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
              size="lg"
              onClick={() => {
                setItemNotFoundDialogOpen(false);
                
                // Check if we have cached data for this barcode
                const cachedData = loadFormFromCache(scannedBarcode);
                
                if (cachedData) {
                  // Restore cached form data
                  setNewItem({
                    name: cachedData.name || '',
                    barcode: scannedBarcode,
                    price: cachedData.price || '',
                    stockQuantity: cachedData.stockQuantity || '',
                    vatRate: cachedData.vatRate || '23.00',
                    categoryId: cachedData.categoryId || ''
                  });
                  setSuccess('Previous form data restored for this barcode!');
                  addTimeout(() => setSuccess(null), 3000);
                } else {
                  // No cached data, start fresh
                setNewItem({
                  name: '',
                  barcode: scannedBarcode,
                  price: '',
                  stockQuantity: '',
                  vatRate: '23.00',
                  categoryId: ''
                });
                }
                
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
        <Modal.Header closeButton style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', color: '#ffffff' }}>
          <Modal.Title style={{ color: '#ffffff' }}>
            <i className="bi bi-plus-circle me-2" style={{ color: '#ffffff' }}></i>
            Register New Item
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#ffffff' }}>Item Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter item name"
                value={newItem.name}
                onChange={(e) => {
                  const updatedItem = { ...newItem, name: e.target.value };
                  setNewItem(updatedItem);
                  saveFormToCache(newItem.barcode, updatedItem);
                }}
                required
                style={{ backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#ffffff' }}>Barcode *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter barcode"
                value={newItem.barcode}
                onChange={(e) => {
                  const updatedItem = { ...newItem, barcode: e.target.value };
                  setNewItem(updatedItem);
                  saveFormToCache(e.target.value, updatedItem);
                }}
                required
                style={{ backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#ffffff' }}>Price (€) *</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                placeholder="Enter price"
                value={newItem.price}
                onChange={(e) => {
                  const updatedItem = { ...newItem, price: e.target.value };
                  setNewItem(updatedItem);
                  saveFormToCache(newItem.barcode, updatedItem);
                }}
                required
                style={{ backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#ffffff' }}>Stock Quantity *</Form.Label>
              <Form.Control
                type="number"
                placeholder="Enter stock quantity"
                value={newItem.stockQuantity}
                onChange={(e) => {
                  const updatedItem = { ...newItem, stockQuantity: e.target.value };
                  setNewItem(updatedItem);
                  saveFormToCache(newItem.barcode, updatedItem);
                }}
                required
                style={{ backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#ffffff' }}>VAT Rate (%) *</Form.Label>
              <InputGroup>
                <Form.Control
                  type="number"
                  step="0.01"
                  placeholder="23.00"
                  value={newItem.vatRate}
                  onChange={(e) => {
                    const updatedItem = { ...newItem, vatRate: e.target.value };
                    setNewItem(updatedItem);
                    saveFormToCache(newItem.barcode, updatedItem);
                  }}
                  required
                  style={{ backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
                />
                <InputGroup.Text style={{ backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}>%</InputGroup.Text>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#ffffff' }}>Category</Form.Label>
              <Form.Select
                value={newItem.categoryId}
                onChange={(e) => {
                  const updatedItem = { ...newItem, categoryId: e.target.value };
                  setNewItem(updatedItem);
                  saveFormToCache(newItem.barcode, updatedItem);
                }}
                style={{ backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
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
        <Modal.Footer style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a' }}>
          <Button onClick={() => setRegisterItemDialogOpen(false)} style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>
            Cancel
          </Button>
            <Button 
              style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }} 
              onClick={async () => {
              try {
                const itemData = {
                  name: newItem.name,
                  barcode: newItem.barcode,
                  price: parseFloat(newItem.price),
                  stockQuantity: parseInt(newItem.stockQuantity),
                  vatRate: parseFloat(newItem.vatRate),
                  categoryId: newItem.categoryId && newItem.categoryId.trim() !== '' ? parseInt(newItem.categoryId) : null
                };
                
                await itemsAPI.create(itemData);
                setSuccess('Item registered successfully!');
                addTimeout(() => setSuccess(null), 3000);
                setRegisterItemDialogOpen(false);
                
                // Clear cache for this barcode since item was successfully registered
                clearFormCache(newItem.barcode);
                
                // Reset form
                setNewItem({
                  name: '',
                  barcode: '',
                  price: '',
                  stockQuantity: '',
                  vatRate: '23.00',
                  categoryId: ''
                });
                
                // Refresh items list
                fetchItems();
              } catch (error) {
                const errorMessage = error.response?.data || 'Failed to register item. Please try again.';
                setError(errorMessage);
                setTimeout(() => setError(null), 5000);
              }
            }}
            disabled={!newItem.name || !newItem.barcode || !newItem.price || !newItem.stockQuantity || !newItem.vatRate}
          >
            Register Item
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Cash Payment Confirmation Dialog */}
      <Modal show={cashConfirmDialogOpen} onHide={() => setCashConfirmDialogOpen(false)} centered>
        <Modal.Body className="text-center p-4" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          <div className="mb-4">
            <i className="bi bi-cash-coin" style={{ fontSize: '3rem', color: '#ffffff' }}></i>
          </div>
          <h4 className="mb-3" style={{ color: '#ffffff' }}>Cash Payment</h4>
          <p className="mb-3" style={{ color: '#ffffff' }}>Payment received successfully!</p>
          <div className="mb-4" style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', padding: '1rem', borderRadius: '8px' }}>
            <h5 className="mb-2" style={{ color: '#ffffff' }}>Change Due</h5>
            <h3 className="mb-0" style={{ color: '#ffffff' }}>€{changeDue.toFixed(2)}</h3>
          </div>
          <p className="mb-4" style={{ color: '#aaaaaa' }}>This dialog will close automatically in 5 seconds...</p>
          <Button 
            size="lg" 
            onClick={() => {
              // Clear the auto-close timeout if user manually clicks OK
              if (cashPaymentTimeoutRef.current) {
                clearTimeout(cashPaymentTimeoutRef.current);
                cashPaymentTimeoutRef.current = null;
              }
              setCashConfirmDialogOpen(false);
              processCashPayment();
            }}
            style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
            className="px-5"
            disabled={paymentInProgressRef.current || loading}
          >
            OK
          </Button>
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={deleteConfirmOpen} onHide={handleCancelDelete} centered>
        <Modal.Body className="text-center p-4" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          <div className="mb-3">
            <i className="bi bi-exclamation-triangle" style={{ fontSize: '2.5rem', color: '#ffffff' }}></i>
          </div>
          <h5 className="mb-3" style={{ color: '#ffffff' }}>Remove Item from Cart?</h5>
          {itemToDelete && (
            <p className="mb-4" style={{ color: '#aaaaaa' }}>
                    <strong style={{ color: '#ffffff' }}>{itemToDelete.itemName}</strong>
              <br />
              <small>€{itemToDelete.totalPrice.toFixed(2)}</small>
            </p>
          )}
          <div className="d-flex gap-3 justify-content-center">
            <Button 
              onClick={handleCancelDelete}
              className="px-4"
              style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
            >
            Cancel
          </Button>
            <Button 
              onClick={handleConfirmDelete}
              className="px-4"
              style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
            >
              Remove
          </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Discount Selection Modal */}
      <Modal show={discountDialogOpen} onHide={() => {
        setDiscountDialogOpen(false);
        setCustomDiscountAmount('');
      }} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', color: '#ffffff' }}>
          <Modal.Title style={{ color: '#ffffff' }}>
            <i className="bi bi-percent me-2" style={{ color: '#ffffff' }}></i>
            Apply Discount
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          <div className="row g-3">
            {/* Percentage Discounts */}
            <div className="col-12">
              <h6 className="mb-3" style={{ color: '#aaaaaa' }}>Percentage Discounts</h6>
              <div className="row g-2">
                <div className="col-4">
                  <Button 
                    className="w-100 py-3"
                    onClick={() => handleDiscountSelect({ type: 'percentage', value: 5 })}
                    style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
                  >
                    5%
                  </Button>
                </div>
                <div className="col-4">
                  <Button 
                    className="w-100 py-3"
                    onClick={() => handleDiscountSelect({ type: 'percentage', value: 10 })}
                    style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
                  >
                    10%
                  </Button>
                </div>
                <div className="col-4">
                  <Button 
                    className="w-100 py-3"
                    onClick={() => handleDiscountSelect({ type: 'percentage', value: 20 })}
                    style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
                  >
                    20%
                  </Button>
                </div>
              </div>
            </div>

            {/* Custom Amount Discount */}
            <div className="col-12">
              <h6 className="mb-3" style={{ color: '#aaaaaa' }}>Custom Amount Discount</h6>
              <div className="row g-2">
                <div className="col-8">
                  <Form.Control
                    type="text"
                    placeholder="Enter amount (€)"
                    value={customDiscountAmount}
                    onChange={(e) => setCustomDiscountAmount(e.target.value)}
                    className="form-control-lg"
                    style={{ backgroundColor: '#3a3a3a', border: '1px solid #4a4a4a', color: '#ffffff' }}
                  />
                </div>
                <div className="col-4">
                  <Button 
                    className="w-100 py-3"
                    onClick={handleCustomDiscountApply}
                    disabled={!customDiscountAmount || parseFloat(customDiscountAmount) <= 0 || parseFloat(customDiscountAmount) > calculateSubtotal()}
                    style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
              <div className="mt-2">
                <small style={{ color: '#aaaaaa' }}>
                  Maximum: €{calculateSubtotal().toFixed(2)}
                </small>
              </div>
            </div>

            {/* Current Cart Summary */}
            <div className="col-12">
              <div className="p-3 rounded" style={{ backgroundColor: '#3a3a3a', color: '#ffffff' }}>
                <h6 className="mb-2" style={{ color: '#ffffff' }}>Current Cart Summary</h6>
                <div className="d-flex justify-content-between" style={{ color: '#ffffff' }}>
                  <span>Subtotal:</span>
                  <span>€{calculateSubtotal().toFixed(2)}</span>
                </div>
                {appliedDiscount && (
                  <>
                    <div className="d-flex justify-content-between" style={{ color: '#ffffff' }}>
                      <span>Discount:</span>
                      <span>-€{calculateDiscountAmount().toFixed(2)}</span>
                    </div>
                    <hr className="my-2" style={{ borderColor: '#4a4a4a' }} />
                    <div className="d-flex justify-content-between fw-bold" style={{ color: '#ffffff' }}>
                      <span>Total:</span>
                      <span>€{calculateTotal().toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a' }}>
          {appliedDiscount && (
            <Button 
              onClick={handleRemoveDiscount}
              className="me-auto"
              style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
            >
              <i className="bi bi-x-circle me-1"></i>
              Remove Discount
            </Button>
          )}
          <Button 
            onClick={() => setDiscountDialogOpen(false)}
            style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Out of Stock Dialog */}
      <Modal show={outOfStockDialogOpen} onHide={() => setOutOfStockDialogOpen(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', color: '#ffffff' }}>
          <Modal.Title style={{ color: '#ffffff' }}>
            <i className="bi bi-exclamation-triangle me-2" style={{ color: '#ffffff' }}></i>
            Out of Stock
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-4" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          <div className="mb-4">
            <i className="bi bi-x-circle" style={{ fontSize: '4rem', color: '#ffffff' }}></i>
          </div>
          <h5 className="mb-3" style={{ color: '#ffffff' }}>Item Not Available</h5>
          <p className="mb-4" style={{ color: '#aaaaaa' }}>
            <strong style={{ color: '#ffffff' }}>{outOfStockItem?.name}</strong> is currently out of stock.
            <br />
            Please select a different item or contact the manager to restock.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <Button 
              style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }} 
              onClick={() => setOutOfStockDialogOpen(false)}
            >
              <i className="bi bi-check-circle me-1"></i>
              OK
          </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Edit Item Dialog */}
      <EditItemDialog
        show={editItemDialogOpen}
        onHide={() => {
          setEditItemDialogOpen(false);
          setItemToEdit(null);
        }}
        itemToEdit={itemToEdit}
        categories={categories}
        onSave={handleSaveEditedItem}
        title="Edit Item"
        isEditMode={true}
      />

      {/* Print Label Confirmation Dialog */}
      <Modal 
        show={printLabelDialogOpen} 
        onHide={() => {
          setPrintLabelDialogOpen(false);
          setItemToPrint(null);
        }}
        centered
        size="sm"
      >
        <Modal.Body className="text-center py-4" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          <h6 className="mb-4" style={{ color: '#ffffff' }}>Print label?</h6>
          <div className="d-flex gap-3 justify-content-center">
            <Button 
              onClick={() => {
                setPrintLabelDialogOpen(false);
                setItemToPrint(null);
              }}
              style={{ minWidth: '80px', backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
            >
              No
            </Button>
            <Button 
              onClick={handlePrintItemLabel}
              style={{ minWidth: '80px', backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
            >
              Yes
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      
      {/* Fullscreen indicator */}
      <FullscreenIndicator />
    </div>
  );
};

export default SalesPage;