import { useEffect, useState } from 'react';
import { Specialty } from './api';
import { useCountry, useLockedCountry } from './brand';
import { useCountries } from './components';
import { flag } from './format';
import { useSession } from './hooks';
import { PlaceFields } from './Places';
import { go, href } from './router';

const EVENT = 'ollisante-country-gate';

type Profile = 'patient' | 'medecin' | 'structure';
type Ask = { specialty: Specialty } | { profile: Profile };

/**
 * Avant de se connecter (ou de chercher une spécialité), on demande le pays dans une fenêtre ; le patient choisit
 * ensuite entre un médecin et une structure de santé. Puis la connexion, et la liste correspondante dans ce pays.
 */
export function askCountry(specialty: Specialty) {
  window.dispatchEvent(new CustomEvent<Ask>(EVENT, { detail: { specialty } }));
}

/** Cases Patient, Médecin, Structure de l'accueil. */
export function askProfile(profile: Profile) {
  window.dispatchEvent(new CustomEvent<Ask>(EVENT, { detail: { profile } }));
}

/** Ouvre la page voulue, en passant par la connexion patient si besoin. */
function openAsPatient(target: string, signedIn: boolean) {
  if (signedIn) window.location.hash = target;
  else go('connexion/patient', { suite: target });
}

const TAG: Record<Profile, string> = { patient: 'Patient', medecin: 'Médecin', structure: 'Structure' };

export function CountryGate() {
  const [ask, setAsk] = useState<Ask | null>(null);
  const [step, setStep] = useState<'country' | 'choice'>('country');
  const [country, setCountry] = useCountry();
  const [code, setCode] = useState('');
  // Ville et localité : facultatives, proposées au patient une fois le pays choisi.
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const where = () => ({ ville: city || undefined, localite: locality || undefined });
  const locked = useLockedCountry();
  const user = useSession();
  const countries = useCountries();

  function finish(a: Ask, pays: string) {
    if ('specialty' in a) return openAsPatient(href('recherche', { pays, specialite: a.specialty.code, ...where() }), !!user);
    if (a.profile === 'medecin') return user ? go('compte') : go('connexion/medecin');
    if (a.profile === 'structure') {
      window.location.href = '/structure/';
      return;
    }
    // Patient : choix entre un médecin et une structure, dans la même fenêtre.
    setStep('choice');
    setAsk(a);
  }

  useEffect(() => {
    const on = (e: Event) => {
      const a = (e as CustomEvent<Ask>).detail;
      setStep('country');
      if (locked) {
        setCode(locked);
        if ('profile' in a && a.profile === 'patient') {
          setAsk(a);
          setStep('choice');
        } else finish(a, locked);
        return;
      }
      setCode(country);
      setCity('');
      setLocality('');
      setAsk(a);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, user, country]);

  useEffect(() => {
    if (!ask) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAsk(null);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [ask]);

  if (!ask) return null;
  const tag = 'specialty' in ask ? ask.specialty.nameFr : TAG[ask.profile];
  const forPatient = 'specialty' in ask || ask.profile === 'patient';
  const name = countries.find((c) => c.code === code)?.nameFr ?? '';
  const close = () => setAsk(null);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="gate-title" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      {step === 'country' ? (
        <form
          className="modal card stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!code) return;
            setCountry(code);
            const a = ask;
            if (!('profile' in a && a.profile === 'patient')) setAsk(null);
            finish(a, code);
          }}
        >
          <p className="gate-tag">{tag}</p>
          <h2 id="gate-title">{forPatient ? 'Dans quel pays souhaitez-vous consulter ?' : 'Dans quel pays exercez-vous ?'}</h2>
          <select value={code} onChange={(e) => { setCode(e.target.value); setCity(''); setLocality(''); }} required autoFocus aria-label="Pays">
            <option value="">Choisir le pays</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.nameFr}</option>)}
          </select>
          {forPatient ? (
            <PlaceFields country={code} city={city} locality={locality} onChange={(c, l) => { setCity(c); setLocality(l); }} />
          ) : null}
          <button className="btn" disabled={!code}>Continuer</button>
          <button type="button" className="btn ghost" onClick={close}>Annuler</button>
          {forPatient && !user ? <p className="muted small">Vous vous connecterez ensuite pour voir les disponibilités.</p> : null}
        </form>
      ) : (
        <div className="modal card stack gate-choice">
          <p className="gate-tag">{flag(code)} {[locality, city, name].filter(Boolean).join(', ')}</p>
          <h2 id="gate-title">Vous souhaitez consulter</h2>
          <button type="button" className="choice-card doctor" onClick={() => { close(); openAsPatient(href('recherche', { pays: code, ...where() }), !!user); }}>
            <strong>Un médecin</strong>
          </button>
          <button type="button" className="choice-card structure" onClick={() => { close(); openAsPatient(href('structures', { pays: code, ...where() }), !!user); }}>
            <strong>Une structure de santé</strong>
            <span className="choice-sub">Clinique, hôpital, cabinet</span>
          </button>
          {locked ? null : <button type="button" className="btn ghost" onClick={() => setStep('country')}>Changer de pays</button>}
          <button type="button" className="btn ghost" onClick={close}>Annuler</button>
        </div>
      )}
    </div>
  );
}
