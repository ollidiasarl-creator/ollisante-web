/**
 * Démo « parcours patient » (à valider) : visible seulement dans le navigateur qui a ouvert #/demo (#/demo-off pour
 * revenir). Rien ne change pour les autres visiteurs.
 */
const KEY = 'ollisante-demo-patient';

export function syncDemoFromHash() {
  try {
    if (window.location.hash.startsWith('#/demo-off')) localStorage.removeItem(KEY);
    else if (window.location.hash.startsWith('#/demo')) localStorage.setItem(KEY, '1');
  } catch {
    // sans stockage, la démo ne s'active pas
  }
}

export function isDemo(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
