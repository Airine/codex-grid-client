import { useState, useEffect, useCallback } from 'react';
import type { Session, Subscription, UsageData, ProxyStatus, Settings } from '../types';

/* ─── Generic IPC call hook ─── */

function useIpcCall<T, A extends unknown[] = []>(
  fetcher: (...args: A) => Promise<T>,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (...args: A) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher(...args);
      setData(result);
      return result;
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      console.error('[useIpcCall]', msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  return { data, loading, error, refetch };
}

/* ─── Session ─── */

export function useSession() {
  const { data, loading, refetch } = useIpcCall<Session | null>(window.ipc.getSession);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    session: data,
    loading,
    refetch,
  };
}

/* ─── Subscription ─── */

export function useSubscription() {
  const { data, loading, refetch } = useIpcCall<Subscription | null>(window.ipc.getSubscription);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    subscription: data,
    loading,
    refetch,
  };
}

/* ─── Usage ─── */

export function useUsage(initialRange: '5h' | '24h' | '7d' | '30d' = '24h') {
  const [range, setRange] = useState(initialRange);
  const { data, loading, refetch } = useIpcCall<UsageData | null, ['5h' | '24h' | '7d' | '30d']>(window.ipc.getUsage);

  useEffect(() => {
    refetch(range);
  }, [range, refetch]);

  return {
    usage: data,
    range,
    setRange,
    loading,
    refetch: () => refetch(range),
  };
}

/* ─── Proxy Status ─── */

export function useProxyStatus() {
  const { data, loading, refetch } = useIpcCall<ProxyStatus>(window.ipc.getProxyStatus);

  useEffect(() => {
    refetch();

    // Listen for proxy status changes
    const unsubscribe = window.ipc.onProxyStatusChanged((status) => {
      // Refresh status from main process
      refetch();
    });

    return () => {
      unsubscribe();
    };
  }, [refetch]);

  return {
    status: data,
    loading,
    refetch,
  };
}

/* ─── Settings ─── */

export function useSettings() {
  const { data, loading, refetch } = useIpcCall<Settings>(window.ipc.getSettings);

  const update = useCallback(async (partial: Partial<Settings>) => {
    try {
      const updated = await window.ipc.updateSettings(partial);
      refetch();
      return updated;
    } catch (err) {
      console.error('[useSettings] Update failed:', (err as Error).message);
      throw err;
    }
  }, [refetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    settings: data,
    loading,
    update,
    refetch,
  };
}
