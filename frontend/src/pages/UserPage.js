import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { useForm, Controller } from 'react-hook-form';
import { usersAPI } from '../services/api';
import { useTimeoutManager } from '../hooks/useTimeoutManager';
import { debounce } from '../utils/debounce';

const UserPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null for add, object for edit
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const { addTimeout } = useTimeoutManager();

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'USER',
      isActive: true,
      hourlyPayRate: ''
    }
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced version of fetchUsers to prevent rapid-fire requests
  const debouncedFetchUsers = useCallback(
    debounce(fetchUsers, 300),
    [fetchUsers]
  );

  const fetchRoles = async () => {
    try {
      const response = await usersAPI.getRoles();
      // Backend returns array of strings like ['ADMIN', 'USER']
      // Convert to objects with name and displayName
      const roleObjects = response.data.map(role => ({
        name: role,
        displayName: role === 'ADMIN' ? 'Admin' : 'User'
      }));
      setAvailableRoles(roleObjects);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      // Fallback to hardcoded roles
      setAvailableRoles([
        { name: 'ADMIN', displayName: 'Admin' },
        { name: 'USER', displayName: 'User' }
      ]);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    reset({
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'USER',
      isActive: true,
      hourlyPayRate: ''
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setValue('username', user.username);
    setValue('email', user.email);
    setValue('password', ''); // Don't pre-fill password for security
    setValue('fullName', user.fullName);
    setValue('role', user.role);
    setValue('isActive', user.isActive);
    setValue('hourlyPayRate', user.hourlyPayRate || '');
    setShowModal(true);
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        await usersAPI.delete(id);
        setSuccess('User deleted successfully!');
        debouncedFetchUsers();
      } catch (err) {
        console.error('Failed to delete user:', err);
        // Extract error message from response
        const errorMessage = err.response?.data || err.message || 'Failed to delete user. Please try again.';
        setError(errorMessage);
      } finally {
        setLoading(false);
        addTimeout(() => setSuccess(null), 5000);
        addTimeout(() => setError(null), 5000);
      }
    }
  };

  const handleToggleStatus = async (id) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await usersAPI.toggleStatus(id);
      setSuccess('User status updated successfully!');
      debouncedFetchUsers();
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      setError('Failed to update user status. Please try again.');
    } finally {
      setLoading(false);
      addTimeout(() => setSuccess(null), 3000);
      addTimeout(() => setError(null), 3000);
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingUser) {
        // For updates, only include password if it's provided
        const updateData = { ...data };
        if (!updateData.password) {
          delete updateData.password;
        }
        // Handle empty hourly pay rate (convert to null)
        if (updateData.hourlyPayRate === '' || updateData.hourlyPayRate === null || updateData.hourlyPayRate === undefined) {
          updateData.hourlyPayRate = null;
        } else {
          updateData.hourlyPayRate = parseFloat(updateData.hourlyPayRate);
        }
        await usersAPI.update(editingUser.id, updateData);
        setSuccess('User updated successfully!');
      } else {
        // For new users, handle empty hourly pay rate
        const createData = { ...data };
        if (createData.hourlyPayRate === '' || createData.hourlyPayRate === null || createData.hourlyPayRate === undefined) {
          createData.hourlyPayRate = null;
        } else {
          createData.hourlyPayRate = parseFloat(createData.hourlyPayRate);
        }
        await usersAPI.create(createData);
        setSuccess('User added successfully!');
      }
      setShowModal(false);
      debouncedFetchUsers();
    } catch (err) {
      console.error('Failed to save user:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        data: err.response?.data,
        status: err.response?.status
      });
      
      // Handle both string and object error responses
      let errorMessage = 'Failed to save user. Please try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (Array.isArray(err.response.data)) {
          // Validation errors array
          errorMessage = err.response.data.map(e => e.message || e).join(', ');
        } else {
          errorMessage = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setSubmitting(false);
      addTimeout(() => setSuccess(null), 3000);
      addTimeout(() => setError(null), 5000);
    }
  };

  const handleInitializeUsers = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await usersAPI.initialize();
      setSuccess('Default users initialized successfully!');
      debouncedFetchUsers();
    } catch (err) {
      console.error('Failed to initialize default users:', err);
      setError('Failed to initialize default users. Please try again.');
    } finally {
      setLoading(false);
      addTimeout(() => setSuccess(null), 3000);
      addTimeout(() => setError(null), 3000);
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'ADMIN': return 'danger';
      case 'USER': return 'primary';
      default: return 'secondary';
    }
  };

  const getRoleDisplayName = (role) => {
    const roleObj = availableRoles.find(r => r.name === role);
    return roleObj ? roleObj.displayName : role;
  };

  if (loading && !submitting) {
    return (
      <Container className="text-center py-5" style={{ backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
        <Spinner animation="border" role="status" style={{ color: '#ffffff' }}>
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3" style={{ color: '#ffffff' }}>Loading users...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
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

      <Card className="shadow-sm mb-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
        <Card.Header style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #333333', color: '#ffffff' }} className="d-flex justify-content-between align-items-center">
          <h1 className="mb-0 fw-bold" style={{ color: '#ffffff', fontSize: '1.75rem' }}>
            <i className="bi bi-people me-2" style={{ color: '#ffffff' }}></i>
            User Management
          </h1>
          <div>
            <Button onClick={handleInitializeUsers} className="me-2" disabled={loading || submitting} style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Initialize Default Users
            </Button>
            <Button onClick={handleAddUser} disabled={loading || submitting} style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}>
              <i className="bi bi-person-plus me-2"></i>
              Add New User
            </Button>
          </div>
        </Card.Header>
        <Card.Body style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          {users.length === 0 ? (
            <div className="text-center py-5" style={{ color: '#aaaaaa' }}>
              <i className="bi bi-people-fill display-4 mb-3" style={{ color: '#aaaaaa' }}></i>
              <p>No users found. Click "Add New User" or "Initialize Default Users" to get started.</p>
            </div>
          ) : (
            <Table striped bordered hover responsive className="mb-0" style={{ color: '#ffffff' }}>
              <thead style={{ backgroundColor: '#2a2a2a', color: '#ffffff' }}>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Hourly Rate</th>
                  <th>Created At</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#1a1a1a' }}>
                {users.map((user, index) => (
                  <tr key={user.id} style={{ backgroundColor: index % 2 === 0 ? '#1a1a1a' : '#222222', color: '#ffffff' }}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{user.username}</strong>
                    </td>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>
                      <Badge bg={getRoleBadgeVariant(user.role)}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={user.isActive ? 'success' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>{user.hourlyPayRate ? `€${parseFloat(user.hourlyPayRate).toFixed(2)}` : '-'}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <Button
                          onClick={() => handleEditUser(user)}
                          disabled={submitting}
                          title="Edit User"
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
                          <i className="bi bi-pencil-square" style={{ fontSize: '18px' }}></i>
                        </Button>
                        <Button
                          onClick={() => handleToggleStatus(user.id)}
                          disabled={submitting}
                          title={user.isActive ? 'Deactivate User' : 'Activate User'}
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
                          <i className={`bi ${user.isActive ? 'bi-pause' : 'bi-play'}`} style={{ fontSize: '18px' }}></i>
                        </Button>
                        <Button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={submitting}
                          title="Delete User"
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
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit User Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #2a2a2a', color: '#ffffff' }}>
          <Modal.Title style={{ color: '#ffffff' }}>
            <i className={`bi ${editingUser ? 'bi-pencil-square' : 'bi-person-plus'} me-2`} style={{ color: '#ffffff' }}></i>
            {editingUser ? 'Edit User' : 'Add New User'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Body style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3" controlId="username">
                  <Form.Label style={{ color: '#ffffff' }}>Username</Form.Label>
                  <Controller
                    name="username"
                    control={control}
                    rules={{
                      required: 'Username is required',
                      minLength: { value: 3, message: 'Username must be at least 3 characters' },
                      maxLength: { value: 50, message: 'Username must not exceed 50 characters' }
                    }}
                    render={({ field }) => (
                      <Form.Control
                        type="text"
                        placeholder="Enter username"
                        {...field}
                        isInvalid={!!errors.username}
                        style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.username && errors.username.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label style={{ color: '#ffffff' }}>Email</Form.Label>
                  <Controller
                    name="email"
                    control={control}
                    rules={{
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    }}
                    render={({ field }) => (
                      <Form.Control
                        type="email"
                        placeholder="Enter email"
                        {...field}
                        isInvalid={!!errors.email}
                        style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email && errors.email.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3" controlId="fullName">
                  <Form.Label style={{ color: '#ffffff' }}>Full Name</Form.Label>
                  <Controller
                    name="fullName"
                    control={control}
                    rules={{
                      required: 'Full name is required',
                      minLength: { value: 2, message: 'Full name must be at least 2 characters' },
                      maxLength: { value: 100, message: 'Full name must not exceed 100 characters' }
                    }}
                    render={({ field }) => (
                      <Form.Control
                        type="text"
                        placeholder="Enter full name"
                        {...field}
                        isInvalid={!!errors.fullName}
                        style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                      />
                    )}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.fullName && errors.fullName.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3" controlId="role">
                  <Form.Label style={{ color: '#ffffff' }}>Role</Form.Label>
                  <Controller
                    name="role"
                    control={control}
                    rules={{ required: 'Role is required' }}
                    render={({ field }) => (
                      <Form.Select {...field} isInvalid={!!errors.role} style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}>
                        <option value="">Select a role</option>
                        {availableRoles.map((role) => (
                          <option key={role.name} value={role.name}>
                            {role.displayName}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.role && errors.role.message}
                  </Form.Control.Feedback>
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3" controlId="password">
              <Form.Label style={{ color: '#ffffff' }}>
                Password {editingUser && <small style={{ color: '#aaaaaa' }}>(leave blank to keep current password)</small>}
              </Form.Label>
              <Controller
                name="password"
                control={control}
                rules={{
                  required: editingUser ? false : 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                }}
                render={({ field }) => (
                  <Form.Control
                    type="password"
                    placeholder={editingUser ? "Enter new password (optional)" : "Enter password"}
                    {...field}
                    isInvalid={!!errors.password}
                    style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                  />
                )}
              />
              <Form.Control.Feedback type="invalid">
                {errors.password && errors.password.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="hourlyPayRate">
              <Form.Label style={{ color: '#ffffff' }}>Hourly Pay Rate (Optional)</Form.Label>
              <Controller
                name="hourlyPayRate"
                control={control}
                rules={{
                  min: {
                    value: 0,
                    message: 'Hourly pay rate cannot be negative'
                  }
                }}
                render={({ field }) => (
                  <Form.Control
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 15.50"
                    value={field.value || ''}
                    isInvalid={!!errors.hourlyPayRate}
                    style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}
                  />
                )}
              />
              <Form.Control.Feedback type="invalid" style={{ color: '#ff6b6b' }}>
                {errors.hourlyPayRate && errors.hourlyPayRate.message}
              </Form.Control.Feedback>
              <Form.Text style={{ color: '#aaaaaa' }}>
                Used for calculating total pay in employee reports
              </Form.Text>
            </Form.Group>

            {editingUser && (
              <Form.Group className="mb-3" controlId="isActive">
                <Form.Check
                  type="checkbox"
                  label="Active User"
                  {...control.register('isActive')}
                />
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a' }}>
            <Button onClick={() => setShowModal(false)} disabled={submitting} style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} style={{ backgroundColor: '#2a2a2a', border: '1px solid #333333', color: '#ffffff' }}>
              {submitting ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-save me-2"></i>}
              {editingUser ? 'Update User' : 'Add User'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default UserPage;
