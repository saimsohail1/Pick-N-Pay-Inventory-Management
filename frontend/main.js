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
        
        // Method 1: Try to send to specified printer or default printer
        const sendToPrinter = (targetPrinter) => {
          return new Promise((res, rej) => {
            // Use PowerShell to send raw bytes to printer port
            // Get printer port and send raw data
            const psScript = targetPrinter 
              ? `$p = Get-Printer -Name "${targetPrinter}" -ErrorAction SilentlyContinue; if ($p) { $port = $p.PortName; $bytes = [System.IO.File]::ReadAllBytes("${tempFile}"); [System.IO.File]::WriteAllBytes("$port", $bytes); "OK" } else { "NOTFOUND" }`
              : `$p = Get-Printer | Where-Object {$_.Default -eq $true} | Select-Object -First 1; if ($p) { $port = $p.PortName; $bytes = [System.IO.File]::ReadAllBytes("${tempFile}"); [System.IO.File]::WriteAllBytes("$port", $bytes); "OK" } else { "NOTFOUND" }`;
            
            exec(`powershell -Command "${psScript}"`, { timeout: 5000 }, (error, stdout, stderr) => {
              if (!error && stdout && stdout.trim() === 'OK') {
                res(true);
              } else {
                rej(new Error('Printer not found or port not accessible'));
              }
            });
          });
        };
        
        // Method 2: Try LPT1 (common for POS printers)
        const sendToLPT1 = () => {
          return new Promise((res, rej) => {
            exec(`copy /B "${tempFile}" LPT1`, { timeout: 3000 }, (error) => {
              if (!error) {
                res(true);
              } else {
                rej(error);
              }
            });
          });
        };
        
        // Try methods in order
        (async () => {
          try {
            // Try specified/default printer first
            if (printerName) {
              await sendToPrinter(printerName);
              logToFile('INFO', `✅ Cash drawer command sent to printer: ${printerName}`);
              console.log(`✅ Cash drawer command sent to printer: ${printerName}`);
              fs.unlinkSync(tempFile);
              resolve({ success: true, type: 'printer', printer: printerName, commandUsed: 'ESC p 0 60 255' });
              return;
            }
            
            // Try default printer
            await sendToPrinter(null);
            logToFile('INFO', '✅ Cash drawer command sent to default printer');
            console.log('✅ Cash drawer command sent to default printer');
            fs.unlinkSync(tempFile);
            resolve({ success: true, type: 'printer', printer: 'default', commandUsed: 'ESC p 0 60 255' });
          } catch (printerError) {
            // If printer method failed, try LPT1
            try {
              await sendToLPT1();
              logToFile('INFO', '✅ Cash drawer command sent via LPT1');
              console.log('✅ Cash drawer command sent via LPT1');
              fs.unlinkSync(tempFile);
              resolve({ success: true, type: 'printer', port: 'LPT1', commandUsed: 'ESC p 0 60 255' });
            } catch (lptError) {
              // Clean up temp file
              try { fs.unlinkSync(tempFile); } catch (e) {}
              
              const errorMsg = 'Could not send drawer command to printer. ' +
                'Please ensure:\n' +
                '1. Printer is connected and powered on\n' +
                '2. Drawer is connected to printer\'s RJ11 DK port\n' +
                '3. Printer driver is installed\n' +
                '4. Try specifying printer name in settings';
              
              logToFile('ERROR', '❌ Failed to send to printer', { printerError: printerError.message, lptError: lptError.message });
              reject(new Error(errorMsg));
            }
          }
        })();
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
