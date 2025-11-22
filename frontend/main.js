const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file path
const logFile = path.join(logsDir, `cash-drawer-${new Date().toISOString().split('T')[0]}.log`);

// Helper function to write to both console and log file
function logToFile(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data, null, 2) : ''}\n`;

  // Write to console
  if (level === 'ERROR') {
    console.error(message, data || '');
  } else if (level === 'WARN') {
    console.warn(message, data || '');
  } else {
    console.log(message, data || '');
  }

  // Write to log file
  try {
    fs.appendFileSync(logFile, logMessage, 'utf8');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

// Conditionally load serialport - it may fail if not rebuilt for Electron
let SerialPort = null;
try {
  const serialport = require('serialport');
  SerialPort = serialport.SerialPort;
  console.log('✅ SerialPort module loaded successfully');
} catch (error) {
  console.warn('⚠️ SerialPort module failed to load:', error.message);
  console.warn('⚠️ Serial-based cash drawer functionality will be disabled. Run: npm install --save-dev electron-rebuild && npx electron-rebuild');
}

// 🔹 Only disable hardware acceleration on macOS/Linux, keep it ON for Windows
if (process.platform !== 'win32') {
  app.disableHardwareAcceleration();
}

const DEFAULT_PRINTER = 'SGT-116Receipt'; // ✅ Your actual printer name

let mainWindow;
let customerDisplayWindow;
let backendProcess;
let currentCartState = {
  cart: [],
  subtotal: 0,
  discountAmount: 0,
  total: 0
};

/**
 * Start backend Java process
 */
function startBackend() {
  const jarPath = isDev
    ? path.join(__dirname, 'backend', 'inventory-management-0.0.1-SNAPSHOT.jar')
    : path.join(process.resourcesPath, 'backend', 'inventory-management-0.0.1-SNAPSHOT.jar');

  console.log("👉 Launching backend from:", jarPath);
  console.log("📂 JAR exists?", fs.existsSync(jarPath));

  backendProcess = spawn('java', ['-Xmx512m', '-jar', jarPath], {
    cwd: path.dirname(jarPath),
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'], // ✅ capture logs (prevents Windows freeze)
    windowsHide: true
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend ERROR] ${data.toString().trim()}`);
  });

  backendProcess.on('error', (err) => {
    console.error('❌ Failed to start backend:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log(`ℹ️ Backend process exited with code ${code}`);
  });
}

/**
 * Stop backend gracefully
 */
function stopBackend() {
  if (backendProcess) {
    try {
      backendProcess.kill('SIGTERM');
      console.log('🛑 Backend stopped');
    } catch (err) {
      console.error('❌ Error stopping backend:', err);
    }
    backendProcess = null;
  }
}

/**
 * Create the main window
 */
function createWindow() {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setFullScreen(true);
    mainWindow.setMenuBarVisibility(false);

    if (isDev) {
      // mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
      return;
    }

    if (input.key === 'Escape' && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
      mainWindow.setMenuBarVisibility(true);
      mainWindow.webContents.send('fullscreen-exited');
      return;
    }

    if (input.key === 'F11') {
      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);
      mainWindow.setMenuBarVisibility(!isFullScreen);
      return;
    }
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      try {
        mainWindow.webContents.send('app-closing');
      } catch (err) {
        console.error('Error sending app-closing event:', err);
      }
    } else {
      if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
        customerDisplayWindow.removeAllListeners();
        customerDisplayWindow.destroy();
        customerDisplayWindow = null;
      }
      stopBackend();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * Create the customer display window on second monitor
 */
function createCustomerDisplayWindow() {
  if (customerDisplayWindow) return;

  const displays = screen.getAllDisplays();

  let targetDisplay;
  let windowX, windowY;

  if (displays.length >= 2) {
    targetDisplay = displays[1];
    console.log(`📺 Creating customer display window on display 2 (second monitor)`);
    windowX = targetDisplay.bounds.x + (targetDisplay.bounds.width - 1024) / 2;
    windowY = targetDisplay.bounds.y + (targetDisplay.bounds.height - 600) / 2;
  } else {
    targetDisplay = displays[0];
    console.log(`📺 Creating customer display window on primary display (only one monitor detected)`);
    windowX = targetDisplay.bounds.x + targetDisplay.bounds.width - 1024 - 20;
    windowY = targetDisplay.bounds.y + 20;
  }

  console.log(`📐 Display bounds:`, targetDisplay.bounds);

  customerDisplayWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    x: windowX,
    y: windowY,
    fullscreen: false,
    frame: false,
    autoHideMenuBar: true,
    alwaysOnTop: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false,
    backgroundColor: '#1a1a1a'
  });

  const startUrl = isDev
    ? 'http://localhost:3000/#/customer-display'
    : `file://${path.join(__dirname, 'build', 'index.html')}#/customer-display`;

  customerDisplayWindow.loadURL(startUrl);

  customerDisplayWindow.once('ready-to-show', () => {
    console.log('📺 Customer display window ready to show');
    customerDisplayWindow.show();
    customerDisplayWindow.focus();
    customerDisplayWindow.setMenuBarVisibility(false);

    setTimeout(() => {
      try {
        console.log('📺 Sending initial cart state to customer display:', currentCartState);
        customerDisplayWindow.webContents.send('cart-updated', currentCartState);
      } catch (error) {
        console.error('Error sending initial cart state:', error);
      }
    }, 500);
  });

  customerDisplayWindow.webContents.once('did-finish-load', () => {
    console.log('📺 Customer display window finished loading');
    if (!customerDisplayWindow.isDestroyed()) {
      customerDisplayWindow.show();
      customerDisplayWindow.focus();
    }
  });

  customerDisplayWindow.on('closed', () => {
    customerDisplayWindow = null;
  });

  customerDisplayWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      console.log('📺 Customer display window close prevented, hiding instead');
      customerDisplayWindow.hide();
    }
  });

  customerDisplayWindow.webContents.on('crashed', () => {
    console.error('📺 Customer display window crashed');
    customerDisplayWindow = null;
  });

  customerDisplayWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('📺 Customer display render process gone:', details);
    customerDisplayWindow = null;
  });
}

/**
 * IPC listener for renderer "app-closing"
 */
ipcMain.on('app-closing', () => {
  console.log('📩 Received app-closing from renderer');

  app.isQuitting = true;

  if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
    console.log('🔄 Destroying customer display window...');
    customerDisplayWindow.removeAllListeners();
    customerDisplayWindow.destroy();
    customerDisplayWindow = null;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('🔄 Closing main window...');
    mainWindow.close();
  }

  stopBackend();

  setTimeout(() => {
    console.log('🔄 Quitting application...');
    app.exit(0);
  }, 300);
});

/**
 * IPC handler for app minimize
 */
ipcMain.on('app-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

/**
 * IPC handler for toggling fullscreen
 */
ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
    mainWindow.setMenuBarVisibility(isFullScreen);
    console.log(`🖥️ Fullscreen ${!isFullScreen ? 'enabled' : 'disabled'}`);
  }
});

/**
 * IPC handlers for cart synchronization
 */
ipcMain.on('cart-updated', (event, cartData) => {
  currentCartState = {
    cart: cartData.cart || [],
    subtotal: cartData.subtotal || 0,
    discountAmount: cartData.discountAmount || 0,
    total: cartData.total || 0
  };

  if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
    try {
      customerDisplayWindow.webContents.send('cart-updated', currentCartState);
    } catch (error) {
      console.error('Error sending cart update to customer display:', error);
    }
  }
});

ipcMain.on('request-cart-state', () => {
  if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
    try {
      customerDisplayWindow.webContents.send('cart-updated', currentCartState);
    } catch (error) {
      console.error('Error sending cart state to customer display:', error);
    }
  }
});

/**
 * IPC handler to show customer display window
 */
ipcMain.on('show-customer-display', () => {
  if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
    customerDisplayWindow.show();
    customerDisplayWindow.focus();
    console.log('📺 Customer display window shown via IPC');
  } else {
    console.log('📺 Customer display window not found, recreating...');
    createCustomerDisplayWindow();
  }
});

/* ------------------------------------------------------------------
   🔹 SHARED HTML PRINT HELPER (SILENT, NO POPUP)
   Uses the Windows printer driver (no raw ports, no USB001).
------------------------------------------------------------------- */
function printHtmlSilently(html, printerName = DEFAULT_PRINTER) {
  return new Promise((resolve, reject) => {
    try {
      if (process.platform !== 'win32') {
        return reject(new Error('Silent printing is currently implemented only for Windows'));
      }

      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          sandbox: true
        }
      });

      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);

      printWindow.loadURL(dataUrl);

      printWindow.webContents.on('did-finish-load', () => {
        logToFile('INFO', '🖨️ Starting silent print job', { printerName });

        printWindow.webContents.print(
          {
            silent: true,
            printBackground: true,
            deviceName: printerName
          },
          (success, failureReason) => {
            if (!success) {
              logToFile('ERROR', '❌ Silent print failed', { printerName, failureReason });
              if (!printWindow.isDestroyed()) printWindow.close();
              return reject(new Error(failureReason || 'Silent print failed'));
            }

            logToFile('INFO', '✅ Silent print completed', { printerName });
            if (!printWindow.isDestroyed()) {
              setTimeout(() => {
                if (!printWindow.isDestroyed()) printWindow.close();
              }, 300);
            }
            resolve({ success: true, printer: printerName });
          }
        );
      });

      printWindow.on('error', (err) => {
        logToFile('ERROR', '❌ Error in print window', { error: err.message });
        if (!printWindow.isDestroyed()) printWindow.close();
        reject(err);
      });
    } catch (err) {
      logToFile('ERROR', '❌ Exception in printHtmlSilently', { error: err.message });
      reject(err);
    }
  });
}

/* ------------------------------------------------------------------
   🔹 OPEN TILL (ONLY): prints a tiny HTML slip AND sends ESC p
   - Drawer opens ONLY when this is called
   - Sales receipts will NOT send ESC p
------------------------------------------------------------------- */
function createTillOpenedHtml(companyName, companyAddress) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // We embed ESC p 0 60 255 as raw control characters in textContent.
  // Some drivers will pass this to the printer as ESC/POS.
  // Even if driver ignores it, the print job itself may still trigger the drawer
  // if configured in the driver.
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Till Opened</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      margin: 0;
      padding: 4mm;
      text-align: center;
    }
    .header { font-weight: bold; margin-bottom: 6px; }
    .title { font-weight: bold; font-size: 13px; margin: 8px 0; }
    .info { margin: 2px 0; }
  </style>
</head>
<body>
  <div class="header">${(companyName || 'ADAMS GREEN').toUpperCase()}</div>
  ${companyAddress ? `<div class="info">${companyAddress}</div>` : ''}
  <div class="title">TILL OPENED</div>
  <div class="info">Date: ${dateStr}</div>
  <div class="info">Time: ${timeStr}</div>
  <pre id="escPayload" style="margin-top:8px;"></pre>
  <script>
    // ESC p 0 60 255 drawer kick sequence
    const esc = '\\x1B\\x70\\x00\\x3C\\xFF';
    const node = document.getElementById('escPayload');
    try {
      node.textContent = esc + '\\n';
    } catch (e) {
      // ignore
    }
  </script>
</body>
</html>
`;
}

/**
 * IPC handler for opening cash drawer via printer
 * ONLY prints the Till Opened slip (no sale receipt)
 */
ipcMain.handle('open-till', async (event, options = {}) => {
  logToFile('INFO', '💰 Open Till button clicked', options);

  try {
    const html = createTillOpenedHtml(
      options.companyName || 'ADAMS GREEN Provision',
      options.companyAddress || ''
    );

    const printerName = options.printerName || DEFAULT_PRINTER;
    const result = await printHtmlSilently(html, printerName);

    return {
      success: true,
      message: 'Till opened successfully',
      type: 'printer',
      printer: result.printer,
      logFile
    };
  } catch (error) {
    logToFile('ERROR', '❌ Failed to open till', { error: error.message, stack: error.stack });
    console.error('❌ Failed to open till:', error);
    return {
      success: false,
      message: error.message || 'Failed to open till. Please check printer connection.',
      error: error.toString(),
      logFile
    };
  }
});

/* ------------------------------------------------------------------
   🔹 RAW ESC/POS PRINTING – Direct to printer port (bypasses spooler)
   This sends raw ESC/POS commands directly to the printer port,
   which is what thermal printers need. NO drawer kick commands.
------------------------------------------------------------------- */
/**
 * Send raw ESC/POS data directly to printer port (bypasses print spooler)
 */
async function sendRawEscPosToPrinter(escPosData, printerName = null) {
  return new Promise((resolve, reject) => {
    try {
      if (process.platform !== 'win32') {
        reject(new Error('Raw ESC/POS printing is currently only supported on Windows'));
        return;
      }

      const { exec } = require('child_process');
      const tempFile = path.join(app.getPath('temp'), `receipt_${Date.now()}.raw`);
      
      // Write ESC/POS data to temp file
      fs.writeFileSync(tempFile, escPosData);
      
      const targetPrinter = printerName || DEFAULT_PRINTER;
      console.log(`📤 Sending raw ESC/POS data to printer: ${targetPrinter}`);
      console.log(`📤 Data length: ${escPosData.length} bytes`);
      logToFile('INFO', '📤 Sending raw ESC/POS print data', { 
        printer: targetPrinter, 
        dataLength: escPosData.length
      });
      
      const psScript = `
        # Try exact name first
        $printer = Get-Printer -Name "${targetPrinter}" -ErrorAction SilentlyContinue;
        
        # If not found, try partial match (case-insensitive)
        if (-not $printer) {
          $allPrinters = Get-Printer -ErrorAction SilentlyContinue;
          $printer = $allPrinters | Where-Object { $_.Name -like "*${targetPrinter}*" -or $_.Name -like "*SGT*116*" -or $_.Name -like "*UDiiPOS*" -or $_.Name -like "*Receipt*" } | Select-Object -First 1;
        }
        
        $port = $null;
        if ($printer) {
          $port = $printer.PortName;
          Write-Host "Found printer: $($printer.Name) on port: $port";
        } else {
          # Try direct port access (USB001 is the known port)
          $directPorts = @("USB001", "LPT1", "COM1", "COM2", "COM3");
          foreach ($testPort in $directPorts) {
            try {
              $testStream = New-Object System.IO.FileStream($testPort, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite) -ErrorAction Stop;
              $testStream.Close();
              $port = $testPort;
              Write-Host "Found accessible port: $port";
              break;
            } catch {
              # Port not accessible, try next
            }
          }
        }
        
        if ($port) {
          $bytes = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '/')}");
          Write-Host "Read $($bytes.Length) bytes from file";
          try {
            $fileStream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite);
            $bytesWritten = $fileStream.Write($bytes, 0, $bytes.Length);
            Write-Host "Wrote $bytesWritten bytes to port $port";
            $fileStream.Flush();
            $fileStream.Close();
            Write-Host "Print data sent successfully";
            Write-Output "OK"
          } catch {
            Write-Host "Error writing to port $port : $($_.Exception.Message)";
            Write-Output "ERROR: $($_.Exception.Message)"
          }
        } else {
          Write-Output "NOTFOUND"
        }
      `;
      
      const psScriptFile = path.join(app.getPath('temp'), `print_script_${Date.now()}.ps1`);
      fs.writeFileSync(psScriptFile, psScript);
      
      exec(`powershell -ExecutionPolicy Bypass -File "${psScriptFile}"`, { timeout: 15000 }, (psError, psStdout, psStderr) => {
        // Clean up script file
        try {
          if (fs.existsSync(psScriptFile)) {
            fs.unlinkSync(psScriptFile);
          }
        } catch (e) {}
        
        // Clean up temp file
        try {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        } catch (e) {}
        
        if (!psError && psStdout && psStdout.trim().includes('OK')) {
          logToFile('INFO', `✅ Raw ESC/POS print data sent successfully to: ${targetPrinter}`);
          console.log(`✅ Print data sent successfully to: ${targetPrinter}`);
          resolve({ 
            success: true, 
            printer: targetPrinter
          });
        } else {
          const errorDetails = psStdout || psStderr || psError?.message || 'Unknown error';
          console.error(`❌ Failed to send print data: ${errorDetails}`);
          logToFile('ERROR', '❌ Failed to send print data', { 
            printer: targetPrinter,
            error: errorDetails
          });
          reject(new Error(`Could not send print data to printer "${targetPrinter}": ${errorDetails}`));
        }
      });
    } catch (error) {
      logToFile('ERROR', '❌ Error sending raw ESC/POS print data', { error: error.message });
      reject(error);
    }
  });
}

/**
 * Convert receipt data to ESC/POS format
 */
function convertReceiptToEscPos(sale, companyName, companyAddress) {
  const ESC = 0x1B;
  const GS = 0x1D;
  const LF = 0x0A;
  const CR = 0x0D;
  
  const buffers = [];
  
  // Helper to append text (use ASCII for maximum compatibility)
  const appendText = (text) => {
    if (!text) return;
    // Convert to ASCII-safe string
    const asciiText = String(text)
      .replace(/€/g, 'EUR')
      .replace(/[^\x00-\x7F]/g, '?'); // Replace non-ASCII with ?
    buffers.push(Buffer.from(asciiText, 'ascii'));
  };
  
  // Helper to append bytes
  const appendBytes = (bytes) => {
    buffers.push(Buffer.from(bytes));
  };
  
  logToFile('INFO', 'Converting sale to ESC/POS', { 
    saleId: sale.id, 
    itemCount: sale.saleItems?.length || 0
  });
  
  // Initialize printer (CRITICAL - must be first)
  appendBytes([ESC, 0x40]); // ESC @ - Initialize printer
  
  // Reset printer to default state
  appendBytes([ESC, 0x61, 0x00]); // Left align
  appendBytes([ESC, 0x45, 0x00]); // Bold off
  appendBytes([ESC, 0x21, 0x00]); // Normal size
  appendBytes([ESC, 0x61, 0x01]); // Center align for header
  appendText((companyName || 'ADAMS GREEN').toUpperCase());
  appendBytes([LF, CR]);
  
  if (companyAddress) {
    appendText(companyAddress);
    appendBytes([LF, CR]);
  }
  
  appendText('SALE RECEIPT');
  appendBytes([LF, CR]);
  appendBytes([ESC, 0x61, 0x00]); // Left align
  
  // Format date
  const saleDate = new Date(sale.saleDate);
  const dateStr = saleDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = saleDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  appendText(`Date: ${dateStr}`);
  appendBytes([LF, CR]);
  appendText(`Time: ${timeStr}`);
  appendBytes([LF, CR]);
  appendText(`Sale ID: ${sale.id}`);
  appendBytes([LF, CR]);
  appendText(`Cashier: ${sale.user?.username || sale.user?.fullName || 'Unknown'}`);
  appendBytes([LF, CR]);
  
  // Divider
  appendText('--------------------------------');
  appendBytes([LF, CR]);
  
  // Items
  if (sale.saleItems && sale.saleItems.length > 0) {
    sale.saleItems.forEach((item) => {
      const name = (item.itemName || item.name || 'Unknown Item').substring(0, 32);
      const price = parseFloat(item.unitPrice || item.price || 0).toFixed(2);
      const qty = item.quantity || 1;
      const total = parseFloat(item.totalPrice || 0).toFixed(2);
      
      // Item name
      appendText(name);
      appendBytes([LF, CR]);
      // Quantity and prices
      appendText(`${qty}x  EUR${price}  EUR${total}`);
      appendBytes([LF, CR]);
    });
  } else {
    appendText('No items');
    appendBytes([LF, CR]);
  }
  
  // Divider
  appendText('--------------------------------');
  appendBytes([LF, CR]);
  
  // Calculate totals
  const subtotalExcludingVat = sale.saleItems ? sale.saleItems.reduce((sum, item) => 
    sum + parseFloat(item.priceExcludingVat || 0), 0
  ) : parseFloat(sale.subtotalAmount || sale.totalAmount || 0);
  const totalVat = sale.saleItems ? sale.saleItems.reduce((sum, item) => 
    sum + parseFloat(item.vatAmount || 0), 0
  ) : 0;
  
  appendText(`Subtotal (excl. VAT): EUR${subtotalExcludingVat.toFixed(2)}`);
  appendBytes([LF, CR]);
  if (totalVat > 0) {
    appendText(`VAT (23%): EUR${totalVat.toFixed(2)}`);
    appendBytes([LF, CR]);
  }
  appendText(`TOTAL: EUR${parseFloat(sale.totalAmount || 0).toFixed(2)}`);
  appendBytes([LF, CR]);
  
  // Footer
  appendText('--------------------------------');
  appendBytes([LF, CR]);
  appendBytes([ESC, 0x61, 0x01]); // Center align
  appendText('Thank you for your purchase!');
  appendBytes([LF, CR]);
  appendText(companyName || 'ADAMS GREEN');
  appendBytes([LF, CR]);
  
  // Cut paper (partial cut)
  appendBytes([GS, 0x56, 0x41, 0x00]); // GS V A 0 - Partial cut
  appendBytes([LF, LF, LF]); // Feed a few lines
  
  const finalBuffer = Buffer.concat(buffers);
  logToFile('INFO', `✅ ESC/POS buffer created: ${finalBuffer.length} bytes`);
  return finalBuffer;
}

/**
 * OLD HTML BUILDING FUNCTION (kept for reference, not used for receipts)
 */
function buildReceiptHtml(receiptData) {
  const sale = receiptData.sale;
  const companyName = (receiptData.companyName || 'ADAMS GREEN Provision').toUpperCase();
  const companyAddress = receiptData.companyAddress || '';
  const ESCAPED = (str) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const saleDate = new Date(sale.saleDate);
  const dateStr = saleDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const timeStr = saleDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  let itemsHtml = '';
  if (sale.saleItems && sale.saleItems.length > 0) {
    sale.saleItems.forEach((item) => {
      const name = ESCAPED(item.itemName || item.name || 'Unknown Item');
      const qty = item.quantity || 1;
      const price = parseFloat(item.unitPrice || item.price || 0).toFixed(2);
      const total = parseFloat(item.totalPrice || 0).toFixed(2);
      itemsHtml += `
        <tr>
          <td class="left">${name}</td>
          <td class="right">${qty}</td>
          <td class="right">€${price}</td>
          <td class="right">€${total}</td>
        </tr>
      `;
    });
  } else {
    itemsHtml = `
      <tr>
        <td colspan="4" class="center">No items</td>
      </tr>
    `;
  }

  const subtotalExclVat = sale.saleItems
    ? sale.saleItems.reduce((sum, item) => sum + parseFloat(item.priceExcludingVat || 0), 0)
    : parseFloat(sale.subtotalAmount || sale.totalAmount || 0);
  const totalVat = sale.saleItems
    ? sale.saleItems.reduce((sum, item) => sum + parseFloat(item.vatAmount || 0), 0)
    : 0;

  const totalAmount = parseFloat(sale.totalAmount || 0).toFixed(2);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      margin: 0;
      padding: 4mm;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .left  { text-align: left; }
    .bold  { font-weight: bold; }
    .line  { border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 0; }
    .header { text-align: center; margin-bottom: 4px; }
    .footer { text-align: center; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="bold">${ESCAPED(companyName)}</div>
    ${companyAddress ? `<div>${ESCAPED(companyAddress)}</div>` : ''}
    <div>SALE RECEIPT</div>
  </div>

  <div>Date: ${ESCAPED(dateStr)}</div>
  <div>Time: ${ESCAPED(timeStr)}</div>
  <div>Sale ID: ${ESCAPED(sale.id)}</div>
  <div class="line"></div>

  <table>
    <thead>
      <tr>
        <td class="left bold">Item</td>
        <td class="right bold">Qty</td>
        <td class="right bold">Price</td>
        <td class="right bold">Total</td>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="line"></div>
  <table>
    <tr>
      <td class="left">Subtotal (excl. VAT):</td>
      <td class="right">€${subtotalExclVat.toFixed(2)}</td>
    </tr>
    ${
      totalVat > 0
        ? `<tr>
      <td class="left">VAT (23%):</td>
      <td class="right">€${totalVat.toFixed(2)}</td>
    </tr>`
        : ''
    }
    <tr>
      <td class="left bold">TOTAL:</td>
      <td class="right bold">€${totalAmount}</td>
    </tr>
  </table>

  <div class="footer">
    <div>Thank you for your purchase!</div>
    <div>${ESCAPED(companyName)}</div>
  </div>
</body>
</html>
`;
}

/**
 * IPC handler for printing receipt (RAW ESC/POS - direct to printer port)
 * This bypasses the print spooler and sends raw ESC/POS commands directly.
 * NO drawer kick commands are included - drawer only opens via "Open Till" button.
 */
ipcMain.handle('print-receipt-raw', async (event, receiptData) => {
  logToFile('INFO', '🖨️ Raw receipt print requested (ESC/POS mode)', {
    saleId: receiptData.saleId,
    saleItemsCount: receiptData.sale?.saleItems?.length || 0,
    totalAmount: receiptData.sale?.totalAmount
  });

  try {
    if (!receiptData.sale) {
      throw new Error('Sale data is missing');
    }

    // Convert sale data to ESC/POS format
    const escPosData = convertReceiptToEscPos(
      receiptData.sale,
      receiptData.companyName || 'ADAMS GREEN',
      receiptData.companyAddress || ''
    );

    // Send raw ESC/POS data directly to printer port
    const printerName = receiptData.printerName || DEFAULT_PRINTER;
    const result = await sendRawEscPosToPrinter(escPosData, printerName);

    logToFile('INFO', '✅ Receipt printed successfully (ESC/POS)', {
      printer: result.printer
    });

    return {
      success: true,
      message: `Receipt printed successfully${result.printer ? ` (${result.printer})` : ''}`,
      printer: result.printer
    };
  } catch (error) {
    logToFile('ERROR', '❌ Failed to print receipt (ESC/POS)', {
      error: error.message,
      stack: error.stack,
      saleId: receiptData.saleId
    });
    console.error('❌ Failed to print receipt (ESC/POS):', error);
    return {
      success: false,
      message: error.message || 'Failed to print receipt. Please check printer connection.',
      error: error.toString()
    };
  }
});

/**
 * IPC handler for test print (simple HTML test)
 */
ipcMain.handle('test-print', async (event, options = {}) => {
  logToFile('INFO', '🧪 Test print requested', options);
  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Test Print</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      margin: 0;
      padding: 4mm;
    }
  </style>
</head>
<body>
  <div>TEST PRINT</div>
  <div>If you can read this, the printer works.</div>
</body>
</html>
`;
    const printerName = options.printerName || DEFAULT_PRINTER;
    const result = await printHtmlSilently(html, printerName);
    return {
      success: true,
      message: `Test print sent${result.printer ? ` (${result.printer})` : ''}`,
      printer: result.printer
    };
  } catch (error) {
    logToFile('ERROR', '❌ Test print failed', { error: error.message });
    return {
      success: false,
      message: error.message || 'Test print failed',
      error: error.toString()
    };
  }
});

/**
 * IPC handler to get list of available serial ports (unchanged)
 */
ipcMain.handle('get-serial-ports', async () => {
  if (!SerialPort) {
    return { success: false, ports: [], message: 'SerialPort module not available' };
  }

  try {
    const ports = await SerialPort.list();
    return {
      success: true,
      ports: ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer,
        vendorId: p.vendorId,
        productId: p.productId
      }))
    };
  } catch (error) {
    console.error('❌ Error listing serial ports:', error);
    return { success: false, ports: [], message: error.message };
  }
});

app.whenReady().then(() => {
  startBackend();
  createWindow();
  setTimeout(() => {
    createCustomerDisplayWindow();
  }, 1000);
});

app.on('before-quit', stopBackend);

app.on('window-all-closed', () => {
  app.exit(0);
});

app.on('activate', () => {
  if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
