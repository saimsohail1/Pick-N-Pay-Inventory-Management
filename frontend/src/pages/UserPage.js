import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { useForm, Controller } from 'react-hook-form';
import { usersAPI } from '../services/api';

const UserPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null for add, object for edit
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'USER',
      isActive: true
    }
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
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
  };

  const fetchRoles = async () => {
    try {
      const response = await usersAPI.getRoles();
      setAvailableRoles(response.data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      // Fallback to hardcoded roles
      setAvailableRoles([
        { name: 'ADMIN', displayName: 'Admin' },
        { name: 'MANAGER', displayName: 'Manager' },
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
      isActive: true
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
        fetchUsers();
      } catch (err) {
        console.error('Failed to delete user:', err);
        setError('Failed to delete user. Please try again.');
      } finally {
        setLoading(false);
        setTimeout(() => setSuccess(null), 3000);
        setTimeout(() => setError(null), 3000);
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
      fetchUsers();
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      setError('Failed to update user status. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
      setTimeout(() => setError(null), 3000);
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
        await usersAPI.update(editingUser.id, updateData);
        setSuccess('User updated successfully!');
      } else {
        await usersAPI.create(data);
        setSuccess('User added successfully!');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Failed to save user:', err);
      if (err.response && err.response.data) {
        setError(err.response.data);
      } else {
        setError('Failed to save user. Please try again.');
      }
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccess(null), 3000);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleInitializeUsers = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await usersAPI.initialize();
      setSuccess('Default users initialized successfully!');
      fetchUsers();
    } catch (err) {
      console.error('Failed to initialize default users:', err);
      setError('Failed to initialize default users. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
      setTimeout(() => setError(null), 3000);
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'ADMIN': return 'danger';
      case 'MANAGER': return 'warning';
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
      <Container className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading users...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h1 className="mb-4 fw-bold">
        <i className="bi bi-people me-2"></i>
        User Management
      </h1>

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

      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold">Users List</h5>
          <div>
            <Button variant="light" onClick={handleInitializeUsers} className="me-2" disabled={loading || submitting}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Initialize Default Users
            </Button>
            <Button variant="light" onClick={handleAddUser} disabled={loading || submitting}>
              <i className="bi bi-person-plus me-2"></i>
              Add New User
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {users.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-people-fill display-4 mb-3"></i>
              <p>No users found. Click "Add New User" or "Initialize Default Users" to get started.</p>
            </div>
          ) : (
            <Table striped bordered hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id}>
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
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="text-center">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEditUser(user)}
                        disabled={submitting}
                      >
                        <i className="bi bi-pencil-square"></i>
                      </Button>
                      <Button
                        variant={user.isActive ? 'outline-warning' : 'outline-success'}
                        size="sm"
                        className="me-2"
                        onClick={() => handleToggleStatus(user.id)}
                        disabled={submitting}
                      >
                        <i className={`bi ${user.isActive ? 'bi-pause' : 'bi-play'}`}></i>
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={submitting}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
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
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className={`bi ${editingUser ? 'bi-pencil-square' : 'bi-person-plus'} me-2`}></i>
            {editingUser ? 'Edit User' : 'Add New User'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Body>
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3" controlId="username">
                  <Form.Label>Username</Form.Label>
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
                  <Form.Label>Email</Form.Label>
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
                  <Form.Label>Full Name</Form.Label>
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
                  <Form.Label>Role</Form.Label>
                  <Controller
                    name="role"
                    control={control}
                    rules={{ required: 'Role is required' }}
                    render={({ field }) => (
                      <Form.Select {...field} isInvalid={!!errors.role}>
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
              <Form.Label>
                Password {editingUser && <small className="text-muted">(leave blank to keep current password)</small>}
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
                  />
                )}
              />
              <Form.Control.Feedback type="invalid">
                {errors.password && errors.password.message}
              </Form.Control.Feedback>
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
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
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
