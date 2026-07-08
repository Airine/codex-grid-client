import { useState, useMemo } from 'react';
import { useSubscription, useUsage } from '../hooks/useStore';
import { PLANS } from '../../shared/constants';
import type { UsageDataPoint } from '../types';

/* ─── Inline Line Chart ─── */

function LineChart({ data, width = 600, height = 200 }: { data: UsageDataPoint[]; width?: number; height?: number }) {
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxTokens = Math.max(...data.map((d) => d.tokens), 1);
  const maxRequests = Math.max(...data.map((d) => d.requests), 1);

  const xScale = (i: number) => padding.left + (i / (data.length - 1)) * chartWidth;
  const yScaleTokens = (v: number) => padding.top + chartHeight - (v / maxTokens) * chartHeight;
  const yScaleRequests = (v: number) => padding.top + chartHeight - (v / maxRequests) * chartHeight;

  const tokenLine = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScaleTokens(d.tokens)}`)
    .join(' ');

  const requestLine = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScaleRequests(d.requests)}`)
    .join(' ');

  const tokenArea = `${tokenLine} L ${xScale(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  // Format time labels
  const timeLabels = data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1);
  const labelIndices = timeLabels.map((_, i) => {
    const actualIndex = i * Math.ceil(data.length / 6);
    return Math.min(actualIndex, data.length - 1);
  });

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <line
          key={tick}
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - tick)}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight * (1 - tick)}
          stroke="var(--border-primary)"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.5"
        />
      ))}

      {/* Token area fill */}
      <path d={tokenArea} fill="var(--accent-primary)" opacity="0.08" />

      {/* Token line */}
      <path d={tokenLine} fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Request line */}
      <path d={requestLine} fill="none" stroke="var(--accent-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />

      {/* Data points */}
      {data.map((d, i) => (
        <circle key={`t-${i}`} cx={xScale(i)} cy={yScaleTokens(d.tokens)} r="3" fill="var(--accent-primary)" opacity="0.8" />
      ))}

      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const value = Math.round(maxTokens * tick);
        return (
          <text
            key={`y-${tick}`}
            x={padding.left - 10}
            y={padding.top + chartHeight * (1 - tick) + 4}
            textAnchor="end"
            fill="var(--text-tertiary)"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            {value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
          </text>
        );
      })}

      {/* X-axis labels */}
      {labelIndices.map((idx) => {
        const d = data[idx];
        if (!d) return null;
        const date = new Date(d.timestamp);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return (
          <text
            key={`x-${idx}`}
            x={xScale(idx)}
            y={height - 8}
            textAnchor="middle"
            fill="var(--text-tertiary)"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            {label}
          </text>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${width - 140}, 10)`}>
        <circle cx="0" cy="6" r="4" fill="var(--accent-primary)" />
        <text x="10" y="10" fill="var(--text-secondary)" fontSize="11">Tokens</text>
        <circle cx="70" cy="6" r="4" fill="var(--accent-success)" />
        <text x="80" y="10" fill="var(--text-secondary)" fontSize="11">Requests</text>
      </g>
    </svg>
  );
}

/* ─── Stat Card ─── */

function StatCard({ label, value, subtext, accent }: { label: string; value: string; subtext: string; accent?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: `var(--accent-${accent})` } : undefined}>
        {value}
      </div>
      <div className="stat-subtext">{subtext}</div>
    </div>
  );
}

/* ─── Usage Warning ─── */

function UsageWarning({ used, total }: { used: number; total: number }) {
  const percent = total > 0 ? (used / total) * 100 : 0;

  if (percent < 80) return null;

  return (
    <div className={`alert ${percent >= 95 ? 'alert-danger' : 'alert-warning'}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      {percent >= 95
        ? `Critical: You've used ${percent.toFixed(0)}% of your monthly quota!`
        : `Warning: You've used ${percent.toFixed(0)}% of your monthly quota.`}
    </div>
  );
}

/* ─── Main View ─── */

export function DashboardView() {
  const { subscription, loading: subLoading } = useSubscription();
  const { usage, range, setRange, loading: usageLoading } = useUsage('24h');

  const usagePercent = useMemo(() => {
    if (!subscription) return 0;
    return subscription.quota.tokensPerMonth > 0
      ? (subscription.quota.usedTokens / subscription.quota.tokensPerMonth) * 100
      : 0;
  }, [subscription]);

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toString();
  };

  const ranges = [
    { value: '5h' as const, label: '5H' },
    { value: '24h' as const, label: '24H' },
    { value: '7d' as const, label: '7D' },
    { value: '30d' as const, label: '30D' },
  ];

  if (subLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard-view">
      {/* Subscription Card */}
      {subscription && (
        <div className="dashboard-section">
          <div className="card subscription-card">
            <div className="subscription-header">
              <div>
                <h2 className="subscription-plan">
                  {PLANS[subscription.plan]?.name || subscription.plan}
                  <span className={`badge badge-${subscription.status === 'active' ? 'success' : subscription.status === 'expired' ? 'danger' : 'warning'}`}>
                    {subscription.status}
                  </span>
                </h2>
                <p className="subscription-expiry">
                  Expires {new Date(subscription.expiresAt).toLocaleDateString()}
                  {subscription.renewsAt && ` · Renews ${new Date(subscription.renewsAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>

            <div className="quota-section">
              <div className="quota-header">
                <span>Monthly Quota</span>
                <span className="quota-percent">{usagePercent.toFixed(1)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-bar-fill ${usagePercent >= 95 ? 'progress-bar-fill-danger' : usagePercent >= 80 ? 'progress-bar-fill-warning' : ''}`}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <div className="quota-stats">
                <span>{formatNumber(subscription.quota.usedTokens)} used</span>
                <span>{formatNumber(subscription.quota.remainingTokens)} remaining</span>
              </div>
            </div>

            <UsageWarning used={subscription.quota.usedTokens} total={subscription.quota.tokensPerMonth} />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {usage && (
        <div className="dashboard-section">
          <div className="stats-grid">
            <StatCard
              label="Total Requests"
              value={formatNumber(usage.totalRequests)}
              subtext={`In ${usage.range}`}
            />
            <StatCard
              label="Total Tokens"
              value={formatNumber(usage.totalTokens)}
              subtext={`In ${usage.range}`}
              accent="primary"
            />
            <StatCard
              label="Input Tokens"
              value={formatNumber(usage.inputTokens)}
              subtext="Tokens sent to API"
              accent="success"
            />
            <StatCard
              label="Output Tokens"
              value={formatNumber(usage.outputTokens)}
              subtext="Tokens received from API"
              accent="warning"
            />
          </div>
        </div>
      )}

      {/* Usage Chart */}
      <div className="dashboard-section chart-section">
        <div className="card chart-card">
          <div className="chart-header">
            <h3>Usage Trend</h3>
            <div className="range-selector">
              {ranges.map((r) => (
                <button
                  key={r.value}
                  className={`range-btn ${range === r.value ? 'active' : ''}`}
                  onClick={() => setRange(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {usageLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <div className="spinner" />
            </div>
          ) : usage && usage.dataPoints.length > 0 ? (
            <div className="chart-container">
              <LineChart data={usage.dataPoints} />
            </div>
          ) : (
            <div className="chart-empty">No usage data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
