const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');

// 🔹 Only disable hardware acceleration on macOS/Linux, keep it ON for Windows
if (process.platform !== 'win32') {
  app.disableHardwareAcceleration();
}

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
 * IPC listener for renderer "app-closing"
 */
ipcMain.on('app-closing', () => {
  console.log('📩 Received app-closing from renderer');
  
  // Stop backend gracefully
  stopBackend();
  
  // Give a moment for cleanup, then quit
  setTimeout(() => {
    console.log('🔄 Quitting application...');
    app.quit();
  }, 100);
});

app.whenReady().then(() => {
  startBackend();
  createWindow();
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
