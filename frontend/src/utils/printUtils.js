/**
 * Enhanced printing utilities for Electron app
 * Uses hidden iframe instead of window.open to prevent popup blockers
 */

/**
 * Print content using hidden iframe (better for Electron)
 * @param {string} content - HTML content to print
 * @param {string} title - Document title
 * @param {Object} options - Print options
 */
export const printContent = (content, title = 'Print Document', options = {}) => {
  return new Promise((resolve, reject) => {
    try {
      // Create hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      
      document.body.appendChild(iframe);
      
      // Set content
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(content);
      doc.close();
      
      // Wait for content to load
      iframe.onload = () => {
        try {
          const printWindow = iframe.contentWindow;
          
          // Set up print event listeners
          printWindow.onbeforeprint = () => {
            console.log('Print started');
          };
          
          printWindow.onafterprint = () => {
            console.log('Print completed');
            // Cleanup
            document.body.removeChild(iframe);
            resolve(true);
          };
          
          // Start printing with delay to ensure content is ready
          setTimeout(() => {
            printWindow.print();
          }, options.delay || 100);
          
        } catch (error) {
          console.error('Print error:', error);
          document.body.removeChild(iframe);
          reject(error);
        }
      };
      
      // Fallback timeout
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          reject(new Error('Print timeout'));
        }
      }, 10000);
      
    } catch (error) {
      console.error('Print setup error:', error);
      reject(error);
    }
  });
};

/**
 * Print using Electron IPC (if available)
 * @param {string} content - HTML content to print
 * @param {string} title - Document title
 */
export const printWithElectron = (content, title = 'Print Document') => {
  return new Promise((resolve, reject) => {
    try {
      // Check if running in Electron
      if (window.require && window.require('electron')) {
        const { ipcRenderer } = window.require('electron');
        
        // Send print request to main process
        ipcRenderer.invoke('print-content', { content, title })
          .then((result) => {
            if (result.success) {
              resolve(true);
            } else {
              reject(new Error(result.error || 'Print failed'));
            }
          })
          .catch(reject);
      } else {
        // Fallback to iframe method
        printContent(content, title).then(resolve).catch(reject);
      }
    } catch (error) {
      console.error('Electron print error:', error);
      // Fallback to iframe method
      printContent(content, title).then(resolve).catch(reject);
    }
  });
};

/**
 * Create optimized receipt HTML for thermal printers
 * @param {Object} sale - Sale data
 * @param {string} companyName - Company name
 * @returns {string} HTML content
 */
export const createReceiptHTML = (sale, companyName = 'PickNPay') => {
  const subtotalExcludingVat = sale.saleItems.reduce((sum, item) => 
    sum + parseFloat(item.priceExcludingVat || 0), 0
  );
  const totalVat = sale.saleItems.reduce((sum, item) => 
    sum + parseFloat(item.vatAmount || 0), 0
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - Sale #${sale.id}</title>
      <style>
        @media print {
          @page { 
            size: 80mm auto; 
            margin: 0; 
          }
          body { 
            margin: 0; 
            padding: 5mm; 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            line-height: 1.2;
            width: 70mm;
          }
        }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 12px; 
          line-height: 1.2; 
          margin: 0; 
          padding: 5mm; 
          width: 70mm;
        }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px; }
        .item { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; }
        .total { border-top: 1px dashed #000; padding-top: 5px; margin-top: 10px; font-weight: bold; }
        .vat-info { margin: 5px 0; font-size: 10px; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .center { text-align: center; }
        .right { text-align: right; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="center"><strong>${companyName.toUpperCase()}</strong></div>
        <div class="center">SALE RECEIPT</div>
        <div class="center">Date: ${new Date(sale.saleDate).toLocaleDateString()}</div>
        <div class="center">Time: ${new Date(sale.saleDate).toLocaleTimeString()}</div>
        <div class="center">Sale ID: ${sale.id}</div>
        <div class="center">Cashier: ${sale.user?.username || 'Unknown'}</div>
      </div>
      
      <div class="divider"></div>
      
      ${sale.saleItems.map(item => `
        <div class="item">
          <span>${item.itemName}</span>
          <span>€${parseFloat(item.unitPrice).toFixed(2)}</span>
        </div>
        <div class="item" style="margin-left: 10px; font-size: 10px;">
          <span>${item.quantity}x</span>
          <span>€${parseFloat(item.totalPrice).toFixed(2)}</span>
        </div>
      `).join('')}
      
      <div class="divider"></div>
      
      <div class="item">
        <span>Subtotal (excl. VAT):</span>
        <span>€${subtotalExcludingVat.toFixed(2)}</span>
      </div>
      <div class="item">
        <span>VAT (23%):</span>
        <span>€${totalVat.toFixed(2)}</span>
      </div>
      <div class="total">
        <div class="item">
          <span><strong>TOTAL:</strong></span>
          <span><strong>€${parseFloat(sale.totalAmount).toFixed(2)}</strong></span>
        </div>
      </div>
      
      <div class="vat-info">
        <div class="center">VAT No: ${sale.vatNumber || 'N/A'}</div>
      </div>
      
      <div class="divider"></div>
      
      <div class="footer">
        <div>Thank you for your purchase!</div>
        <div>${companyName}</div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Create optimized Z-report HTML for thermal printers
 * @param {Object} reportData - Report data
 * @param {string} companyName - Company name
 * @param {string} startDate - Report start date
 * @returns {string} HTML content
 */
export const createZReportHTML = (reportData, companyName = 'PickNPay', startDate) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Z-Report - ${startDate}</title>
      <style>
        @media print {
          @page { 
            size: 80mm auto; 
            margin: 0; 
          }
          body { 
            margin: 0; 
            padding: 5mm; 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            line-height: 1.2;
            width: 70mm;
          }
        }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 12px; 
          line-height: 1.2; 
          margin: 0; 
          padding: 5mm; 
          width: 70mm;
        }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px; }
        .item { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; }
        .total { border-top: 1px dashed #000; padding-top: 5px; margin-top: 10px; font-weight: bold; }
        .section { margin: 10px 0; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .center { text-align: center; }
        .right { text-align: right; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="center"><strong>${companyName.toUpperCase()}</strong></div>
        <div class="center"><strong>Z-REPORT</strong></div>
        <div class="center">Date: ${startDate}</div>
        <div class="center">${new Date().toLocaleString()}</div>
      </div>
      
      <div class="divider"></div>
      
      <div class="section">
        <div class="center"><strong>SALES SUMMARY</strong></div>
        <div class="item">
          <span>Total Sales:</span>
          <span>€${parseFloat(reportData.totalSales || 0).toFixed(2)}</span>
        </div>
        <div class="item">
          <span>Total Items:</span>
          <span>${reportData.totalItems || 0}</span>
        </div>
        <div class="item">
          <span>Total Transactions:</span>
          <span>${reportData.totalTransactions || 0}</span>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="section">
        <div class="center"><strong>VAT SUMMARY</strong></div>
        <div class="item">
          <span>Subtotal (excl. VAT):</span>
          <span>€${parseFloat(reportData.vatInfo?.subtotalExcludingVat || 0).toFixed(2)}</span>
        </div>
        <div class="item">
          <span>Total VAT:</span>
          <span>€${parseFloat(reportData.vatInfo?.totalVat || 0).toFixed(2)}</span>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="section">
        <div class="center"><strong>CATEGORY BREAKDOWN</strong></div>
        ${(reportData.categorySummary || []).map(category => `
          <div class="item">
            <span>${category.categoryName}:</span>
            <span>€${parseFloat(category.totalSales || 0).toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="divider"></div>
      
      <div class="footer">
        <div>End of Z-Report</div>
        <div>${companyName}</div>
      </div>
    </body>
    </html>
  `;
};
