const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');
const net = require('net'); // For network-based cash drawers

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
 * Open cash drawer via network (TCP/IP)
 * Most network cash drawers use port 9100 (raw printing) or 515 (LPR)
 */
async function openCashDrawerNetwork(ipAddress, port = 9100) {
  return new Promise((resolve, reject) => {
    logToFile('INFO', `🌐 Connecting to network cash drawer at ${ipAddress}:${port}`);
    console.log(`🌐 Connecting to network cash drawer at ${ipAddress}:${port}`);
    
    const socket = new net.Socket();
    let connected = false;
    let commandSent = false;
    
    // ESC/POS commands to try
    const openDrawerCommands = [
      Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFF]), // ESC p 0 - Drawer 0, 100ms on, 510ms off
      Buffer.from([0x1B, 0x70, 0x01, 0x19, 0xFF]), // ESC p 1 - Drawer 1, 100ms on, 510ms off
      Buffer.from([0x1B, 0x70, 0x00, 0x32, 0xFF]), // ESC p 0 - Drawer 0, 200ms on, 510ms off
      Buffer.from([0x1B, 0x70, 0x01, 0x32, 0xFF]), // ESC p 1 - Drawer 1, 200ms on, 510ms off
    ];
    
    socket.setTimeout(5000); // 5 second timeout
    
    socket.on('connect', () => {
      connected = true;
      logToFile('INFO', `✅ Connected to cash drawer at ${ipAddress}:${port}`);
      console.log(`✅ Connected to cash drawer at ${ipAddress}:${port}`);
      
      // Try first command (most common)
      const command = openDrawerCommands[0];
      const commandHex = Array.from(command).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
      logToFile('INFO', `📤 Sending cash drawer open command...`, { command: commandHex });
      console.log(`📤 Sending cash drawer open command...`);
      console.log(`📤 Command bytes:`, commandHex);
      
      socket.write(command, (err) => {
        if (err) {
          console.error('❌ Error writing command:', err);
          socket.destroy();
          reject(err);
          return;
        }
        
        commandSent = true;
        logToFile('INFO', `✅ Cash drawer command sent successfully`, { ip: ipAddress, port: port });
        console.log('✅ Cash drawer command sent successfully');
        
        // Flush and keep connection open briefly to ensure command is processed
        socket.setNoDelay(true); // Disable Nagle algorithm for immediate send
        
        // Keep connection open briefly to ensure command is processed
        setTimeout(() => {
          socket.end();
          logToFile('INFO', `✅ Cash drawer operation completed`, { ip: ipAddress, port: port, success: true });
          resolve({ 
            success: true, 
            type: 'network',
            address: `${ipAddress}:${port}`,
            commandUsed: 1
          });
        }, 1000); // Keep open for 1 second
      });
    });
    
    socket.on('error', (err) => {
      logToFile('ERROR', `❌ Network error connecting to ${ipAddress}:${port}`, { error: err.message, code: err.code });
      console.error(`❌ Network error connecting to ${ipAddress}:${port}:`, err.message);
      if (!commandSent) {
        reject(new Error(`Failed to connect to cash drawer: ${err.message}`));
      }
    });
    
    socket.on('timeout', () => {
      logToFile('ERROR', `❌ Connection timeout to ${ipAddress}:${port}`);
      console.error(`❌ Connection timeout to ${ipAddress}:${port}`);
      socket.destroy();
      if (!commandSent) {
        reject(new Error(`Connection timeout to cash drawer at ${ipAddress}:${port}`));
      }
    });
    
    socket.on('close', () => {
      if (connected) {
        console.log('✅ Connection to cash drawer closed');
      }
    });
    
    // Connect to the cash drawer
    socket.connect(port, ipAddress);
  });
}

/**
 * Try to auto-detect network cash drawer by scanning common IPs and ports
 * Optimized for speed - tries most likely IPs first
 */
async function detectNetworkCashDrawer() {
  const commonPorts = [9100, 515]; // Most common ports for network cash drawers
  const localIPs = [];
  
  // Get local network IPs first (most likely)
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let localNetworkIP = null;
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIPs.push(iface.address);
        if (!localNetworkIP) {
          localNetworkIP = iface.address;
        }
        // Also try common IPs on same subnet
        const parts = iface.address.split('.');
        if (parts.length === 4) {
          // Try common IPs on the same subnet (prioritize .1, .100, .101)
          localIPs.push(`${parts[0]}.${parts[1]}.${parts[2]}.1`);
          localIPs.push(`${parts[0]}.${parts[1]}.${parts[2]}.100`);
          localIPs.push(`${parts[0]}.${parts[1]}.${parts[2]}.101`);
          for (let i = 2; i <= 20; i++) {
            if (i !== 100 && i !== 101) {
              localIPs.push(`${parts[0]}.${parts[1]}.${parts[2]}.${i}`);
            }
          }
        }
      }
    }
  }
  
  // Add common defaults (prioritize these at the beginning)
  // Since user's PC is at 192.168.0.37, prioritize 192.168.0.x subnet
  localIPs.unshift(
    '192.168.0.100', '192.168.0.101', '192.168.0.102', '192.168.0.103',
    '192.168.0.1', '192.168.0.2', '192.168.0.10', '192.168.0.20',
    '192.168.1.100', '192.168.1.1', '192.168.1.101'
  );
  
  logToFile('INFO', '🔍 Scanning for network cash drawer', { localNetworkIP, totalIPs: localIPs.length });
  console.log('🔍 Scanning for network cash drawer (this may take a few seconds)...');
  console.log(`📍 Your PC IP: ${localNetworkIP || 'unknown'}, scanning subnet 192.168.0.x`);
  
  // Try most likely IPs first (limit to avoid long wait, but prioritize 192.168.0.x)
  const uniqueIPs = [...new Set(localIPs)];
  // Sort to prioritize 192.168.0.x subnet
  const sortedIPs = uniqueIPs.sort((a, b) => {
    const aIsTargetSubnet = a.startsWith('192.168.0.');
    const bIsTargetSubnet = b.startsWith('192.168.0.');
    if (aIsTargetSubnet && !bIsTargetSubnet) return -1;
    if (!aIsTargetSubnet && bIsTargetSubnet) return 1;
    return 0;
  });
  const ipsToTry = sortedIPs.slice(0, 30); // Try more IPs since we know the subnet
  
  // Try ports in parallel for faster detection
  for (const ip of ipsToTry) {
    for (const port of commonPorts) {
      try {
        const socket = new net.Socket();
        socket.setTimeout(200); // Quick timeout for scanning
        
        const result = await new Promise((resolve, reject) => {
          socket.on('connect', () => {
            socket.destroy();
            resolve({ ip, port });
          });
          
          socket.on('error', () => {
            reject();
          });
          
          socket.on('timeout', () => {
            socket.destroy();
            reject();
          });
          
          socket.connect(port, ip);
        });
        
        console.log(`✅ Found potential cash drawer at ${result.ip}:${result.port}`);
        return result;
      } catch (e) {
        // Continue scanning
      }
    }
  }
  
  console.log('⚠️ Could not auto-detect network cash drawer');
  return null;
}

/**
 * Open cash drawer using ESC/POS command via serial port
 * ESC/POS command: ESC p (0x1B 0x70) m t1 t2
 * Common values: 0x1B 0x70 0x00 0x19 0xFF (opens drawer 1)
 */
async function openCashDrawerSerial(specifiedPort = null) {
  // Check if SerialPort is available
  if (!SerialPort) {
    throw new Error('SerialPort module not available. Please rebuild native modules: npm install --save-dev electron-rebuild && npx electron-rebuild');
  }
  
  try {
    // Get list of available serial ports
    const ports = await SerialPort.list();
    console.log('🔌 Available serial ports:', ports.map(p => ({ path: p.path, manufacturer: p.manufacturer })));

    if (ports.length === 0) {
      throw new Error('No serial ports found. Please connect your cash drawer.');
    }

    // Use specified port if provided, otherwise find the first available port
    let portPath = specifiedPort;
    
    // If port is specified, verify it exists
    if (portPath) {
      const found = ports.find(p => p.path === portPath || p.path.toUpperCase() === portPath.toUpperCase());
      if (!found) {
        throw new Error(`Specified port ${portPath} not found. Available ports: ${ports.map(p => p.path).join(', ')}`);
      }
      portPath = found.path;
      console.log(`✅ Using specified port: ${portPath}`);
    } else if (process.platform === 'win32') {
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
    console.log(`📋 Port details:`, ports.find(p => p.path === portPath));

    // ESC/POS commands to try (various formats)
    const openDrawerCommands = [
      Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFF]), // ESC p 0 - Drawer 0, 100ms on, 510ms off
      Buffer.from([0x1B, 0x70, 0x01, 0x19, 0xFF]), // ESC p 1 - Drawer 1, 100ms on, 510ms off
      Buffer.from([0x1B, 0x70, 0x00, 0x32, 0xFF]), // ESC p 0 - Drawer 0, 200ms on, 510ms off
      Buffer.from([0x1B, 0x70, 0x01, 0x32, 0xFF]), // ESC p 1 - Drawer 1, 200ms on, 510ms off
      Buffer.from([0x10, 0x14, 0x01, 0x00, 0x01]), // Alternative command format
      Buffer.from([0x1B, 0x70, 0x00, 0x64, 0x64]), // ESC p 0 - Drawer 0, longer pulse
    ];

    // Common baud rates to try
    const baudRates = [9600, 19200, 115200, 38400, 57600];

    // Try each baud rate
    let lastError = null;
    for (const baudRate of baudRates) {
      try {
        console.log(`🔌 Trying baud rate: ${baudRate}`);
        const result = await tryOpenDrawer(portPath, baudRate, openDrawerCommands);
        if (result && result.success) {
          return result;
        }
      } catch (error) {
        console.log(`⚠️ Baud rate ${baudRate} failed:`, error.message);
        lastError = error;
        // Continue to next baud rate
      }
    }

    // If we get here, all baud rates and commands failed
    const errorMsg = `Failed to open cash drawer. Tried ${baudRates.length} baud rates and ${openDrawerCommands.length} commands on port ${portPath}.\n\n` +
      `Possible issues:\n` +
      `1. Wrong serial port - Check Device Manager (Windows) to find the correct COM port\n` +
      `2. Drawer connected through printer - If drawer is connected via RJ11/RJ12 to a printer, use the printer's COM port\n` +
      `3. Wrong baud rate - Your drawer might need a different baud rate\n` +
      `4. Drawer needs different command format\n` +
      `5. Port is locked by another application\n\n` +
      `Available ports: ${ports.map(p => p.path).join(', ')}`;
    
    throw new Error(errorMsg);
  } catch (error) {
    console.error('❌ Error opening cash drawer:', error);
    throw error;
  }
}

/**
 * Try to open drawer with specific baud rate
 */
function tryOpenDrawer(portPath, baudRate, commands) {
  return new Promise((resolve, reject) => {
    let port = null;
    let commandIndex = 0;
    let portOpened = false;

    try {
      port = new SerialPort({
        path: portPath,
        baudRate: baudRate,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        autoOpen: false // Don't open automatically
      });

      port.on('open', () => {
        portOpened = true;
        console.log(`✅ Serial port opened at ${baudRate} baud`);
        
        // Small delay to ensure port is ready
        setTimeout(() => {
          tryNextCommand();
        }, 100);
      });

      port.on('error', (err) => {
        console.error(`❌ Serial port error at ${baudRate} baud:`, err);
        if (port && port.isOpen) {
          port.close();
        }
        reject(err);
      });

      const tryNextCommand = () => {
        if (commandIndex >= commands.length) {
          if (port && port.isOpen) {
            port.close();
          }
          reject(new Error(`All commands failed at ${baudRate} baud`));
          return;
        }
        
        const command = commands[commandIndex];
        console.log(`💰 Trying command ${commandIndex + 1}/${commands.length} at ${baudRate} baud`);
        console.log(`📤 Command bytes:`, Array.from(command).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' '));
        
        port.write(command, (err) => {
          if (err) {
            console.error(`❌ Error writing command ${commandIndex + 1}:`, err);
            commandIndex++;
            setTimeout(tryNextCommand, 200);
            return;
          }
          
          // Flush the buffer to ensure data is sent
          port.drain((drainErr) => {
            if (drainErr) {
              console.error('⚠️ Error draining port:', drainErr);
            }
            
            console.log(`✅ Command ${commandIndex + 1} sent and flushed at ${baudRate} baud`);
            
            // Keep port open longer to ensure command is processed
            setTimeout(() => {
              if (port && port.isOpen) {
                port.close((closeErr) => {
                  if (closeErr) {
                    console.error('⚠️ Error closing serial port:', closeErr);
                  } else {
                    console.log('✅ Serial port closed');
                  }
                  resolve({ 
                    success: true, 
                    port: portPath, 
                    baudRate: baudRate,
                    commandUsed: commandIndex + 1 
                  });
                });
              } else {
                resolve({ 
                  success: true, 
                  port: portPath, 
                  baudRate: baudRate,
                  commandUsed: commandIndex + 1 
                });
              }
            }, 1000); // Keep open for 1 second
          });
        });
      };

      // Open the port
      port.open((err) => {
        if (err) {
          console.error(`❌ Failed to open port at ${baudRate} baud:`, err);
          reject(err);
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!portOpened) {
          if (port) {
            port.close();
          }
          reject(new Error(`Timeout: Could not open serial port at ${baudRate} baud within 10 seconds`));
        }
      }, 10000);
    } catch (error) {
      if (port && port.isOpen) {
        port.close();
      }
      reject(error);
    }
  });
  } catch (error) {
    console.error('❌ Error opening cash drawer:', error);
    throw error;
  }
}

/**
 * IPC handler for opening cash drawer
 * Supports both network (TCP/IP) and serial (USB/COM) connections
 */
ipcMain.handle('open-till', async (event, options = {}) => {
  logToFile('INFO', '💰 Open Till button clicked', options);
  try {
    // Check if network connection is specified
    if (options.ipAddress) {
      const port = options.port || 9100; // Default to port 9100 (raw printing)
      logToFile('INFO', `Using specified IP address: ${options.ipAddress}:${port}`);
      const result = await openCashDrawerNetwork(options.ipAddress, port);
      logToFile('INFO', 'Cash drawer command completed', result);
      return { 
        success: true, 
        message: `Cash drawer opened successfully via network (${options.ipAddress}:${port})`, 
        type: 'network',
        address: result.address,
        commandUsed: result.commandUsed,
        logFile: logFile
      };
    }
    
    // If no IP specified but network mode is requested, try auto-detection
    if (options.networkMode === true || options.networkMode === 'auto') {
      logToFile('INFO', '🔍 Auto-detecting network cash drawer...');
      console.log('🔍 Auto-detecting network cash drawer...');
      
      try {
        const detected = await detectNetworkCashDrawer();
        if (detected) {
          logToFile('INFO', 'Auto-detected cash drawer', detected);
          const result = await openCashDrawerNetwork(detected.ip, detected.port);
          logToFile('INFO', 'Cash drawer command completed', result);
          return { 
            success: true, 
            message: `Cash drawer opened successfully via network (auto-detected: ${detected.ip}:${detected.port})`, 
            type: 'network',
            address: result.address,
            commandUsed: result.commandUsed,
            logFile: logFile
          };
        } else {
          logToFile('WARN', 'Could not auto-detect network cash drawer - trying common network IPs directly');
          console.log('⚠️ Auto-detection failed, trying common network IPs directly...');
          
          // Try common IPs directly without scanning
          // Prioritize 192.168.0.x subnet since user's PC is at 192.168.0.37
          const commonIPs = [
            '192.168.0.100', '192.168.0.101', '192.168.0.102', '192.168.0.103',
            '192.168.0.1', '192.168.0.2', '192.168.0.10', '192.168.0.20',
            '192.168.1.100', '192.168.1.1'
          ];
          const commonPorts = [9100, 515];
          
          for (const ip of commonIPs) {
            for (const port of commonPorts) {
              try {
                logToFile('INFO', `Trying direct connection to ${ip}:${port}`);
                const result = await openCashDrawerNetwork(ip, port);
                logToFile('INFO', 'Cash drawer command completed', result);
                return { 
                  success: true, 
                  message: `Cash drawer opened successfully via network (${ip}:${port})`, 
                  type: 'network',
                  address: result.address,
                  commandUsed: result.commandUsed,
                  logFile: logFile
                };
              } catch (err) {
                logToFile('WARN', `Failed to connect to ${ip}:${port}`, { error: err.message });
                // Continue to next IP/port
              }
            }
          }
          
          // If all network attempts failed, throw error instead of falling back to serial
          throw new Error('Could not connect to network cash drawer. Auto-detection failed and common IPs did not work. Please specify the cash drawer IP address manually.');
        }
      } catch (error) {
        logToFile('ERROR', 'Network cash drawer detection/connection failed', { error: error.message });
        throw error;
      }
    }
    
    // Only try serial connection if network mode is explicitly disabled or not requested
    if (options.networkMode === false || (!options.networkMode && !options.ipAddress)) {
      logToFile('INFO', 'Using serial port connection');
      const result = await openCashDrawerSerial(options.portPath);
      return { 
        success: true, 
        message: 'Cash drawer opened successfully', 
        type: 'serial',
        port: result.port,
        baudRate: result.baudRate,
        commandUsed: result.commandUsed,
        logFile: logFile
      };
    }
    
    // If we get here, something went wrong
    throw new Error('Invalid cash drawer configuration. Please specify either ipAddress for network mode or set networkMode to false for serial mode.');
  } catch (error) {
    logToFile('ERROR', '❌ Failed to open cash drawer', { error: error.message, stack: error.stack });
    console.error('❌ Failed to open cash drawer:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to open cash drawer. Please check the connection.',
      error: error.toString(),
      logFile: logFile // Include log file path in response
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

/**
 * IPC handler to scan network for cash drawer (quick scan of common IPs)
 */
ipcMain.handle('scan-network-drawer', async () => {
  logToFile('INFO', '🔍 Starting network scan for cash drawer');
  const foundIPs = [];
  const commonPorts = [9100, 515];
  
  // Get local network IP
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let subnet = '192.168.0';
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const parts = iface.address.split('.');
        if (parts.length === 4) {
          subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
          break;
        }
      }
    }
  }
  
  logToFile('INFO', `Scanning subnet ${subnet}.x for cash drawer`);
  console.log(`🔍 Scanning ${subnet}.x subnet for cash drawer...`);
  
  // Scan common IPs on the subnet (limit to avoid long wait)
  const ipsToScan = [];
  for (let i = 1; i <= 150; i++) {
    if (i !== 37) { // Skip PC's own IP
      ipsToScan.push(`${subnet}.${i}`);
    }
  }
  
  // Try first 30 IPs to keep it fast
  const ipsToTry = ipsToScan.slice(0, 30);
  
  for (const ip of ipsToTry) {
    for (const port of commonPorts) {
      try {
        const socket = new net.Socket();
        socket.setTimeout(300); // 300ms timeout per IP
        
        await new Promise((resolve, reject) => {
          socket.on('connect', () => {
            socket.destroy();
            foundIPs.push({ ip, port, status: 'open' });
            logToFile('INFO', `Found open port: ${ip}:${port}`);
            resolve();
          });
          
          socket.on('error', () => {
            reject();
          });
          
          socket.on('timeout', () => {
            socket.destroy();
            reject();
          });
          
          socket.connect(port, ip);
        });
      } catch (e) {
        // Continue scanning
      }
    }
  }
  
  logToFile('INFO', `Network scan completed`, { found: foundIPs.length, subnet });
  return { 
    success: true, 
    foundIPs,
    subnet,
    message: foundIPs.length > 0 
      ? `Found ${foundIPs.length} potential cash drawer(s)` 
      : 'No cash drawer found. Try manual IP configuration.'
  };
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
