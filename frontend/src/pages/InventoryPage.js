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
  InputGroup
} from 'react-bootstrap';
import { itemsAPI, categoriesAPI } from '../services/api';
import EditItemDialog from '../components/EditItemDialog';
import JsBarcode from 'jsbarcode';

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [sortBy, setSortBy] = useState('stockQuantity'); // Default sort by stock quantity
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' for ascending (lowest first)
  const [filters, setFilters] = useState({
    stockFilter: 'all', // 'all', 'low', 'out', 'normal'
    expiryFilter: 'all', // 'all', 'expired', 'expiring', 'valid'
    categoryFilter: 'all' // 'all' or specific category ID
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stockQuantity: '',
    barcode: '',
    vatRate: '23.00', // Default 23% VAT
    categoryId: '',
    batchId: '',
    generalExpiryDate: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [itemsResponse, categoriesResponse] = await Promise.all([
          itemsAPI.getAll(),
          categoriesAPI.getAll()
        ]);
        setItems(itemsResponse.data);
        setCategories(categoriesResponse.data);
      } catch (err) {
        setError('Failed to fetch data');
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await itemsAPI.getAll();
      setItems(response.data);
    } catch (err) {
      setError('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const itemData = {
        ...formData,
        price: parseFloat(formData.price),
        stockQuantity: parseInt(formData.stockQuantity),
        vatRate: parseFloat(formData.vatRate),
        categoryId: formData.categoryId && formData.categoryId.trim() !== '' ? formData.categoryId : null
      };

      if (editingItem) {
        await itemsAPI.update(editingItem.id, itemData);
        setSuccess('Item updated successfully');
      } else {
        await itemsAPI.create(itemData);
        setSuccess('Item added successfully');
      }

      setShowAddModal(false);
      setShowEditModal(false);
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        stockQuantity: '',
        barcode: '',
        vatRate: '23.00',
        categoryId: '',
        batchId: '',
        generalExpiryDate: ''
      });
      fetchItems();
    } catch (err) {
      const errorMessage = err.response?.data || 'Failed to save item';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleEditItem = async (formData) => {
    if (!editingItem) return;
    
    setLoading(true);
    try {
      const itemData = {
        ...formData,
        price: parseFloat(formData.price),
        stockQuantity: parseInt(formData.stockQuantity),
        vatRate: parseFloat(formData.vatRate)
      };

      await itemsAPI.update(editingItem.id, itemData);
      setSuccess('Item updated successfully');
      setShowEditModal(false);
      setEditingItem(null);
      fetchItems();
    } catch (err) {
      setError('Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setLoading(true);
      try {
        await itemsAPI.delete(id);
        setSuccess('Item deleted successfully');
        fetchItems();
      } catch (err) {
        const errorMessage = err.response?.data || 'Failed to delete item';
        setError(errorMessage);
        console.error('Delete item error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrintLabel = (item) => {
    // Generate barcode SVG
    let barcodeDataURL = '';
    if (item.barcode) {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, item.barcode, {
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
        <title>Item Label - ${item.name}</title>
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
              margin: 0.05in;
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
            padding: 0.05in;
            font-weight: bold;
          }
          
          .label-container {
            text-align: center;
            width: 100%;
            padding: 0;
          }
          
          .item-name {
            font-size: 16px;
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
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="item-name">${item.name}</div>
          ${barcodeDataURL ? `
            <div class="barcode-container">
              <img src="${barcodeDataURL}" alt="Barcode" class="barcode-image" />
            </div>
          ` : ''}
          <div class="item-price">
            <span class="price-symbol">€</span>${item.price.toFixed(2)}
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
  };

  // Filter and sort items based on current settings
  const getFilteredAndSortedItems = () => {
    let filteredItems = [...items];

    // Apply search filter (barcode or name)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filteredItems = filteredItems.filter(item => {
        const itemName = (item.name || '').toLowerCase();
        const itemBarcode = (item.barcode || '').toLowerCase();
        return itemName.includes(searchLower) || itemBarcode.includes(searchLower);
      });
    }

    // Apply stock filters
    if (filters.stockFilter === 'out') {
      filteredItems = filteredItems.filter(item => item.stockQuantity <= 0);
    } else if (filters.stockFilter === 'low') {
      filteredItems = filteredItems.filter(item => item.stockQuantity > 0 && item.stockQuantity <= 10);
    } else if (filters.stockFilter === 'normal') {
      filteredItems = filteredItems.filter(item => item.stockQuantity > 10);
    }

    // Apply expiry filters
    if (filters.expiryFilter === 'expired') {
      filteredItems = filteredItems.filter(item => 
        item.generalExpiryDate && new Date(item.generalExpiryDate) < new Date()
      );
    } else if (filters.expiryFilter === 'expiring') {
      const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      filteredItems = filteredItems.filter(item => 
        item.generalExpiryDate && 
        new Date(item.generalExpiryDate) >= new Date() && 
        new Date(item.generalExpiryDate) <= oneWeekFromNow
      );
    } else if (filters.expiryFilter === 'valid') {
      filteredItems = filteredItems.filter(item => 
        !item.generalExpiryDate || new Date(item.generalExpiryDate) > new Date()
      );
    }

    // Apply category filter
    if (filters.categoryFilter !== 'all') {
      filteredItems = filteredItems.filter(item => 
        item.categoryId === parseInt(filters.categoryFilter)
      );
    }

    // Sort filtered items
    return filteredItems.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'stockQuantity':
          aValue = a.stockQuantity;
          bValue = b.stockQuantity;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'expiryDate':
          aValue = a.generalExpiryDate ? new Date(a.generalExpiryDate) : new Date('9999-12-31');
          bValue = b.generalExpiryDate ? new Date(b.generalExpiryDate) : new Date('9999-12-31');
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };


  if (loading && items.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0 fw-bold">
          <i className="bi bi-box-seam me-2"></i>
          Inventory
        </h1>
        <div className="d-flex align-items-center">
          <span className="badge bg-primary me-2 fs-6">
            {items.length} Items
          </span>
          <span className="badge bg-warning fs-6">
            {items.filter(item => item.stockQuantity <= 10).length} Low Stock
          </span>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="mb-3">
          {success}
        </Alert>
      )}

      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">Inventory Items</h5>
            <Button 
              variant="light" 
              onClick={() => {
                setFormData({
                  name: '',
                  description: '',
                  price: '',
                  stockQuantity: '',
                  barcode: '',
                  vatRate: '23.00',
                  categoryId: '',
                  batchId: '',
                  expiryDate: ''
                });
                setShowAddModal(true);
              }}
              className="fw-bold"
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Item
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {/* Filters */}
          <div className="p-3 bg-light border-bottom">
            {/* Search Bar */}
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label small fw-bold">
                  <i className="bi bi-search me-1"></i>Search by Name or Barcode
                </label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Enter item name or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="sm"
                  />
                  {searchTerm && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      title="Clear search"
                    >
                      <i className="bi bi-x"></i>
                    </Button>
                  )}
                </InputGroup>
              </div>
            </div>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label small fw-bold">Stock Filter</label>
                <Form.Select 
                  size="sm" 
                  value={filters.stockFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, stockFilter: e.target.value }))}
                >
                  <option value="all">All Items</option>
                  <option value="out">Out of Stock (0)</option>
                  <option value="low">Low Stock (1-10)</option>
                  <option value="normal">Normal Stock (10+)</option>
                </Form.Select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">Expiry Filter</label>
                <Form.Select 
                  size="sm" 
                  value={filters.expiryFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, expiryFilter: e.target.value }))}
                >
                  <option value="all">All Items</option>
                  <option value="expired">Expired</option>
                  <option value="expiring">Expiring Soon (7 days)</option>
                  <option value="valid">Valid/No Expiry</option>
                </Form.Select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">Category Filter</label>
                <Form.Select 
                  size="sm" 
                  value={filters.categoryFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, categoryFilter: e.target.value }))}
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold">Sort By</label>
                <Form.Select 
                  size="sm" 
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setSortOrder('asc');
                  }}
                >
                  <option value="stockQuantity">Stock Quantity</option>
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="expiryDate">Expiry Date</option>
                </Form.Select>
              </div>
            </div>
            <div className="row mt-2">
              <div className="col-12">
                <div className="d-flex align-items-center justify-content-between">
                  <small className="text-muted">
                    <i className="bi bi-funnel me-1"></i>
                    Showing {getFilteredAndSortedItems().length} of {items.length} items
                    {searchTerm && ` (Search: "${searchTerm}")`}
                    {filters.stockFilter !== 'all' && ` (Stock: ${filters.stockFilter})`}
                    {filters.expiryFilter !== 'all' && ` (Expiry: ${filters.expiryFilter})`}
                    {filters.categoryFilter !== 'all' && ` (Category: ${categories.find(c => c.id === parseInt(filters.categoryFilter))?.name})`}
                  </small>
                  <small className="text-muted">
                    <i className="bi bi-sort-down me-1"></i>
                    Sorted by <strong>{sortBy === 'stockQuantity' ? 'Stock Quantity' : sortBy === 'name' ? 'Name' : sortBy === 'price' ? 'Price' : 'Expiry Date'}</strong> 
                    ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})
                  </small>
                </div>
              </div>
            </div>
          </div>
          <Table responsive hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th 
                  className="cursor-pointer" 
                  onClick={() => handleSort('name')}
                  style={{ cursor: 'pointer' }}
                >
                  Name
                  {sortBy === 'name' && (
                    <i className={`bi bi-${sortOrder === 'asc' ? 'sort-alpha-up' : 'sort-alpha-down'} ms-1`}></i>
                  )}
                </th>
                <th>Category</th>
                <th>Description</th>
                <th 
                  className="text-end cursor-pointer" 
                  onClick={() => handleSort('price')}
                  style={{ cursor: 'pointer' }}
                >
                  Price
                  {sortBy === 'price' && (
                    <i className={`bi bi-${sortOrder === 'asc' ? 'sort-numeric-up' : 'sort-numeric-down'} ms-1`}></i>
                  )}
                </th>
                <th 
                  className="text-center cursor-pointer" 
                  onClick={() => handleSort('stockQuantity')}
                  style={{ cursor: 'pointer' }}
                >
                  Stock
                  {sortBy === 'stockQuantity' && (
                    <i className={`bi bi-${sortOrder === 'asc' ? 'sort-numeric-up' : 'sort-numeric-down'} ms-1`}></i>
                  )}
                </th>
                <th>Barcode</th>
                <th className="text-center">Batch ID</th>
                <th 
                  className="text-center cursor-pointer" 
                  onClick={() => handleSort('expiryDate')}
                  style={{ cursor: 'pointer' }}
                >
                  Expiry Date
                  {sortBy === 'expiryDate' && (
                    <i className={`bi bi-${sortOrder === 'asc' ? 'sort-up' : 'sort-down'} ms-1`}></i>
                  )}
                </th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredAndSortedItems().map((item) => (
                <tr key={item.id}>
                  <td className="fw-bold">{item.name}</td>
                  <td>
                    <Badge bg="info" className="fs-6">
                      {item.categoryName || 'No Category'}
                    </Badge>
                  </td>
                  <td className="text-muted">{item.description || '-'}</td>
                  <td className="text-end fw-bold">€{item.price.toFixed(2)}</td>
                  <td className="text-center">
                    <Badge 
                      bg={item.stockQuantity <= 10 ? 'warning' : 'success'}
                      className="fs-6"
                    >
                      {item.stockQuantity}
                    </Badge>
                  </td>
                  <td>
                    <code className="text-muted">{item.barcode || '-'}</code>
                  </td>
                  <td className="text-center">
                    <code className="text-info">{item.batchId || '-'}</code>
                  </td>
                  <td className="text-center">
                    {item.generalExpiryDate ? (
                      <Badge 
                        bg={new Date(item.generalExpiryDate) < new Date() ? 'danger' : 
                            new Date(item.generalExpiryDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'warning' : 'success'}
                        className="fs-6"
                      >
                        {new Date(item.generalExpiryDate).toLocaleDateString()}
                      </Badge>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="d-flex justify-content-center gap-2">
                      <Button
                        variant="outline-primary"
                        onClick={() => handleEdit(item)}
                        title="Edit Item"
                        style={{
                          width: '50px',
                          height: '50px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0'
                        }}
                      >
                        <i className="bi bi-pencil" style={{ fontSize: '18px' }}></i>
                      </Button>
                      <Button
                        variant="outline-success"
                        onClick={() => handlePrintLabel(item)}
                        title="Print Label"
                        style={{
                          width: '50px',
                          height: '50px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0'
                        }}
                      >
                        <i className="bi bi-printer" style={{ fontSize: '18px' }}></i>
                      </Button>
                      <Button
                        variant="outline-danger"
                        onClick={() => handleDelete(item.id)}
                        title="Delete Item"
                        style={{
                          width: '50px',
                          height: '50px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0'
                        }}
                      >
                        <i className="bi bi-trash" style={{ fontSize: '18px' }}></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Add Item Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-plus-circle me-2"></i>
            Add New Item
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Item Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Barcode</Form.Label>
                  <Form.Control
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
              >
                <option value="">Select a category (optional)</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price (€) *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>€</InputGroup.Text>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Stock Quantity *</Form.Label>
                  <Form.Control
                    type="number"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>VAT Rate (%) *</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="vatRate"
                      value={formData.vatRate}
                      onChange={handleInputChange}
                      placeholder="23.00"
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Batch ID</Form.Label>
                  <Form.Control
                    type="text"
                    name="batchId"
                    value={formData.batchId}
                    onChange={handleInputChange}
                    placeholder="Enter batch ID (optional)"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Expiry Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="generalExpiryDate"
                    value={formData.generalExpiryDate}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Adding...
                </>
              ) : (
                <>
                  <i className="bi bi-plus-circle me-2"></i>
                  Add Item
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Item Modal */}
      <EditItemDialog
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        itemToEdit={editingItem}
        categories={categories}
        onSave={handleEditItem}
        title="Edit Item"
        isEditMode={true}
      />
    </div>
  );
};

export default InventoryPage;