const { app, BrowserWindow, ipcMain } = require('electron');
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
let backendProcess;

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
 * IPC listener for renderer "app-closing"
 */
ipcMain.on('app-closing', () => {
  console.log('📩 Received app-closing from renderer');
  
  app.isQuitting = true;

  // Stop backend
  stopBackend();

  // Close main window
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log('🔄 Closing main window...');
    mainWindow.close();
  }
  
  // Quit app after a short delay to ensure windows close
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
 * IPC handler for opening cash drawer directly via ESC/POS command
 * Sends ESC/POS drawer open command directly to printer port (no printing)
 */
ipcMain.handle('open-till', async (event, options = {}) => {
  const { printerPort, serialPort } = options;
  
  logToFile('INFO', 'Opening till - sending ESC/POS drawer command', { printerPort, serialPort, platform: process.platform });
  
  // ESC/POS command to open cash drawer: ESC p m t1 t2
  // ESC = 0x1B (27), p = 0x70 (112), m = 0x00 (drawer pin 0), t1 = 0x19 (25ms), t2 = 0x78 (120ms)
  const drawerCommand = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x78]);
  
  // Alternative command for drawer pin 1: ESC p 1 25 250
  const drawerCommandPin1 = Buffer.from([0x1B, 0x70, 0x01, 0x19, 0xFA]);
  
  try {
    // Method 1: Try serial port if specified
    if (serialPort && SerialPort) {
      logToFile('INFO', 'Attempting to open drawer via serial port', { port: serialPort });
      return await openDrawerViaSerial(serialPort, drawerCommand, drawerCommandPin1);
    }
    
    // Method 2: Try Windows printer port (LPT/COM)
    if (process.platform === 'win32') {
      logToFile('INFO', 'Attempting to open drawer via Windows printer port');
      return await openDrawerViaWindowsPort(printerPort, drawerCommand, drawerCommandPin1);
    }
    
    // Method 3: Try to find and use default serial port
    if (SerialPort) {
      logToFile('INFO', 'Attempting to find and use default serial port');
      return await openDrawerViaAutoDetect(drawerCommand, drawerCommandPin1);
    }
    
    // Fallback: Return error with helpful message
    logToFile('ERROR', 'No method available to open drawer', { 
      hasSerialPort: !!SerialPort, 
      platform: process.platform,
      providedPort: !!printerPort,
      providedSerialPort: !!serialPort
    });
    
    return { 
      success: false, 
      message: 'Unable to open drawer. Please ensure printer is connected and specify the printer port in settings.' 
    };
  } catch (error) {
    logToFile('ERROR', 'Failed to open till', { error: error.message, stack: error.stack });
    return { success: false, message: error.message || 'Failed to open cash drawer' };
  }
});

/**
 * Open drawer via serial port
 */
async function openDrawerViaSerial(portPath, command, commandPin1) {
  return new Promise((resolve, reject) => {
    let port = null;
    const timeout = setTimeout(() => {
      if (port) {
        try {
          port.close();
        } catch (err) {
          console.error('Error closing port on timeout:', err);
        }
      }
      reject(new Error('Serial port operation timed out'));
    }, 5000);
    
    try {
      port = new SerialPort({ path: portPath, baudRate: 9600, autoOpen: false });
      
      port.open((err) => {
        if (err) {
          clearTimeout(timeout);
          logToFile('ERROR', 'Failed to open serial port', { port: portPath, error: err.message });
          reject(new Error(`Failed to open serial port ${portPath}: ${err.message}`));
          return;
        }
        
        logToFile('INFO', 'Serial port opened, sending drawer command', { port: portPath });
        
        // Send drawer open command (pin 0 - most common)
        port.write(command, (writeErr) => {
          clearTimeout(timeout);
          
          setTimeout(() => {
            try {
              port.close();
            } catch (closeErr) {
              console.error('Error closing port:', closeErr);
            }
          }, 100);
          
          if (writeErr) {
            logToFile('ERROR', 'Failed to write to serial port', { error: writeErr.message });
            reject(new Error(`Failed to write to serial port: ${writeErr.message}`));
            return;
          }
          
          logToFile('INFO', 'Drawer command sent via serial port', { port: portPath });
          resolve({ success: true, message: 'Cash drawer opened successfully via serial port' });
        });
      });
      
      port.on('error', (err) => {
        clearTimeout(timeout);
        logToFile('ERROR', 'Serial port error', { error: err.message });
        reject(new Error(`Serial port error: ${err.message}`));
      });
    } catch (error) {
      clearTimeout(timeout);
      logToFile('ERROR', 'Serial port exception', { error: error.message });
      reject(error);
    }
  });
}

/**
 * Open drawer via Windows printer port (LPT/COM)
 */
async function openDrawerViaWindowsPort(printerPort, command, commandPin1) {
  return new Promise((resolve, reject) => {
    // Common Windows printer ports
    const commonPorts = printerPort 
      ? [printerPort] 
      : ['LPT1', 'LPT2', 'LPT3', 'COM1', 'COM2', 'COM3', 'COM4'];
    
    let attempts = 0;
    const tryPort = (portIndex) => {
      if (portIndex >= commonPorts.length) {
        reject(new Error('Could not open drawer on any available port'));
        return;
      }
      
      const portName = commonPorts[portIndex];
      logToFile('INFO', 'Trying Windows port', { port: portName });
      
      // Use fs to write directly to port (Windows allows this)
      const portPath = `\\\\.\\${portName}`;
      
      fs.writeFile(portPath, command, (err) => {
        if (err) {
          logToFile('WARN', 'Failed to write to port, trying next', { port: portName, error: err.message });
          // Try pin 1 command
          fs.writeFile(portPath, commandPin1, (err2) => {
            if (err2) {
              // Try next port
              tryPort(portIndex + 1);
            } else {
              logToFile('INFO', 'Drawer opened via Windows port (pin 1)', { port: portName });
              resolve({ success: true, message: `Cash drawer opened successfully via ${portName}` });
            }
          });
        } else {
          logToFile('INFO', 'Drawer opened via Windows port (pin 0)', { port: portName });
          resolve({ success: true, message: `Cash drawer opened successfully via ${portName}` });
        }
      });
    };
    
    tryPort(0);
  });
}

/**
 * Auto-detect and use serial port
 */
async function openDrawerViaAutoDetect(command, commandPin1) {
  try {
    const ports = await SerialPort.list();
    logToFile('INFO', 'Auto-detecting serial ports', { count: ports.length });
    
    if (ports.length === 0) {
      throw new Error('No serial ports found');
    }
    
    // Try the first available port (usually the printer)
    const firstPort = ports[0];
    logToFile('INFO', 'Using first available serial port', { port: firstPort.path });
    
    return await openDrawerViaSerial(firstPort.path, command, commandPin1);
  } catch (error) {
    logToFile('ERROR', 'Auto-detect failed', { error: error.message });
    throw error;
  }
}


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
  startBackend();
  createWindow();
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
