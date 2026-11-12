import { getConsent, onConsent } from './consent';

/**
 * Test A/B de l'accueil : chaque visiteur reçoit au hasard (moitié-moitié) la version « actuelle » ou « fluide »,
 * et la garde à chaque visite. Les liens ?design=fluide / ?design=actuel forcent une version (démonstration) :
 * ce visiteur-là n'est alors pas compté dans le test.
 */
const AB_KEY = 'ollisante-ab-design';
export const AB_VARIANT: { design: 'fluide' | 'actuel'; counted: boolean } = (() => {
  const asked = new URLSearchParams(window.location.search).get('design');
  try {
    if (asked === 'fluide' || asked === 'actuel') sessionStorage.setItem('ollisante-design', asked);
    const forced = sessionStorage.getItem('ollisante-design');
    if (forced === 'fluide' || forced === 'actuel') return { design: forced, counted: false };
    let v = localStorage.getItem(AB_KEY) as 'fluide' | 'actuel' | null;
    if (v !== 'fluide' && v !== 'actuel') {
      v = Math.random() < 0.5 ? 'fluide' : 'actuel';
      localStorage.setItem(AB_KEY, v);
    }
    return { design: v, counted: true };
  } catch {
    return { design: asked === 'fluide' ? 'fluide' : 'actuel', counted: false };
  }
})();

const AB_SOURCE = `ab-accueil-${AB_VARIANT.design}`;

export type AbKind = 'VISIT' | 'SEARCH' | 'BOOK' | 'SIGNUP';

function consented() {
  return getConsent() === 'accepted';
}

/**
 * Compte un événement pour la version vue (visite, recherche, clic sur un horaire, inscription). Rien de personnel :
 * seulement la version et le type d'événement, et uniquement si le visiteur a accepté la mesure d'audience.
 */
export function abTrack(kind: AbKind) {
  if (!AB_VARIANT.counted || !consented()) return;
  if (kind === 'VISIT' || kind === 'SIGNUP') {
    // une seule visite par passage sur le site ; une seule inscription par appareil
    const store = kind === 'VISIT' ? sessionStorage : localStorage;
    const flag = `ollisante-ab-${kind.toLowerCase()}`;
    try {
      if (store.getItem(flag)) return;
      store.setItem(flag, '1');
    } catch {
      return;
    }
  }
  void fetch('/api/v1/campaign/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: AB_SOURCE, kind }),
    keepalive: true,
  }).catch(() => undefined);
}

/** À l'ouverture du site : compte la visite, tout de suite ou dès que le visiteur accepte la mesure d'audience. */
export function abVisit() {
  if (!AB_VARIANT.counted) return;
  const c = getConsent();
  if (c === 'accepted') abTrack('VISIT');
  else if (c === null) {
    const stop = onConsent((v) => {
      stop();
      if (v === 'accepted') abTrack('VISIT');
    });
  }
}
