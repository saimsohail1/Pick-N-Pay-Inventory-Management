import React, { useState, useEffect } from 'react';
import { Table, Container } from 'react-bootstrap';
import { companySettingsAPI } from '../services/api';

const CustomerDisplay = () => {
  const [cart, setCart] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [companyName, setCompanyName] = useState('ADAMS GREEN');

  useEffect(() => {
    fetchCompanyName();
    
    // Listen for cart updates from main window
    if (window.electron && window.electron.ipcRenderer) {
      const handleCartUpdate = (cartData) => {
        if (cartData) {
          setCart(Array.isArray(cartData.cart) ? cartData.cart : []);
        setSubtotal(cartData.subtotal || 0);
        setDiscountAmount(cartData.discountAmount || 0);
        setTotal(cartData.total || 0);
        }
      };

      window.electron.ipcRenderer.on('cart-updated', handleCartUpdate);

      // Request initial cart state after a short delay to ensure IPC is ready
      setTimeout(() => {
      window.electron.ipcRenderer.send('request-cart-state');
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
      backgroundColor: '#000000',
      padding: '0.3rem',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      <Container fluid style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0, margin: 0, maxWidth: '100%' }}>
        {/* Header - Just Company Name */}
        <div style={{
          textAlign: 'center',
          marginBottom: '0.3rem',
          padding: '0.3rem',
          backgroundColor: '#2a2a2a',
          border: '1px solid #333333',
          borderRadius: '6px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          flexShrink: 0
        }}>
          <h1 style={{
            fontSize: '1.4rem',
            fontWeight: 'bold',
            color: '#ffffff',
            margin: 0
          }}>
            {companyName}
          </h1>
        </div>

        {/* Cart Items */}
        <div style={{
          backgroundColor: '#2a2a2a',
          border: '1px solid #333333',
          borderRadius: '6px',
          padding: '0.3rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '0.3rem',
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          {cart.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#aaaaaa',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%'
            }}>
              <i className="bi bi-cart" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem', color: '#aaaaaa' }}></i>
              <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '600', color: '#ffffff' }}>Cart is Empty</h3>
              <p style={{ fontSize: '1rem', marginTop: '0.5rem', color: '#aaaaaa' }}>Items will appear here when added</p>
            </div>
          ) : (
            <Table striped hover responsive style={{ marginBottom: 0, fontSize: '0.95rem', backgroundColor: '#2a2a2a' }}>
              <thead style={{ backgroundColor: '#2a2a2a', color: '#ffffff', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.4)', borderBottom: '2px solid #333333' }}>
                <tr>
                  <th style={{ padding: '0.5rem', fontSize: '0.95rem', fontWeight: 'bold', color: '#ffffff' }}>#</th>
                  <th style={{ padding: '0.5rem', fontSize: '0.95rem', fontWeight: 'bold', color: '#ffffff' }}>Item</th>
                  <th style={{ padding: '0.5rem', fontSize: '0.95rem', fontWeight: 'bold', textAlign: 'right', color: '#ffffff' }}>Price</th>
                  <th style={{ padding: '0.5rem', fontSize: '0.95rem', fontWeight: 'bold', textAlign: 'center', color: '#ffffff' }}>Qty</th>
                  <th style={{ padding: '0.5rem', fontSize: '0.95rem', fontWeight: 'bold', textAlign: 'right', color: '#ffffff' }}>Total</th>
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: '#2a2a2a' }}>
                  {cart.map((item, index) => (
                  <tr key={index} style={{ fontSize: '0.9rem', backgroundColor: index % 2 === 0 ? '#2a2a2a' : '#1a1a1a', color: '#ffffff' }}>
                    <td style={{ padding: '0.5rem', verticalAlign: 'middle', fontSize: '0.95rem', color: '#ffffff' }}>{index + 1}</td>
                    <td style={{ padding: '0.5rem', verticalAlign: 'middle', color: '#ffffff' }}>
                        <div>
                        <strong style={{ fontSize: '0.95rem', display: 'block', color: '#ffffff' }}>{item.itemName}</strong>
                          {item.itemBarcode && item.itemBarcode !== 'N/A' && (
                          <div style={{ fontSize: '0.75rem', color: '#aaaaaa' }}>
                              <i className="bi bi-upc"></i> {item.itemBarcode}
                            </div>
                          )}
                        </div>
                      </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', verticalAlign: 'middle', fontSize: '0.95rem', color: '#ffffff' }}>
                        €{item.unitPrice?.toFixed(2) || '0.00'}
                      </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ffffff' }}>{item.quantity}</span>
                      </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '0.95rem', color: '#ffffff' }}>
                        €{item.totalPrice?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          )}
        </div>

        {/* Summary */}
        {cart.length > 0 && (
          <div style={{
            backgroundColor: '#2a2a2a',
            border: '1px solid #333333',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '0.4rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            flexShrink: 0
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.2rem',
              fontSize: '0.85rem',
              fontWeight: '500',
              color: '#ffffff'
            }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#ffffff' }}>€{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.2rem',
                fontSize: '0.85rem',
                color: '#aaaaaa',
                fontWeight: '500'
              }}>
                <span>Discount:</span>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#ffffff' }}>-€{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.3rem',
              borderTop: '2px solid #333333',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#ffffff'
            }}>
              <span>TOTAL:</span>
              <span style={{ fontSize: '1.3rem', color: '#ffffff' }}>€{total.toFixed(2)}</span>
            </div>
          </div>
        )}

      </Container>
    </div>
  );
};

export default CustomerDisplay;

