import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { errorText, session } from './api';

/** Charge une donnée (et permet de la recharger après une action). */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await load());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, loading, reload };
}

/** Patient connecté sur cet ordinateur (mis à jour à la connexion et à la déconnexion). */
export function useSession() {
  return useSyncExternalStore(session.subscribe, () => localStorageRaw(), () => null) ? session.load() : null;
}

function localStorageRaw(): string | null {
  try {
    return localStorage.getItem('ollisante-site-session');
  } catch {
    return null;
  }
}
