const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  protocol,
  net,
  Tray,
  nativeTheme,
  globalShortcut,
  dialog,
  Notification,
  shell,
  powerMonitor,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');

// ── Windows-specific app identification ──────────────────────────────────────
// Must be called before app.on('ready') for proper taskbar grouping,
// notification toast attribution, and jump list association.
app.setAppUserModelId('com.deepa.bms.desktop');

// ── GPU / performance command-line switches ──────────────────────────────────
// Ignore GPU blacklist so the app renders even on older or virtualised GPUs.
app.commandLine.appendSwitch('ignore-gpu-blacklist');
// Use the GPU process for rasterization (smoother rendering).
app.commandLine.appendSwitch('enable-gpu-rasterization');
// Disable the in-process GPU feature to let the dedicated GPU process handle it.
app.commandLine.appendSwitch('disable-in-process-gpu');

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
let tray;
let isQuitting = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const STATE_PATH = path.join(app.getPath('userData'), 'window-state.json');

// ── Window State Persistence ────────────────────────────────────────────────

function loadWindowState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    }
  } catch {}
  return { width: 1280, height: 800 };
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    if (mainWindow.isMinimized()) return;
    const bounds = mainWindow.getBounds();
    const maximized = mainWindow.isMaximized();
    fs.writeFileSync(
      STATE_PATH,
      JSON.stringify({ ...bounds, maximized }, null, 2),
    );
  } catch {}
}

// ── Custom Protocol ─────────────────────────────────────────────────────────

function registerProtocol() {
  protocol.handle('app', (request) => {
    try {
      const url = new URL(request.url);
      let pathname = url.pathname;

      if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
      }

      const absolutePath = path.join(__dirname, 'web', pathname);

      if (
        !fs.existsSync(absolutePath) ||
        fs.statSync(absolutePath).isDirectory()
      ) {
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

// ── Window Creation ─────────────────────────────────────────────────────────

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    ...state,
    minWidth: 900,
    minHeight: 600,
    title: 'Deepa BMS',
    show: false,
    backgroundColor: '#F4F2EE',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (state.maximized) {
    mainWindow.maximize();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (isDev) {
    const devUrl = process.env.ELECTRON_DEV_URL || 'http://localhost:8081';
    console.log('[main] DEV mode — loading from', devUrl);
    mainWindow.loadURL(devUrl).catch((err) => {
      console.error('[main] Failed to load dev URL:', err.message);
    });
    mainWindow.webContents.openDevTools();
  } else {
    console.log('[main] PROD mode — loading via custom app:// protocol');
    mainWindow.loadURL('app://-/index.html').catch((err) => {
      console.error('[main] Failed to load custom app URL:', err.message);
      mainWindow.loadURL(
        `data:text/html,<h2 style="font-family:sans-serif;padding:2rem;color:#c00">
          Deepa BMS failed to load.<br>
          <small>${err.message}</small>
        </h2>`,
      );
    });
  }

  // Save window state on changes
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] Renderer process gone:', details.reason);
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, desc) => {
    console.error('[main] did-fail-load:', code, desc);
  });
}

// ── IPC Handlers ────────────────────────────────────────────────────────────

function setupIPC() {
  ipcMain.handle('app:get-info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  }));

  ipcMain.handle('app:get-system-theme', () =>
    nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
  );

  ipcMain.handle(
    'dialog:save-file',
    async (_event, { content, defaultName, filters }) => {
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName,
        filters: filters || [{ name: 'All Files', extensions: ['*'] }],
      });
      if (canceled || !filePath) return null;
      fs.writeFileSync(filePath, content, 'utf8');
      return filePath;
    },
  );

  ipcMain.handle(
    'dialog:open-file',
    async (_event, { filters }) => {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: filters || [{ name: 'All Files', extensions: ['*'] }],
      });
      if (canceled || !filePaths.length) return null;
      return filePaths[0];
    },
  );

  ipcMain.handle('dialog:save-csv', async (_event, { content, defaultName }) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName || 'export.csv',
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (canceled || !filePath) return null;
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  });

  ipcMain.handle(
    'notification:show',
    (_event, { title, body }) => {
      if (Notification.isSupported()) {
        new Notification({ title, body }).show();
      }
    },
  );

  ipcMain.handle('app:print', () => {
    mainWindow?.webContents.print({});
  });

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => {
    isQuitting = true;
    mainWindow?.close();
  });
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);

  ipcMain.on('shell:open-external', (_event, url) => {
    shell.openExternal(url);
  });

  // Push system theme changes to renderer
  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    mainWindow?.webContents.send('theme:system-changed', theme);
  });
}

// ── System Tray ─────────────────────────────────────────────────────────────

function setupTray() {
  if (tray) return;
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  if (!fs.existsSync(iconPath)) return;
  tray = new Tray(iconPath);
  tray.setToolTip('Deepa BMS');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Deepa BMS',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ── Global Shortcuts ────────────────────────────────────────────────────────

function setupShortcuts() {
  globalShortcut.register('CommandOrControl+N', () => {
    mainWindow?.webContents.send('shortcut:new-entry');
  });
  globalShortcut.register('CommandOrControl+S', () => {
    mainWindow?.webContents.send('shortcut:save');
  });
  globalShortcut.register('CommandOrControl+F', () => {
    mainWindow?.webContents.send('shortcut:search');
  });
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    mainWindow?.webContents.send('shortcut:sync');
  });
}

// ── Application Menu ────────────────────────────────────────────────────────

function setupMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Entry',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('shortcut:new-entry'),
        },
        { type: 'separator' },
        {
          label: 'Export Data…',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('shortcut:export'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
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
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        {
          label: 'Toggle Dark Mode',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => mainWindow?.webContents.send('shortcut:toggle-dark'),
        },
        { type: 'separator' },
        { role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
        { role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
        { role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Deepa BMS',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Deepa BMS',
              message: 'Deepa BMS',
              detail: `Version ${app.getVersion()}\nElectron ${process.versions.electron}\nChrome ${process.versions.chrome}\nNode ${process.versions.node}`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ── Power Monitor ────────────────────────────────────────────────────────────

function setupPowerMonitor() {
  powerMonitor.on('suspend', () => {
    console.log('[main] System suspending — syncing state');
    mainWindow?.webContents.send('power:suspend');
    saveWindowState();
  });

  powerMonitor.on('resume', () => {
    console.log('[main] System resumed — reconnecting');
    mainWindow?.webContents.send('power:resume');
  });

  powerMonitor.on('on-ac', () => {
    mainWindow?.webContents.send('power:ac');
  });

  powerMonitor.on('on-battery', () => {
    mainWindow?.webContents.send('power:battery');
  });
}

// ── App Lifecycle ───────────────────────────────────────────────────────────

app.on('ready', () => {
  if (!isDev) {
    registerProtocol();
  }
  createWindow();
  setupMenu();
  setupIPC();
  setupShortcuts();
  setupTray();
  setupPowerMonitor();

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }
});

// If the GPU process dies, fall back to software rendering
app.on('child-process-gone', (_event, details) => {
  if (details.type === 'GPU') {
    console.warn('[main] GPU process crashed — disabling hardware acceleration');
    app.disableHardwareAcceleration();
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

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
