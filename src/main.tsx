import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { captureCampaign } from './campaign';
import { syncDemoFromHash } from './demo';
import { ErrorBoundary } from './ErrorBoundary';
import './styles.css';

captureCampaign();
syncDemoFromHash();

// Hors connexion et réseau lent : le site s'ouvre et affiche les dernières informations enregistrées.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
