import { useEffect, useState } from 'react';
import { Practitioner, Slot, getFacilities, searchPractitioners } from '../api';
import { useCountry, useLockedCountry } from '../brand';
import { Agenda, ErrorBox, useCountries } from '../components';
import { flag, initials, money } from '../format';
import { useLoad, useSession } from '../hooks';
import { LoginToBook } from '../LoginToBook';
import { go, href } from '../router';
import { SearchForm } from '../SearchForm';

export default function Search({ query }: { query: URLSearchParams }) {
  const locked = useLockedCountry();
  const pays = locked ?? query.get('pays') ?? '';
  const specialite = query.get('specialite') ?? '';
  const q = query.get('q') ?? '';
  const countries = useCountries();
  const [country, setCountry] = useCountry();
  const [page, setPage] = useState(0);
  const [allFacilities, setAllFacilities] = useState(false);
  // Le pays de la recherche devient celui du site (en-tête, actualités).
  useEffect(() => {
    if (!locked && pays !== country) setCountry(pays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pays]);
  useEffect(() => {
    setPage(0);
    setAllFacilities(false);
  }, [pays, specialite, q]);
  const list = useLoad(() => searchPractitioners({ countryCode: pays, specialty: specialite, q, page }), [pays, specialite, q, page]);
  const facilities = useLoad(() => getFacilities(pays || undefined), [pays]);
  const total = list.data?.totalElements ?? 0;
  const place = countries.find((c) => c.code === pays);
  const shownFacilities = (facilities.data ?? []).slice(0, allFacilities ? undefined : 6);

  return (
    <div className="page">
      <div className="wrap">
        <h1>{place ? <>{flag(place.code)} Santé · {place.nameFr}</> : 'Trouver un professionnel de santé'}</h1>
        <p className="muted">
          {place
            ? 'Médecins et structures de santé vérifiés. Connectez-vous pour voir les disponibilités et réserver.'
            : 'Tous les pays. Choisissez un pays pour voir aussi ses structures de santé.'}
        </p>
        <SearchForm key={`${pays}|${specialite}`} initial={{ pays, specialite, q }} className="filters" />
        <ErrorBox text={list.error} />
        {list.loading && !list.data ? <div className="spinner" aria-label="Chargement" /> : null}
        {list.data ? <p className="muted" style={{ marginBottom: 12 }}>{total} professionnel{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}</p> : null}
        {list.data && list.data.content.length === 0 ? (
          <div className="empty-state card">Aucun professionnel ne correspond à cette recherche. Essayez un autre pays ou une autre spécialité.</div>
        ) : null}
        <div className="stack">
          {(list.data?.content ?? []).map((p) => (
            <PractitionerResult key={p.id} p={p} facilities={facilities.data ?? []} />
          ))}
        </div>
        {list.data && list.data.totalPages > 1 ? (
          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            <button className="btn secondary small" disabled={page === 0} onClick={() => setPage(page - 1)}>← Précédents</button>
            <span className="muted small">Page {page + 1} / {list.data.totalPages}</span>
            <button className="btn secondary small" disabled={page + 1 >= list.data.totalPages} onClick={() => setPage(page + 1)}>Suivants →</button>
          </div>
        ) : null}
        {pays && !specialite && !q && shownFacilities.length ? (
          <section className="facility-section">
            <h2>Structures de santé{place ? ` · ${place.nameFr}` : ''}</h2>
            <div className="facility-grid">
              {shownFacilities.map((f) => (
                <a key={f.id} className="card facility-card" href={href(`structure/${f.id}`)}>
                  <strong>{f.name}</strong>
                  <span className="muted small">{[f.address, f.city].filter(Boolean).join(', ') || place?.nameFr}</span>
                </a>
              ))}
            </div>
            {!allFacilities && (facilities.data?.length ?? 0) > 6 ? (
              <button type="button" className="btn secondary small" onClick={() => setAllFacilities(true)}>
                Voir les {facilities.data!.length} structures
              </button>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function PractitionerResult({ p, facilities, facilityId }: {
  p: Practitioner; facilities: Parameters<typeof Agenda>[0]['facilities']; facilityId?: string;
}) {
  const user = useSession();
  const countries = useCountries();
  const pick = (s: Slot) => go(`rdv/${p.id}`, { creneau: s.startsAt });
  return (
    <article className="card result">
      <div className="who">
        <div className="avatar" aria-hidden>{initials(p.firstName, p.lastName)}</div>
        <div className="stack" style={{ gap: 4 }}>
          <span className="result-country">{flag(p.countryCode)} {countries.find((c) => c.code === p.countryCode)?.nameFr ?? p.countryCode}</span>
          <h3><a href={href(`medecin/${p.id}`)}>Dr {p.firstName} {p.lastName}</a></h3>
          <span className="muted">{p.specialties.map((s) => s.nameFr).join(', ')}</span>
          {p.consultationFeeMinor != null && p.feeCurrency ? <span className="small">Consultation : {money(p.consultationFeeMinor, p.feeCurrency)}</span> : null}
          <a className="small" href={href(`medecin/${p.id}`)}>Voir le profil</a>
        </div>
      </div>
      {user ? (
        <Agenda practitionerId={p.id} days={5} perDay={4} facilityId={facilityId} facilities={facilities} onPick={pick} />
      ) : (
        <LoginToBook practitionerId={p.id} />
      )}
    </article>
  );
}
