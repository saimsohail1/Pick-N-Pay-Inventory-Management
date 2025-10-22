/**
 * Enhanced printing utilities for Electron app
 * Uses hidden iframe instead of window.open to prevent popup blockers
 */

/**
 * Direct print function - prints immediately without dialog
 * @param {string} content - HTML content to print
 * @param {string} title - Document title
 * @param {Object} options - Print options
 */
export const directPrint = (content, title = 'Print Document', options = {}) => {
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
            console.log('Direct print started');
          };
          
          printWindow.onafterprint = () => {
            console.log('Direct print completed');
            // Cleanup
            document.body.removeChild(iframe);
            resolve(true);
          };
          
          // Start printing immediately with delay to ensure content is ready
          setTimeout(() => {
            printWindow.print();
          }, options.delay || 200);
          
        } catch (error) {
          console.error('Direct print error:', error);
          document.body.removeChild(iframe);
          reject(error);
        }
      };
      
      // Fallback timeout
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          reject(new Error('Direct print timeout'));
        }
      }, 10000);
      
    } catch (error) {
      console.error('Direct print setup error:', error);
      reject(error);
    }
  });
};

/**
 * Print content using hidden iframe (better for Electron)
 * @param {string} content - HTML content to print
 * @param {string} title - Document title
 * @param {Object} options - Print options
 */
export const printContent = (content, title = 'Print Document', options = {}) => {
  return directPrint(content, title, options);
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
 * Create optimized Z-report HTML for standard paper
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
            size: A4; 
            margin: 15mm; 
          }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            font-size: 10px; 
            line-height: 1.3;
            color: #000;
          }
        }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 10px; 
          line-height: 1.3; 
          margin: 0; 
          padding: 15mm; 
          color: #000;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #000; 
          padding-bottom: 10px; 
          margin-bottom: 15px; 
        }
        .section { 
          margin: 15px 0; 
          page-break-inside: avoid;
        }
        .section-title { 
          font-weight: bold; 
          font-size: 12px; 
          margin-bottom: 8px; 
          border-bottom: 1px solid #ccc; 
          padding-bottom: 3px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 8px 0;
        }
        th, td { 
          padding: 4px 6px; 
          text-align: left; 
          border-bottom: 1px solid #ddd;
        }
        th { 
          background-color: #f5f5f5; 
          font-weight: bold; 
          font-size: 9px;
        }
        td { 
          font-size: 9px;
        }
        .total-row { 
          font-weight: bold; 
          background-color: #f0f0f0; 
        }
        .footer { 
          text-align: center; 
          margin-top: 20px; 
          font-size: 9px; 
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }
        .right { text-align: right; }
        .center { text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="center"><strong>${companyName.toUpperCase()}</strong></div>
        <div class="center"><strong>Z-REPORT</strong></div>
        <div class="center">Date: ${startDate}</div>
        <div class="center">Generated: ${new Date().toLocaleString()}</div>
      </div>
      
      <div class="section">
        <div class="section-title">PAYMENT METHODS</div>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th class="right">Count</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData.paymentMethods || []).map(payment => `
              <tr class="${payment.label === 'Total' ? 'total-row' : ''}">
                <td>${payment.label.toUpperCase()}</td>
                <td class="right">${payment.count}</td>
                <td class="right">€${parseFloat(payment.total || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <div class="section-title">CATEGORY SALES</div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th class="right">Count</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData.categories || []).map(category => `
              <tr class="${category.category === 'Total' ? 'total-row' : ''}">
                <td>${category.category}</td>
                <td class="right">${category.count}</td>
                <td class="right">€${parseFloat(category.total || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <div class="section-title">VAT SUMMARY</div>
        <table>
          <tbody>
            <tr>
              <td>Amount Excluding VAT:</td>
              <td class="right">€${parseFloat(reportData.vatInfo?.totalAmountExcludingVat || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Total VAT Amount:</td>
              <td class="right">€${parseFloat(reportData.vatInfo?.totalVatAmount || 0).toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total Amount Including VAT:</strong></td>
              <td class="right"><strong>€${parseFloat(reportData.vatInfo?.totalAmountIncludingVat || 0).toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="footer">
        <div>End of Z-Report</div>
        <div>${companyName} - ${new Date().toLocaleString()}</div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Create Sales History HTML for printing
 * @param {Array} sales - Sales data
 * @param {string} companyName - Company name
 * @param {string} dateRange - Date range
 * @returns {string} HTML content
 */
export const createSalesHistoryHTML = (sales, companyName = 'PickNPay', dateRange = '') => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sales History - ${dateRange}</title>
      <style>
        @media print {
          @page { 
            size: A4; 
            margin: 15mm; 
          }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            font-size: 10px; 
            line-height: 1.3;
            color: #000;
          }
        }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 10px; 
          line-height: 1.3; 
          margin: 0; 
          padding: 15mm; 
          color: #000;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #000; 
          padding-bottom: 10px; 
          margin-bottom: 15px; 
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 8px 0;
        }
        th, td { 
          padding: 4px 6px; 
          text-align: left; 
          border-bottom: 1px solid #ddd;
        }
        th { 
          background-color: #f5f5f5; 
          font-weight: bold; 
          font-size: 9px;
        }
        td { 
          font-size: 9px;
        }
        .footer { 
          text-align: center; 
          margin-top: 20px; 
          font-size: 9px; 
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }
        .right { text-align: right; }
        .center { text-align: center; }
        .sale-item {
          font-size: 8px;
          color: #666;
          margin-left: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="center"><strong>${companyName.toUpperCase()}</strong></div>
        <div class="center"><strong>SALES HISTORY</strong></div>
        <div class="center">${dateRange}</div>
        <div class="center">Generated: ${new Date().toLocaleString()}</div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Date/Time</th>
            <th>Payment</th>
            <th>Items</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${sales.map((sale, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${new Date(sale.saleDate).toLocaleString()}</td>
              <td>${sale.paymentMethod}</td>
              <td>
                ${sale.saleItems.map(item => `
                  <div class="sale-item">${item.itemName} (${item.quantity}x)</div>
                `).join('')}
              </td>
              <td class="right">€${parseFloat(sale.totalAmount).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <div>Total Sales: ${sales.length} transactions</div>
        <div>Total Amount: €${sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0).toFixed(2)}</div>
        <div>${companyName} - ${new Date().toLocaleString()}</div>
      </div>
    </body>
    </html>
  `;
};
