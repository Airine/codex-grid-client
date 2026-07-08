/**
 * Electron Preload Script
 *
 * Securely bridges main process and renderer process via contextBridge.
 * Exposes a typed `window.ipc` API for the renderer to safely interact
 * with the main process without direct access to Node.js or ipcRenderer.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { IpcApi } from '../shared/types';

/**
 * The IPC API exposed to the renderer process via window.ipc.
 *
 * Security rules:
 * - Only expose specific, pre-defined channels.
 * - Never expose ipcRenderer.send/invoke/on directly.
 * - Event listeners return an unsubscribe function.
 */
const ipcApi: IpcApi = {
  // ─── Auth ───────────────────────────────────────────────────────────
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getSession: () => ipcRenderer.invoke('auth:getSession'),

  // ─── Subscription ───────────────────────────────────────────────────
  getSubscription: () => ipcRenderer.invoke('subscription:get'),

  // ─── Usage ──────────────────────────────────────────────────────────
  getUsage: (range) => ipcRenderer.invoke('usage:get', range),

  // ─── Proxy ──────────────────────────────────────────────────────────
  startProxy: (config) => ipcRenderer.invoke('proxy:start', config),
  stopProxy: () => ipcRenderer.invoke('proxy:stop'),
  getProxyStatus: () => ipcRenderer.invoke('proxy:getStatus'),

  // ─── Settings ───────────────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),

  // ─── App ────────────────────────────────────────────────────────────
  checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),

  // ─── Events ─────────────────────────────────────────────────────────
  onProxyStatusChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, status: Parameters<IpcApi['onProxyStatusChanged']>[0] extends (arg: infer A) => void ? A : never) => {
      callback(status);
    };
    ipcRenderer.on('proxy-status-changed', listener);
    return () => ipcRenderer.removeListener('proxy-status-changed', listener);
  },

  onThemeChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, theme: Parameters<IpcApi['onThemeChanged']>[0] extends (arg: infer A) => void ? A : never) => {
      callback(theme);
    };
    ipcRenderer.on('theme-changed', listener);
    return () => ipcRenderer.removeListener('theme-changed', listener);
  },

  // ─── Store ──────────────────────────────────────────────────────────
  getStoreValue: (key) => ipcRenderer.invoke('store:get', key),
  setStoreValue: (key, value) => ipcRenderer.invoke('store:set', key, value),
};

// Expose the typed API to the renderer process under `window.ipc`
contextBridge.exposeInMainWorld('ipc', ipcApi);
