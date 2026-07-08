export const APP_NAME = 'Codex Grid';
export const APP_VERSION = '1.0.0';

export const DEFAULT_PROXY_PORT = 8787;
export const DEFAULT_GRID_API_URL = 'https://grid.agon.win/api/v1';

export const IPC_CHANNELS = {
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_GET_SESSION: 'auth:getSession',
  SUBSCRIPTION_GET: 'subscription:get',
  USAGE_GET: 'usage:get',
  PROXY_START: 'proxy:start',
  PROXY_STOP: 'proxy:stop',
  PROXY_GET_STATUS: 'proxy:getStatus',
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  APP_CHECK_UPDATE: 'app:checkUpdate',
  APP_OPEN_EXTERNAL: 'app:openExternal',
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
} as const;

export const IPC_EVENTS = {
  PROXY_STATUS_CHANGED: 'proxy-status-changed',
  THEME_CHANGED: 'theme-changed',
  USAGE_UPDATED: 'usage-updated',
} as const;

export const PLANS = {
  free: { name: 'Free', tokensPerMonth: 0 },
  basic: { name: 'Basic', tokensPerMonth: 1_000_000 },
  pro: { name: 'Pro', tokensPerMonth: 10_000_000 },
  enterprise: { name: 'Enterprise', tokensPerMonth: 100_000_000 },
} as const;

export const SUPPORTED_MODELS = [
  { id: 'gpt-5.4', name: 'GPT-5.4', aliases: ['gpt-5-4'] },
  { id: 'gpt-4.1', name: 'GPT-4.1', aliases: [] },
  { id: 'gpt-4o', name: 'GPT-4o', aliases: [] },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', aliases: [] },
  { id: 'claude-opus-4', name: 'Claude Opus 4', aliases: [] },
];

export const USAGE_RANGES = [
  { value: '5h' as const, label: '5 Hours' },
  { value: '24h' as const, label: '24 Hours' },
  { value: '7d' as const, label: '7 Days' },
  { value: '30d' as const, label: '30 Days' },
];
