import { useEffect, useState } from 'react';
import { FaqEntry, News, Practitioner, Specialty, getFaq, getNews, getSpecialties, searchPractitioners } from '../api';
import { askCountry } from '../CountryGate';
import { SearchBar } from '../SearchForm';
import { fold, matchSpecialties, searchFaq, searchNews, searchPages } from '../searchIndex';
import { href } from '../router';

/** Résultats de la recherche générale : spécialités, informations du site, questions fréquentes, actualités, professionnels. */
export default function Results({ q }: { q: string }) {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [faq, setFaq] = useState<FaqEntry[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [pros, setPros] = useState<Practitioner[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.allSettled([
      getSpecialties().then(setSpecialties),
      getFaq().then(setFaq),
      getNews(undefined, 50).then((p) => setNews(p.content)),
    ]).then(() => setReady(true));
  }, []);
  useEffect(() => {
    setPros([]);
    if (fold(q).length < 3) return;
    searchPractitioners({ q }).then((r) => setPros(r.content.slice(0, 6))).catch(() => undefined);
  }, [q]);

  const specs = matchSpecialties(q, specialties);
  const pages = searchPages(q);
  const answers = searchFaq(q, faq).slice(0, 5);
  const articles = searchNews(q, news).slice(0, 4);
  const none = ready && !specs.length && !pages.length && !answers.length && !articles.length && !pros.length;

  return (
    <div className="page results-page">
      <div className="wrap stack">
        <div className="results-search"><SearchBar key={q} initial={q} /></div>
        <h1>Résultats pour « {q} »</h1>

        <section className="res-block">
          <h2>Prendre rendez-vous</h2>
          <label className="field res-select">
            <span className="sr-only">Toutes les spécialités</span>
            <select value="" onChange={(e) => { const s = specialties.find((x) => x.code === e.target.value); if (s) askCountry(s); }}>
              <option value="">Choisir une spécialité</option>
              {[...specialties].sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr')).map((s) => <option key={s.code} value={s.code}>{s.nameFr}</option>)}
            </select>
          </label>
          {specs.length ? (
            <div className="res-list">
              {specs.map((s) => (
                <button key={s.code} type="button" className="res-item res-spec" onClick={() => askCountry(s)}>
                  <strong>{s.nameFr}</strong><span className="spec-go">Choisir le pays →</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {pages.length || answers.length ? (
          <section className="res-block">
            <h2>Informations</h2>
            <div className="res-list">
              {pages.map((p) => (
                <a key={p.link} className="res-item" href={p.link}><strong>{p.title}</strong><span className="muted">{p.text}</span></a>
              ))}
              {answers.map((f) => (
                <details key={f.id} className="res-item"><summary><strong>{f.questionFr}</strong></summary><p>{f.answerFr}</p></details>
              ))}
            </div>
          </section>
        ) : null}

        {articles.length ? (
          <section className="res-block">
            <h2>Actualités santé</h2>
            <div className="res-list">
              {articles.map((n) => (
                <details key={n.id} className="res-item">
                  <summary><strong>{n.title}</strong></summary>
                  {n.body ? <p style={{ whiteSpace: 'pre-line' }}>{n.body}</p> : null}
                  {n.linkUrl ? <a href={n.linkUrl} target="_blank" rel="noreferrer">En savoir plus</a> : null}
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {pros.length ? (
          <section className="res-block">
            <h2>Professionnels</h2>
            <div className="res-list">
              {pros.map((p) => (
                <a key={p.id} className="res-item" href={href(`medecin/${p.id}`)}>
                  <strong>Dr {p.firstName} {p.lastName}</strong><span className="muted">{p.specialties.map((s) => s.nameFr).join(', ')}</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {!ready ? <div className="spinner" aria-label="Chargement" /> : null}
        {none ? (
          <div className="empty-state card">
            Aucun résultat. Essayez un autre mot (par exemple « généraliste », « tarif », « urgence ») ou consultez le{' '}
            <a href={href('aide')}>centre d’aide</a>.
          </div>
        ) : null}
      </div>
    </div>
  );
}
