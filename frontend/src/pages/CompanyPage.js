import React, { useState, useEffect } from 'react';
import { useTimeoutManager } from '../hooks/useTimeoutManager';
import {
  Container, Row, Col, Card, Button, Form, Alert, Spinner
} from 'react-bootstrap';
import { useForm, Controller } from 'react-hook-form';
import { companySettingsAPI } from '../services/api';

const CompanyPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const { addTimeout } = useTimeoutManager();

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      companyName: '',
      address: ''
    }
  });

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    setInitialLoading(true);
    setError(null);
    try {
      const response = await companySettingsAPI.get();
      reset({
        companyName: response.data.companyName,
        address: response.data.address || ''
      });
    } catch (err) {
      setError('Failed to load company settings.');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleUpdateSettings = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await companySettingsAPI.update(data);
      setSuccess('Company information updated successfully!');
      addTimeout(() => setSuccess(null), 3000);
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('companyNameUpdated', { 
        detail: { companyName: data.companyName } 
      }));
      // Refresh the page to update the navbar and other components
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError('Failed to update company information. Please try again.');
      addTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading company settings...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0 fw-bold">
          <i className="bi bi-building me-2"></i>
          Company Settings
        </h1>
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

      <Row className="justify-content-center">
        <Col xs={12} md={8} lg={6}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-building me-2"></i>
                Company Information
              </h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit(handleUpdateSettings)}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Company Name</Form.Label>
                  <Controller
                    name="companyName"
                    control={control}
                    rules={{
                      required: 'Company name is required',
                      minLength: { value: 1, message: 'Company name must be at least 1 character' },
                      maxLength: { value: 100, message: 'Company name must be less than 100 characters' }
                    }}
                    render={({ field }) => (
                      <Form.Control
                        type="text"
                        placeholder="Enter company name"
                        {...field}
                        isInvalid={!!errors.companyName}
                        className="form-control-lg"
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.companyName && errors.companyName.message}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    This name will be displayed throughout the application including the navigation bar and dashboard.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">Company Address</Form.Label>
                  <Controller
                    name="address"
                    control={control}
                    rules={{
                      maxLength: { value: 500, message: 'Address must be less than 500 characters' }
                    }}
                    render={({ field }) => (
                      <Form.Control
                        as="textarea"
                        rows={4}
                        placeholder="Enter company address"
                        {...field}
                        isInvalid={!!errors.address}
                        className="form-control-lg"
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.address && errors.address.message}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    This address will be displayed on reports and receipts.
                  </Form.Text>
                </Form.Group>

                <div className="d-grid">
                  <Button
                    variant="primary"
                    type="submit"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Update Company Information
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CompanyPage;
