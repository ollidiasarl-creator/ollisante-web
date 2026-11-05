import { useEffect, useMemo, useState } from 'react';
import { Facility, Practitioner, Slot, getSlots } from './api';
import { useCountries } from './components';
import { addDays, flag, initials, isoDate, money, time } from './format';
import { href } from './router';

const DAYS = 5;
const PER_DAY = 4;

const weekday = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long' });
const dayMonth = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const longDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Une fiche médecin en ligne, comme sur les grands sites de rendez-vous : à gauche qui il est et où il consulte,
 * à droite ses horaires libres sur 5 jours, avec les flèches pour avancer ou reculer.
 * {@code next} : le premier horaire libre connu (pour « Prochain rendez-vous le … » quand la semaine affichée est vide).
 */
export function DoctorRow({ p, facilities, next, onPick }: {
  p: Practitioner; facilities: Facility[]; next?: Slot; onPick: (s: Slot) => void;
}) {
  const countries = useCountries();
  const [start, setStart] = useState(() => new Date());
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const from = isoDate(start);
  const to = isoDate(addDays(start, DAYS - 1));

  useEffect(() => {
    let live = true;
    setSlots(null);
    getSlots(p.id, from, to)
      .then((s) => live && setSlots(s))
      .catch(() => live && setSlots([]));
    return () => {
      live = false;
    };
  }, [p.id, from, to]);

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(start, i)), [start]);
  const byDay = (d: Date) => (slots ?? []).filter((s) => isoDate(new Date(s.startsAt)) === isoDate(d));
  // Lieu de consultation : celui du premier horaire connu, sinon le premier lieu du médecin.
  const place = facilities.find((f) => f.id === (slots?.[0] ?? next)?.facilityId);
  const today = isoDate(new Date());
  const empty = slots !== null && slots.length === 0;
  const max = expanded ? 99 : PER_DAY;
  const more = days.some((d) => byDay(d).length > PER_DAY);
  const country = countries.find((c) => c.code === p.countryCode);

  return (
    <article className="drow">
      <div className="drow-who">
        <div className="drow-head">
          <span className="drow-avatar" aria-hidden="true">{initials(p.firstName, p.lastName)}</span>
          <div>
            <a className="drow-name" href={href(`medecin/${p.id}`)}>Dr {p.firstName} {p.lastName}</a>
            <p className="drow-spec">{p.specialties.map((s) => s.nameFr).join(', ')}</p>
          </div>
        </div>
        <ul className="drow-facts">
          <li>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
            <span>
              {place ? <>{place.name}<br />{[place.address, place.locality, place.city].filter(Boolean).join(', ')}</> : null}
              {place ? <br /> : null}
              {flag(p.countryCode)} {country?.nameFr ?? p.countryCode}
            </span>
          </li>
          {p.consultationFeeMinor != null && p.feeCurrency ? (
            <li>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>
              <span>Consultation : {money(p.consultationFeeMinor, p.feeCurrency)}</span>
            </li>
          ) : null}
          {p.teleconsultationEnabled ? (
            <li>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="7" width="13" height="10" rx="2" /><path d="M16 11l5-3v8l-5-3" /></svg>
              <span>Téléconsultation possible</span>
            </li>
          ) : null}
        </ul>
        <a className="drow-profile" href={href(`medecin/${p.id}`)}>Voir le profil</a>
      </div>

      <div className="drow-agenda">
        <div className="drow-days">
          <button type="button" className="drow-nav" aria-label="Jours précédents" disabled={from <= today} onClick={() => { setStart(addDays(start, -DAYS)); setExpanded(false); }}>‹</button>
          {days.map((d) => (
            <div key={isoDate(d)} className="drow-day">
              <strong><span className="drow-long">{weekday(d)}</span><span className="drow-short">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span></strong>
              <span>{dayMonth(d)}</span>
            </div>
          ))}
          <button type="button" className="drow-nav" aria-label="Jours suivants" onClick={() => { setStart(addDays(start, DAYS)); setExpanded(false); }}>›</button>
        </div>
        {slots === null ? (
          <p className="drow-wait">Chargement des disponibilités…</p>
        ) : empty ? (
          <div className="drow-empty">
            {next && next.startsAt.slice(0, 10) > to ? (
              <button type="button" className="drow-next" onClick={() => setStart(new Date(`${next.startsAt.slice(0, 10)}T12:00:00`))}>
                Prochain rendez-vous le {longDate(next.startsAt)} ›
              </button>
            ) : (
              <p className="drow-wait">Aucune disponibilité sur ces jours</p>
            )}
          </div>
        ) : (
          <>
            <div className="drow-slots">
              {days.map((d) => {
                const list = byDay(d);
                return (
                  <div key={isoDate(d)} className="drow-col">
                    {list.slice(0, max).map((s) => (
                      <button key={s.startsAt} type="button" className="drow-slot" onClick={() => onPick(s)}>{time(s.startsAt)}</button>
                    ))}
                    {list.length === 0 ? <span className="drow-none">—</span> : null}
                  </div>
                );
              })}
            </div>
            {more ? (
              <button type="button" className="drow-more" onClick={() => setExpanded(!expanded)}>
                {expanded ? 'Voir moins d’horaires' : 'Voir plus d’horaires'}
              </button>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}
