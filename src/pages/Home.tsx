import { useEffect, useRef, useState } from 'react';
import { News, Specialty, getNews, getProfile, getSpecialties } from '../api';
import { askCountry, askProfile } from '../CountryGate';
import { NewsGrid } from '../NewsGrid';
import { AvailableNow } from '../AvailableNow';
import { SHOWCASE, useCountry } from '../brand';
import { useCountries } from '../components';
import { flag } from '../format';
import { useLoad, useSession } from '../hooks';
import { href } from '../router';
import { SearchBar } from '../SearchForm';

/** Icônes des trois profils, les mêmes que sur l'écran d'ouverture de l'application. */
const ICONS = {
  patient: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="7" r="4" /><path d="M2.5 21c1.2-4 4.2-6 7.5-6 1.3 0 2.5.3 3.6.8" />
      <path d="M20.3 14.4a2.2 2.2 0 0 0-3.1 0l-.5.5-.5-.5a2.2 2.2 0 0 0-3.1 3.1l3.6 3.5 3.6-3.5a2.2 2.2 0 0 0 0-3.1z" fill="currentColor" />
    </svg>
  ),
  practitioner: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 2v2" /><path d="M11 2v2" /><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
      <path d="M8 15a6 6 0 0 0 12 0v-3" /><circle cx="20" cy="10" r="2" />
    </svg>
  ),
  structure: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18" /><path d="M18 11h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2" />
      <path d="M12 5v5" /><path d="M9.5 7.5h5" /><path d="M10 22v-4h4v4" /><path d="M10 14h4" />
    </svg>
  ),
};

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Illustration d'une spécialité : un pictogramme dans un médaillon aux couleurs Ollisanté. */
const ART: Record<string, string> = {
  GENERAL_PRACTICE: 'M5 2v2 M11 2v2 M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1 M8 15a6 6 0 0 0 12 0v-3 M20 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  PEDIATRICS: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M9 12h.01 M15 12h.01 M9.5 15.5a3 3 0 0 0 5 0 M12 5c0-1.5 1-2.5 2.5-2.5',
  GYNECOLOGY: 'M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 14v7 M9 18h6',
  CARDIOLOGY: 'M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.4 8.8 11.4 8.8 11.4s8.8-6 8.8-11.4z M5 11.5h3.5l1.5-2.5 2.5 5 1.5-2.5H19',
  DENTISTRY: 'M7 3C4.5 3 3 5 3 7.5c0 3 1.5 4.5 2 7.5.4 2.6 1 6 2.5 6s1.8-3 2.3-5c.3-1 1.1-1 1.4 0 .5 2 .8 5 2.3 5s2.1-3.4 2.5-6c.5-3 2-4.5 2-7.5C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z',
  OPHTHALMOLOGY: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  DERMATOLOGY: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z M10 14h.01 M14 16.5h.01 M13.5 11.5h.01',
  ENT: 'M6 8.5a6 6 0 1 1 12 0c0 3.5-3 4.5-3 7a3.5 3.5 0 0 1-7 .5 M10 8.5a2 2 0 1 1 4 0c0 1.5-2 2-2 3.5',
};

function SpecArt({ code }: { code: string }) {
  return (
    <span className="spec-art" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={ART[code]} /></svg>
    </span>
  );
}

/** Spécialités mises en avant, avec les motifs de consultation les plus courants. */
const SPECIALTIES = [
  { code: 'GENERAL_PRACTICE', name: 'Médecine générale', reasons: 'Fièvre, paludisme, toux' },
  { code: 'PEDIATRICS', name: 'Pédiatrie', reasons: 'Enfants, vaccins, fièvre' },
  { code: 'GYNECOLOGY', name: 'Gynécologie', reasons: 'Grossesse, contraception' },
  { code: 'CARDIOLOGY', name: 'Cardiologie', reasons: 'Tension, cœur' },
  { code: 'DENTISTRY', name: 'Dentiste', reasons: 'Mal de dents, soins' },
  { code: 'OPHTHALMOLOGY', name: 'Ophtalmologie', reasons: 'Vue, yeux rouges' },
  { code: 'DERMATOLOGY', name: 'Dermatologie', reasons: 'Peau, boutons' },
  { code: 'ENT', name: 'ORL', reasons: 'Gorge, oreilles, nez' },
];

const HOW = ['Créez votre compte gratuit', 'Choisissez votre médecin', 'Réservez un créneau', 'Consultez'];

const ico = (d: string) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const PROMISES = [
  { icon: ico('M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z M9 12l2 2 4-4'), title: 'Médecins vérifiés' },
  { icon: ico('M6 11V8a6 6 0 0 1 12 0v3 M5 11h14v10H5z'), title: 'Données protégées' },
  { icon: ico('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2'), title: 'Ouvert 24 h/24' },
  { icon: ico('M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z'), title: 'Aide sur WhatsApp' },
];

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

/** Accueil : les trois profils comme dans l'application, la recherche, les actualités du pays et le téléchargement. */
/** `light` : variante aérée (titre et recherche, profils, spécialités en pastilles, engagements en une ligne, actualités). */
export default function Home({ light = false }: { light?: boolean }) {
  const countries = useCountries();
  const [country, setCountry] = useCountry();
  const user = useSession();
  // Patient connecté sans pays choisi sur le site : on prend le pays de son compte pour les actualités.
  useEffect(() => {
    if (!user || country) return;
    getProfile()
      .then((p) => p.patient?.countryCode && setCountry(p.patient.countryCode))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user.id]);
  const [specialtyCount, setSpecialtyCount] = useState(0);
  useEffect(() => {
    getSpecialties().then((l) => setSpecialtyCount(l.length)).catch(() => undefined);
  }, []);
  const news = useLoad(() => getNews(country || undefined), [country]);
  const [open, setOpen] = useState<News | null>(null);
  const [showAllNews, setShowAllNews] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const countryName = (code: string | null) =>
    code ? countries.find((c) => c.code === code)?.nameFr ?? code : 'Toute l’Afrique';
  const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  return (
    <>
      <section className="hero-band">
        <div className="wrap hero-band-grid">
          <div className="hero-copy">
            <h1>Votre rendez-vous médical, <em>simplement</em></h1>
            <p className="lead hero-sub">Trouvez un médecin et réservez en ligne, 24 h/24.</p>
            {light ? null : (
            <ul className="hero-points">
              <li><Check />Médecins vérifiés</li>
              <li><Check />Réservation 24 h/24</li>
              <li><Check />Rappel avant le rendez-vous</li>
            </ul>
            )}
            {SHOWCASE ? (
              <p className="lead">Ouverture prochaine dans votre pays.</p>
            ) : (
              <>
                <SearchBar />
                <a className="triage-link" href={href('orientation')}>Vous ne savez pas quel médecin consulter ? Laissez-vous guider →</a>
              </>
            )}
            {light ? null : (
            <dl className="hero-stats">
              <div><dt>{countries.length || '…'}</dt><dd>pays couverts</dd></div>
              <div><dt>{specialtyCount || '…'}</dt><dd>spécialités</dd></div>
              <div><dt>Gratuit</dt><dd>l’inscription patient</dd></div>
            </dl>
            )}
          </div>
        </div>
      </section>

      <section className="wrap profile-row" aria-label="Je suis">
        <a className="profile-tile patient" href={href('patient')} onClick={(e) => { e.preventDefault(); askProfile('patient'); }}>
          <span className="tile-icon">{ICONS.patient}</span>
          <span className="tile-text"><strong>Patient</strong><span>Prendre rendez-vous</span></span>
          <Chevron />
        </a>
        <a className="profile-tile practitioner" href={user ? href('compte') : href('connexion/medecin')} onClick={(e) => { if (user) return; e.preventDefault(); askProfile('medecin'); }}>
          <span className="tile-icon">{ICONS.practitioner}</span>
          <span className="tile-text"><strong>Médecin</strong><span>Gérer mes patients</span></span>
          <Chevron />
        </a>
        <a className="profile-tile structure" href={SHOWCASE ? href('bientot') : '/structure/'} onClick={(e) => { if (SHOWCASE) return; e.preventDefault(); askProfile('structure'); }}>
          <span className="tile-icon">{ICONS.structure}</span>
          <span className="tile-text"><strong>Structure</strong><span>Clinique, hôpital, cabinet</span></span>
          <Chevron />
        </a>
      </section>

      {SHOWCASE || light ? null : <AvailableNow country={country} />}

      {SHOWCASE ? null : light ? (
        <section className="section light-section">
          <div className="wrap">
            <h2>Spécialités</h2>
            <div className="spec-tiles">
              {SPECIALTIES.map((x) => (
                <a key={x.code} href={href('recherche', { specialite: x.code })} onClick={(e) => { e.preventDefault(); askCountry({ code: x.code, nameFr: x.name } as Specialty); }}>
                  <SpecArt code={x.code} />{x.name}
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {light ? (
        <section className="section light-section">
          <ul className="wrap trust-strip">
            {PROMISES.map((x) => <li key={x.title}><span className="trust-icon">{x.icon}</span>{x.title}</li>)}
          </ul>
        </section>
      ) : null}

      {news.data && news.data.content.length ? (
        <section className="section news-section">
          <div className="wrap">
            <h2>Actualités{country ? ` · ${countryName(country)}` : ''}</h2>
            <NewsGrid items={news.data.content.slice(0, showAllNews ? undefined : 4)} place={(n) => countryName(n.countryCode)}
              date={(n) => new Date(n.publishedAt).toLocaleDateString('fr-FR')} onOpen={setOpen} />
            {!showAllNews && news.data.content.length > 4 ? (
              <button type="button" className="btn secondary news-more" onClick={() => setShowAllNews(true)}>Voir toutes les actualités</button>
            ) : null}
          </div>
        </section>
      ) : null}

      {open ? (
        <dialog ref={dialog} className="news-dialog" onClose={() => setOpen(null)} aria-labelledby="news-dialog-title">
          <p className="news-meta">{shortDate(open.publishedAt)} · {countryName(open.countryCode)}</p>
          <h2 id="news-dialog-title">{open.title}</h2>
          {open.body ? <p className="news-body">{open.body}</p> : null}
          <div className="row">
            {open.linkUrl ? <a className="btn secondary" href={open.linkUrl} target="_blank" rel="noreferrer">En savoir plus</a> : null}
            <button type="button" className="btn" onClick={() => dialog.current?.close()}>Fermer</button>
          </div>
        </dialog>
      ) : null}

      {light ? null : (<>
      <section className="section how-section">
        <div className="wrap">
          <h2>Comment ça marche ?</h2>
          <ol className="how">
            {HOW.map((h, i) => (
              <li key={h}><span className="num">{i + 1}</span><strong>{h}</strong></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section promise-section">
        <div className="wrap">
          <h2>Nos engagements</h2>
          <ul className="promises">
            {PROMISES.map((x) => (
              <li key={x.title}><span className="promise-icon">{x.icon}</span><strong>{x.title}</strong></li>
            ))}
          </ul>
          <p><a href={href('aide')}>Questions fréquentes →</a></p>
        </div>
      </section>

      </>)}

      {countries.length && !light ? (
        <section className="section countries-section">
          <div className="wrap">
            <h2>Nos implantations</h2>
          </div>
          <div className="marquee" aria-label="Pays où Ollisanté est présent">
            <div className="marquee-track">
              {[0, 1].map((copy) => (
                <ul key={copy} className="marquee-list" aria-hidden={copy === 1}>
                  {countries.map((c) => (
                    <li key={c.code}>
                      <a className="flag-chip" href={href('recherche', { pays: c.code })} tabIndex={copy === 1 ? -1 : undefined}>
                        <span className="flag" aria-hidden="true">{flag(c.code)}</span>{c.nameFr}
                      </a>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>
      ) : null}

    </>
  );
}
