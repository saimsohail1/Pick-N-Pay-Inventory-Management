import React, { useRef, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert
} from '@mui/material';
import Quagga from 'quagga';

const BarcodeScanner = ({ open, onClose, onBarcodeScanned }) => {
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (open) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      try {
        if (Quagga && Quagga.stop) {
          Quagga.stop();
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, []);

  const startScanner = () => {
    if (!scannerRef.current) return;

    setScanning(true);
    setError(null);
    setIsInitialized(false);

    // Clean up any existing Quagga instance
    try {
      if (Quagga && Quagga.stop) {
        Quagga.stop();
      }
    } catch (e) {
      // Ignore errors when stopping
    }

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          width: 640,
          height: 480,
          facingMode: "environment" // Use back camera
        },
      },
      decoder: {
        readers: [
          "code_128_reader",
          "ean_reader",
          "ean_8_reader",
          "code_39_reader",
          "code_39_vin_reader",
          "codabar_reader",
          "upc_reader",
          "upc_e_reader",
          "i2of5_reader"
        ]
      },
      locate: true,
      locator: {
        patchSize: "medium",
        halfSample: true
      }
    }, (err) => {
      if (err) {
        setError('Failed to initialize camera. Please check camera permissions.');
        setScanning(false);
        setIsInitialized(false);
        return;
      }
      setIsInitialized(true);
      Quagga.start();
    });

    Quagga.onDetected((data) => {
      const code = data.codeResult.code;
      if (code) {
        onBarcodeScanned(code);
        stopScanner();
      }
    });
  };

  const stopScanner = () => {
    try {
      if (Quagga && Quagga.stop && isInitialized) {
        Quagga.stop();
      }
    } catch (e) {
      // Ignore errors when stopping
      console.warn('Error stopping Quagga scanner:', e);
    }
    setScanning(false);
    setIsInitialized(false);
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Scan Barcode</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Position the barcode within the camera view
          </Typography>
          
          <Box
            ref={scannerRef}
            sx={{
              width: '100%',
              height: 400,
              border: '2px dashed #ccc',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5'
            }}
          >
            {!scanning && !error && (
              <Typography color="textSecondary">
                Initializing camera...
              </Typography>
            )}
          </Box>
          
          {scanning && (
            <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
              Scanning for barcodes...
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {error && (
          <Button onClick={startScanner} variant="contained">
            Retry
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScanner;
