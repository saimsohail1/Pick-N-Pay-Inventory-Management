const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const path = require('path');
const fs = require('fs');

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
    frame: false, // ✅ Remove window frame for true fullscreen
    autoHideMenuBar: true, // ✅ Hide menu bar
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    titleBarStyle: 'hidden' // ✅ Hide title bar completely
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setFullScreen(true); // ✅ Ensure fullscreen on show
    mainWindow.setMenuBarVisibility(false); // ✅ Hide menu bar in fullscreen
    mainWindow.maximize(); // ✅ Maximize window for better fullscreen experience
  });

  // ✅ ESC key to exit fullscreen
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
        mainWindow.setMenuBarVisibility(true); // ✅ Show menu bar when exiting fullscreen
        mainWindow.setFrame(true); // ✅ Show frame when exiting fullscreen
        // Show a brief notification
        mainWindow.webContents.send('fullscreen-exited');
      }
    }
  });

  // ✅ F11 key to toggle fullscreen
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);
      if (!isFullScreen) {
        mainWindow.setMenuBarVisibility(false); // ✅ Hide menu bar when entering fullscreen
        mainWindow.setFrame(false); // ✅ Hide frame when entering fullscreen
      } else {
        mainWindow.setMenuBarVisibility(true); // ✅ Show menu bar when exiting fullscreen
        mainWindow.setFrame(true); // ✅ Show frame when exiting fullscreen
      }
    }
  });

  // ✅ Logout user when window is closed
  mainWindow.on('close', (event) => {
    // Send logout message to renderer process before closing
    try {
      mainWindow.webContents.send('app-closing');
      // Give a small delay for the logout to complete
      setTimeout(() => {
        if (backendProcess) {
          backendProcess.kill();
        }
        mainWindow = null;
      }, 200);
    } catch (error) {
      console.error('Error sending app-closing message:', error);
      if (backendProcess) {
        backendProcess.kill();
      }
      mainWindow = null;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// ✅ Handle app-closing message from renderer process
ipcMain.on('app-closing', (event) => {
  console.log('Received app-closing message from renderer');
  // Close the app gracefully
  if (backendProcess) {
    backendProcess.kill();
  }
  app.quit();
});

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('before-quit', () => {
  // Force logout before quitting
  if (mainWindow && mainWindow.webContents) {
    try {
      mainWindow.webContents.send('app-closing');
    } catch (error) {
      console.error('Error sending logout message:', error);
    }
  }
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
