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
            font-weight: bold;
          }
        }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 12px; 
          line-height: 1.2; 
          margin: 0; 
          padding: 5mm; 
          width: 70mm;
          font-weight: bold;
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
      <meta charset="UTF-8">
      <style>
        * {
          box-sizing: border-box;
        }
        
        @media print {
          @page { 
            size: A4; 
            margin: 5mm; 
          }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Arial', sans-serif; 
            font-size: 24px; 
            line-height: 1.8;
            color: #000;
            background: white;
            font-weight: 900;
          }
          .no-print {
            display: none !important;
          }
        }
        
        body { 
          font-family: 'Arial', sans-serif; 
          font-size: 24px; 
          line-height: 1.8; 
          margin: 0; 
          padding: 5mm; 
          color: #000;
          background: white;
          font-weight: 900;
        }
        
        .header { 
          text-align: center; 
          border-bottom: 4px solid #000; 
          padding-bottom: 25px; 
          margin-bottom: 30px; 
        }
        
        .header h1 {
          margin: 0 0 15px 0;
          font-size: 42px;
          font-weight: 900;
        }
        
        .header .subtitle {
          margin: 15px 0;
          font-size: 34px;
          font-weight: 900;
        }
        
        .header .date-info {
          margin: 15px 0;
          font-size: 24px;
          font-weight: 900;
        }
        
        .section { 
          margin: 30px 0; 
          page-break-inside: avoid;
        }
        
        .section-title { 
          font-weight: 900; 
          font-size: 28px; 
          margin-bottom: 25px; 
          border-bottom: 5px solid #333; 
          padding-bottom: 15px;
          text-transform: uppercase;
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0;
          border: 3px solid #000;
        }
        
        th, td { 
          padding: 20px 25px; 
          text-align: left; 
          border: 3px solid #000;
          vertical-align: top;
        }
        
        th { 
          background-color: #f0f0f0; 
          font-weight: 900; 
          font-size: 24px;
          text-transform: uppercase;
        }
        
        td { 
          font-size: 24px;
          font-weight: 900;
        }
        
        .total-row { 
          font-weight: 900; 
          background-color: #e0e0e0; 
          border-top: 3px solid #000;
        }
        
        .footer { 
          text-align: center; 
          margin-top: 35px; 
          font-size: 22px; 
          border-top: 5px solid #000;
          padding-top: 25px;
          font-weight: 900;
        }
        
        .right { text-align: right; }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        
        .summary-box {
          border: 6px solid #000;
          padding: 35px;
          margin: 40px 0;
          background-color: #f9f9f9;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin: 18px 0;
          padding: 12px 0;
          font-size: 24px;
          font-weight: 900;
        }
        
        .summary-total {
          border-top: 5px solid #000;
          padding-top: 18px;
          margin-top: 30px;
          font-weight: 900;
          font-size: 26px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${companyName.toUpperCase()}</h1>
        <div class="subtitle">Z-REPORT</div>
        <div class="date-info">Date: ${startDate}</div>
        <div class="date-info">Generated: ${new Date().toLocaleString()}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Payment Methods Summary</div>
        <table>
          <thead>
            <tr>
              <th>Payment Method</th>
              <th class="right">Transactions</th>
              <th class="right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData.paymentMethods || []).map(payment => `
              <tr class="${payment.label === 'Total' ? 'total-row' : ''}">
                <td class="bold">${payment.label.toUpperCase()}</td>
                <td class="right">${payment.count || 0}</td>
                <td class="right bold">€${parseFloat(payment.total || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <div class="section-title">Category Sales Summary</div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th class="right">Items Sold</th>
              <th class="right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData.categories || []).map(category => `
              <tr class="${category.category === 'Total' ? 'total-row' : ''}">
                <td class="bold">${category.category}</td>
                <td class="right">${category.count || 0}</td>
                <td class="right bold">€${parseFloat(category.total || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <div class="section-title">VAT Summary</div>
        <div class="summary-box">
          <div class="summary-row">
            <span>Amount Excluding VAT:</span>
            <span class="right bold">€${parseFloat(reportData.vatInfo?.totalAmountExcludingVat || 0).toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Total VAT Amount (23%):</span>
            <span class="right bold">€${parseFloat(reportData.vatInfo?.totalVatAmount || 0).toFixed(2)}</span>
          </div>
          <div class="summary-row summary-total">
            <span>TOTAL AMOUNT INCLUDING VAT:</span>
            <span class="right bold">€${parseFloat(reportData.vatInfo?.totalAmountIncludingVat || 0).toFixed(2)}</span>
        </div>
        </div>
      </div>
      
      <div class="footer">
        <div class="bold">End of Z-Report</div>
        <div>${companyName} - Generated on ${new Date().toLocaleString()}</div>
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
  const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || 0), 0);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sales History - ${dateRange}</title>
      <meta charset="UTF-8">
      <style>
        * {
          box-sizing: border-box;
        }
        
        @media print {
          @page { 
            size: A4; 
            margin: 10mm; 
          }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Arial', sans-serif; 
            font-size: 11px; 
            line-height: 1.4;
            color: #000;
            background: white;
            font-weight: bold;
          }
          .no-print {
            display: none !important;
          }
        }
        
        body { 
          font-family: 'Arial', sans-serif; 
          font-size: 11px; 
          line-height: 1.4; 
          margin: 0; 
          padding: 10mm; 
          color: #000;
          background: white;
          font-weight: bold;
        }
        
        .header { 
          text-align: center; 
          border-bottom: 2px solid #000; 
          padding-bottom: 15px; 
          margin-bottom: 20px; 
        }
        
        .header h1 {
          margin: 0 0 5px 0;
          font-size: 18px;
          font-weight: bold;
        }
        
        .header .subtitle {
          margin: 5px 0;
          font-size: 14px;
          font-weight: bold;
        }
        
        .header .date-info {
          margin: 5px 0;
          font-size: 12px;
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 15px 0;
          border: 1px solid #000;
        }
        
        th, td { 
          padding: 8px 10px; 
          text-align: left; 
          border: 1px solid #000;
          vertical-align: top;
        }
        
        th { 
          background-color: #f0f0f0; 
          font-weight: bold; 
          font-size: 11px;
          text-transform: uppercase;
        }
        
        td { 
          font-size: 11px;
        }
        
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          font-size: 10px; 
          border-top: 1px solid #000;
          padding-top: 10px;
        }
        
        .right { text-align: right; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        
        .sale-item {
          font-size: 10px;
          margin: 2px 0;
          padding: 2px 0;
          border-bottom: 1px dotted #ccc;
        }
        
        .sale-item:last-child {
          border-bottom: none;
        }
        
        .sale-number {
          font-weight: bold;
          color: #333;
        }
        
        .payment-method {
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .payment-cash {
          color: #28a745;
        }
        
        .payment-card {
          color: #007bff;
        }
        
        .total-amount {
          font-weight: bold;
          font-size: 12px;
        }
        
        .summary-box {
          border: 2px solid #000;
          padding: 15px;
          margin: 20px 0;
          background-color: #f9f9f9;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
          padding: 3px 0;
        }
        
        .summary-total {
          border-top: 1px solid #000;
          padding-top: 5px;
          margin-top: 10px;
          font-weight: bold;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${companyName.toUpperCase()}</h1>
        <div class="subtitle">SALES HISTORY</div>
        <div class="date-info">${dateRange}</div>
        <div class="date-info">Generated: ${new Date().toLocaleString()}</div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 20%;">Date/Time</th>
            <th style="width: 15%;">Payment</th>
            <th style="width: 45%;">Items</th>
            <th style="width: 15%;" class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${sales.map((sale, index) => `
            <tr>
              <td class="sale-number">${index + 1}</td>
              <td>${new Date(sale.saleDate).toLocaleString()}</td>
              <td class="payment-method ${sale.paymentMethod === 'CASH' ? 'payment-cash' : 'payment-card'}">${sale.paymentMethod}</td>
              <td>
                ${(sale.saleItems || []).map(item => `
                  <div class="sale-item">
                    <strong>${item.itemName || 'Unknown Item'}</strong> 
                    (${item.quantity || 0}x) 
                    <span class="right">€${parseFloat(item.totalPrice || 0).toFixed(2)}</span>
          </div>
        `).join('')}
              </td>
              <td class="right total-amount">€${parseFloat(sale.totalAmount || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="summary-box">
        <div class="summary-row">
          <span>Total Transactions:</span>
          <span class="right bold">${sales.length}</span>
        </div>
        <div class="summary-row summary-total">
          <span>TOTAL AMOUNT:</span>
          <span class="right bold">€${totalAmount.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="footer">
        <div class="bold">End of Sales History</div>
        <div>${companyName} - Generated on ${new Date().toLocaleString()}</div>
      </div>
    </body>
    </html>
  `;
};
