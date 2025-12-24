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

const DEFAULT_PRINTER = 'POS-80C'; // ✅ Your actual printer name (can be overridden by system default)

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
  
  // Multiple ESC/POS commands to try (different printers use different commands)
  const drawerCommands = [
    Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x78]), // ESC p 0 25 120 (most common)
    Buffer.from([0x1B, 0x70, 0x01, 0x19, 0xFA]), // ESC p 1 25 250 (pin 1)
    Buffer.from([0x1B, 0x70, 0x00, 0x32, 0x78]), // ESC p 0 50 120
    Buffer.from([0x10, 0x14, 0x01, 0x00, 0x01]), // Alternative command
    Buffer.from([0x1B, 0x70, 0x00, 0x64, 0x64]), // ESC p 0 100 100
  ];
  
  try {
    // Method 1: Try serial port if specified
    if (serialPort && SerialPort) {
      logToFile('INFO', 'Attempting to open drawer via specified serial port', { port: serialPort });
      return await openDrawerViaSerial(serialPort, drawerCommands);
    }
    
    // Method 2: Try Windows printer port (get default printer port first, then try common ports)
    if (process.platform === 'win32') {
      logToFile('INFO', 'Attempting to open drawer via Windows printer port');
      
      let defaultPort = null;
      let isUsbPort = false;
      
      // First, try to get and use the default printer port
      if (!printerPort) {
        logToFile('INFO', 'Getting default printer port from Windows');
        defaultPort = await getDefaultPrinterPort();
        if (defaultPort) {
          logToFile('INFO', 'Found default printer port', { port: defaultPort });
          isUsbPort = defaultPort.toUpperCase().startsWith('USB');
          
          // If it's a USB port (like USB003), use Windows Raw Print API method
          // This is the ONLY method that works for USB printers - confirmed by user testing
          // USB003 is the correct port for POS-80C printer
          if (isUsbPort) {
            logToFile('INFO', 'USB port detected - using Windows Raw Print API (required for USB printers like USB003)', { port: defaultPort });
            // For USB ports, Raw Print API is the only method that works
            // Don't fall through to other methods - they won't work for USB
            return await openDrawerViaWindowsRawPrint(drawerCommands);
          } else {
            // Try direct port access for non-USB ports
            try {
              const result = await openDrawerViaWindowsPort(defaultPort, drawerCommands);
              if (result.success) return result;
            } catch (error) {
              logToFile('WARN', 'Default printer port failed, trying common ports', { port: defaultPort, error: error.message });
            }
          }
        }
      }
      
      // Then try the specified port or common ports
      try {
        const result = await openDrawerViaWindowsPort(printerPort, drawerCommands);
        if (result.success) return result;
      } catch (error) {
        logToFile('WARN', 'Windows port method failed', { error: error.message });
        
        // If it was a USB port, provide specific error message
        if (isUsbPort && defaultPort) {
          throw new Error(`USB printer detected (${defaultPort}). USB printers cannot be accessed directly. The cash drawer may open automatically when printing receipts, or you may need to configure a serial/COM port for the drawer.`);
        }
      }
    }
    
    // Method 3: Try all available serial ports
    if (SerialPort) {
      logToFile('INFO', 'Attempting to find and try all available serial ports');
      return await openDrawerViaAllSerialPorts(drawerCommands);
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
      message: 'Unable to open drawer. Please check the log file for details. You may need to specify the printer port manually.' 
    };
  } catch (error) {
    logToFile('ERROR', 'Failed to open till', { error: error.message, stack: error.stack });
    return { success: false, message: error.message || 'Failed to open cash drawer' };
  }
});

/**
 * Open drawer via serial port - tries multiple commands and baud rates
 */
async function openDrawerViaSerial(portPath, commands) {
  return new Promise((resolve, reject) => {
    let port = null;
    let isResolved = false;
    const timeout = setTimeout(() => {
      if (!isResolved) {
        if (port) {
          try {
            if (port.isOpen) port.close();
          } catch (err) {
            console.error('Error closing port on timeout:', err);
          }
        }
        isResolved = true;
        reject(new Error('Serial port operation timed out'));
      }
    }, 10000);
    
    const cleanup = () => {
      if (port && port.isOpen) {
        try {
          port.close();
        } catch (err) {
          console.error('Error closing port:', err);
        }
      }
    };
    
    try {
      // Try different baud rates (9600 is most common for receipt printers)
      const baudRates = [9600, 115200, 19200, 38400, 57600];
      let baudIndex = 0;
      
      const tryBaudRate = () => {
        if (isResolved) return;
        
        if (baudIndex >= baudRates.length) {
          clearTimeout(timeout);
          isResolved = true;
          cleanup();
          reject(new Error(`Failed to open drawer on ${portPath} with any baud rate`));
          return;
        }
        
        const baudRate = baudRates[baudIndex];
        logToFile('INFO', 'Trying serial port with baud rate', { port: portPath, baudRate });
        
        cleanup();
        
        port = new SerialPort({ path: portPath, baudRate: baudRate, autoOpen: false });
        
        port.open((err) => {
          if (isResolved) return;
          
          if (err) {
            logToFile('WARN', 'Failed to open serial port with baud rate', { port: portPath, baudRate, error: err.message });
            baudIndex++;
            setTimeout(tryBaudRate, 200);
            return;
          }
          
          logToFile('INFO', 'Serial port opened, trying drawer commands', { port: portPath, baudRate });
          
          // Try all commands
          let commandIndex = 0;
          const tryCommand = () => {
            if (isResolved) return;
            
            if (commandIndex >= commands.length) {
              // All commands failed, try next baud rate
              cleanup();
              baudIndex++;
              setTimeout(tryBaudRate, 200);
              return;
            }
            
            const cmd = commands[commandIndex];
            logToFile('INFO', 'Sending drawer command', { port: portPath, commandIndex, baudRate });
            
            port.write(cmd, (writeErr) => {
              if (isResolved) return;
              
              if (writeErr) {
                logToFile('WARN', 'Failed to write command', { port: portPath, commandIndex, error: writeErr.message });
                commandIndex++;
                setTimeout(tryCommand, 150);
                return;
              }
              
              // Success - command sent
              clearTimeout(timeout);
              isResolved = true;
              setTimeout(cleanup, 300);
              
              logToFile('INFO', 'Drawer command sent successfully', { port: portPath, baudRate, commandIndex });
              resolve({ success: true, message: `Cash drawer opened successfully via ${portPath} (baud: ${baudRate})` });
            });
          };
          
          tryCommand();
        });
        
        port.on('error', (err) => {
          if (isResolved) return;
          logToFile('WARN', 'Serial port error', { port: portPath, baudRate, error: err.message });
          cleanup();
          baudIndex++;
          setTimeout(tryBaudRate, 200);
        });
      };
      
      tryBaudRate();
    } catch (error) {
      clearTimeout(timeout);
      isResolved = true;
      cleanup();
      logToFile('ERROR', 'Serial port exception', { error: error.message });
      reject(error);
    }
  });
}

/**
 * Open drawer via Windows printer port (LPT/COM/USB) - tries multiple commands
 */
async function openDrawerViaWindowsPort(printerPort, commands) {
  return new Promise((resolve, reject) => {
    // Common Windows printer ports (only if no specific port provided)
    const commonPorts = printerPort 
      ? [printerPort] 
      : ['LPT1', 'LPT2', 'LPT3', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8'];
    
    let portIndex = 0;
    const tryPort = () => {
      if (portIndex >= commonPorts.length) {
        reject(new Error('Could not open drawer on any available Windows port. The printer may be connected via USB and require a different port name. Check Windows Printer settings for the actual port name.'));
        return;
      }
      
      const portName = commonPorts[portIndex];
      
      // Skip USB ports immediately - they cannot be accessed directly via file writes
      // USB printers need to be accessed through the Windows print spooler
      if (portName.toUpperCase().startsWith('USB')) {
        logToFile('INFO', 'USB port detected, skipping direct access (requires print spooler)', { port: portName });
        portIndex++;
        setTimeout(tryPort, 10);
        return;
      }
      
      logToFile('INFO', 'Trying Windows port', { port: portName });
      
      // Handle different port name formats
      let portPath;
      if (portName.startsWith('\\\\.\\')) {
        // Already in correct format
        portPath = portName;
      } else {
        // Standard COM/LPT ports
        portPath = `\\\\.\\${portName}`;
      }
      
      let commandIndex = 0;
      const tryCommand = () => {
        if (commandIndex >= commands.length) {
          // All commands failed on this port, try next port
          portIndex++;
          // Skip quickly if port doesn't exist (ENOENT), wait longer if it exists but timed out
          const delay = portName.startsWith('COM') ? 200 : 100;
          setTimeout(tryPort, delay);
          return;
        }
        
        const cmd = commands[commandIndex];
        logToFile('INFO', 'Trying command on Windows port', { port: portName, commandIndex });
        
        // Use writeFile with a timeout wrapper
        const writeTimeout = setTimeout(() => {
          logToFile('WARN', 'Write operation timed out', { port: portName, commandIndex });
          commandIndex++;
          setTimeout(tryCommand, 50);
        }, 2000); // 2 second timeout per write
        
        fs.writeFile(portPath, cmd, (err) => {
          clearTimeout(writeTimeout);
          
          if (err) {
            // ENOENT means port doesn't exist - skip quickly
            // EPERM means permission denied (port is locked/busy) - skip this port entirely
            // ETIMEDOUT means port exists but is busy - skip this port entirely
            if (err.code === 'ENOENT') {
              logToFile('INFO', 'Port does not exist, skipping', { port: portName });
              portIndex++;
              setTimeout(tryPort, 50);
            } else if (err.code === 'EPERM' || err.code === 'ETIMEDOUT') {
              logToFile('WARN', 'Port is locked or busy, skipping port entirely', { port: portName, code: err.code });
              portIndex++;
              setTimeout(tryPort, 100);
            } else {
              logToFile('WARN', 'Failed to write command to port', { port: portName, commandIndex, error: err.message, code: err.code });
              commandIndex++;
              setTimeout(tryCommand, 100);
            }
          } else {
            logToFile('INFO', 'Drawer opened via Windows port', { port: portName, commandIndex });
            resolve({ success: true, message: `Cash drawer opened successfully via ${portName}` });
          }
        });
      };
      
      tryCommand();
    };
    
    tryPort();
  });
}

/**
 * Try all available serial ports
 */
async function openDrawerViaAllSerialPorts(commands) {
  try {
    const ports = await SerialPort.list();
    logToFile('INFO', 'Auto-detecting serial ports', { count: ports.length, ports: ports.map(p => p.path) });
    
    if (ports.length === 0) {
      throw new Error('No serial ports found. Please connect your printer and ensure it is recognized by the system.');
    }
    
    // Try each port sequentially
    for (let i = 0; i < ports.length; i++) {
      const port = ports[i];
      logToFile('INFO', 'Trying serial port', { index: i, port: port.path, manufacturer: port.manufacturer });
      
      try {
        const result = await openDrawerViaSerial(port.path, commands);
        if (result.success) {
          return result;
        }
      } catch (error) {
        logToFile('WARN', 'Failed to open drawer on port', { port: port.path, error: error.message });
        // Continue to next port
      }
    }
    
    throw new Error(`Tried all ${ports.length} available serial ports but could not open drawer. Ports tried: ${ports.map(p => p.path).join(', ')}`);
  } catch (error) {
    logToFile('ERROR', 'Auto-detect failed', { error: error.message });
    throw error;
  }
}

/**
 * Open drawer via Windows Raw Print API (for USB printers)
 * Sends raw ESC/POS command directly to printer queue
 */
async function openDrawerViaWindowsRawPrint(commands) {
  if (process.platform !== 'win32') {
    throw new Error('Windows Raw Print API is only available on Windows');
  }
  
  try {
    // Get default printer name and port
    const { exec } = require('child_process');
    let printerName = null;
    let printerPort = null;
    
    try {
      const printerInfo = await new Promise((resolve, reject) => {
        exec('powershell -Command "$printer = Get-CimInstance Win32_Printer | Where-Object {$_.Default -eq $true}; if ($printer) { Write-Output \"$($printer.Name)|$($printer.PortName)\" }"',
          { timeout: 5000 },
          (error, stdout) => {
            if (error || !stdout || !stdout.trim()) {
              reject(new Error('Could not get default printer info'));
              return;
            }
            const parts = stdout.trim().split('|');
            resolve({ name: parts[0], port: parts[1] || 'unknown' });
          }
        );
      });
      printerName = printerInfo.name;
      printerPort = printerInfo.port;
    } catch (error) {
      logToFile('WARN', 'Could not get default printer, using fallback', { error: error.message });
      // Fallback: try to find POS-80C printer specifically
      try {
        const printerInfo = await new Promise((resolve, reject) => {
          exec('powershell -Command "$printer = Get-CimInstance Win32_Printer | Where-Object {$_.Name -eq \"POS-80C\"}; if ($printer) { Write-Output \"$($printer.Name)|$($printer.PortName)\" }"',
            { timeout: 5000 },
            (error, stdout) => {
              if (error || !stdout || !stdout.trim()) {
                reject(new Error('Could not find POS-80C printer'));
                return;
              }
              const parts = stdout.trim().split('|');
              resolve({ name: parts[0], port: parts[1] || 'unknown' });
            }
          );
        });
        printerName = printerInfo.name;
        printerPort = printerInfo.port;
      } catch (fallbackError) {
        // Last resort: use hardcoded name
        printerName = 'POS-80C';
        logToFile('WARN', 'Using hardcoded printer name POS-80C', { error: fallbackError.message });
      }
    }
    
    if (!printerName) {
      printerName = 'POS-80C'; // Default fallback
    }
    
    logToFile('INFO', 'Sending drawer command via Windows Raw Print API', { 
      printer: printerName, 
      port: printerPort || 'unknown',
      commandCount: commands.length 
    });
    
    // Try all commands sequentially until one succeeds
    for (let cmdIndex = 0; cmdIndex < commands.length; cmdIndex++) {
      const drawerCommand = commands[cmdIndex];
      logToFile('INFO', 'Trying drawer command', { index: cmdIndex, command: Array.from(drawerCommand).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ') });
      
      try {
        const result = await sendDrawerCommandViaRawPrint(printerName, drawerCommand);
        if (result.success) {
          return result;
        }
        logToFile('WARN', 'Drawer command failed, trying next', { index: cmdIndex, error: result.message });
      } catch (error) {
        logToFile('WARN', 'Drawer command exception, trying next', { index: cmdIndex, error: error.message });
        if (cmdIndex === commands.length - 1) {
          throw error; // Throw last error if all commands fail
        }
      }
    }
    
    throw new Error('All drawer commands failed via Raw Print API');
  } catch (error) {
    logToFile('ERROR', 'Raw Print API exception', { error: error.message });
    throw error;
  }
}

/**
 * Send a single drawer command via Windows Raw Print API
 */
async function sendDrawerCommandViaRawPrint(printerName, drawerCommand) {
  return new Promise((resolve, reject) => {
    const tempDir = require('os').tmpdir();
    const tempFile = path.join(tempDir, `drawer_cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.bin`);
    
    // Write raw bytes to temp file
    fs.writeFile(tempFile, drawerCommand, (writeErr) => {
      if (writeErr) {
        reject(new Error(`Failed to create temp file: ${writeErr.message}`));
        return;
      }
      
      // Use PowerShell to send raw data via Windows Print API (winspool.drv)
      const escapedTempFile = tempFile.replace(/\\/g, '\\\\').replace(/'/g, "''");
      // Escape printer name for PowerShell (escape single quotes and backticks)
      const escapedPrinterName = printerName.replace(/'/g, "''").replace(/`/g, '``').replace(/\$/g, '`$');
      const psCmd = `
$ErrorActionPreference = 'Stop'
$printerName = '${escapedPrinterName}'
$bytes = [System.IO.File]::ReadAllBytes('${escapedTempFile}')
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrint {
    [DllImport("winspool.drv", CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.drv", CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, DOCINFOA di);
    [DllImport("winspool.drv", CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
}
[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
public struct DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
}
"@
$hPrinter = [IntPtr]::Zero
if ([RawPrint]::OpenPrinter($printerName, [ref]$hPrinter, [IntPtr]::Zero)) {
    try {
        $docInfo = New-Object DOCINFOA
        $docInfo.pDocName = "DrawerOpen"
        $docInfo.pDataType = "RAW"
        if ([RawPrint]::StartDocPrinter($hPrinter, 1, $docInfo)) {
            try {
                if ([RawPrint]::StartPagePrinter($hPrinter)) {
                    try {
                        $gcHandle = [System.Runtime.InteropServices.GCHandle]::Alloc($bytes, [System.Runtime.InteropServices.GCHandleType]::Pinned)
                        try {
                            $written = 0
                            if ([RawPrint]::WritePrinter($hPrinter, $gcHandle.AddrOfPinnedObject(), $bytes.Length, [ref]$written)) {
                                Write-Output "SUCCESS"
                            } else {
                                Write-Output "ERROR: WritePrinter failed - $([System.Runtime.InteropServices.Marshal]::GetLastWin32Error())"
                            }
                        } finally {
                            $gcHandle.Free()
                        }
                    } finally {
                        [RawPrint]::EndPagePrinter($hPrinter) | Out-Null
                    }
                } else {
                    Write-Output "ERROR: StartPagePrinter failed - $([System.Runtime.InteropServices.Marshal]::GetLastWin32Error())"
                }
            } finally {
                [RawPrint]::EndDocPrinter($hPrinter) | Out-Null
            }
        } else {
            Write-Output "ERROR: StartDocPrinter failed - $([System.Runtime.InteropServices.Marshal]::GetLastWin32Error())"
        }
    } finally {
        [RawPrint]::ClosePrinter($hPrinter) | Out-Null
    }
} else {
    Write-Output "ERROR: OpenPrinter failed - $([System.Runtime.InteropServices.Marshal]::GetLastWin32Error())"
}
        `.trim();
        
        exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCmd.replace(/"/g, '\\"')}"`, 
          { timeout: 10000 },
          (error, stdout, stderr) => {
            // Clean up temp file
            fs.unlink(tempFile, () => {});
            
            if (error) {
              logToFile('ERROR', 'Raw Print API failed', { error: error.message, stderr, stdout });
              reject(new Error(`Failed to send command via Raw Print API: ${error.message}`));
              return;
            }
            
            const output = stdout.trim();
            logToFile('INFO', 'Raw Print API response', { output, stderr, printerName });
            if (output.includes('SUCCESS')) {
              logToFile('INFO', 'Drawer command sent successfully via Raw Print API', { printerName });
              resolve({ success: true, message: 'Cash drawer opened successfully via Windows Raw Print API', printer: printerName });
            } else {
              logToFile('ERROR', 'Raw Print API returned error', { output, stderr, printerName });
              reject(new Error(`Raw Print API error: ${output || stderr || 'Unknown error'}`));
            }
          }
        );
      });
    });
}

/**
 * Get default printer port on Windows
 */
async function getDefaultPrinterPort() {
  if (process.platform !== 'win32') {
    return null;
  }
  
  try {
    // Use PowerShell to get default printer port and name
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      // Get both printer name and port name
      const cmd = 'powershell -Command "$printer = Get-CimInstance Win32_Printer | Where-Object {$_.Default -eq $true}; if ($printer) { Write-Output $printer.PortName }"';
      exec(cmd, 
        { timeout: 5000 }, 
        (error, stdout, stderr) => {
          if (error) {
            logToFile('WARN', 'Could not get default printer port', { error: error.message, stderr });
            resolve(null);
            return;
          }
          
          const port = stdout.trim();
          if (!port || port.length === 0) {
            logToFile('WARN', 'Default printer port is empty or not found');
            resolve(null);
            return;
          }
          
          logToFile('INFO', 'Found default printer port', { port });
          resolve(port);
        }
      );
    });
  } catch (error) {
    logToFile('ERROR', 'Error getting default printer port', { error: error.message });
    return null;
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
 * IPC handler to get list of available serial ports and Windows printer ports
 */
ipcMain.handle('get-serial-ports', async () => {
  const result = {
    success: true,
    serialPorts: [],
    windowsPorts: [],
    defaultPrinterPort: null
  };

  // Get serial ports
  if (SerialPort) {
    try {
      const ports = await SerialPort.list();
      result.serialPorts = ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer || 'Unknown',
        vendorId: p.vendorId || '',
        productId: p.productId || ''
      }));
      logToFile('INFO', 'Listed serial ports', { count: result.serialPorts.length });
    } catch (error) {
      logToFile('ERROR', 'Error listing serial ports', { error: error.message });
    }
  }

  // Get Windows printer ports
  if (process.platform === 'win32') {
    result.windowsPorts = ['LPT1', 'LPT2', 'LPT3', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8'];
    
    // Try to get default printer port
    try {
      result.defaultPrinterPort = await getDefaultPrinterPort();
    } catch (error) {
      logToFile('WARN', 'Could not get default printer port', { error: error.message });
    }
  }

  return result;
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
