import { useState, useEffect, useCallback } from 'react';
import { useSession } from './hooks/useStore';
import { useTheme } from './hooks/useTheme';
import { LoginView } from './components/LoginView';
import { AppTopBar } from './components/AppTopBar';
import { DashboardView } from './components/DashboardView';
import { ApiProxyPanel } from './components/ApiProxyPanel';
import { SettingsPanel } from './components/SettingsPanel';
import type { AppTab } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const { session, loading: sessionLoading, refetch: refetchSession } = useSession();
  const { effectiveTheme, toggleTheme } = useTheme();
  const [initializing, setInitializing] = useState(true);

  // Check session on mount with a small delay to avoid flash
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitializing(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    refetchSession();
  }, [refetchSession]);

  const handleRefresh = useCallback(() => {
    refetchSession();
    window.location.reload();
  }, [refetchSession]);

  // Show loading spinner while checking session
  if (initializing || sessionLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: 'var(--bg-primary)',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-primary), #1f6feb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(47, 129, 247, 0.3)',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
          }}
        >
          <div className="spinner" />
          Loading...
        </div>
      </div>
    );
  }

  // Show login view if not authenticated
  if (!session) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Render main app
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {/* Top Navigation Bar */}
      <AppTopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName={session.user.name}
        userAvatar={session.user.avatar}
        theme={effectiveTheme}
        onToggleTheme={toggleTheme}
        onRefresh={handleRefresh}
      />

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'proxy' && <ApiProxyPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
}
