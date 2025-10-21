import React, { useState, useEffect } from 'react';
import { Alert } from 'react-bootstrap';
import { useTimeoutManager } from '../hooks/useTimeoutManager';

const FullscreenIndicator = () => {
  const [showIndicator, setShowIndicator] = useState(false);
  const { addTimeout } = useTimeoutManager();

  useEffect(() => {
    // Check if we're running in Electron
    const isElectron = window && window.require;
    let timeoutId;
    
    if (isElectron) {
      const { ipcRenderer } = window.require('electron');
      
      const handleFullscreenExited = () => {
        setShowIndicator(true);
        // Hide indicator after 3 seconds
        timeoutId = addTimeout(() => setShowIndicator(false), 3000);
      };
      
      ipcRenderer.on('fullscreen-exited', handleFullscreenExited);
      
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        ipcRenderer.removeListener('fullscreen-exited', handleFullscreenExited);
      };
    }
  }, []);

  if (!showIndicator) return null;

  return (
    <Alert 
      variant="info" 
      className="position-fixed" 
      style={{ 
        top: '20px', 
        right: '20px', 
        zIndex: 9999,
        minWidth: '300px'
      }}
    >
      <i className="bi bi-info-circle me-2"></i>
      Press <kbd>F11</kbd> to toggle fullscreen or <kbd>ESC</kbd> to exit
    </Alert>
  );
};

export default FullscreenIndicator;
