import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

const SimpleBarcodeScanner = ({ open, onClose, onBarcodeScanned }) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState(null);

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onBarcodeScanned(manualBarcode.trim());
      setManualBarcode('');
      onClose();
    } else {
      setError('Please enter a barcode');
    }
  };

  const handleClose = () => {
    setManualBarcode('');
    setError(null);
    onClose();
  };

  return (
    <Modal show={open} onHide={handleClose} size="md">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-qr-code-scan me-2"></i>
          Barcode Scanner
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
            {error}
          </Alert>
        )}
        
        <div className="text-center py-3">
          <i className="bi bi-camera-video-off display-4 text-muted mb-3"></i>
          <p className="mb-2">
            Camera scanning is not available in this environment.
          </p>
          <p className="text-muted mb-3">
            Please enter the barcode manually:
          </p>
          
          <Form.Control
            type="text"
            placeholder="e.g., 1234567890123"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleManualSubmit();
              }
            }}
            autoFocus
            className="text-center"
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleManualSubmit} 
          variant="primary"
          disabled={!manualBarcode.trim()}
        >
          <i className="bi bi-search me-2"></i>
          Lookup Item
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SimpleBarcodeScanner;
