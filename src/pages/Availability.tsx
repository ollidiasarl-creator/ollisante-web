import { PhotoBanner } from '../PhotoBanner';
import { useEffect, useMemo, useState } from 'react';
import { Facility, Practitioner, Slot, getFacilities, getSlots, searchPractitioners } from '../api';
import { useCountry, useLockedCountry } from '../brand';
import { useCountries } from '../components';
import { DoctorRow } from '../DoctorRow';
import { addDays, flag, isoDate, time } from '../format';
import { useSession } from '../hooks';
import { bookSlot } from '../LoginToBook';
import { SearchForm } from '../SearchForm';

const DAYS = 5;
const MAX = 12;

type Row = { p: Practitioner; slots: Slot[] };

const dayHead = (d: Date) => {
  const k = isoDate(d);
  if (k === isoDate(new Date())) return 'Aujourd’hui';
  if (k === isoDate(addDays(new Date(), 1))) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
};

/**
 * Médecins disponibles d'un pays (et d'une ville, d'une localité) : d'abord un tableau récapitulatif — un médecin par
 * ligne, le premier horaire libre de chaque jour — puis le détail des horaires de chacun.
 */
export default function Availability({ query }: { query: URLSearchParams }) {
  const locked = useLockedCountry();
  const pays = locked ?? query.get('pays') ?? '';
  const ville = query.get('ville') ?? '';
  const localite = query.get('localite') ?? '';
  const specialite = query.get('specialite') ?? '';
  const q = query.get('q') ?? '';
  const countries = useCountries();
  const [country, setCountry] = useCountry();
  const user = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    if (!locked && pays && pays !== country) setCountry(pays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pays]);

  useEffect(() => {
    getFacilities(pays || undefined).then(setFacilities).catch(() => undefined);
  }, [pays]);

  useEffect(() => {
    let live = true;
    setRows(null);
    const from = isoDate(new Date());
    const to = isoDate(addDays(new Date(), 13));
    searchPractitioners({ countryCode: pays || undefined, city: ville || undefined, locality: localite || undefined, specialty: specialite || undefined, q: q || undefined })
      .then(async (page) => {
        const all = await Promise.all(
          page.content.map(async (p) => ({ p, slots: await getSlots(p.id, from, to).catch(() => [] as Slot[]) })),
        );
        // Ceux qui ont un horaire libre d'abord, le plus tôt en tête ; puis les autres.
        all.sort((a, b) => (a.slots[0]?.startsAt ?? '9').localeCompare(b.slots[0]?.startsAt ?? '9'));
        if (live) setRows(all);
      })
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [pays, ville, localite, specialite, q]);

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(new Date(), i)), []);
  const place = countries.find((c) => c.code === pays);
  const where = [localite, ville].filter(Boolean).join(', ');
  const withSlots = (rows ?? []).filter((r) => r.slots.length > 0);
  const recap = withSlots.slice(0, MAX);
  const placeOf = (r: Row) => facilities.find((f) => f.id === r.slots[0]?.facilityId);

  return (
    <div className="page">
      <div className="wrap">
        <PhotoBanner theme="disponibilites" />
        <h1>{place ? <>{flag(place.code)} Médecins disponibles · {where || place.nameFr}</> : 'Médecins disponibles'}</h1>
        <p className="muted">Les horaires libres des prochains jours. Choisissez-en un pour réserver.</p>
        <SearchForm key={`${pays}|${ville}|${localite}|${specialite}`} page="disponibilites" initial={{ pays, ville, localite, specialite, q }} className="filters" />

        {rows === null ? <div className="spinner" aria-label="Chargement" /> : null}

        {rows && withSlots.length === 0 ? (
          <div className="empty-state card">
            Aucune disponibilité dans les prochains jours {where ? 'à cet endroit' : 'pour ce choix'}. Essayez {where ? 'une autre ville ou localité' : 'un autre pays'} ou une autre spécialité.
          </div>
        ) : null}

        {recap.length ? (
          <section className="recap card" aria-labelledby="recap-title">
            <div className="recap-head">
              <h2 id="recap-title">En un coup d’œil</h2>
              <span className="muted small">{withSlots.length} médecin{withSlots.length > 1 ? 's' : ''} avec des horaires libres</span>
            </div>
            <div className="recap-scroll">
              <table className="recap-table">
                <thead>
                  <tr>
                    <th scope="col">Médecin</th>
                    <th scope="col" className="recap-where">Lieu</th>
                    {days.map((d) => <th key={isoDate(d)} scope="col" className="recap-day">{dayHead(d)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {recap.map((r) => {
                    const f = placeOf(r);
                    return (
                      <tr key={r.p.id}>
                        <th scope="row">
                          <a href={`#d-${r.p.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`d-${r.p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                            Dr {r.p.firstName} {r.p.lastName}
                          </a>
                          <span>{r.p.specialties.map((s) => s.nameFr).join(', ')}</span>
                        </th>
                        <td className="recap-where">{f ? [f.locality, f.city].filter(Boolean).join(', ') || f.name : '—'}</td>
                        {days.map((d) => {
                          const list = r.slots.filter((s) => isoDate(new Date(s.startsAt)) === isoDate(d));
                          return (
                            <td key={isoDate(d)} className="recap-day">
                              {list.length ? (
                                <button type="button" className="recap-slot" onClick={() => bookSlot(r.p.id, list[0].startsAt, !!user)} title={`${list.length} horaire${list.length > 1 ? 's' : ''} libre${list.length > 1 ? 's' : ''}`}>
                                  {time(list[0].startsAt)}
                                  {list.length > 1 ? <small>+{list.length - 1}</small> : null}
                                </button>
                              ) : (
                                <span className="recap-none">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted small recap-note">L’heure affichée est le premier horaire libre du jour ; « +3 » = 3 autres horaires ce jour-là, à voir dans le détail ci-dessous.</p>
          </section>
        ) : null}

        {withSlots.length ? (
          <section className="recap-detail" aria-labelledby="detail-title">
            <h2 id="detail-title">Tous les horaires</h2>
            <div className="drow-list">
              {withSlots.map((r) => (
                <div key={r.p.id} id={`d-${r.p.id}`} className="recap-anchor">
                  <DoctorRow p={r.p} facilities={facilities} next={r.slots[0]} onPick={(s) => bookSlot(r.p.id, s.startsAt, !!user)} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
