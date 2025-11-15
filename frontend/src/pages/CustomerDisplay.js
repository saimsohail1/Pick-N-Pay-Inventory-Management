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
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '3rem',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Container fluid style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header - Just Company Name */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem',
          padding: '2rem',
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            fontSize: '4rem',
            fontWeight: 'bold',
            color: '#0d6efd',
            margin: 0,
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
          }}>
            {companyName}
          </h1>
        </div>

        {/* Cart Items */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          minHeight: '500px',
          flex: 1
        }}>
          {cart.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '6rem 2rem',
              color: '#6c757d'
            }}>
              <i className="bi bi-cart" style={{ fontSize: '6rem', display: 'block', marginBottom: '2rem', color: '#dee2e6' }}></i>
              <h3 style={{ fontSize: '2.5rem', margin: 0, fontWeight: '600' }}>Cart is Empty</h3>
              <p style={{ fontSize: '1.8rem', marginTop: '1rem', color: '#adb5bd' }}>Items will appear here when added</p>
            </div>
          ) : (
            <>
              <Table striped hover responsive style={{ marginBottom: 0 }}>
                <thead style={{ backgroundColor: '#0d6efd', color: '#fff' }}>
                  <tr>
                    <th style={{ padding: '1.5rem', fontSize: '1.8rem', fontWeight: 'bold' }}>#</th>
                    <th style={{ padding: '1.5rem', fontSize: '1.8rem', fontWeight: 'bold' }}>Item</th>
                    <th style={{ padding: '1.5rem', fontSize: '1.8rem', fontWeight: 'bold', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '1.5rem', fontSize: '1.8rem', fontWeight: 'bold', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '1.5rem', fontSize: '1.8rem', fontWeight: 'bold', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => (
                    <tr key={index} style={{ fontSize: '1.6rem' }}>
                      <td style={{ padding: '1.5rem', verticalAlign: 'middle', fontSize: '1.8rem' }}>{index + 1}</td>
                      <td style={{ padding: '1.5rem', verticalAlign: 'middle' }}>
                        <div>
                          <strong style={{ fontSize: '1.8rem', display: 'block', marginBottom: '0.5rem' }}>{item.itemName}</strong>
                          {item.itemBarcode && item.itemBarcode !== 'N/A' && (
                            <div style={{ fontSize: '1.2rem', color: '#6c757d', marginTop: '0.25rem' }}>
                              <i className="bi bi-upc"></i> {item.itemBarcode}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1.5rem', textAlign: 'right', verticalAlign: 'middle', fontSize: '1.8rem' }}>
                        €{item.unitPrice?.toFixed(2) || '0.00'}
                      </td>
                      <td style={{ padding: '1.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0d6efd' }}>{item.quantity}</span>
                      </td>
                      <td style={{ padding: '1.5rem', textAlign: 'right', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '1.8rem' }}>
                        €{item.totalPrice?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </div>

        {/* Summary */}
        {cart.length > 0 && (
          <div style={{
            backgroundColor: '#0d6efd',
            color: '#fff',
            borderRadius: '12px',
            padding: '3rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              fontSize: '2rem',
              fontWeight: '500'
            }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 'bold', fontSize: '2.2rem' }}>€{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                fontSize: '2rem',
                color: '#90ee90',
                fontWeight: '500'
              }}>
                <span>Discount:</span>
                <span style={{ fontWeight: 'bold', fontSize: '2.2rem' }}>-€{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '2rem',
              borderTop: '3px solid rgba(255,255,255,0.3)',
              fontSize: '3rem',
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
            }}>
              <span>TOTAL:</span>
              <span style={{ fontSize: '3.5rem' }}>€{total.toFixed(2)}</span>
            </div>
          </div>
        )}

      </Container>
    </div>
  );
};

export default CustomerDisplay;

