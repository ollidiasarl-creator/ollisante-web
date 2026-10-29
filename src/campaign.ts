/**
 * Affiches (test A/B) : le QR code ouvre le site avec ?src=<profil>-<version> (ex. medecin-a). On compte le scan,
 * on garde la source sur l'appareil, puis on compte l'inscription si elle a lieu. Aucune donnée personnelle.
 */
const KEY = 'ollisante-src';
const SOURCE = /^[a-z0-9-]{1,40}$/;

export type CampaignProfile = 'patient' | 'medecin' | 'structure';

function send(source: string, kind: 'VISIT' | 'SIGNUP') {
  void fetch('/api/v1/campaign/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, kind }),
    keepalive: true,
  }).catch(() => undefined);
}

function stored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** À l'ouverture du site : lit la source du QR code, compte le scan et la retire de l'adresse. */
export function captureCampaign() {
  const params = new URLSearchParams(window.location.search);
  const src = params.get('src')?.toLowerCase() ?? '';
  if (!SOURCE.test(src)) return;
  send(src, 'VISIT');
  try {
    localStorage.setItem(KEY, src);
  } catch {
    // sans stockage, l'inscription ne sera simplement pas attribuée
  }
  // Version B de l'affiche structure : l'inscription des structures est sur l'espace Structure.
  if (params.get('vers') === 'structure') {
    window.location.replace('/structure/#inscription');
    return;
  }
  params.delete('src');
  const rest = params.toString();
  window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);
}

/** Profil visé par l'affiche scannée (pour l'accueil personnalisé), ou null. */
export function campaignProfile(): CampaignProfile | null {
  const p = stored()?.split('-')[0];
  return p === 'patient' || p === 'medecin' || p === 'structure' ? p : null;
}

/** Une inscription vient d'aboutir : on l'attribue à l'affiche scannée (une seule fois). */
export function campaignSignup() {
  const src = stored();
  if (!src) return;
  send(src, 'SIGNUP');
  try {
    localStorage.removeItem(KEY);
  } catch {
    // rien
  }
}
