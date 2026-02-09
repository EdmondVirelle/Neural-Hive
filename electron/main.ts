/**
 * Neural Hive - Electron Main Process
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

import {
  IPC_CHANNELS,
  BroadcastPayload,
} from '../src/types/shared.js';

// Import managers
import { BroadcastManager } from './broadcast-manager.js';
import { getConfigLoader } from './config-loader.js';
import { getResourceMonitor } from './resource-monitor.js';
import { TaskbarNotifier } from './taskbar-notifier.js';
import { HealthMonitor } from './health-monitor.js';
import { AgentManager } from './agent-manager.js';
import { SettingsManager } from './settings-manager.js';
import { detectInstalledClis } from './cli-detector.js';

// ============================================
// State Management
// ============================================

let mainWindow: BrowserWindow | null = null;

// Initialize managers
const configLoader = getConfigLoader();
const broadcastManager = new BroadcastManager();
const resourceMonitor = getResourceMonitor();
const taskbarNotifier = new TaskbarNotifier();
const healthMonitor = new HealthMonitor(path.join(_dirname, '../../config'));

// Initialize Settings Manager
let settingsManager: SettingsManager;

// Initialize Agent Manager (settingsManager injected after app.whenReady)
let agentManager: AgentManager;

// ============================================
// Window Management
// ============================================

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Neural Hive v1.0.0 - AI Agent Orchestrator',
    backgroundColor: '#111827',
    webPreferences: {
      preload: path.join(_dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: '',
    },
  });

  const isDev = process.env.npm_lifecycle_event === 'dev:electron' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(_dirname, '../../index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    resourceMonitor.setMainWindow(null);
    agentManager.setMainWindow(null);
  });

  resourceMonitor.setMainWindow(mainWindow);
  agentManager.setMainWindow(mainWindow);
}

// ============================================
// IPC Handlers
// ============================================

// Agent Operations
ipcMain.handle(IPC_CHANNELS.SPAWN_AGENT, (_e, opts) => agentManager.spawnAgent(opts));

ipcMain.handle(IPC_CHANNELS.RESIZE_TERMINAL, (_e, id, cols, rows) => {
  if (!agentManager.isValidAgentId(id)) return { success: false, error: 'Invalid ID' };
  return agentManager.resizeTerminal(id, cols as number, rows as number);
});

ipcMain.handle(IPC_CHANNELS.SEND_COMMAND, (_e, id, cmd) => {
  if (!agentManager.isValidAgentId(id)) return { success: false, error: 'Invalid ID' };
  return agentManager.sendCommand(id, cmd as string);
});

ipcMain.handle(IPC_CHANNELS.KILL_AGENT, (_e, id) => {
  if (!agentManager.isValidAgentId(id)) return { success: false, error: 'Invalid ID' };
  return agentManager.killAgent(id);
});

ipcMain.handle(IPC_CHANNELS.PAUSE_AGENT, (_e, id) => {
  if (!agentManager.isValidAgentId(id)) return { success: false, error: 'Invalid ID' };
  return agentManager.pauseAgent(id);
});

ipcMain.handle(IPC_CHANNELS.RESUME_AGENT, (_e, id) => {
  if (!agentManager.isValidAgentId(id)) return { success: false, error: 'Invalid ID' };
  return agentManager.resumeAgent(id);
});

// Broadcast & Tags
ipcMain.handle(IPC_CHANNELS.BROADCAST_COMMAND, (_e, payload) => agentManager.broadcastCommand(payload as BroadcastPayload));

ipcMain.handle(IPC_CHANNELS.SET_AGENT_TAGS, (_e, id, tags) => {
  if (!agentManager.isValidAgentId(id)) return { success: false, error: 'Invalid ID' };
  if (!agentManager.isValidTags(tags)) return { success: false, error: 'Invalid Tags' };
  return { success: agentManager.setTags(id, tags) };
});

ipcMain.handle(IPC_CHANNELS.GET_AGENT_TAGS, (_e, id) => agentManager.getTags(id as string));

// Config & Dialogs
ipcMain.handle(IPC_CHANNELS.RELOAD_CONFIG, () => {
  configLoader.reload();
  return { success: true };
});

ipcMain.handle('dialog:select-folder', async () => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Project Folder',
    buttonLabel: 'Select',
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  return { canceled: false, path: result.filePaths[0] };
});

ipcMain.handle(IPC_CHANNELS.UPDATE_ERROR_COUNT, (_e, count) => {
  if (typeof count !== 'number') return { success: false };
  if (mainWindow && !mainWindow.isDestroyed()) {
    taskbarNotifier.setError(mainWindow, count > 0);
  }
  return { success: true };
});

// Settings & CLI Detection
ipcMain.handle(IPC_CHANNELS.DETECT_CLIS, async () => {
  const settings = settingsManager?.getSettings() ?? null;
  return detectInstalledClis(settings, true);
});

ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
  return settingsManager?.getSettings() ?? {};
});

ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_e, newSettings) => {
  try {
    settingsManager?.saveSettings(newSettings);
    return { success: true };
  } catch {
    return { success: false };
  }
});

// ============================================
// App Lifecycle
// ============================================

app.whenReady().then(() => {
  // Initialize managers that require app to be ready
  settingsManager = new SettingsManager();
  agentManager = new AgentManager(
    configLoader,
    broadcastManager,
    resourceMonitor,
    healthMonitor,
    _dirname,
    settingsManager
  );

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  agentManager.stop();
  resourceMonitor.clear();
  healthMonitor.stop();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  agentManager.stop();
  resourceMonitor.stop();
  healthMonitor.stop();
});
