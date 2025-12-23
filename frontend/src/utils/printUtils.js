/**
 * Enhanced printing utilities for Electron app
 * Uses hidden iframe instead of window.open to prevent popup blockers
 */

/**
 * Print receipt using raw ESC/POS (bypasses print spooler - no drawer interference)
 * @param {Object} sale - Sale data
 * @param {string} companyName - Company name
 * @param {string} companyAddress - Company address
 * @param {string} printerName - Optional printer name
 * @param {string} cashierName - Optional cashier name (overrides sale.user?.username)
 * @param {string} vatNumber - Optional VAT number
 */
export const printReceiptRaw = async (sale, companyName = "ADAMS GREEN", companyAddress = '', printerName = null, cashierName = null, vatNumber = null) => {
  // Always use directPrint (browser's window.print) - this is what worked in the original version
  // The IPC handler is just a passthrough, so we use the browser's native printing
  console.log('🖨️ Printing receipt using browser print (window.print)');
  const receiptContent = createReceiptHTML(sale, companyName, companyAddress, cashierName, vatNumber);
  return directPrint(receiptContent, `Receipt - Sale #${sale.id}`);
};

/**
 * Direct print function - prints silently without dialog (uses Electron IPC if available)
 * @param {string} content - HTML content to print
 * @param {string} title - Document title
 * @param {Object} options - Print options
 */
export const directPrint = (content, title = 'Print Document', options = {}) => {
  return new Promise((resolve, reject) => {
    // If in Electron, use silent IPC printing (no dialog)
    if (window.electron && window.electron.ipcRenderer) {
      console.log('🖨️ Printing silently via Electron IPC (no dialog)');
      window.electron.ipcRenderer.invoke('print-silent', {
        html: content,
        printerName: options.printerName || null
      }).then((result) => {
        if (result && result.success) {
          console.log('✅ Silent print completed');
          resolve(true);
        } else {
          console.error('❌ Silent print failed:', result);
          // Don't fall back to window.print() in Electron - just reject
          reject(new Error(result?.message || 'Print failed'));
        }
      }).catch((error) => {
        console.error('❌ Silent print error:', error);
        // Don't fall back to window.print() in Electron - just reject
        reject(error);
      });
      return; // Important: return early to prevent fallback
    }

    // Fallback: Use window.print() (will show dialog in browser)
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
 * @param {string} companyAddress - Company address
 * @param {string} cashierName - Optional cashier name
 * @param {string} vatNumber - Optional VAT number
 * @returns {string} HTML content
 */
export const createReceiptHTML = (sale, companyName = "ADAMS GREEN", companyAddress = '', cashierName = null, vatNumber = null) => {
  // Helper function to format date as DD/MM/YYYY
  const formatReceiptDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const subtotalExcludingVat = sale.saleItems.reduce((sum, item) => 
    sum + parseFloat(item.priceExcludingVat || 0), 0
  );
  const totalVat = sale.saleItems.reduce((sum, item) => 
    sum + parseFloat(item.vatAmount || 0), 0
  );
  
  // Use the selected VAT rate from the sale (this is the VAT rate selected on the sales page)
  // This is the ONLY VAT rate that should be used - it applies to all items in the sale
  let selectedVatRate = 0;
  if (sale.selectedVatRate != null) {
    // Use the selected VAT rate stored in the sale
    selectedVatRate = parseFloat(sale.selectedVatRate);
  } else if (sale.saleItems && sale.saleItems.length > 0) {
    // Fallback: Get VAT rate from first item if selectedVatRate not stored (for old sales)
    selectedVatRate = parseFloat(sale.saleItems[0].vatRate || 0);
  }
  
  // If still no VAT rate found, calculate from totals
  if (selectedVatRate === 0 && subtotalExcludingVat > 0) {
    selectedVatRate = (totalVat / subtotalExcludingVat) * 100;
  } else if (selectedVatRate === 0) {
    selectedVatRate = 23; // Default fallback
  }

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
            font-weight: 600;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 12px; 
          line-height: 1.2; 
          margin: 0; 
          padding: 5mm; 
          width: 70mm;
          font-weight: 600;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px; }
        .header .company-name { font-size: 16px; font-weight: 700; margin-bottom: 3px; }
        .header .company-address { font-size: 14px; font-weight: 600; margin-bottom: 3px; }
        .item { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; font-weight: 600; }
        .total { border-top: 1px dashed #000; padding-top: 5px; margin-top: 10px; font-weight: 700; }
        .vat-info { margin: 5px 0; font-size: 10px; font-weight: 600; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; font-weight: 600; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .center { text-align: center; }
        .right { text-align: right; }
        .notes-box { 
          background-color: #ffff00 !important; 
          padding: 8px; 
          margin: 8px 0; 
          border: 2px solid #000; 
          text-align: center; 
          font-weight: 700; 
          font-size: 13px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        * { color: #000 !important; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="center company-name">${companyName.toUpperCase()}</div>
        ${companyAddress ? `<div class="center company-address">${companyAddress}</div>` : ''}
        ${vatNumber ? `<div class="center" style="font-size: 11px; font-weight: 600;">VAT No: ${vatNumber}</div>` : ''}
        <div class="center">SALE RECEIPT</div>
        <div class="center">Date: ${formatReceiptDate(sale.saleDate)}</div>
        <div class="center">Time: ${new Date(sale.saleDate).toLocaleTimeString()}</div>
        <div class="center">Cashier: ${cashierName || sale.user?.username || 'Unknown'}</div>
      </div>
      
      <div class="divider"></div>
      
      ${sale.notes ? `
        <div style="margin: 5px 0; font-weight: 700; font-size: 11px; white-space: pre-wrap; word-wrap: break-word;">${sale.notes}</div>
      ` : ''}
      
      ${sale.saleItems.map(item => `
        <div class="item">
          <span>${item.itemName} ${item.quantity}x</span>
          <span>€${parseFloat(item.totalPrice).toFixed(2)}</span>
        </div>
      `).join('')}
      
      <div class="divider"></div>
      
      <div class="item">
        <span>VAT (${selectedVatRate.toFixed(1)}%):</span>
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
      
      <div style="margin-top: 10px; padding: 8px; border: 1px dashed #000; font-size: 11px; font-weight: 700; line-height: 1.3;">
        <div style="text-align: center; font-weight: 700; margin-bottom: 5px; font-size: 12px;">SHOP POLICY:</div>
        <div style="margin-bottom: 3px; font-weight: 700;">BRAND NEW DEVICES ONLY COVER MANUFACTURE WARRANTY.</div>
        <div style="margin-bottom: 3px; font-weight: 700;">${companyName.toUpperCase()} DOES NOT COVER ANY WARRANTY FOR BRAND NEW DEVICES.</div>
        <div style="margin-bottom: 3px; font-weight: 700;">New Devices Can be returned within 7 days if unopened and unused.</div>
        <div style="margin-bottom: 3px; font-weight: 700;">Accessory warranty vary depending on the manufacturer</div>
        <div style="margin-bottom: 3px; font-weight: 700;">If faulty within 7 days a repair will be authorised.</div>
        <div style="margin-bottom: 3px; font-weight: 700;">No Return & no Refund For Used Phones if faulty product we fix or exchange depending on the product condition.</div>
        <div style="margin-bottom: 3px; font-weight: 700;">USED PHONES WARRANTY COVER ONLY ${companyName.toUpperCase()} but depending on the product conditions.</div>
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
export const createZReportHTML = (reportData, companyName = "ADAMS GREEN", startDate, companyAddress = '', companyPhone = '', vatNumber = '', website = '') => {
  // Format date as DD/MM/YYYY or handle date range string
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    // Helper function to format a single date
    const formatSingleDate = (d) => {
      const date = new Date(d);
      if (isNaN(date.getTime())) return d; // Return original if invalid
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    // Check if it's a date range (contains " to ")
    if (dateStr.includes(' to ')) {
      const [start, end] = dateStr.split(' to ');
      // Format both dates and use hyphen separator: "DD/MM/YYYY - DD/MM/YYYY"
      return `${formatSingleDate(start)} - ${formatSingleDate(end)}`;
    }
    
    // Single date - format it as "DD/MM/YYYY"
    return formatSingleDate(dateStr);
  };

  // Process VAT breakdown from backend
  let vatRows = [];
  let totalGross = 0;
  let totalVat = 0;
  let totalNet = 0;
  let weightedVatSum = 0;
  let totalGrossForAvg = 0;
  
  if (reportData.vatBreakdown && reportData.vatBreakdown.length > 0) {
    // Use backend-provided VAT breakdown
    vatRows = reportData.vatBreakdown.map(vat => {
      const gross = parseFloat(vat.gross || 0);
      const vatAmount = parseFloat(vat.vatAmount || 0);
      const net = parseFloat(vat.net || 0);
      const rate = parseFloat(vat.vatRate || 0);
      
      totalGross += gross;
      totalVat += vatAmount;
      totalNet += net;
      
      // Calculate weighted average (weight by gross amount)
      weightedVatSum += rate * gross;
      totalGrossForAvg += gross;
      
      return {
        rate: `${rate.toFixed(1)}%`,
        gross: gross,
        vat: vatAmount,
        net: net
      };
    });
  } else if (reportData.vatInfo) {
    // Fallback to old format if breakdown not available
    const gross = parseFloat(reportData.vatInfo.totalAmountIncludingVat || 0);
    const vat = parseFloat(reportData.vatInfo.totalVatAmount || 0);
    const net = parseFloat(reportData.vatInfo.totalAmountExcludingVat || 0);
    
    // Calculate average VAT percentage
    const avgVatRate = gross > 0 ? (vat / net) * 100 : 0;
    
    vatRows = [{
      rate: `${Math.round(avgVatRate)}%`,
      gross: gross,
      vat: vat,
      net: net
    }];
    
    totalGross = gross;
    totalVat = vat;
    totalNet = net;
  }
  
  // Calculate weighted average VAT percentage
  const avgVatPercentage = totalGrossForAvg > 0 ? weightedVatSum / totalGrossForAvg : 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Z-Report - ${startDate}</title>
      <meta charset="UTF-8">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        @media print {
          @page { 
            size: 80mm auto; 
            margin: 0; 
          }
          body { 
            margin: 0; 
            padding: 4mm; 
            font-family: 'Courier New', monospace; 
            font-size: 13px; 
            line-height: 1.3;
            width: 72mm;
            font-weight: 600;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: 13px; 
          line-height: 1.3; 
          margin: 0; 
          padding: 4mm; 
          width: 72mm;
          color: #000;
          background: white;
          font-weight: 600;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .header { 
          text-align: center; 
          margin-bottom: 8px;
          width: 100%;
        }
        
        .header > div {
          text-align: center;
          width: 100%;
        }
        
        .header .company-name {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
          text-align: center;
        }
        
        .header .address {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 3px;
          text-align: center;
        }
        
        .header .phone {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 3px;
          text-align: center;
        }
        
        .header .date {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 6px;
          text-align: center;
        }
        
        .divider {
          border-top: 1px solid #000;
          margin: 12px 0;
        }
        
        .section { 
          margin: 12px 0; 
          page-break-inside: avoid;
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 6px 0;
          font-size: 12px;
        }
        
        th, td { 
          padding: 5px 4px; 
          text-align: left; 
          vertical-align: top;
          font-size: 12px;
          font-weight: 600;
          color: #000;
        }
        
        th { 
          font-weight: 700;
          text-transform: uppercase;
          border-bottom: 1px dashed #000;
          padding-bottom: 5px;
          font-size: 12px;
        }
        
        td {
          white-space: nowrap;
        }
        
        td:first-child {
          white-space: normal;
          word-wrap: break-word;
          max-width: 40%;
        }
        
        th.right, td.count, td.currency {
          text-align: right;
        }
        
        th.right:last-child, td.currency {
          padding-right: 8px;
        }
        
        .right { 
          text-align: right; 
        }
        
        .total-row {
          border-top: 1px dashed #000;
          padding-top: 5px;
          margin-top: 5px;
          font-weight: 700;
          font-size: 12px;
        }
        
        .total-row td.currency {
          padding-right: 10px;
        }
        
        table tbody tr.total-row td:last-child {
          padding-right: 10px;
        }
        
        .currency {
          text-align: right;
          white-space: nowrap;
          font-weight: 600;
        }
        
        .count {
          text-align: right;
          white-space: nowrap;
          font-weight: 600;
        }
        
        
        .section-title {
          font-weight: 700;
          margin-bottom: 6px;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${companyName}</div>
        ${companyAddress ? `<div class="address">${companyAddress}</div>` : ''}
        ${vatNumber ? `<div class="address" style="font-size: 13px; font-weight: 700;">VAT No: ${vatNumber}</div>` : ''}
        ${companyPhone ? `<div class="phone">Tel: ${companyPhone}</div>` : ''}
        ${website ? `<div class="phone" style="font-size: 12px;">Website: ${website}</div>` : ''}
        <div class="date">${formatDate(startDate)}</div>
      </div>
      
      <div class="divider"></div>
      
      <div class="section">
        <table>
          <thead>
            <tr>
              <th>Label</th>
              <th class="right">Count</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData.paymentMethods || []).map(payment => `
              <tr class="${payment.label === 'Total' ? 'total-row' : ''}">
                <td>${payment.label}</td>
                <td class="count">${payment.count || 0}</td>
                <td class="currency">€ ${parseFloat(payment.total || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="divider"></div>
      
      <div class="section">
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
                <td class="count">${category.count || 0}</td>
                <td class="currency">€ ${parseFloat(category.total || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="divider"></div>
      
      <div class="section">
        <table>
          <thead>
            <tr>
              <th>VAT %</th>
              <th class="right">Gross</th>
              <th class="right">VAT</th>
              <th class="right">Net</th>
            </tr>
          </thead>
          <tbody>
            ${vatRows.length > 0 ? vatRows.map(vat => `
              <tr>
                <td>${vat.rate}</td>
                <td class="currency">€ ${vat.gross.toFixed(2)}</td>
                <td class="currency">€ ${vat.vat.toFixed(2)}</td>
                <td class="currency">€ ${vat.net.toFixed(2)}</td>
              </tr>
            `).join('') : `
              <tr>
                <td>N/A</td>
                <td class="currency">€ 0.00</td>
                <td class="currency">€ 0.00</td>
                <td class="currency">€ 0.00</td>
              </tr>
            `}
            ${vatRows.length > 0 && avgVatPercentage > 0 ? `
              <tr>
                <td>Avg ${Math.round(avgVatPercentage)}%</td>
                <td class="currency">-</td>
                <td class="currency">-</td>
                <td class="currency">-</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td>Total</td>
              <td class="currency">€ ${totalGross.toFixed(2)}</td>
              <td class="currency">€ ${totalVat.toFixed(2)}</td>
              <td class="currency">€ ${totalNet.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
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
export const createSalesHistoryHTML = (sales, companyName = "ADAMS GREEN", dateRange = '', vatNumber = '', companyAddress = '', companyPhone = '', website = '') => {
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
        
        .notes-box {
          background-color: #ffff00;
          padding: 8px;
          margin: 5px 0;
          border: 2px solid #000;
          font-weight: bold;
          font-size: 11px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .vat-info {
          font-size: 10px;
          color: #555;
          margin-top: 3px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${companyName.toUpperCase()}</h1>
        ${companyAddress ? `<div class="subtitle">${companyAddress}</div>` : ''}
        ${vatNumber ? `<div class="subtitle">VAT No: ${vatNumber}</div>` : ''}
        ${companyPhone ? `<div class="subtitle">Tel: ${companyPhone}</div>` : ''}
        ${website ? `<div class="subtitle">Website: ${website}</div>` : ''}
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
          ${sales.map((sale, index) => {
            // Get VAT rate from first item (all items in a sale have the same VAT rate)
            const vatRate = sale.saleItems && sale.saleItems.length > 0 
              ? parseFloat(sale.saleItems[0].vatRate || 23.00).toFixed(1) 
              : '23.0';
            
            return `
            <tr>
              <td class="sale-number">${index + 1}</td>
              <td>${new Date(sale.saleDate).toLocaleString()}</td>
              <td class="payment-method ${sale.paymentMethod === 'CASH' ? 'payment-cash' : 'payment-card'}">${sale.paymentMethod}</td>
              <td>
                ${sale.notes ? `
                  <div class="notes-box">
                    <strong>⚠️ NOTE:</strong> ${sale.notes}
                  </div>
                ` : ''}
                ${(sale.saleItems || []).map(item => `
                  <div class="sale-item">
                    <strong>${item.itemName || 'Unknown Item'}</strong> 
                    (${item.quantity || 0}x) 
                    <span class="right">€${parseFloat(item.totalPrice || 0).toFixed(2)}</span>
                  </div>
                `).join('')}
                <div class="vat-info" style="margin-top: 5px; padding-top: 5px; border-top: 1px dotted #ccc; font-weight: bold;">
                  VAT: ${vatRate}%
                </div>
              </td>
              <td class="right total-amount">€${parseFloat(sale.totalAmount || 0).toFixed(2)}</td>
            </tr>
          `;
          }).join('')}
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
