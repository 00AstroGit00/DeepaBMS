const { app, BrowserWindow, Menu, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');

// Register custom protocol scheme to load files without file:// protocol CORS and path issues
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function registerProtocol() {
  protocol.handle('app', (request) => {
    try {
      const url = new URL(request.url);
      let pathname = url.pathname;

      if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
      }

      // Resolve the physical file path in the 'web' folder
      const absolutePath = path.join(__dirname, 'web', pathname);

      // Check if file exists. If not, fallback to index.html (SPA routing support)
      if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
        const indexPath = path.join(__dirname, 'web', 'index.html');
        return net.fetch(pathToFileURL(indexPath).toString());
      }

      return net.fetch(pathToFileURL(absolutePath).toString());
    } catch (error) {
      console.error('[protocol] Failed to handle request:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'Deepa BMS - Desktop',
    // Hide window initially to prevent blank white flash
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Only display the window once content is fully painted
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (isDev) {
    // Development: load from Expo dev server
    const devUrl = process.env.ELECTRON_DEV_URL || 'http://localhost:8081';
    console.log('[main] DEV mode — loading from', devUrl);
    mainWindow.loadURL(devUrl).catch((err) => {
      console.error('[main] Failed to load dev URL:', err.message);
    });
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load via registered 'app' protocol
    console.log('[main] PROD mode — loading via custom app:// protocol');
    mainWindow.loadURL('app://-/index.html').catch((err) => {
      console.error('[main] Failed to load custom app URL:', err.message);
      // Last-resort fallback: show a human-readable error page
      mainWindow.loadURL(
        `data:text/html,<h2 style="font-family:sans-serif;padding:2rem;color:#c00">
          Deepa BMS failed to load.<br>
          <small>${err.message}</small>
        </h2>`
      );
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Gracefully handle any renderer-side crashes
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] Renderer process gone:', details.reason);
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, desc) => {
    console.error('[main] did-fail-load:', code, desc);
  });
}

app.on('ready', () => {
  if (!isDev) {
    registerProtocol();
  }
  createWindow();
  setupMenu();

  // Only check for updates in production
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {
      // Silently ignore update errors (no update server configured)
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

function setupMenu() {
  const template = [
    {
      label: 'File',
      submenu: [{ role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        // Only expose DevTools menu in dev mode
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
