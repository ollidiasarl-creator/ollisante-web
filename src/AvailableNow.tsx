import { useEffect, useState } from 'react';
import { Facility, Practitioner, Slot, getFacilities, getSlots, searchPractitioners } from './api';
import { DoctorRow } from './DoctorRow';
import { askProfile } from './CountryGate';
import { useCountries } from './components';
import { addDays, flag, initials, isoDate, money, time } from './format';
import { useSession } from './hooks';
import { href } from './router';
import { bookSlot } from './LoginToBook';

/** Spécialités proposées en raccourci au-dessus des disponibilités. */
const QUICK = [
  { code: '', name: 'Tous' },
  { code: 'GENERAL_PRACTICE', name: 'Généraliste' },
  { code: 'PEDIATRICS', name: 'Pédiatre' },
  { code: 'GYNECOLOGY', name: 'Gynécologue' },
  { code: 'CARDIOLOGY', name: 'Cardiologue' },
  { code: 'DENTISTRY', name: 'Dentiste' },
];

const DAYS = 3; // jours affichés par médecin
const PER_DAY = 3; // créneaux visibles par jour
const SHOWN = 6; // médecins affichés

type Row = { p: Practitioner; slots: Slot[] };

const dayName = (d: Date) => {
  const today = isoDate(new Date());
  const key = isoDate(d);
  if (key === today) return 'Aujourd’hui';
  if (key === isoDate(addDays(new Date(), 1))) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
};

/**
 * Accueil : les médecins qui ont des créneaux libres dans les prochains jours, les plus tôt disponibles d'abord.
 * Un clic sur un horaire mène à la réservation (après connexion pour un visiteur).
 */
/** {@code list} : fiches en ligne (identité à gauche, horaires sur 5 jours à droite) au lieu des cartes. */
export function AvailableNow({ country, list = false }: { country: string; list?: boolean }) {
  const countries = useCountries();
  const user = useSession();
  const [spec, setSpec] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  useEffect(() => {
    if (!list) return;
    getFacilities(country || undefined).then(setFacilities).catch(() => undefined);
  }, [country, list]);

  useEffect(() => {
    let live = true;
    setRows(null);
    const from = isoDate(new Date());
    const to = isoDate(addDays(new Date(), 13));
    searchPractitioners({ countryCode: country || undefined, specialty: spec || undefined })
      .then(async (page) => {
        const all = await Promise.all(
          page.content.slice(0, 12).map(async (p) => ({ p, slots: await getSlots(p.id, from, to).catch(() => [] as Slot[]) })),
        );
        const free = all.filter((r) => r.slots.length > 0);
        free.sort((a, b) => a.slots[0].startsAt.localeCompare(b.slots[0].startsAt));
        if (live) setRows(free.slice(0, SHOWN));
      })
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [country, spec]);

  const book = (p: Practitioner, s: Slot) => bookSlot(p.id, s.startsAt, !!user);
  const place = countries.find((c) => c.code === country);

  return (
    <section className="section avail-section" aria-labelledby="avail-title">
      <div className="wrap">
        <div className="avail-head">
          <div>
            <h2 id="avail-title">Médecins disponibles{place ? <> · {flag(place.code)} {place.nameFr}</> : null}</h2>
            <p className="muted">Choisissez un horaire, réservez en quelques secondes.</p>
          </div>
          <a className="avail-all" href={href('patient')} onClick={(e) => { e.preventDefault(); askProfile('patient'); }}>
            Voir tous les médecins →
          </a>
        </div>
        <div className="avail-chips" role="group" aria-label="Spécialité">
          {QUICK.map((q) => (
            <button key={q.code} type="button" className={q.code === spec ? 'on' : undefined} aria-pressed={q.code === spec} onClick={() => setSpec(q.code)}>
              {q.name}
            </button>
          ))}
        </div>

        {rows === null ? (
          <div className="avail-grid">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="avail-card skeleton" aria-hidden="true" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state card">Aucune disponibilité dans les prochains jours pour ce choix. Essayez une autre spécialité ou un autre pays.</div>
        ) : list ? (
          <div className="drow-list">
            {rows.map(({ p, slots }) => <DoctorRow key={p.id} p={p} facilities={facilities} next={slots[0]} onPick={(s) => book(p, s)} />)}
          </div>
        ) : (
          <div className="avail-grid">
            {rows.map(({ p, slots }) => {
              const first = slots[0];
              // Les 3 prochains jours où le médecin a vraiment des créneaux libres (pas de colonnes vides).
              const days = [...new Set(slots.map((s) => isoDate(new Date(s.startsAt))))]
                .slice(0, DAYS)
                .map((k) => new Date(`${k}T12:00:00`));
              return (
                <article key={p.id} className="avail-card">
                  <header>
                    <span className="avatar" aria-hidden="true">{initials(p.firstName, p.lastName)}</span>
                    <div>
                      <a className="avail-name" href={href(`medecin/${p.id}`)}>Dr {p.firstName} {p.lastName}</a>
                      <span className="muted small">{p.specialties.map((s) => s.nameFr).join(', ')}</span>
                      <span className="small">
                        {flag(p.countryCode)} {countries.find((c) => c.code === p.countryCode)?.nameFr ?? p.countryCode}
                        {p.consultationFeeMinor != null && p.feeCurrency ? <> · {money(p.consultationFeeMinor, p.feeCurrency)}</> : null}
                      </span>
                    </div>
                  </header>
                  <p className="avail-next">
                    <span className="dot" aria-hidden="true" />
                    Prochain rendez-vous : <strong>{dayName(new Date(first.startsAt)).toLowerCase()} à {time(first.startsAt)}</strong>
                  </p>
                  <div className="avail-days">
                    {days.map((d) => {
                      const list = slots.filter((s) => isoDate(new Date(s.startsAt)) === isoDate(d));
                      return (
                        <div key={isoDate(d)} className="avail-day">
                          <span className="avail-day-name">{dayName(d)}</span>
                          {list.slice(0, PER_DAY).map((s) => (
                            <button key={s.startsAt} type="button" className="slot" onClick={() => book(p, s)}>{time(s.startsAt)}</button>
                          ))}
                          {list.length === 0 ? <span className="slot empty">—</span> : null}
                        </div>
                      );
                    })}
                  </div>
                  <a className="avail-more small" href={href(`medecin/${p.id}`)}>Plus d’horaires</a>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
