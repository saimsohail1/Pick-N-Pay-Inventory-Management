import React from 'react';
import { Modal, Form, Row, Col, Button } from 'react-bootstrap';
import { useForm, Controller } from 'react-hook-form';

const EditItemDialog = ({
  show,
  onHide,
  itemToEdit,
  categories = [],
  onSave,
  title = "Edit Item",
  isEditMode = true
}) => {
  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm({
    defaultValues: {
      name: '',
      description: '',
      price: '',
      stockQuantity: '',
      barcode: '',
      vatRate: '23.00',
      categoryId: '',
      batchId: '',
      generalExpiryDate: ''
    }
  });

  // Reset form when itemToEdit changes
  React.useEffect(() => {
    if (itemToEdit) {
      reset({
        name: itemToEdit.name || itemToEdit.itemName || '',
        description: itemToEdit.description || '',
        price: itemToEdit.price || itemToEdit.unitPrice || '',
        stockQuantity: itemToEdit.stockQuantity || itemToEdit.quantity || '',
        barcode: itemToEdit.barcode || itemToEdit.itemBarcode || '',
        vatRate: itemToEdit.vatRate || '23.00',
        categoryId: itemToEdit.categoryId || '',
        batchId: itemToEdit.batchId || '',
        generalExpiryDate: itemToEdit.generalExpiryDate || ''
      });
    }
  }, [itemToEdit, reset]);

  const handleFormSubmit = (data) => {
    if (onSave) {
      onSave(data);
    }
  };

  const handleClose = () => {
    reset();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', color: '#ffffff' }}>
        <Modal.Title style={{ color: '#ffffff' }}>
          <i className="bi bi-pencil-square me-2" style={{ color: '#ffffff' }}></i>
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4" style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
        <Form onSubmit={handleSubmit(handleFormSubmit)}>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold" style={{ color: '#ffffff' }}>
                  <i className="bi bi-upc me-1"></i>
                  Barcode
                </Form.Label>
                <Controller
                  name="barcode"
                  control={control}
                  render={({ field }) => (
                    <Form.Control
                      {...field}
                      type="text"
                      placeholder="Enter barcode"
                      style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                    />
                  )}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold" style={{ color: '#ffffff' }}>
                  <i className="bi bi-tags me-1"></i>
                  Category
                </Form.Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Form.Select {...field} style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}>
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Form.Select>
                  )}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-semibold" style={{ color: '#ffffff' }}>
                  <i className="bi bi-tag me-1"></i>
                  Item Name
                </Form.Label>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Item name is required' }}
                  render={({ field }) => (
                    <Form.Control
                      {...field}
                      type="text"
                      placeholder="Enter item name"
                      className={errors.name ? 'is-invalid' : ''}
                      style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                    />
                  )}
                />
                {errors.name && (
                  <div className="invalid-feedback" style={{ color: '#ff6b6b' }}>{errors.name.message}</div>
                )}
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-semibold" style={{ color: '#ffffff' }}>
                  <i className="bi bi-card-text me-1"></i>
                  Description
                </Form.Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Form.Control
                      {...field}
                      as="textarea"
                      rows={3}
                      placeholder="Enter item description"
                      style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                    />
                  )}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold" style={{ color: '#ffffff' }}>
                  <i className="bi bi-currency-euro me-1"></i>
                  Price (€) *
                </Form.Label>
                <Controller
                  name="price"
                  control={control}
                  rules={{ 
                    required: 'Price is required',
                    min: { value: 0.01, message: 'Price must be greater than 0' }
                  }}
                  render={({ field }) => (
                    <Form.Control
                      {...field}
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      className={errors.price ? 'is-invalid' : ''}
                      style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                    />
                  )}
                />
                {errors.price && (
                  <div className="invalid-feedback" style={{ color: '#ff6b6b' }}>{errors.price.message}</div>
                )}
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold" style={{ color: '#ffffff' }}>
                  <i className="bi bi-box-seam me-1"></i>
                  Database Stock Quantity *
                </Form.Label>
                <Controller
                  name="stockQuantity"
                  control={control}
                  rules={{ 
                    required: 'Stock quantity is required',
                    min: { value: 0, message: 'Stock quantity must be 0 or greater' }
                  }}
                  render={({ field }) => (
                    <Form.Control
                      {...field}
                      type="number"
                      min="0"
                      placeholder="0"
                      className={errors.stockQuantity ? 'is-invalid' : ''}
                      style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                    />
                  )}
                />
                {errors.stockQuantity && (
                  <div className="invalid-feedback" style={{ color: '#ff6b6b' }}>{errors.stockQuantity.message}</div>
                )}
                {itemToEdit?.cartQuantity !== undefined && (
                  <Form.Text className="text-muted" style={{ color: '#aaaaaa', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                    <i className="bi bi-info-circle me-1"></i>
                    Cart Quantity: {itemToEdit.cartQuantity} (for reference only - not changed by this edit)
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold" style={{ color: '#ffffff' }}>
                  <i className="bi bi-percent me-1"></i>
                  VAT Rate (%) *
                </Form.Label>
                <Controller
                  name="vatRate"
                  control={control}
                  rules={{ 
                    required: 'VAT rate is required',
                    min: { value: 0, message: 'VAT rate must be 0 or greater' }
                  }}
                  render={({ field }) => (
                    <Form.Control
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="23.00"
                      className={errors.vatRate ? 'is-invalid' : ''}
                      style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                    />
                  )}
                />
                {errors.vatRate && (
                  <div className="invalid-feedback" style={{ color: '#ff6b6b' }}>{errors.vatRate.message}</div>
                )}
              </Form.Group>
            </Col>
            <Col md={6}>
              {/* Empty column for spacing */}
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold" style={{ color: '#ffffff' }}>
                  <i className="bi bi-box me-1"></i>
                  Batch ID
                </Form.Label>
                <Controller
                  name="batchId"
                  control={control}
                  render={({ field }) => (
                    <Form.Control
                      {...field}
                      type="text"
                      placeholder="Enter batch ID (optional)"
                      style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                    />
                  )}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold" style={{ color: '#ffffff' }}>
                  <i className="bi bi-calendar3 me-1"></i>
                  Expiry Date
                </Form.Label>
                <Controller
                  name="generalExpiryDate"
                  control={control}
                  render={({ field }) => (
                    <Form.Control
                      {...field}
                      type="date"
                      placeholder="Select expiry date"
                      style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                    />
                  )}
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button 
              variant="secondary" 
              onClick={handleClose}
              style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
            >
              <i className="bi bi-x-circle me-1"></i>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              style={{ backgroundColor: '#3a3a3a', border: '1px solid #ffffff', color: '#ffffff' }}
            >
              <i className="bi bi-check-circle me-1"></i>
              {isEditMode ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditItemDialog;
