/**
 * Main Process Entry — Codex Grid Client
 * Manages application lifecycle, window, IPC, store, tray, and updater.
 */
import { app, BrowserWindow, ipcMain, shell, Menu, nativeTheme } from 'electron';
import path from 'path';
import {
  IPC_CHANNELS,
  IPC_EVENTS,
  APP_NAME,
  DEFAULT_GRID_API_URL,
  DEFAULT_PROXY_PORT,
} from '../shared/constants';
import type {
  LoginCredentials,
  User,
  Session,
  Subscription,
  UsageData,
  Settings,
  UpdateInfo,
} from '../shared/types';

import {
  getSession,
  setSession,
  clearSession,
  getSettings,
  updateSettings,
  getStoreValue,
  setStoreValue,
} from './store';

import {
  startProxy,
  stopProxy,
  getProxyStatus,
  onStatusChanged as onProxyStatusChanged,
} from './api-proxy';

import { createTray, updateTray, destroyTray } from './tray';
import { configureUpdater, checkForUpdates } from './updater';

/* ────────────────────── State ────────────────────── */

let mainWindow: BrowserWindow | null = null;
let isDev = false;

/* ────────────────────── Window ────────────────────── */

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: APP_NAME,
    show: false, // show when ready
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load renderer
  if (isDev) {
    win.loadURL('http://localhost:5173').catch((err: Error) => {
      console.error('[Main] Failed to load dev server:', err.message);
    });
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html')).catch((err: Error) => {
      console.error('[Main] Failed to load renderer:', err.message);
    });
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault();
      win.hide();
    } else {
      mainWindow = null;
    }
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

/* ────────────────────── Menu ────────────────────── */

function buildAppMenu(): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: APP_NAME,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
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
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

/* ────────────────────── Mock data helpers ────────────────────── */

function createMockUser(apiKey: string): User {
  return {
    id: 'user-' + Buffer.from(apiKey.slice(-8)).toString('hex').slice(0, 8),
    email: 'user@neurasea.ai',
    name: 'Grid User',
    avatar: undefined,
  };
}

function createMockSubscription(): Subscription {
  return {
    plan: 'pro',
    status: 'active',
    quota: {
      tokensPerMonth: 10_000_000,
      usedTokens: 2_450_000,
      remainingTokens: 7_550_000,
    },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function createMockUsage(range: '5h' | '24h' | '7d' | '30d'): UsageData {
  const ranges: Record<string, { label: string; points: number }> = {
    '5h': { label: '5 Hours', points: 10 },
    '24h': { label: '24 Hours', points: 24 },
    '7d': { label: '7 Days', points: 14 },
    '30d': { label: '30 Days', points: 30 },
  };

  const r = ranges[range] ?? ranges['24h'];
  const intervalMs = range === '5h' ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const dataPoints = Array.from({ length: r.points }, (_, i) => ({
    timestamp: new Date(Date.now() - (r.points - i) * intervalMs).toISOString(),
    tokens: Math.floor(Math.random() * 50000) + 10000,
    requests: Math.floor(Math.random() * 200) + 50,
  }));

  const totalTokens = dataPoints.reduce((sum, d) => sum + d.tokens, 0);
  const totalRequests = dataPoints.reduce((sum, d) => sum + d.requests, 0);

  return {
    range: r.label,
    totalRequests,
    totalTokens,
    inputTokens: Math.floor(totalTokens * 0.6),
    outputTokens: Math.floor(totalTokens * 0.4),
    dataPoints,
  };
}

/* ────────────────────── IPC Handlers ────────────────────── */

function registerIpcHandlers(): void {
  // ── Auth ──

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_event, credentials: LoginCredentials) => {
    try {
      const { apiKey } = credentials;

      if (!apiKey || apiKey.length < 8) {
        return { success: false, error: 'Invalid API key format' };
      }

      const user = createMockUser(apiKey);
      const session: Session = {
        user,
        apiKey,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      setSession(session);

      return { success: true, user };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    await stopProxy();
    clearSession();
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_GET_SESSION, async () => {
    return getSession();
  });

  // ── Subscription ──

  ipcMain.handle(IPC_CHANNELS.SUBSCRIPTION_GET, async () => {
    const session = getSession();
    if (!session) return null;
    return createMockSubscription();
  });

  // ── Usage ──

  ipcMain.handle(
    IPC_CHANNELS.USAGE_GET,
    async (_event, range: '5h' | '24h' | '7d' | '30d') => {
      const session = getSession();
      if (!session) return null;
      return createMockUsage(range);
    },
  );

  // ── Proxy ──

  ipcMain.handle(IPC_CHANNELS.PROXY_START, async (_event, config?: { port?: number }) => {
    const session = getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    const settings = getSettings();
    const port = config?.port ?? settings.apiProxyPort ?? DEFAULT_PROXY_PORT;

    const result = await startProxy({
      port,
      upstreamUrl: settings.gridApiUrl || DEFAULT_GRID_API_URL,
      apiKeyProvider: () => {
        const s = getSession();
        return s?.apiKey ?? '';
      },
    });

    if (result.success) {
      broadcastProxyStatus();
    }

    return result;
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_STOP, async () => {
    await stopProxy();
    broadcastProxyStatus();
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_GET_STATUS, async () => {
    return getProxyStatus();
  });

  // ── Settings ──

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_event, partial: Partial<Settings>) => {
    const updated = updateSettings(partial);

    // Notify renderer of theme change
    if (partial.theme) {
      mainWindow?.webContents.send(IPC_EVENTS.THEME_CHANGED, partial.theme);
    }

    return updated;
  });

  // ── App ──

  ipcMain.handle(IPC_CHANNELS.APP_CHECK_UPDATE, async (): Promise<UpdateInfo | null> => {
    return checkForUpdates();
  });

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, async (_event, url: string) => {
    await shell.openExternal(url);
  });

  // ── Store ──

  ipcMain.handle(IPC_CHANNELS.STORE_GET, async (_event, key: string) => {
    return getStoreValue(key);
  });

  ipcMain.handle(IPC_CHANNELS.STORE_SET, async (_event, key: string, value: unknown) => {
    setStoreValue(key, value);
  });
}

/* ────────────────────── Proxy status broadcast ────────────────────── */

function broadcastProxyStatus(): void {
  const status = getProxyStatus();
  mainWindow?.webContents.send(IPC_EVENTS.PROXY_STATUS_CHANGED, status);
  updateTray(status);
}

/* ────────────────────── App Lifecycle ────────────────────── */

app.whenReady().then(() => {
  isDev = process.argv.includes('--dev');

  if (isDev) {
    console.log('[Main] Running in development mode');
  }

  // macOS menu
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(buildAppMenu());
  } else {
    Menu.setApplicationMenu(null);
  }

  // Create window
  mainWindow = createWindow();

  // Tray
  const proxyStatus = getProxyStatus();
  createTray(mainWindow, proxyStatus, () => {
    const status = getProxyStatus();
    if (status.running) {
      stopProxy().then(() => broadcastProxyStatus());
    } else {
      startProxy().then(() => broadcastProxyStatus());
    }
  });

  // Proxy status listener
  onProxyStatusChanged((status) => {
    mainWindow?.webContents.send(IPC_EVENTS.PROXY_STATUS_CHANGED, status);
    updateTray(status);
  });

  // Updater
  configureUpdater();

  // Theme listener
  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send(
      IPC_EVENTS.THEME_CHANGED,
      nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    );
  });

  // Register IPC
  registerIpcHandlers();

  // Auto-start proxy if enabled
  const settings = getSettings();
  if (settings.autoStartProxy) {
    const session = getSession();
    if (session) {
      startProxy({
        port: settings.apiProxyPort,
        upstreamUrl: settings.gridApiUrl,
        apiKeyProvider: () => {
          const s = getSession();
          return s?.apiKey ?? '';
        },
      }).catch((err: Error) => {
        console.error('[Main] Auto-start proxy failed:', err.message);
      });
    }
  }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    mainWindow = createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopProxy().catch(() => { /* noop */ });
  destroyTray();
});

app.on('will-quit', () => {
  // Cleanup IPC handlers
  ipcMain.removeAllListeners();
});
