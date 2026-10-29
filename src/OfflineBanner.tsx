import { useEffect, useState } from 'react';

/** Bandeau discret quand le téléphone n'a plus de réseau : le site reste utilisable avec les informations enregistrées. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="offline-banner" role="status">
      Hors connexion : vous voyez les dernières informations enregistrées. La réservation reprendra avec le réseau.
    </div>
  );
}
