const { app, BrowserWindow, globalShortcut } = require('electron');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const path = require('path');

app.disableHardwareAcceleration();

let mainWindow;
let backendProcess;

function startBackend() {
  const jarPath = isDev
    ? path.join(__dirname, 'backend', 'inventory-management-0.0.1-SNAPSHOT.jar')
    : path.join(process.resourcesPath, 'backend', 'inventory-management-0.0.1-SNAPSHOT.jar');

  console.log("👉 Launching backend from:", jarPath);

  backendProcess = spawn('java', ['-jar', jarPath], {
    cwd: path.dirname(jarPath),
    detached: false,
    stdio: 'ignore',      // ✅ no extra console window
    windowsHide: true     // ✅ hides cmd.exe window
  });

  backendProcess.on('error', (err) => {
    console.error('❌ Failed to start backend:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log(`ℹ️ Backend process exited with code ${code}`);
  });
}

function createWindow() {
  if (mainWindow) return; // ✅ prevents double windows

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true, // ✅ Start in fullscreen mode
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
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
    mainWindow.setFullScreen(true); // ✅ Ensure fullscreen on show
  });

  // ✅ ESC key to exit fullscreen
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape') {
      if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
        // Show a brief notification
        mainWindow.webContents.send('fullscreen-exited');
      }
    }
  });

  // ✅ F11 key to toggle fullscreen
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  // ✅ Logout user when window is closed
  mainWindow.on('closed', () => {
    // Send logout message to renderer process
    mainWindow.webContents.send('app-closing');
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});

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
