/**
 * Store Module — electron-store wrapper for data persistence
 * Manages session, settings, and usage cache.
 */
import Store from 'electron-store';
import type { Session, Settings, UsageData } from '../shared/types';
import {
  DEFAULT_PROXY_PORT,
  DEFAULT_GRID_API_URL,
} from '../shared/constants';

interface StoreSchema {
  session: Session | null;
  settings: Settings;
  usageCache: Record<string, UsageData>;
}

const defaults: StoreSchema = {
  session: null,
  settings: {
    theme: 'system',
    language: 'en',
    apiProxyPort: DEFAULT_PROXY_PORT,
    autoStartProxy: false,
    launchOnStartup: false,
    gridApiUrl: DEFAULT_GRID_API_URL,
  },
  usageCache: {},
};

const store = new Store<StoreSchema>({
  name: 'codex-grid-client',
  defaults,
});

/* ── Session ── */

export function getSession(): Session | null {
  return store.get('session');
}

export function setSession(session: Session): void {
  store.set('session', session);
}

export function clearSession(): void {
  store.set('session', null);
}

/* ── Settings ── */

export function getSettings(): Settings {
  return store.get('settings');
}

export function updateSettings(partial: Partial<Settings>): Settings {
  const current = store.get('settings');
  const updated = { ...current, ...partial };
  store.set('settings', updated);
  return updated;
}

/* ── Usage Cache ── */

export function getUsageCache(): Record<string, UsageData> {
  return store.get('usageCache');
}

export function setUsageCache(cache: Record<string, UsageData>): void {
  store.set('usageCache', cache);
}

/* ── Generic store access ── */

export function getStoreValue(key: string): unknown {
  return store.get(key as keyof StoreSchema);
}

export function setStoreValue(key: string, value: unknown): void {
  store.set(key as keyof StoreSchema, value as StoreSchema[keyof StoreSchema]);
}

export { store };
