import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useSettings, useSession } from '../hooks/useStore';
import { useTheme } from '../hooks/useTheme';
import { APP_NAME, APP_VERSION } from '../../shared/constants';
import type { Settings } from '../types';

/* ─── Setting Row ─── */

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-label">{label}</div>
        {description && <div className="setting-description">{description}</div>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

/* ─── Toggle Switch ─── */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`toggle-switch ${checked ? 'toggle-on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <div className="toggle-knob" />
    </button>
  );
}

/* ─── Main Settings Panel ─── */

export function SettingsPanel() {
  const { settings, update } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const { session, refetch: refetchSession } = useSession();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<string | null>(null);

  const handleUpdate = useCallback(
    async (partial: Partial<Settings>) => {
      try {
        await update(partial);
      } catch (err) {
        console.error('[Settings] Update failed:', err);
      }
    },
    [update],
  );

  const handleCheckUpdate = useCallback(async () => {
    setCheckingUpdate(true);
    setUpdateInfo(null);
    try {
      const info = await window.ipc.checkUpdate();
      if (info) {
        setUpdateInfo(`v${info.version} is available!`);
      } else {
        setUpdateInfo('You are up to date.');
      }
    } catch {
      setUpdateInfo('Failed to check for updates.');
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await window.ipc.logout();
    refetchSession();
    window.location.reload();
  }, [refetchSession]);

  if (!settings) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="settings-panel animate-fade-in">
      {/* Appearance */}
      <div className="settings-section">
        <h2 className="settings-section-title">Appearance</h2>
        <div className="settings-group">
          <SettingRow label="Theme" description="Choose your preferred color scheme">
            <div className="segmented-control">
              {(['dark', 'light', 'system'] as const).map((t) => (
                <button
                  key={t}
                  className={`segmented-btn ${settings.theme === t ? 'active' : ''}`}
                  onClick={() => handleUpdate({ theme: t })}
                >
                  {t === 'dark' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  )}
                  {t === 'light' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                    </svg>
                  )}
                  {t === 'system' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  )}
                  <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Language" description="Select your preferred language">
            <select
              className="input"
              value={settings.language}
              onChange={(e) => handleUpdate({ language: e.target.value as 'en' | 'zh-CN' })}
              style={{ width: 'auto', minWidth: 140 }}
            >
              <option value="en">English</option>
              <option value="zh-CN">中文</option>
            </select>
          </SettingRow>
        </div>
      </div>

      {/* Proxy */}
      <div className="settings-section">
        <h2 className="settings-section-title">API Proxy</h2>
        <div className="settings-group">
          <SettingRow label="Proxy Port" description="Local port for the API proxy server">
            <input
              type="number"
              className="input"
              value={settings.apiProxyPort}
              onChange={(e) => handleUpdate({ apiProxyPort: parseInt(e.target.value) || 8787 })}
              style={{ width: 100 }}
              min={1024}
              max={65535}
            />
          </SettingRow>

          <SettingRow label="Auto-start Proxy" description="Automatically start proxy when app launches">
            <ToggleSwitch
              checked={settings.autoStartProxy}
              onChange={(v) => handleUpdate({ autoStartProxy: v })}
            />
          </SettingRow>
        </div>
      </div>

      {/* System */}
      <div className="settings-section">
        <h2 className="settings-section-title">System</h2>
        <div className="settings-group">
          <SettingRow label="Launch on Startup" description="Start app automatically when you log in">
            <ToggleSwitch
              checked={settings.launchOnStartup}
              onChange={(v) => handleUpdate({ launchOnStartup: v })}
            />
          </SettingRow>
        </div>
      </div>

      {/* Updates */}
      <div className="settings-section">
        <h2 className="settings-section-title">Updates</h2>
        <div className="settings-group">
          <SettingRow label="Version" description={`Current: ${APP_VERSION}`}>
            <button className="btn" onClick={handleCheckUpdate} disabled={checkingUpdate}>
              {checkingUpdate ? (
                <>
                  <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                  Checking...
                </>
              ) : (
                'Check for Updates'
              )}
            </button>
          </SettingRow>
          {updateInfo && (
            <div style={{ padding: '8px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              {updateInfo}
            </div>
          )}
        </div>
      </div>

      {/* About */}
      <div className="settings-section">
        <h2 className="settings-section-title">About</h2>
        <div className="settings-group">
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {APP_NAME} v{APP_VERSION}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              A pure, focused Codex subscription client for Neurasea Grid.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-sm"
                onClick={() => window.ipc.openExternal('https://grid.agon.win')}
              >
                Website
              </button>
              <button
                className="btn btn-sm"
                onClick={() => window.ipc.openExternal('https://github.com/Airine/codex-grid-client')}
              >
                GitHub
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account */}
      {session && (
        <div className="settings-section">
          <h2 className="settings-section-title">Account</h2>
          <div className="settings-group">
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Signed in as <strong style={{ color: 'var(--text-primary)' }}>{session.user.email}</strong>
              </div>
              <button className="btn btn-danger btn-sm" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
