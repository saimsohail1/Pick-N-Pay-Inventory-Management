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
    
    // Open DevTools in development mode or if F12 is pressed
    if (isDev) {
      // mainWindow.webContents.openDevTools(); // Uncomment to auto-open DevTools
    }
  });

  // 🔹 Handle keyboard shortcuts (F12 for DevTools, F11/Escape for fullscreen)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    // F12 - Toggle DevTools (works in both dev and production)
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
      return;
    }

    // Escape - Exit fullscreen
    if (input.key === 'Escape' && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
      mainWindow.setMenuBarVisibility(true);
      mainWindow.webContents.send('fullscreen-exited');
      return;
    }

    // F11 - Toggle fullscreen
    if (input.key === 'F11') {
      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);
      mainWindow.setMenuBarVisibility(!isFullScreen);
      return;
    }
  });

  mainWindow.on('close', (event) => {
    // If app is not quitting, prevent default and send IPC message
    if (!app.isQuitting) {
      event.preventDefault();
    try {
      mainWindow.webContents.send('app-closing');
    } catch (err) {
      console.error('Error sending app-closing event:', err);
    }
    } else {
      // If app is quitting, force destroy customer display window
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
 * Creates on second monitor if available, otherwise on primary monitor
 */
function createCustomerDisplayWindow() {
  if (customerDisplayWindow) return;

  // Get all displays
  const displays = screen.getAllDisplays();
  
  let targetDisplay;
  let windowX, windowY;
  
  // Use the second display if available, otherwise use primary display
  if (displays.length >= 2) {
    targetDisplay = displays[1];
    console.log(`📺 Creating customer display window on display 2 (second monitor)`);
    windowX = targetDisplay.bounds.x + (targetDisplay.bounds.width - 1024) / 2;
    windowY = targetDisplay.bounds.y + (targetDisplay.bounds.height - 600) / 2;
  } else {
    targetDisplay = displays[0];
    console.log(`📺 Creating customer display window on primary display (only one monitor detected)`);
    // Position on the right side of the primary display
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
    
    // Send current cart state when window is ready
    setTimeout(() => {
      try {
        console.log('📺 Sending initial cart state to customer display:', currentCartState);
        customerDisplayWindow.webContents.send('cart-updated', currentCartState);
      } catch (error) {
        console.error('Error sending initial cart state:', error);
      }
    }, 500); // Small delay to ensure window is fully ready
  });

  // Also show window if it loads successfully
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

  // Prevent closing customer display window - just hide it instead
  customerDisplayWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      console.log('📺 Customer display window close prevented, hiding instead');
      customerDisplayWindow.hide();
    }
  });

  // Add error handling
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
  
  // Set quitting flag so windows can close properly
  app.isQuitting = true;
  
  // Force destroy customer display window if it exists
  if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
    console.log('🔄 Destroying customer display window...');
    // Remove all event listeners to prevent interference
    customerDisplayWindow.removeAllListeners();
    // Force destroy the window
    customerDisplayWindow.destroy();
    customerDisplayWindow = null;
  }
  
  // Close main window
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('🔄 Closing main window...');
    mainWindow.close();
  }
  
  // Stop backend gracefully
  stopBackend();
  
  // Give a moment for cleanup, then quit
  setTimeout(() => {
    console.log('🔄 Quitting application...');
    // Force quit - exit all processes
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
    mainWindow.setMenuBarVisibility(isFullScreen); // Show menu bar when not fullscreen
    console.log(`🖥️ Fullscreen ${!isFullScreen ? 'enabled' : 'disabled'}`);
  }
});

/**
 * IPC handlers for cart synchronization
 */
ipcMain.on('cart-updated', (event, cartData) => {
  // Store current cart state
  currentCartState = {
    cart: cartData.cart || [],
    subtotal: cartData.subtotal || 0,
    discountAmount: cartData.discountAmount || 0,
    total: cartData.total || 0
  };

  // Send to customer display window if it exists and is not destroyed
  if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
    try {
    customerDisplayWindow.webContents.send('cart-updated', currentCartState);
    } catch (error) {
      console.error('Error sending cart update to customer display:', error);
    }
  }
});

ipcMain.on('request-cart-state', (event) => {
  // Send current cart state to requesting window if customer display exists
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
    // Recreate window if it doesn't exist
    console.log('📺 Customer display window not found, recreating...');
    createCustomerDisplayWindow();
  }
});

/**
 * Open cash drawer using ESC/POS command sent to USB printer
 * The drawer is connected to the printer's RJ11 DK port
 * ESC/POS command: ESC p (0x1B 0x70) m t1 t2
 * Standard command: 0x1B 0x70 0x00 0x3C 0xFF (opens drawer 1)
 */
async function openCashDrawerViaPrinter(printerName = null) {
  return new Promise((resolve, reject) => {
    try {
      // Standard ESC/POS drawer kick command
      // 0x1B = ESC
      // 0x70 = 'p' (drawer kick command)
      // 0x00 = drawer number (0 = drawer 1)
      // 0x3C = on time (60 * 2ms = 120ms pulse)
      // 0xFF = off time (255 * 2ms = 510ms)
      const openDrawerCommand = Buffer.from([0x1B, 0x70, 0x00, 0x3C, 0xFF]);
      
      logToFile('INFO', '💰 Opening cash drawer via printer', { printerName: printerName || 'default' });
      console.log('💰 Opening cash drawer via printer:', printerName || 'default');
      console.log('📤 ESC/POS command:', Array.from(openDrawerCommand).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' '));
      
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        const tempFile = path.join(app.getPath('temp'), `drawer_${Date.now()}.raw`);
        
        // Write ESC/POS command to temp file
        fs.writeFileSync(tempFile, openDrawerCommand);
        
        // Use PowerShell to send raw ESC/POS command directly to printer port
        // This avoids interfering with normal print jobs
        const printersToTry = printerName 
          ? [printerName]
          : ['SGT-116Receipt Printer']; // Primary printer - since it's working, try this first
        
        const targetPrinter = printersToTry[0];
        console.log(`📤 Sending drawer command to printer: ${targetPrinter}`);
        
        // PowerShell command to get printer port and send raw bytes directly
        // Using FileStream for more reliable direct port access
        // Note: We use Write-Host for debugging, but Write-Output for the result
        const psScript = `
          $printer = Get-Printer -Name "${targetPrinter}" -ErrorAction SilentlyContinue;
          if ($printer) {
            $port = $printer.PortName;
            Write-Host "Found printer: $($printer.Name) on port: $port";
            $bytes = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '/')}");
            Write-Host "Read $($bytes.Length) bytes";
            try {
              $fileStream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite);
              $fileStream.Write($bytes, 0, $bytes.Length);
              $fileStream.Flush();
              $fileStream.Close();
              Write-Host "Command sent successfully";
              Write-Output "OK"
            } catch {
              Write-Output "ERROR: $($_.Exception.Message)"
            }
          } else {
            Write-Output "NOTFOUND"
          }
        `;
        
        // Write script to temp file to avoid escaping issues
        const psScriptFile = path.join(app.getPath('temp'), `drawer_script_${Date.now()}.ps1`);
        fs.writeFileSync(psScriptFile, psScript);
        
        console.log(`📤 Executing PowerShell script for drawer...`);
        logToFile('INFO', `Executing PowerShell script for drawer`, { scriptFile: psScriptFile, tempFile: tempFile });
        
        exec(`powershell -ExecutionPolicy Bypass -File "${psScriptFile}"`, { timeout: 10000 }, (psError, psStdout, psStderr) => {
          // Clean up script file
          try {
            if (fs.existsSync(psScriptFile)) {
              fs.unlinkSync(psScriptFile);
            }
          } catch (e) {}
          
          console.log(`📤 PowerShell stdout:`, psStdout);
          if (psStderr) console.log(`📤 PowerShell stderr:`, psStderr);
          
          logToFile('INFO', `PowerShell execution result`, { 
            stdout: psStdout, 
            stderr: psStderr, 
            error: psError?.message 
          });
          
          // Clean up temp file
          try {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }
          } catch (e) {
            // Ignore cleanup errors
          }
          
          if (!psError && psStdout && psStdout.trim().includes('OK')) {
            logToFile('INFO', `✅ Cash drawer command sent successfully to: ${targetPrinter}`);
            console.log(`✅ Cash drawer command sent successfully to: ${targetPrinter}`);
            resolve({ 
              success: true, 
              type: 'printer', 
              printer: targetPrinter, 
              commandUsed: 'ESC p 0 60 255' 
            });
          } else {
            const errorDetails = psStdout || psStderr || psError?.message || 'Unknown error';
            console.error(`❌ Failed to send drawer command: ${errorDetails}`);
            
            logToFile('ERROR', '❌ Failed to send drawer command', { 
              printer: targetPrinter,
              error: errorDetails,
              stdout: psStdout,
              stderr: psStderr
            });
            
            const errorMsg = `Could not send drawer command to printer "${targetPrinter}".\n\n` +
              `Error: ${errorDetails}\n\n` +
              `Troubleshooting:\n` +
              `1. Check printer is connected and powered on\n` +
              `2. Verify drawer cable is connected to printer's RJ11 DK port\n` +
              `3. Ensure printer driver is installed\n` +
              `4. Try running as Administrator\n` +
              `5. Check printer driver settings - disable "Open drawer on print" if enabled`;
            
            reject(new Error(errorMsg));
          }
        });
      } else {
        reject(new Error('Printer-based cash drawer is currently only supported on Windows'));
      }
    } catch (error) {
      logToFile('ERROR', '❌ Error opening cash drawer via printer', { error: error.message });
      reject(error);
    }
  });
}

/**
 * Send raw ESC/POS data directly to printer port (bypasses print spooler)
 * This gives us full control - no drawer commands unless we explicitly send them
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
      
      const targetPrinter = printerName || 'SGT-116Receipt Printer';
      console.log(`📤 Sending raw ESC/POS data to printer: ${targetPrinter}`);
      logToFile('INFO', '📤 Sending raw ESC/POS print data', { printer: targetPrinter, dataLength: escPosData.length });
      
      const psScript = `
        $printer = Get-Printer -Name "${targetPrinter}" -ErrorAction SilentlyContinue;
        if ($printer) {
          $port = $printer.PortName;
          Write-Host "Found printer: $($printer.Name) on port: $port";
          $bytes = [System.IO.File]::ReadAllBytes("${tempFile.replace(/\\/g, '/')}");
          Write-Host "Read $($bytes.Length) bytes";
          try {
            $fileStream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite);
            $fileStream.Write($bytes, 0, $bytes.Length);
            $fileStream.Flush();
            $fileStream.Close();
            Write-Host "Print data sent successfully";
            Write-Output "OK"
          } catch {
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
  
  const buffers = [];
  
  // Helper to append text (use ASCII/latin1 for better ESC/POS compatibility)
  const appendText = (text) => {
    // Convert to ASCII-safe string, replacing special characters
    const asciiText = text
      .replace(/€/g, 'EUR')
      .replace(/[^\x00-\x7F]/g, '?'); // Replace non-ASCII with ?
    buffers.push(Buffer.from(asciiText, 'ascii'));
  };
  
  // Helper to append bytes
  const appendBytes = (bytes) => {
    buffers.push(Buffer.from(bytes));
  };
  
  // Log the sale data for debugging
  console.log('📄 Converting sale to ESC/POS:', JSON.stringify(sale, null, 2));
  logToFile('INFO', 'Converting sale to ESC/POS', { 
    saleId: sale.id, 
    itemCount: sale.saleItems?.length || 0,
    saleItems: sale.saleItems 
  });
  
  // Initialize printer
  appendBytes([ESC, 0x40]); // ESC @ - Initialize printer
  
  // Set character code table (PC437 - standard for thermal printers)
  appendBytes([ESC, 0x74, 0x00]); // ESC t 0 - Select character code table 0 (PC437)
  
  // Center align and bold for header
  appendBytes([ESC, 0x61, 0x01]); // ESC a 1 - Center align
  appendBytes([ESC, 0x45, 0x01]); // ESC E 1 - Bold on
  appendBytes([ESC, 0x21, 0x08]); // ESC ! 8 - Double height
  appendText((companyName || 'ADAMS GREEN').toUpperCase() + '\n');
  appendBytes([ESC, 0x21, 0x00]); // ESC ! 0 - Normal size
  appendBytes([ESC, 0x45, 0x00]); // ESC E 0 - Bold off
  
  if (companyAddress) {
    appendText(companyAddress + '\n');
  }
  
  appendText('SALE RECEIPT\n');
  appendBytes([ESC, 0x61, 0x00]); // ESC a 0 - Left align
  
  // Format date
  const saleDate = new Date(sale.saleDate);
  const dateStr = saleDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = saleDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  appendText(`Date: ${dateStr}\n`);
  appendText(`Time: ${timeStr}\n`);
  appendText(`Sale ID: ${sale.id}\n`);
  appendText(`Cashier: ${sale.user?.username || sale.user?.fullName || 'Unknown'}\n`);
  
  // Divider
  appendText('--------------------------------\n');
  
  // Items
  if (sale.saleItems && sale.saleItems.length > 0) {
    console.log('📦 Processing sale items:', sale.saleItems.length);
    sale.saleItems.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`, item);
      const name = (item.itemName || item.name || 'Unknown Item').substring(0, 32); // Limit length
      const price = parseFloat(item.unitPrice || item.price || 0).toFixed(2);
      const qty = item.quantity || 1;
      const total = parseFloat(item.totalPrice || 0).toFixed(2);
      
      // Item name (left aligned)
      appendText(name + '\n');
      // Quantity and prices (right aligned)
      appendBytes([ESC, 0x61, 0x02]); // Right align
      appendText(`${qty}x  EUR${price}  EUR${total}\n`);
      appendBytes([ESC, 0x61, 0x00]); // Left align
    });
  } else {
    console.warn('⚠️ No sale items found in sale data');
    appendText('No items\n');
  }
  
  // Divider
  appendText('--------------------------------\n');
  
  // Calculate totals
  const subtotalExcludingVat = sale.saleItems ? sale.saleItems.reduce((sum, item) => 
    sum + parseFloat(item.priceExcludingVat || 0), 0
  ) : parseFloat(sale.subtotalAmount || sale.totalAmount || 0);
  const totalVat = sale.saleItems ? sale.saleItems.reduce((sum, item) => 
    sum + parseFloat(item.vatAmount || 0), 0
  ) : 0;
  
  appendBytes([ESC, 0x61, 0x02]); // Right align
  appendText(`Subtotal (excl. VAT): EUR${subtotalExcludingVat.toFixed(2)}\n`);
  if (totalVat > 0) {
    appendText(`VAT (23%): EUR${totalVat.toFixed(2)}\n`);
  }
  appendBytes([ESC, 0x45, 0x01]); // Bold on
  appendBytes([ESC, 0x21, 0x10]); // ESC ! 16 - Double width
  appendText(`TOTAL: EUR${parseFloat(sale.totalAmount || 0).toFixed(2)}\n`);
  appendBytes([ESC, 0x21, 0x00]); // ESC ! 0 - Normal size
  appendBytes([ESC, 0x45, 0x00]); // Bold off
  appendBytes([ESC, 0x61, 0x00]); // Left align
  
  // Footer
  appendText('--------------------------------\n');
  appendBytes([ESC, 0x61, 0x01]); // Center align
  appendText('Thank you for your purchase!\n');
  appendText((companyName || 'ADAMS GREEN') + '\n');
  
  // Feed lines before cut
  appendBytes([LF, LF, LF]);
  
  // Cut paper (partial cut)
  appendBytes([GS, 0x56, 0x41, 0x00]); // GS V A 0 - Partial cut
  appendBytes([LF, LF, LF]); // Feed a few lines after cut
  
  const finalBuffer = Buffer.concat(buffers);
  console.log(`✅ ESC/POS buffer created: ${finalBuffer.length} bytes`);
  logToFile('INFO', 'ESC/POS buffer created', { bufferLength: finalBuffer.length });
  
  return finalBuffer;
}

/**
 * IPC handler for opening cash drawer via USB printer
 */
ipcMain.handle('open-till', async (event, options = {}) => {
  logToFile('INFO', '💰 Open Till button clicked', options);
  try {
    logToFile('INFO', 'Using printer-based cash drawer');
    const result = await openCashDrawerViaPrinter(options.printerName);
    return { 
      success: true, 
      message: `Cash drawer opened successfully via printer${result.printer ? ` (${result.printer})` : ''}`, 
      type: 'printer',
      printer: result.printer || result.port,
      commandUsed: result.commandUsed,
      logFile: logFile
    };
  } catch (error) {
    logToFile('ERROR', '❌ Failed to open cash drawer', { error: error.message, stack: error.stack });
    console.error('❌ Failed to open cash drawer:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to open cash drawer. Please check printer connection.',
      error: error.toString(),
      logFile: logFile
    };
  }
});

/**
 * IPC handler for raw ESC/POS printing (bypasses print spooler)
 */
ipcMain.handle('print-receipt-raw', async (event, receiptData) => {
  logToFile('INFO', '🖨️ Raw receipt print requested', { 
    saleId: receiptData.saleId,
    sale: receiptData.sale,
    companyName: receiptData.companyName,
    companyAddress: receiptData.companyAddress
  });
  console.log('🖨️ Raw receipt print requested:', {
    saleId: receiptData.saleId,
    saleItemsCount: receiptData.sale?.saleItems?.length || 0,
    totalAmount: receiptData.sale?.totalAmount
  });
  
  try {
    // Validate sale data
    if (!receiptData.sale) {
      throw new Error('Sale data is missing');
    }
    
    if (!receiptData.sale.saleItems || receiptData.sale.saleItems.length === 0) {
      console.warn('⚠️ Sale has no items, but proceeding with print');
    }
    
    const escPosData = convertReceiptToEscPos(
      receiptData.sale,
      receiptData.companyName || 'ADAMS GREEN',
      receiptData.companyAddress || ''
    );
    
    console.log(`📤 Sending ${escPosData.length} bytes to printer...`);
    const result = await sendRawEscPosToPrinter(escPosData, receiptData.printerName);
    
    logToFile('INFO', '✅ Receipt printed successfully', { 
      printer: result.printer,
      dataLength: escPosData.length
    });
    
    return {
      success: true,
      message: `Receipt printed successfully${result.printer ? ` (${result.printer})` : ''}`,
      printer: result.printer
    };
  } catch (error) {
    logToFile('ERROR', '❌ Failed to print receipt', { 
      error: error.message, 
      stack: error.stack,
      saleId: receiptData.saleId
    });
    console.error('❌ Failed to print receipt:', error);
    console.error('❌ Error stack:', error.stack);
    return {
      success: false,
      message: error.message || 'Failed to print receipt. Please check printer connection.',
      error: error.toString()
    };
  }
});

/**
 * IPC handler to get list of available serial ports
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
  // Create customer display window after a short delay to ensure main window is ready
  setTimeout(() => {
    createCustomerDisplayWindow();
  }, 1000);
});

app.on('before-quit', stopBackend);

app.on('window-all-closed', () => {
  // Force quit on all platforms when all windows are closed
  app.exit(0);
});

app.on('activate', () => {
  if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
