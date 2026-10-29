import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Country, Facility, Slot, getCountries, getSlots } from './api';
import { addDays, dayLabel, flag, isoDate, time } from './format';

export function ErrorBox({ text }: { text: string | null }) {
  return text ? <div className="error" role="alert">{text}</div> : null;
}

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}{required ? <span className="req">*</span> : null}</span>
      {children}
      {hint ? <span className="muted small" style={{ fontWeight: 400 }}>{hint}</span> : null}
    </label>
  );
}

let countriesCache: Promise<Country[]> | null = null;
export function useCountries(): Country[] {
  const [list, setList] = useState<Country[]>([]);
  useEffect(() => {
    countriesCache ??= getCountries()
      .then((l) => [...l].sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr')))
      .catch(() => {
        countriesCache = null;
        return [];
      });
    void countriesCache.then(setList);
  }, []);
  return list;
}

/** Indicatif (liste déroulante) + numéro local. */
export function PhoneInput({ country, onCountry, value, onChange, required }: {
  country: string; onCountry: (c: string) => void; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  const countries = useCountries();
  return (
    <div className="phone">
      <select value={country} onChange={(e) => onCountry(e.target.value)} aria-label="Indicatif">
        {countries.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.dialCode}</option>)}
      </select>
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="tel" placeholder="77 123 45 67"
        aria-label="Numéro de téléphone" required={required} autoComplete="tel-national" />
    </div>
  );
}

/**
 * Agenda d'un professionnel : quelques jours à partir d'aujourd'hui, créneaux libres cliquables
 * (heure locale du navigateur, comme dans l'application).
 */
export function Agenda({ practitionerId, days = 5, perDay = 6, facilityId, onPick, facilities }: {
  practitionerId: string; days?: number; perDay?: number; facilityId?: string;
  onPick: (slot: Slot) => void; facilities?: Facility[];
}) {
  const [start, setStart] = useState(() => new Date());
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const from = isoDate(start);
  const to = isoDate(addDays(start, days - 1));

  useEffect(() => {
    let alive = true;
    setSlots(null);
    getSlots(practitionerId, from, to, facilityId)
      .then((s) => alive && setSlots(s))
      .catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, [practitionerId, from, to, facilityId]);

  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (let i = 0; i < days; i++) map.set(isoDate(addDays(start, i)), []);
    (slots ?? []).forEach((s) => map.get(isoDate(new Date(s.startsAt)))?.push(s));
    return map;
  }, [slots, start, days]);

  const place = (s: Slot) => facilities?.find((f) => f.id === s.facilityId)?.name;
  const today = isoDate(new Date());
  const max = expanded ? 99 : perDay;

  return (
    <div>
      <div className="agenda-nav">
        <button className="btn ghost small" disabled={from <= today} onClick={() => setStart(addDays(start, -days))}>← Précédent</button>
        <span className="muted small">{slots === null ? 'Chargement des disponibilités…' : slots.length === 0 ? 'Aucune disponibilité sur ces jours' : ''}</span>
        <button className="btn ghost small" onClick={() => setStart(addDays(start, days))}>Suivant →</button>
      </div>
      <div className="agenda" style={{ ['--days' as string]: days }}>
        {[...byDay.entries()].map(([key, list], i) => (
          <div key={key} className={`day${i >= 3 ? ' extra' : ''}`}>
            <strong>{dayLabel(new Date(`${key}T12:00:00`))}</strong>
            {list.slice(0, max).map((s) => (
              <button key={s.startsAt} className="slot" onClick={() => onPick(s)} title={place(s)}>{time(s.startsAt)}</button>
            ))}
            {list.length === 0 ? <span className="slot empty">—</span> : null}
          </div>
        ))}
      </div>
      {[...byDay.values()].some((l) => l.length > perDay) && !expanded ? (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button className="btn ghost small" onClick={() => setExpanded(true)}>Voir plus d’horaires</button>
        </div>
      ) : null}
    </div>
  );
}
