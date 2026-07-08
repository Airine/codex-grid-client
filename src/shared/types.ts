export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Session {
  user: User;
  apiKey: string;
  expiresAt: number;
}

export interface Subscription {
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'expired' | 'pending';
  quota: {
    tokensPerMonth: number;
    usedTokens: number;
    remainingTokens: number;
  };
  expiresAt: string;
  renewsAt?: string;
}

export interface UsageDataPoint {
  timestamp: string;
  tokens: number;
  requests: number;
}

export interface UsageData {
  range: string;
  totalRequests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  dataPoints: UsageDataPoint[];
}

export interface ProxyStatus {
  running: boolean;
  url: string;
  port: number;
  uptime: number;
  requestCount: number;
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  language: 'zh-CN' | 'en';
  apiProxyPort: number;
  autoStartProxy: boolean;
  launchOnStartup: boolean;
  gridApiUrl: string;
}

export interface LoginCredentials {
  apiKey: string;
}

export interface ApiProxyConfig {
  port: number;
  upstreamUrl: string;
  apiKey: string;
}

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl: string;
}

export type AppTab = 'dashboard' | 'proxy' | 'settings';

export type ThemeMode = 'dark' | 'light';

export interface IpcApi {
  // Auth
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  getSession: () => Promise<Session | null>;

  // Subscription
  getSubscription: () => Promise<Subscription | null>;

  // Usage
  getUsage: (range: '5h' | '24h' | '7d' | '30d') => Promise<UsageData | null>;

  // Proxy
  startProxy: (config?: { port?: number }) => Promise<{ success: boolean; url?: string; error?: string }>;
  stopProxy: () => Promise<void>;
  getProxyStatus: () => Promise<ProxyStatus>;

  // Settings
  getSettings: () => Promise<Settings>;
  updateSettings: (settings: Partial<Settings>) => Promise<Settings>;

  // App
  checkUpdate: () => Promise<UpdateInfo | null>;
  openExternal: (url: string) => Promise<void>;
  onProxyStatusChanged: (callback: (status: ProxyStatus) => void) => () => void;
  onThemeChanged: (callback: (theme: ThemeMode) => void) => () => void;

  // Store
  getStoreValue: (key: string) => Promise<unknown>;
  setStoreValue: (key: string, value: unknown) => Promise<void>;
}

declare global {
  interface Window {
    ipc: IpcApi;
  }
}
