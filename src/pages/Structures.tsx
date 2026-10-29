import { getFacilities } from '../api';
import { useLockedCountry } from '../brand';
import { useCountries } from '../components';
import { flag } from '../format';
import { useLoad } from '../hooks';
import { href } from '../router';

/** Structures de santé d'un pays : chacune mène à sa fiche (spécialités et médecins qui y consultent). */
export default function Structures({ pays: asked }: { pays: string }) {
  const locked = useLockedCountry();
  const pays = locked ?? asked;
  const countries = useCountries();
  const list = useLoad(() => getFacilities(pays || undefined), [pays]);
  const name = countries.find((c) => c.code === pays)?.nameFr;
  return (
    <div className="page">
      <div className="wrap stack">
        <h1>{name ? <>{flag(pays)} Structures de santé · {name}</> : 'Structures de santé'}</h1>
        {list.loading && !list.data ? <div className="spinner" aria-label="Chargement" /> : null}
        {list.data && list.data.length === 0 ? <div className="empty-state card">Aucune structure dans ce pays pour le moment.</div> : null}
        <div className="facility-grid">
          {(list.data ?? []).map((f) => (
            <a key={f.id} className="card facility-card" href={href(`structure/${f.id}`)}>
              <strong>{f.name}</strong>
              <span className="muted small">{[f.address, f.city].filter(Boolean).join(', ')}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
