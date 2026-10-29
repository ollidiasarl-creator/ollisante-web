import { useEffect, useState } from 'react';

/** Navigation par l'adresse (#/medecin/…) : le serveur n'a qu'une page à servir, et les liens restent partageables. */
export interface Route {
  path: string[];
  query: URLSearchParams;
}

function current(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [p, qs] = raw.split('?');
  return { path: p ? p.split('/').map(decodeURIComponent) : [], query: new URLSearchParams(qs ?? '') };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const on = () => {
      setRoute(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function href(path: string, query?: Record<string, string | undefined>): string {
  const qs = query
    ? Object.entries(query).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&')
    : '';
  return `#/${path}${qs ? `?${qs}` : ''}`;
}

export function go(path: string, query?: Record<string, string | undefined>) {
  window.location.hash = href(path, query);
}
