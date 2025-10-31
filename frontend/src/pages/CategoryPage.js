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
      description: ''
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
    reset({ name: '', description: '' });
    setShowModal(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || ''
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
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, data);
        setSuccess('Category updated successfully!');
      } else {
        await categoriesAPI.create(data);
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
      <Container className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading categories...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0 fw-bold">
          <i className="bi bi-tags me-2"></i>
          Categories
        </h1>
        <div className="d-flex align-items-center">
          <span className="badge bg-primary me-2 fs-6">
            {categories.length} Categories
          </span>
          <Button
            variant="outline-primary"
            onClick={handleInitializeCategories}
            disabled={initializing}
            className="me-2"
          >
            {initializing ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : (
              <i className="bi bi-download me-2"></i>
            )}
            Initialize Default
          </Button>
          <Button variant="primary" onClick={handleCreateCategory}>
            <i className="bi bi-plus-circle me-2"></i>
            Add Category
          </Button>
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
          <h5 className="mb-0 fw-bold">Category Management</h5>
        </Card.Header>
        <Card.Body>
          {categories.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-tags display-1 text-muted"></i>
              <p className="text-muted mt-3">No categories found. Create your first category or initialize default categories.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover className="mb-0">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>#</th>
                    <th style={{ width: '25%' }}>Name</th>
                    <th style={{ width: '35%' }}>Description</th>
                    <th style={{ width: '15%' }}>Display on POS</th>
                    <th style={{ width: '15%' }}>Created</th>
                    <th style={{ width: '5%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category, index) => (
                    <tr key={category.id}>
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
                            variant="outline-primary"
                            onClick={() => handleEditCategory(category)}
                            title="Edit"
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
                            variant="outline-danger"
                            onClick={() => handleDeleteCategory(category.id)}
                            title="Delete"
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
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Category Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingCategory ? 'Edit Category' : 'Add New Category'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Category Name *</Form.Label>
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
                  />
                )}
              />
              <Form.Control.Feedback type="invalid">
                {errors.name && errors.name.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Enter category description (optional)"
                    {...field}
                  />
                )}
              />
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
                  />
                )}
              />
              <Form.Text className="text-muted">
                When checked, this category will be visible in the sales interface
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
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
    </Container>
  );
};

export default CategoryPage;
