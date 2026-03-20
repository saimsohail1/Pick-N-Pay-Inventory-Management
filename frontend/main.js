const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { spawn, execSync } = require('child_process');
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
 * Kill any process holding the backend port (cleanup from previous crash)
 */
function killOrphanedBackend(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8', timeout: 5000 });
      const pid = out.trim().split(/\s+/).pop();
      if (pid && pid !== '0') {
        execSync(`taskkill /PID ${pid} /F`, { timeout: 5000 });
        console.log(`🧹 Killed orphaned process ${pid} on port ${port}`);
      }
    } else {
      const pid = execSync(`lsof -ti:${port}`, { encoding: 'utf8', timeout: 5000 }).trim();
      if (pid) {
        execSync(`kill -9 ${pid}`, { timeout: 5000 });
        console.log(`🧹 Killed orphaned process ${pid} on port ${port}`);
      }
    }
  } catch (e) {
    // No process on port — expected on clean start
  }
}

/**
 * Stop backend gracefully, waiting for it to exit
 */
function stopBackend() {
  return new Promise((resolve) => {
    if (!backendProcess) return resolve();

    const proc = backendProcess;
    backendProcess = null;

    const forceKillTimer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch (e) {}
      console.log('🛑 Backend force-killed after timeout');
      resolve();
    }, 5000);

    proc.on('exit', () => {
      clearTimeout(forceKillTimer);
      console.log('🛑 Backend stopped gracefully');
      resolve();
    });

    try {
      proc.kill('SIGTERM');
    } catch (err) {
      clearTimeout(forceKillTimer);
      console.error('❌ Error stopping backend:', err);
      resolve();
    }
  });
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
ipcMain.on('app-closing', async () => {
  console.log('📩 Received app-closing from renderer');

  app.isQuitting = true;

  if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
    customerDisplayWindow.removeAllListeners('close');
    customerDisplayWindow.destroy();
    customerDisplayWindow = null;
  }

  await stopBackend();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }

  app.exit(0);
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
 * IPC handler for opening cash drawer via printer
 * Prints a small "Till Opened" receipt which triggers the drawer via printer driver
 */
ipcMain.handle('open-till', async (event, options = {}) => {
  try {
    const companyName = options.companyName || 'ADAMS GREEN';
    const companyAddress = options.companyAddress || '';
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const html = `
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
  <div class="header">${companyName.toUpperCase()}</div>
  ${companyAddress ? `<div class="info">${companyAddress}</div>` : ''}
  <div class="title">TILL OPENED</div>
  <div class="info">Date: ${dateStr}</div>
  <div class="info">Time: ${timeStr}</div>
</body>
</html>
    `;

    // Use Electron's built-in printing (goes through print spooler, triggers drawer)
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true }
    });

    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    printWindow.loadURL(dataUrl);

    return new Promise((resolve, reject) => {
      printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.print({
          silent: true,
          printBackground: true
          // Don't specify deviceName - let it use the default printer
          // deviceName can cause errors if the printer name doesn't match exactly
        }, (success, failureReason) => {
          console.log('📄 Till open print callback:', { success, failureReason });
          if (!printWindow.isDestroyed()) {
            setTimeout(() => printWindow.close(), 300);
          }
          if (success) {
            resolve({ success: true, message: 'Till opened successfully' });
          } else {
            reject(new Error(failureReason || 'Failed to open till'));
          }
        });
      });

      printWindow.on('error', (err) => {
        if (!printWindow.isDestroyed()) printWindow.close();
        reject(err);
      });
    });
  } catch (error) {
    console.error('❌ Failed to open till:', error);
    return { success: false, message: error.message || 'Failed to open till' };
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

/**
 * IPC handler for silent printing (no dialog) - used for receipts, reports, labels
 */
ipcMain.handle('print-silent', async (event, options = {}) => {
  try {
    const { html, printerName } = options;
    
    if (!html) {
      throw new Error('HTML content is required for printing');
    }

    // Use Electron's built-in silent printing (no dialog)
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true }
    });

    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    printWindow.loadURL(dataUrl);

    return new Promise((resolve, reject) => {
      printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.print({
          silent: true,
          printBackground: true
          // Don't specify deviceName - let it use the default printer
          // deviceName can cause errors if the printer name doesn't match exactly
        }, (success, failureReason) => {
          console.log('📄 Print callback:', { success, failureReason });
          if (!printWindow.isDestroyed()) {
            setTimeout(() => printWindow.close(), 300);
          }
          if (success) {
            resolve({ success: true, message: 'Printed successfully' });
          } else {
            reject(new Error(failureReason || 'Print failed'));
          }
        });
      });

      printWindow.on('error', (err) => {
        if (!printWindow.isDestroyed()) printWindow.close();
        reject(err);
      });
    });
  } catch (error) {
    console.error('❌ Silent print error:', error);
    return { success: false, message: error.message || 'Print failed' };
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
  killOrphanedBackend(8080);
  startBackend();
  createWindow();
  setTimeout(() => {
    createCustomerDisplayWindow();
  }, 1000);
});

app.on('before-quit', () => { stopBackend(); });

app.on('window-all-closed', () => {
  app.exit(0);
});

app.on('activate', () => {
  if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
