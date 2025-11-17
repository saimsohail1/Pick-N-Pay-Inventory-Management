import React, { useState, useEffect } from 'react';
import { Table, Container } from 'react-bootstrap';
import { companySettingsAPI } from '../services/api';

const CustomerDisplay = () => {
  const [cart, setCart] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [companyName, setCompanyName] = useState('PickNPay');

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
      backgroundColor: '#f8f9fa',
      padding: '0.5rem',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Container fluid style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0 }}>
        {/* Header - Just Company Name */}
        <div style={{
          textAlign: 'center',
          marginBottom: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          flexShrink: 0
        }}>
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: '#0d6efd',
            margin: 0,
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
          }}>
            {companyName}
          </h1>
        </div>

        {/* Cart Items */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '0.5rem',
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {cart.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6c757d',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%'
            }}>
              <i className="bi bi-cart" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem', color: '#dee2e6' }}></i>
              <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '600' }}>Cart is Empty</h3>
              <p style={{ fontSize: '1rem', marginTop: '0.5rem', color: '#adb5bd' }}>Items will appear here when added</p>
            </div>
          ) : (
            <Table striped hover responsive style={{ marginBottom: 0, fontSize: '0.9rem' }}>
              <thead style={{ backgroundColor: '#0d6efd', color: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '0.4rem', fontSize: '0.9rem', fontWeight: 'bold' }}>#</th>
                  <th style={{ padding: '0.4rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Item</th>
                  <th style={{ padding: '0.4rem', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '0.4rem', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '0.4rem', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, index) => (
                  <tr key={index} style={{ fontSize: '0.85rem' }}>
                    <td style={{ padding: '0.4rem', verticalAlign: 'middle', fontSize: '0.9rem' }}>{index + 1}</td>
                    <td style={{ padding: '0.4rem', verticalAlign: 'middle' }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem', display: 'block' }}>{item.itemName}</strong>
                        {item.itemBarcode && item.itemBarcode !== 'N/A' && (
                          <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>
                            <i className="bi bi-upc"></i> {item.itemBarcode}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', verticalAlign: 'middle', fontSize: '0.9rem' }}>
                      €{item.unitPrice?.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ padding: '0.4rem', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0d6efd' }}>{item.quantity}</span>
                    </td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '0.9rem' }}>
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
            backgroundColor: '#0d6efd',
            color: '#fff',
            borderRadius: '8px',
            padding: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            flexShrink: 0
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.3rem',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>€{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.3rem',
                fontSize: '0.9rem',
                color: '#90ee90',
                fontWeight: '500'
              }}>
                <span>Discount:</span>
                <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>-€{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.5rem',
              borderTop: '2px solid rgba(255,255,255,0.3)',
              fontSize: '1.3rem',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
            }}>
              <span>TOTAL:</span>
              <span style={{ fontSize: '1.5rem' }}>€{total.toFixed(2)}</span>
            </div>
          </div>
        )}

      </Container>
    </div>
  );
};

export default CustomerDisplay;

