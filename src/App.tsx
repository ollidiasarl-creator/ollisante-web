import { useEffect, useRef, useState } from 'react';
import { PROFILE_EVENT, Profile, getAppConfig, getProfile, logout, profileName, updateProfile } from './api';
import { Emblem, OpeningSplash, SHOWCASE, StoreBadges, setLockedCountry, useCountry, useLockedCountry } from './brand';
import { useCountries } from './components';
import { flag } from './format';
import { FooterHelp } from './HelpMenu';
import { useLoad, useSession } from './hooks';
import Account from './pages/Account';
import AppDownload from './pages/AppDownload';
import Book from './pages/Book';
import ComingSoon from './pages/ComingSoon';
import Connexion from './pages/Connexion';
import Emergency from './pages/Emergency';
import FacilityPage from './pages/FacilityPage';
import Faq from './pages/Faq';
import Home from './pages/Home';
import PractitionerPage from './pages/PractitionerPage';
import Prices from './pages/Prices';
import Triage from './pages/Triage';
import Results from './pages/Results';
import PatientChoice from './pages/PatientChoice';
import Structures from './pages/Structures';
import { CountryGate, askProfile } from './CountryGate';
import { OfflineBanner } from './OfflineBanner';
import { HelpBubble } from './HelpBubble';
import { ConsentDialog } from './ConsentDialog';
import ProInfo from './pages/ProInfo';
import Search from './pages/Search';
import Availability from './pages/Availability';
import { go, href, useRoute } from './router';

/** Site public Ollisanté : recherche, fiches des professionnels et des structures, réservation, espace patient. */
export default function App() {
  const route = useRoute();
  const user = useSession();
  const config = useLoad(getAppConfig, []);
  const countries = useCountries();
  const [country, setCountry] = useCountry();
  const locked = useLockedCountry();
  const [askCountry, setAskCountry] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  useEffect(() => {
    const onProfile = (e: Event) => setDisplayName(profileName((e as CustomEvent<Profile>).detail));
    window.addEventListener(PROFILE_EVENT, onProfile);
    return () => window.removeEventListener(PROFILE_EVENT, onProfile);
  }, []);
  // Connexion : le pays du compte s'impose partout (recherche, tarifs, actualités) ; s'il est inconnu, on le demande.
  useEffect(() => {
    if (!user) {
      setLockedCountry(null);
      setAskCountry(false);
      setDisplayName(null);
      return;
    }
    getProfile()
      .then((p) => {
        setDisplayName(profileName(p));
        if (p.countryCode) {
          setLockedCountry(p.countryCode);
          setCountry(p.countryCode);
        } else if (p.role === 'PATIENT') setAskCountry(true);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user.id]);
  const current = countries.find((c) => c.code === (locked ?? country));
  const whatsapp = config.data?.whatsappNumber?.replace(/\D/g, '');
  const [first, second] = route.path;

  // Chercher un professionnel, voir sa fiche ou celle d'une structure est libre ; seuls réserver et le compte demandent d'être connecté.
  const needsLogin = !user && ['rdv', 'compte'].includes(first);

  let page;
  if (SHOWCASE && ['recherche', 'medecin', 'structure', 'rdv', 'compte', 'tarifs', 'bientot'].includes(first)) page = <ComingSoon />;
  else if (needsLogin) page = <Connexion profile="patient" next={window.location.hash} />;
  else if (first === 'connexion') {
    const profile = second === 'medecin' || second === 'structure' ? second : 'patient';
    page = <Connexion profile={profile} next={route.query.get('suite')} />;
  }
  else if (first === 'recherche') page = <Search query={route.query} />;
  else if (first === 'disponibilites') page = <Availability query={route.query} />;
  else if (first === 'patient') page = <PatientChoice />;
  else if (first === 'structures') page = <Structures pays={route.query.get('pays') ?? ''} ville={route.query.get('ville') ?? ''} localite={route.query.get('localite') ?? ''} />;
  else if (first === 'resultats') page = <Results q={route.query.get('q') ?? ''} />;
  else if (first === 'medecin' && second) page = <PractitionerPage id={second} />;
  else if (first === 'structure' && second) page = <FacilityPage id={second} />;
  else if (first === 'rdv' && second) page = <Book practitionerId={second} startsAt={route.query.get('creneau') ?? ''} />;
  else if (first === 'compte') page = <Account section={second} item={route.path[2]} />;
  else if (first === 'urgence') page = <Emergency />;
  else if (first === 'application') page = <AppDownload />;
  else if (first === 'tarifs') page = <Prices />;
  else if (first === 'orientation') page = <Triage />;
  else if (first === 'professionnels') page = <ProInfo profile={second === 'structure' ? 'structure' : 'medecin'} />;
  else if (first === 'aide' || first === 'faq') page = <Faq openId={route.query.get('question')} />;
  else page = <Home light={first === 'apercu'} />;

  if (needsLogin || first === 'connexion') {
    return (
      <div className="login-shell">
        <main>{page}</main>
      </div>
    );
  }

  return (
    <>
      <OpeningSplash targetId="header-emblem" />
      {askCountry ? (
        <CountryPrompt
          onSave={async (code) => {
            await updateProfile({ countryCode: code });
            setLockedCountry(code);
            setCountry(code);
            setAskCountry(false);
          }}
        />
      ) : null}
      <header className="top">
        <div className="wrap">
          <a href={href('')} className="brand" aria-label="Ollisanté, accueil">
            <Emblem id="header-emblem" size={36} />
            <span>Ollisanté</span>
          </a>
          {locked ? (
            <span className="country-pill fixed" title="Pays de votre compte">
              <span className="pill-display"><span>{current ? flag(current.code) : ''}</span><span className="pill-name">{current?.nameFr ?? locked}</span></span>
            </span>
          ) : (
            <label className="country-pill">
              <span className="sr-only">Pays</span>
              <span className="pill-display" aria-hidden="true">
                <span>{current ? flag(current.code) : '🌍'}</span>
                <span className="pill-name">{current ? current.nameFr : 'Tous pays'}</span>
              </span>
              <select value={country} onChange={(e) => { setCountry(e.target.value); go('recherche', { pays: e.target.value || undefined }); }}>
                <option value="">🌍 Tous pays</option>
                {countries.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.nameFr}</option>)}
              </select>
            </label>
          )}
          <nav aria-label="Menu principal">
            <a href={href('')} className="hide-sm hide-md" aria-current={first ? undefined : 'page'}>Accueil</a>
            {/* Connecté : son nom (Mon compte, Déconnexion). Sinon « Espace pro » (médecin, structure) ; les patients
                passent par « Prendre rendez-vous » (pays, médecin ou structure, puis connexion). */}
            {SHOWCASE ? null : user ? <AccountMenu signedIn name={displayName} /> : <ProMenu />}
            {SHOWCASE || user?.user.role === 'PRACTITIONER' ? null : (
              <button type="button" className="btn small book-btn" onClick={() => askProfile('patient')}><span className="long-label">Prendre rendez-vous</span><span className="short-label">RDV</span></button>
            )}
            <a href={href('application')} className="btn small hide-sm"><span className="long-label">Télécharger l’application</span><span className="short-label">L’application</span></a>
          </nav>
        </div>
      </header>
      <OfflineBanner />
      <main>{page}</main>
      <CountryGate />
      <ConsentDialog />
      <footer className="foot">
        <div className="wrap cols">
          <div className="stack">
            <a href={href('')} className="brand" aria-label="Ollisanté, accueil"><Emblem size={32} /><span>Ollisanté</span></a>
            <p className="muted small">Prenez rendez-vous avec des professionnels et des structures de santé vérifiés, en Afrique et en Europe.</p>
            <StoreBadges />
            {whatsapp ? <p className="small">Assistance WhatsApp{config.data?.whatsappHours ? ` : ${config.data.whatsappHours}` : ''}</p> : null}
          </div>
          <div>
            <strong>Ollisanté</strong>
            <a href={href('recherche')}>Trouver un professionnel</a>
            {SHOWCASE ? null : <a href={href('compte')}>Mes rendez-vous</a>}
            <a href={href('application')}>Télécharger l’application</a>
            {SHOWCASE ? null : <a href="/structure/">Espace Structure</a>}
          </div>
          <div>
            <strong>Informations</strong>
            <a href={href('urgence')}>Urgence médicale</a>
            <a href="/legal/cgu.html">Conditions d’utilisation</a>
            <a href="/legal/confidentialite.html">Confidentialité</a>
            <a href="/legal/mentions-legales.html">Mentions légales</a>
          </div>
          <FooterHelp />
        </div>
      </footer>
      <HelpBubble whatsapp={whatsapp ?? null} hours={config.data?.whatsappHours ?? null} />
    </>
  );
}

/** Patient sans pays (compte créé par e-mail) : on le demande une fois, il filtre ensuite tout le site. */
function CountryPrompt({ onSave }: { onSave: (code: string) => Promise<void> }) {
  const countries = useCountries();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="country-prompt-title">
      <form
        className="modal card stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!code) return;
          setBusy(true);
          try {
            await onSave(code);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 id="country-prompt-title">Dans quel pays vivez-vous ?</h2>
        <p className="muted small">Vous verrez les professionnels, les disponibilités et les tarifs de ce pays. Vous pourrez le modifier dans Mes informations.</p>
        <select value={code} onChange={(e) => setCode(e.target.value)} required>
          <option value="">Choisir mon pays</option>
          {countries.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.nameFr}</option>)}
        </select>
        <button className="btn" disabled={!code || busy}>{busy ? 'Enregistrement…' : 'Valider'}</button>
      </form>
    </div>
  );
}

/** En-tête : « Se connecter » ouvre un menu Mon compte / Déconnexion (Mon compte mène à la connexion si besoin). */
function AccountMenu({ signedIn, name }: { signedIn: boolean; name: string | null }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    window.addEventListener('hashchange', () => setOpen(false), { once: true });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <div className="acct-menu" ref={box}>
      <button type="button" className="acct-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.3-4 4.4-6 8-6s6.7 2 8 6" /></svg>
        <span className="acct-label" title={signedIn && name ? name : undefined}>{signedIn ? name ?? 'Mon compte' : 'Se connecter'}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open ? (
        <div className="acct-pop" role="menu">
          {signedIn ? (
            <a role="menuitem" href={href('compte')} onClick={() => setOpen(false)}>Mon compte</a>
          ) : (
            <>
              {/* Même parcours que les cases de l'accueil : le pays, puis (patient) médecin ou structure, puis la connexion. */}
              <button type="button" role="menuitem" onClick={() => { setOpen(false); askProfile('patient'); }}>Patient</button>
              <button type="button" role="menuitem" onClick={() => { setOpen(false); askProfile('medecin'); }}>Médecin</button>
              <button type="button" role="menuitem" onClick={() => { setOpen(false); askProfile('structure'); }}>Structure</button>
            </>
          )}
          {signedIn ? (
            <button type="button" role="menuitem" className="danger" onClick={async () => { setOpen(false); await logout(); window.location.hash = '#/'; }}>
              Déconnexion
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** « Espace pro » : un seul bouton, qui propose ensuite Médecin ou Structure (puis le pays et la connexion). */
function ProMenu() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  const pick = (p: 'medecin' | 'structure') => {
    setOpen(false);
    askProfile(p);
  };
  return (
    <div className="acct-menu" ref={box}>
      <button type="button" className="pro-pill" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Espace pro
      </button>
      {open ? (
        <div className="acct-pop" role="menu">
          <button type="button" role="menuitem" onClick={() => pick('medecin')}>Médecin</button>
          <button type="button" role="menuitem" onClick={() => pick('structure')}>Structure</button>
        </div>
      ) : null}
    </div>
  );
}
