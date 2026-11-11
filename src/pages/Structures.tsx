import { PhotoBanner } from '../PhotoBanner';
import { getFacilities } from '../api';
import { useLockedCountry } from '../brand';
import { useCountries } from '../components';
import { flag } from '../format';
import { useLoad } from '../hooks';
import { href } from '../router';
import { SearchForm } from '../SearchForm';

/** Structures de santé d'un pays (et si besoin d'une ville / localité) : chacune mène à sa fiche. */
export default function Structures({ pays: asked, ville, localite }: { pays: string; ville: string; localite: string }) {
  const locked = useLockedCountry();
  const pays = locked ?? asked;
  const countries = useCountries();
  const list = useLoad(() => getFacilities(pays || undefined, ville, localite), [pays, ville, localite]);
  const name = countries.find((c) => c.code === pays)?.nameFr;
  const where = [localite, ville].filter(Boolean).join(', ');
  return (
    <div className="page">
      <div className="wrap stack">
        <PhotoBanner theme="structures" />
        <h1>{name ? <>{flag(pays)} Structures de santé · {name}{where ? ` · ${where}` : ''}</> : 'Structures de santé'}</h1>
        <SearchForm key={`${pays}|${ville}|${localite}`} page="structures" initial={{ pays, ville, localite }} className="filters" />
        {list.loading && !list.data ? <div className="spinner" aria-label="Chargement" /> : null}
        {list.data && list.data.length === 0 ? (
          <div className="empty-state card">{where ? 'Aucune structure à cet endroit pour le moment. Essayez une autre ville ou localité.' : 'Aucune structure dans ce pays pour le moment.'}</div>
        ) : null}
        <div className="facility-grid">
          {(list.data ?? []).map((f) => (
            <a key={f.id} className="card facility-card" href={href(`structure/${f.id}`)}>
              <strong>{f.name}</strong>
              <span className="muted small">{[f.address, f.locality, f.city].filter(Boolean).join(', ')}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
