import { useEffect, useRef, useState } from 'react';
import newEmblem from './logo-mark.svg';

/**
 * Vitrine (réservation, comptes et tarifs remplacés par « Ollisanté ouvre bientôt ») : désactivée, le site complet
 * est ouvert sur ollisante.com comme sur l'adresse de test. « ?vitrine » permet encore de la prévisualiser.
 */
export const SHOWCASE = new URLSearchParams(window.location.search).has('vitrine');

/** Adresses des fiches de l'application dans les magasins (identifiants iOS et Android de l'application Ollisanté). */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6822455067';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.ollisante.app';

/** Logo « L'accueil » (validé le 9 novembre 2026) : le cercle ouvert et le point doré font le « O » d'Ollisanté. */
export const NEW_LOGO = true;
const emblem = newEmblem;
// Couleurs claires du nouveau logo (moins de vert foncé), appliquées à tout le site.
document.documentElement.classList.add('logo-c');

/** Version « fond blanc » (validée le 9 novembre 2026), appliquée à tout le site. L'ancienne version : archives/couleurs-vert-pale-2026-11. */
export const WHITE_DEMO = true;
if (WHITE_DEMO) document.documentElement.classList.add('theme-blanc');

/** Version « images » (photos santé, validée le 12 novembre 2026), appliquée à tout le site. Version d'avant : tag git avant-images-partout. */
export const IMAGES_DEMO = true;

/**
 * Démo « site fluide » : visible seulement avec ollisante.com/?design=fluide (mémorisé le temps de la visite) ;
 * « ?design=actuel » revient à la version en ligne. Les autres visiteurs ne voient aucun changement.
 */
export const DESIGN_DEMO = (() => {
  const asked = new URLSearchParams(window.location.search).get('design');
  try {
    if (asked === 'fluide') sessionStorage.setItem('ollisante-design', 'fluide');
    if (asked === 'actuel') sessionStorage.removeItem('ollisante-design');
    return sessionStorage.getItem('ollisante-design') === 'fluide';
  } catch {
    return asked === 'fluide';
  }
})();
if (DESIGN_DEMO) {
  document.documentElement.classList.add('design-fluide');
  // Apparition douce des sections au défilement (désactivée si l'utilisateur limite les animations).
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!calm && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-reveal');
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    const scan = () => document.querySelectorAll('.reveal').forEach((el) => {
      if (!seen.has(el)) { seen.add(el); io.observe(el); }
    });
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('DOMContentLoaded', scan);
  }
}

/** Signature visuelle : le O à la carte de l'Afrique (ou, en démo, le cercle ouvert et le point doré). */
export function Emblem({ size = 40, id }: { size?: number; id?: string }) {
  return <img id={id} src={emblem} alt="" width={size} height={size} className={NEW_LOGO ? 'emblem emblem-c' : 'emblem'} />;
}

/** Le nom : en démo du nouveau logo, « Olli » en bleu nuit et « santé » en vert. */
export function Wordmark() {
  if (!NEW_LOGO) return <span>Ollisanté</span>;
  // Le cercle (Emblem, juste avant) fait office de « O » : le nom continue avec « llisanté ».
  return <span className="wordmark" aria-hidden="true"><span className="wm-olli">lli</span><span className="wm-sante">santé</span></span>;
}

// ---------- Pays choisi (mémorisé dans le navigateur, partagé entre l'en-tête et les pages) ----------
const COUNTRY_KEY = 'ollisante.country';
const listeners = new Set<(c: string) => void>();

function readCountry(): string {
  try {
    return localStorage.getItem(COUNTRY_KEY) ?? '';
  } catch {
    return '';
  }
}

export function useCountry(): [string, (code: string) => void] {
  const [country, setCountry] = useState(readCountry);
  useEffect(() => {
    listeners.add(setCountry);
    return () => {
      listeners.delete(setCountry);
    };
  }, []);
  const set = (code: string) => {
    try {
      localStorage.setItem(COUNTRY_KEY, code);
    } catch {
      // préférence non critique
    }
    listeners.forEach((l) => l(code));
  };
  return [country, set];
}

// ---------- Pays du compte connecté : tout le site se limite à ce pays ----------
let lockedCountry: string | null = null;
const lockListeners = new Set<(c: string | null) => void>();

/** Appelé à la connexion (pays du compte) et à la déconnexion (null). */
export function setLockedCountry(code: string | null) {
  lockedCountry = code;
  lockListeners.forEach((l) => l(code));
}

/** Pays imposé par le compte connecté, ou null (visiteur, ou pays pas encore connu). */
export function useLockedCountry(): string | null {
  const [code, setCode] = useState(lockedCountry);
  useEffect(() => {
    lockListeners.add(setCode);
    return () => {
      lockListeners.delete(setCode);
    };
  }, []);
  return code;
}

// ---------- Boutons de téléchargement ----------
function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path fill="currentColor" d="M16.37 12.6c-.02-2.3 1.88-3.4 1.97-3.46-1.07-1.57-2.74-1.78-3.33-1.8-1.42-.14-2.77.83-3.49.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.94 1.16 9.21.77 1.11 1.68 2.36 2.88 2.31 1.16-.05 1.59-.75 2.99-.75 1.39 0 1.79.75 3.01.72 1.24-.02 2.03-1.13 2.79-2.25.88-1.29 1.24-2.53 1.26-2.6-.03-.01-2.42-.93-2.45-3.71zM14.08 5.85c.64-.77 1.07-1.85.95-2.92-.92.04-2.03.61-2.69 1.38-.59.68-1.11 1.77-.97 2.82 1.02.08 2.07-.52 2.71-1.28z" />
    </svg>
  );
}

function PlayLogo() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path fill="#4285F4" d="M3.6 2.2 13.4 12l-9.8 9.8c-.3-.2-.5-.6-.5-1.1V3.3c0-.5.2-.9.5-1.1Z" />
      <path fill="#34A853" d="M3.6 2.2c.3-.2.8-.2 1.2 0l12.1 7.6-3.5 2.2Z" />
      <path fill="#EA4335" d="M3.6 21.8 13.4 12l3.5 2.2-12.1 7.6c-.4.2-.9.2-1.2 0Z" />
      <path fill="#FBBC04" d="m16.9 9.8 3.4 2c.6.4.6 1 0 1.4l-3.4 2L13.4 12Z" />
    </svg>
  );
}

/** « Télécharger dans l'App Store » et « Disponible sur Google Play » (« Bientôt sur… » tant que la vitrine est active). */
export function StoreBadges() {
  if (SHOWCASE) {
    return (
      <div className="stores">
        <span className="store soon"><AppleLogo /><span><small>Bientôt sur</small>l’App Store</span></span>
        <span className="store soon"><PlayLogo /><span><small>Bientôt sur</small>Google Play</span></span>
      </div>
    );
  }
  return (
    <div className="stores">
      <a className="store" href={APP_STORE_URL} target="_blank" rel="noreferrer" aria-label="Télécharger Ollisanté dans l’App Store">
        <AppleLogo />
        <span><small>Télécharger dans</small>l’App Store</span>
      </a>
      <a className="store" href={PLAY_STORE_URL} target="_blank" rel="noreferrer" aria-label="Télécharger Ollisanté sur Google Play">
        <PlayLogo />
        <span><small>Disponible sur</small>Google Play</span>
      </a>
    </div>
  );
}

// ---------- Ouverture : l'emblème glisse du centre de l'écran jusqu'à l'en-tête ----------
const SPLASH_KEY = 'ollisante.splash';

function alreadyShown(): boolean {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    return sessionStorage.getItem(SPLASH_KEY) === '1';
  } catch {
    return true;
  }
}

/** Comme dans l'application, une fois par visite. `targetId` : l'emblème de l'en-tête, où l'animation se termine. */
export function OpeningSplash({ targetId }: { targetId: string }) {
  const [phase, setPhase] = useState<'center' | 'moving' | 'done'>(() => (alreadyShown() ? 'done' : 'center'));
  const [transform, setTransform] = useState('none');
  const mark = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (phase !== 'center') return;
    try {
      sessionStorage.setItem(SPLASH_KEY, '1');
    } catch {
      // sans mémoire de session, l'animation sera rejouée : sans gravité
    }
    const timer = window.setTimeout(() => {
      const target = document.getElementById(targetId)?.getBoundingClientRect();
      const from = mark.current?.getBoundingClientRect();
      if (target && from) {
        const dx = target.left + target.width / 2 - (from.left + from.width / 2);
        const dy = target.top + target.height / 2 - (from.top + from.height / 2);
        setTransform(`translate(${dx}px, ${dy}px) scale(${target.width / from.width})`);
      }
      setPhase('moving');
    }, 900);
    return () => window.clearTimeout(timer);
  }, [phase, targetId]);

  if (phase === 'done') return null;
  return (
    <div className={`splash ${phase}`} aria-hidden="true">
      <img
        ref={mark}
        src={emblem}
        alt=""
        className={NEW_LOGO ? 'splash-mark splash-c' : 'splash-mark'}
        style={{ transform }}
        onTransitionEnd={() => setPhase('done')}
      />
    </div>
  );
}
