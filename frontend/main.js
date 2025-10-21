const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const path = require('path');

app.disableHardwareAcceleration();

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

  backendProcess = spawn('java', ['-jar', jarPath], {
    cwd: path.dirname(jarPath),
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data}`);
  });
  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend ERROR] ${data}`);
  });
  
}

/**
 * Stop backend gracefully
 */
function stopBackend() {
  if (backendProcess) {
    try {
      backendProcess.kill('SIGTERM'); // ✅ explicit signal
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
    fullscreen: true,        // ✅ only fullscreen, no maximize
    frame: false,            // ✅ frameless
    autoHideMenuBar: true,   // ✅ hide menubar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // ✅ safer
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false
  });

  const startUrl = 'http://localhost:3000';


  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setFullScreen(true);
    mainWindow.setMenuBarVisibility(false);
  });

  // ✅ Single input handler
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
  stopBackend();
  app.quit();
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
