/**
 * Choix du visiteur sur la mesure anonyme des visites venues des affiches : le site n'utilise sinon que ce qui
 * est indispensable (connexion, pays choisi, fonctionnement hors connexion), sans accord à demander.
 */
const KEY = 'ollisante-consent';
export type Consent = 'accepted' | 'refused';
const listeners = new Set<(c: Consent) => void>();

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'accepted' || v === 'refused' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(c: Consent) {
  try {
    localStorage.setItem(KEY, c);
  } catch {
    // sans stockage, la fenêtre reviendra à la prochaine visite
  }
  listeners.forEach((l) => l(c));
}

export function onConsent(listener: (c: Consent) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
