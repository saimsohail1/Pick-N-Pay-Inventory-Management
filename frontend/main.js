const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');

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

  mainWindow.on('close', () => {
    try {
      mainWindow.webContents.send('app-closing');
    } catch (err) {
      console.error('Error sending app-closing event:', err);
    }
    // Close customer display window when main window closes
    if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
      customerDisplayWindow.close();
    }
    stopBackend();
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
 * Only creates the window if there are 2 or more displays
 */
function createCustomerDisplayWindow() {
  if (customerDisplayWindow) return;

  // Get all displays
  const displays = screen.getAllDisplays();
  
  // Only create customer display if there are 2 or more displays
  if (displays.length < 2) {
    console.log('📺 Only one display detected. Customer display window will not be created.');
    return;
  }
  
  // Use the second display (index 1)
  const secondDisplay = displays[1];
  
  console.log(`📺 Creating customer display window on display 2 (second monitor)`);
  console.log(`📐 Display bounds:`, secondDisplay.bounds);

  customerDisplayWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    x: secondDisplay.bounds.x + (secondDisplay.bounds.width - 1024) / 2,
    y: secondDisplay.bounds.y + (secondDisplay.bounds.height - 600) / 2,
    fullscreen: false,
    frame: false,
    autoHideMenuBar: true,
    alwaysOnTop: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false,
    backgroundColor: '#f8f9fa'
  });

  const startUrl = isDev
    ? 'http://localhost:3000/#/customer-display'
    : `file://${path.join(__dirname, 'build', 'index.html')}#/customer-display`;

  customerDisplayWindow.loadURL(startUrl);

  customerDisplayWindow.once('ready-to-show', () => {
    customerDisplayWindow.show();
    customerDisplayWindow.setMenuBarVisibility(false);
    
    // Send current cart state when window is ready
    setTimeout(() => {
      try {
        customerDisplayWindow.webContents.send('cart-updated', currentCartState);
      } catch (error) {
        console.error('Error sending initial cart state:', error);
      }
    }, 500); // Small delay to ensure window is fully ready
  });

  customerDisplayWindow.on('closed', () => {
    customerDisplayWindow = null;
  });

  // Prevent closing customer display window
  customerDisplayWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      customerDisplayWindow.hide();
    }
  });
}

/**
 * IPC listener for renderer "app-closing"
 */
ipcMain.on('app-closing', () => {
  console.log('📩 Received app-closing from renderer');
  
  // Set quitting flag so windows can close properly
  app.isQuitting = true;
  
  // Close customer display window if it exists
  if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
    console.log('🔄 Closing customer display window...');
    customerDisplayWindow.removeAllListeners('close'); // Remove prevent-close handler
    customerDisplayWindow.close();
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
    app.quit();
  }, 200);
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
