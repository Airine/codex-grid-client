import { useState, useCallback, useEffect } from 'react';
import { useProxyStatus } from '../hooks/useStore';
import type { ReactNode } from 'react';

/* ─── Inline Code Block ─── */
function CodeBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
    }
  }, [text]);

  return (
    <div style={{ marginBottom: '12px' }}>
      {label && (
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', borderRadius: '6px', padding: '8px 12px' }}>
        <code className="font-mono" style={{ flex: 1, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }}>
          {text}
        </code>
        <button className="btn btn-ghost btn-icon" onClick={handleCopy} style={{ flexShrink: 0 }} title="Copy">
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Instruction Step ─── */
function InstructionStep({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>
        {number}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

/* ─── Main API Proxy Panel ─── */
export function ApiProxyPanel() {
  const { status, refetch } = useProxyStatus();
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Format uptime
  const [uptimeDisplay, setUptimeDisplay] = useState('0s');
  useEffect(() => {
    if (!status?.running) {
      setUptimeDisplay('0s');
      return;
    }
    const interval = setInterval(() => {
      const totalSeconds = Math.floor(status.uptime / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (hours > 0) setUptimeDisplay(`${hours}h ${minutes}m ${seconds}s`);
      else if (minutes > 0) setUptimeDisplay(`${minutes}m ${seconds}s`);
      else setUptimeDisplay(`${seconds}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [status?.running, status?.uptime]);

  const handleToggle = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      if (status?.running) {
        await window.ipc.stopProxy();
      } else {
        const result = await window.ipc.startProxy();
        if (!result.success) setActionError(result.error || 'Failed to start proxy');
      }
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [status?.running, refetch]);

  const proxyUrl = status?.url || 'http://127.0.0.1:8787/v1';

  return (
    <div className="animate-fade-in proxy-panel">
      <div className="proxy-header">
        <h1>API Proxy</h1>
        <p>Local OpenAI-compatible API proxy for your applications</p>
      </div>

      {/* Status Card */}
      <div className="card proxy-status-card">
        <div className="proxy-status-header">
          <div className="proxy-status-indicator">
            <div className={`status-dot ${status?.running ? 'status-dot-running' : 'status-dot-stopped'}`} />
            <span>{status?.running ? 'Proxy Running' : 'Proxy Stopped'}</span>
            {status?.running && <span className="badge badge-success">Active</span>}
          </div>
          <button className={`btn ${status?.running ? 'btn-danger' : 'btn-primary'}`} onClick={handleToggle} disabled={loading} style={{ minWidth: 100 }}>
            {loading ? (
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
            ) : status?.running ? (
              <>Stop</>
            ) : (
              <>Start</>
            )}
          </button>
        </div>

        {actionError && (
          <div className="alert alert-danger">{actionError}</div>
        )}

        {status?.running && (
          <div className="proxy-details-grid animate-fade-in">
            <div>
              <div className="proxy-detail-label">Proxy URL</div>
              <div className="proxy-detail-value font-mono">{proxyUrl}</div>
            </div>
            <div>
              <div className="proxy-detail-label">Port</div>
              <div className="proxy-detail-value font-mono">{status.port}</div>
            </div>
            <div>
              <div className="proxy-detail-label">Uptime</div>
              <div className="proxy-detail-value">{uptimeDisplay}</div>
            </div>
            <div>
              <div className="proxy-detail-label">Requests</div>
              <div className="proxy-detail-value">{status.requestCount.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      {status?.running && (
        <div className="card proxy-setup-card animate-fade-in">
          <h2 className="proxy-section-title">Setup Instructions</h2>

          <CodeBlock text={proxyUrl} label="Base URL" />
          <CodeBlock text="sk-grid-your-api-key" label="API Key" />

          <div style={{ marginTop: '20px' }}>
            <InstructionStep number={1} title="Cursor">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Go to Settings &gt; Models and add a custom OpenAI-compatible provider:
              </p>
              <CodeBlock text={`Base URL: ${proxyUrl}\nAPI Key: sk-grid-your-api-key\nModel: gpt-5.4`} />
            </InstructionStep>

            <InstructionStep number={2} title="ChatWise">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Add a custom OpenAI provider with these settings:
              </p>
              <CodeBlock text={`${proxyUrl}`} label="API Host" />
            </InstructionStep>

            <InstructionStep number={3} title="OpenAI SDK / curl">
              <CodeBlock text={`curl ${proxyUrl}/chat/completions \\\
  -H "Authorization: Bearer sk-grid-your-api-key" \\\
  -H "Content-Type: application/json" \\\
  -d '{"model": "gpt-5.4", "messages": [{"role": "user", "content": "Hello"}]}'`} />
            </InstructionStep>

            <InstructionStep number={4} title="Environment Variables">
              <CodeBlock text={`export OPENAI_BASE_URL="${proxyUrl}"\nexport OPENAI_API_KEY="sk-grid-your-api-key"`} />
            </InstructionStep>
          </div>
        </div>
      )}
    </div>
  );
}
