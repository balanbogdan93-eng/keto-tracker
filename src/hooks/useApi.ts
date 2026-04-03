import { useState, useCallback } from 'react';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async <T>(
    url: string,
    options?: RequestInit
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data as T;
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
}
