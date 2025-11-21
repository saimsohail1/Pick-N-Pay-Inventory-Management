import React, { useState, useEffect } from 'react';
import { companySettingsAPI } from '../services/api';

const CustomerDisplay = () => {
  const [total, setTotal] = useState(0);
  const [companyName, setCompanyName] = useState('ADAMS GREEN');

  useEffect(() => {
    fetchCompanyName();
    
    // Listen for cart updates from main window
    if (window.electron && window.electron.ipcRenderer) {
      const handleCartUpdate = (cartData) => {
        console.log('CustomerDisplay: Received cart update', cartData);
        if (cartData) {
          console.log('CustomerDisplay: Setting total to', cartData.total);
        setTotal(cartData.total || 0);
        } else {
          console.log('CustomerDisplay: No cart data received');
        }
      };

      window.electron.ipcRenderer.on('cart-updated', handleCartUpdate);
      console.log('CustomerDisplay: Listening for cart-updated events');

      // Request initial cart state after a short delay to ensure IPC is ready
      setTimeout(() => {
        if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('request-cart-state');
          console.log('CustomerDisplay: Requested initial cart state');
        }
      }, 1000);

      return () => {
        if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.removeListener('cart-updated', handleCartUpdate);
        }
      };
    }
  }, []);

  const fetchCompanyName = async () => {
    try {
      const response = await companySettingsAPI.get();
      const settingsData = response.data || response;
      if (settingsData && settingsData.companyName) {
        setCompanyName(settingsData.companyName);
      }
    } catch (error) {
      console.error('Failed to fetch company name:', error);
    }
  };
  
  // Refresh company name periodically in case it changes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCompanyName();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#1a1a1a',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      boxSizing: 'border-box',
      padding: '1rem'
    }}>
      {/* Company Name - Small at top */}
        <div style={{
        position: 'absolute',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '0.5rem 1rem',
        backgroundColor: '#2a2a2a',
        border: '1px solid #333333',
        borderRadius: '6px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: '600',
          color: '#aaaaaa',
            margin: 0
          }}>
            {companyName}
        </h2>
        </div>

      {/* Total Display - Large and Prominent */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '900px'
      }}>
        {/* Total Label */}
        <div style={{
          fontSize: '2rem',
          fontWeight: '600',
          color: '#aaaaaa',
          marginBottom: '1.5rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase'
        }}>
          TOTAL
        </div>

        {/* Total Amount - Very Large */}
        <div style={{
          backgroundColor: '#2a2a2a',
          border: '2px solid #333333',
          borderRadius: '12px',
          padding: '3rem 4rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.05)',
          minWidth: '400px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)'
        }}>
          <div style={{
            fontSize: '6rem',
            fontWeight: 'bold',
            color: '#ffffff',
            lineHeight: '1.1',
            textShadow: '0 2px 10px rgba(255,255,255,0.1)',
            fontFamily: 'Arial, sans-serif'
        }}>
            €{total.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDisplay;

