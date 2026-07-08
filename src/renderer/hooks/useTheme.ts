import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ThemeMode } from '../types';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('system');
  const [systemTheme, setSystemTheme] = useState<ThemeMode>('dark');

  // Detect system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    updateSystemTheme();
    mediaQuery.addEventListener('change', updateSystemTheme);
    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, []);

  // Listen for theme changes from main process
  useEffect(() => {
    const unsubscribe = window.ipc.onThemeChanged((newTheme) => {
      // This is the effective theme (dark/light), not the setting
      document.documentElement.setAttribute('data-theme', newTheme);
    });
    return () => unsubscribe();
  }, []);

  // Apply theme
  useEffect(() => {
    const effective = theme === 'system' ? systemTheme : theme;
    document.documentElement.setAttribute('data-theme', effective);
  }, [theme, systemTheme]);

  // Load saved theme
  useEffect(() => {
    window.ipc.getSettings().then((settings) => {
      if (settings.theme) {
        setTheme(settings.theme);
      }
    }).catch(() => {
      // Use default
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.ipc.updateSettings({ theme: next }).catch(() => {});
      return next;
    });
  }, []);

  const effectiveTheme = useMemo<ThemeMode>(() => {
    return theme === 'system' ? systemTheme : theme;
  }, [theme, systemTheme]);

  return {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
  };
}
