const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');

// Conditionally load serialport - it may fail if not rebuilt for Electron
let SerialPort = null;
try {
  const serialport = require('serialport');
  SerialPort = serialport.SerialPort;
  console.log('✅ SerialPort module loaded successfully');
} catch (error) {
  console.warn('⚠️ SerialPort module failed to load:', error.message);
  console.warn('⚠️ Cash drawer functionality will be disabled. Run: npm install --save-dev electron-rebuild && npx electron-rebuild');
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
  });

  // 🔹 Handle fullscreen toggle
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    if (input.key === 'Escape' && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
      mainWindow.setMenuBarVisibility(true);
      mainWindow.webContents.send('fullscreen-exited');
    }

    if (input.key === 'F11') {
      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);
      mainWindow.setMenuBarVisibility(!isFullScreen);
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
 * Open cash drawer using ESC/POS command via serial port
 * ESC/POS command: ESC p (0x1B 0x70) m t1 t2
 * Common values: 0x1B 0x70 0x00 0x19 0xFF (opens drawer 1)
 */
async function openCashDrawer() {
  // Check if SerialPort is available
  if (!SerialPort) {
    throw new Error('SerialPort module not available. Please rebuild native modules: npm install --save-dev electron-rebuild && npx electron-rebuild');
  }
  
  try {
    // Get list of available serial ports
    const ports = await SerialPort.list();
    console.log('🔌 Available serial ports:', ports.map(p => p.path));

    if (ports.length === 0) {
      throw new Error('No serial ports found. Please connect your cash drawer.');
    }

    // Find the first available port
    let portPath = null;
    
    if (process.platform === 'win32') {
      // Windows: Check COM ports (COM1-COM20) and USB serial ports
      // USB-to-serial adapters often show up as COM ports
      const windowsPorts = [];
      for (let i = 1; i <= 20; i++) {
        windowsPorts.push(`COM${i}`);
      }
      
      // Try to find a matching port
      for (const comPort of windowsPorts) {
        const found = ports.find(p => p.path.toUpperCase() === comPort.toUpperCase());
        if (found) {
          portPath = found.path;
          console.log(`✅ Found Windows COM port: ${portPath}`);
          break;
        }
      }
      
      // If no common COM port found, use the first available port (could be USB serial)
      if (!portPath && ports.length > 0) {
        portPath = ports[0].path;
        console.log(`✅ Using first available Windows port: ${portPath}`);
      }
    } else {
      // Mac/Linux: Check common USB and serial ports
      const unixPorts = ['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyS0', '/dev/ttyS1', '/dev/tty.usbserial', '/dev/tty.usbmodem'];
      
      for (const unixPort of unixPorts) {
        const found = ports.find(p => p.path === unixPort || p.path.includes(unixPort));
        if (found) {
          portPath = found.path;
          break;
        }
      }
      
      // If no common port found, use the first available port
      if (!portPath && ports.length > 0) {
        portPath = ports[0].path;
      }
    }

    if (!portPath) {
      throw new Error('No suitable serial port found.');
    }

    console.log(`💰 Opening cash drawer on port: ${portPath}`);

    // Create serial port connection
    const port = new SerialPort({
      path: portPath,
      baudRate: 9600, // Common baud rate for cash drawers
      dataBits: 8,
      parity: 'none',
      stopBits: 1
    });

    // ESC/POS command to open cash drawer
    // ESC p (0x1B 0x70) m t1 t2
    // m = drawer number (0 or 1)
    // t1 = on time in 2ms units (0x19 = 50 * 2ms = 100ms)
    // t2 = off time in 2ms units (0xFF = 255 * 2ms = 510ms)
    // Try drawer 0 first, then drawer 1 if needed
    const openDrawerCommands = [
      Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFF]), // Drawer 0
      Buffer.from([0x1B, 0x70, 0x01, 0x19, 0xFF]), // Drawer 1
      Buffer.from([0x10, 0x14, 0x01, 0x00, 0x01])  // Alternative command
    ];

    return new Promise((resolve, reject) => {
      port.on('open', () => {
        console.log('✅ Serial port opened successfully');
        
        // Try each command in sequence
        let commandIndex = 0;
        const tryNextCommand = () => {
          if (commandIndex >= openDrawerCommands.length) {
            port.close();
            reject(new Error('All cash drawer commands failed'));
            return;
          }
          
          const command = openDrawerCommands[commandIndex];
          console.log(`💰 Trying command ${commandIndex + 1}/${openDrawerCommands.length}`);
          
          port.write(command, (err) => {
            if (err) {
              console.error(`❌ Error writing command ${commandIndex + 1}:`, err);
              commandIndex++;
              setTimeout(tryNextCommand, 100);
              return;
            }
            
            console.log(`✅ Cash drawer open command ${commandIndex + 1} sent successfully`);
            
            // Close the port after a short delay
            setTimeout(() => {
              port.close((err) => {
                if (err) {
                  console.error('⚠️ Error closing serial port:', err);
                } else {
                  console.log('✅ Serial port closed');
                }
                resolve({ success: true, port: portPath, commandUsed: commandIndex + 1 });
              });
            }, 500);
          });
        };
        
        // Start trying commands
        tryNextCommand();
      });

      port.on('error', (err) => {
        console.error('❌ Serial port error:', err);
        reject(err);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (port.isOpen) {
          port.close();
        }
        reject(new Error('Timeout: Could not open serial port within 5 seconds'));
      }, 5000);
    });
  } catch (error) {
    console.error('❌ Error opening cash drawer:', error);
    throw error;
  }
}

/**
 * IPC handler for opening cash drawer
 */
ipcMain.handle('open-till', async (event) => {
  try {
    const result = await openCashDrawer();
    return { success: true, message: 'Cash drawer opened successfully', port: result.port };
  } catch (error) {
    console.error('❌ Failed to open cash drawer:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to open cash drawer. Please check the connection.',
      error: error.toString()
    };
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
