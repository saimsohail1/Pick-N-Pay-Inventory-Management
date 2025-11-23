import React, { useState, useEffect } from 'react';
import { useTimeoutManager } from '../hooks/useTimeoutManager';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Modal,
  Alert,
  Spinner,
  Form,
  Badge
} from 'react-bootstrap';
import { useForm, Controller } from 'react-hook-form';
import { categoriesAPI } from '../services/api';

const CategoryPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { addTimeout } = useTimeoutManager();
  const [editingCategory, setEditingCategory] = useState(null);
  const [initializing, setInitializing] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      description: '',
      vatRate: '23.00'
    }
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await categoriesAPI.getAllIncludingInactive();
      setCategories(response.data);
    } catch (err) {
      setError('Failed to fetch categories.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    reset({ name: '', description: '', vatRate: '23.00' });
    setShowModal(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || '',
      vatRate: category.vatRate ? parseFloat(category.vatRate).toFixed(2) : '23.00'
    });
    setShowModal(true);
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      setLoading(true);
      try {
        await categoriesAPI.delete(id);
        setSuccess('Category deleted successfully!');
        addTimeout(() => setSuccess(null), 3000);
        fetchCategories();
      } catch (err) {
        const errorMessage = err.response?.data || 'Failed to delete category.';
        setError(errorMessage);
        addTimeout(() => setError(null), 5000);
        console.error('Delete category error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Ensure VAT rate is set - default to 23.00 if empty or null
      const categoryData = {
        ...data,
        vatRate: data.vatRate && data.vatRate.trim() !== '' ? parseFloat(data.vatRate) : 23.00
      };
      
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, categoryData);
        setSuccess('Category updated successfully!');
      } else {
        await categoriesAPI.create(categoryData);
        setSuccess('Category created successfully!');
      }
      
      addTimeout(() => setSuccess(null), 3000);
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save category.');
      addTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeCategories = async () => {
    if (window.confirm('This will create default categories. Continue?')) {
      setInitializing(true);
      setError(null);
      setSuccess(null);
      
      try {
        await categoriesAPI.initialize();
        setSuccess('Default categories initialized successfully!');
        addTimeout(() => setSuccess(null), 3000);
        fetchCategories();
      } catch (err) {
        setError('Failed to initialize default categories.');
        addTimeout(() => setError(null), 3000);
      } finally {
        setInitializing(false);
      }
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div style={{ backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
        <div className="text-center py-5">
          <Spinner animation="border" role="status" style={{ color: '#ffffff' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3" style={{ color: '#ffffff' }}>Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="m-3" style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="m-3" style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}>
          {success}
        </Alert>
      )}

      <Card className="shadow-sm" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
        <Card.Header style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #333333', color: '#ffffff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="mb-0 fw-bold" style={{ color: '#ffffff', fontSize: '1.75rem' }}>
              <i className="bi bi-tags me-2" style={{ color: '#ffffff' }}></i>
          Categories
        </h1>
            <div className="d-flex align-items-center gap-2">
              <span className="badge fs-6" style={{ backgroundColor: '#3a3a3a', color: '#ffffff' }}>
            {categories.length} Categories
          </span>
          <Button
            onClick={handleInitializeCategories}
            disabled={initializing}
                style={{ backgroundColor: '#3a3a3a', border: '1px solid #333333', color: '#ffffff' }}
                className="fw-bold"
          >
            {initializing ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : (
              <i className="bi bi-download me-2"></i>
            )}
            Initialize Default
          </Button>
              <Button 
                onClick={handleCreateCategory} 
                style={{ backgroundColor: '#3a3a3a', border: '1px solid #333333', color: '#ffffff' }}
                className="fw-bold"
              >
            <i className="bi bi-plus-circle me-2"></i>
            Add Category
          </Button>
        </div>
      </div>
        </Card.Header>
        <Card.Body className="p-0" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          {categories.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-tags display-1" style={{ color: '#aaaaaa' }}></i>
              <p className="mt-3" style={{ color: '#aaaaaa' }}>No categories found. Create your first category or initialize default categories.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover className="mb-0" style={{ color: '#ffffff' }}>
                <thead style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                  <tr>
                    <th style={{ width: '5%' }}>#</th>
                    <th style={{ width: '20%' }}>Name</th>
                    <th style={{ width: '30%' }}>Description</th>
                    <th style={{ width: '10%' }}>VAT Rate</th>
                    <th style={{ width: '12%' }}>Display on POS</th>
                    <th style={{ width: '13%' }}>Created</th>
                    <th style={{ width: '10%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: '#1a1a1a' }}>
                  {categories.map((category, index) => (
                    <tr key={category.id} style={{ backgroundColor: index % 2 === 0 ? '#1a1a1a' : '#222222', color: '#ffffff' }}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{category.name}</strong>
                      </td>
                      <td>
                        {category.description || (
                          <span className="text-muted">No description</span>
                        )}
                      </td>
                      <td>
                        <strong>{category.vatRate ? parseFloat(category.vatRate).toFixed(2) : '23.00'}%</strong>
                      </td>
                      <td>
                        <Badge bg={category.displayOnPos ? 'success' : 'secondary'}>
                          {category.displayOnPos ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                      <td>
                        {new Date(category.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            onClick={() => handleEditCategory(category)}
                            title="Edit"
                            style={{
                              width: '50px',
                              height: '50px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0',
                              backgroundColor: '#2a2a2a',
                              border: '1px solid #333333',
                              color: '#ffffff'
                            }}
                          >
                            <i className="bi bi-pencil" style={{ fontSize: '18px' }}></i>
                          </Button>
                          <Button
                            onClick={() => handleDeleteCategory(category.id)}
                            title="Delete"
                            style={{
                              width: '50px',
                              height: '50px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0',
                              backgroundColor: '#2a2a2a',
                              border: '1px solid #333333',
                              color: '#ffffff'
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
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Category Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', color: '#ffffff' }}>
          <Modal.Title style={{ color: '#ffffff' }}>
            {editingCategory ? 'Edit Category' : 'Add New Category'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Body style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#ffffff' }}>Category Name *</Form.Label>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Category name is required' }}
                render={({ field }) => (
                  <Form.Control
                    type="text"
                    placeholder="Enter category name"
                    {...field}
                    isInvalid={!!errors.name}
                    style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                  />
                )}
              />
              <Form.Control.Feedback type="invalid">
                {errors.name && errors.name.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#ffffff' }}>Description</Form.Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Enter category description (optional)"
                    {...field}
                    style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                  />
                )}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#ffffff' }}>VAT Rate (%)</Form.Label>
              <Controller
                name="vatRate"
                control={control}
                rules={{ 
                  min: { value: 0, message: 'VAT rate must be 0 or greater' },
                  max: { value: 100, message: 'VAT rate must be 100 or less' }
                }}
                render={({ field }) => (
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="23.00 (default)"
                    {...field}
                    isInvalid={!!errors.vatRate}
                    style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                  />
                )}
              />
              <Form.Control.Feedback type="invalid">
                {errors.vatRate && errors.vatRate.message}
              </Form.Control.Feedback>
              <Form.Text style={{ color: '#aaaaaa' }}>
                Default VAT rate for items in this category. If not specified, defaults to 23.00%
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Controller
                name="displayOnPos"
                control={control}
                defaultValue={true}
                render={({ field }) => (
                  <Form.Check
                    type="checkbox"
                    label="Display on POS (Point of Sale)"
                    checked={field.value}
                    onChange={field.onChange}
                    className="fw-bold"
                    style={{ color: '#ffffff' }}
                  />
                )}
              />
              <Form.Text style={{ color: '#aaaaaa' }}>
                When checked, this category will be visible in the sales interface
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a' }}>
            <Button onClick={() => setShowModal(false)} style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}>
              {loading ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <i className="bi bi-save me-2"></i>
              )}
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoryPage;
