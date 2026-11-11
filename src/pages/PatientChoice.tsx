import { PhotoBanner } from '../PhotoBanner';
import { useEffect, useState } from 'react';
import { getFacilities, searchPractitioners } from '../api';
import { useCountry, useLockedCountry } from '../brand';
import { useCountries } from '../components';
import { flag } from '../format';
import { useSession } from '../hooks';
import { href } from '../router';

/**
 * Patient : on choisit son pays, puis de consulter un médecin ou une structure de santé (avec le nombre disponible
 * dans ce pays). Sans compte, le choix mène à la connexion, puis à la liste correspondante.
 */
export default function PatientChoice() {
  const countries = useCountries();
  const locked = useLockedCountry();
  const [chosen, setChosen] = useCountry();
  const pays = locked ?? chosen;
  const user = useSession();
  const [counts, setCounts] = useState<{ doctors: number; structures: number } | null>(null);

  useEffect(() => {
    setCounts(null);
    if (!pays) return;
    let live = true;
    Promise.all([searchPractitioners({ countryCode: pays }), getFacilities(pays)])
      .then(([d, f]) => live && setCounts({ doctors: d.totalElements, structures: f.length }))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [pays]);

  const name = countries.find((c) => c.code === pays)?.nameFr ?? '';
  // Médecins, structures et horaires sont visibles de tous : la connexion n'est demandée qu'à la réservation.
  function choose(target: string) {
    window.location.hash = target;
  }
  const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

  return (
    <div className="page">
      <div className="wrap patient-choice">
        <PhotoBanner theme="patient" />
        <h1>Prendre rendez-vous</h1>
        <label className="field">
          <span>Votre pays</span>
          <select value={pays} onChange={(e) => setChosen(e.target.value)} disabled={!!locked}>
            <option value="">Choisir votre pays</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.nameFr}</option>)}
          </select>
        </label>

        <div className="choice-row">
          <button type="button" className="choice-card doctor" disabled={!pays} onClick={() => choose(href('disponibilites', { pays }))}>
            <span className="choice-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2v2 M11 2v2 M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1 M8 15a6 6 0 0 0 12 0v-3 M20 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></svg>
            </span>
            <strong>Un médecin</strong>
            <span className="choice-sub">{pays && counts ? `${plural(counts.doctors, 'médecin', 'médecins')} · ${name}` : 'Choisissez d’abord votre pays'}</span>
          </button>
          <button type="button" className="choice-card structure" disabled={!pays} onClick={() => choose(href('structures', { pays }))}>
            <span className="choice-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18 M18 11h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2 M12 5v5 M9.5 7.5h5 M10 22v-4h4v4" /></svg>
            </span>
            <strong>Une structure de santé</strong>
            <span className="choice-sub">{pays && counts ? `${plural(counts.structures, 'structure', 'structures')} · ${name}` : 'Clinique, hôpital, cabinet'}</span>
          </button>
        </div>
        {user ? null : <p className="muted small">Les horaires libres s’affichent aussitôt ; la connexion n’est demandée que pour réserver.</p>}
      </div>
    </div>
  );
}
