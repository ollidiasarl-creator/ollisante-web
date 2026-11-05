import { useEffect, useState } from 'react';
import { Place, getPlaces } from './api';
import { Field } from './components';

const cache = new Map<string, Place[]>();

/** Villes (et leurs localités) d'un pays ; liste vide tant qu'aucun pays n'est choisi. */
export function usePlaces(country: string) {
  const [places, setPlaces] = useState<Place[]>(() => cache.get(country) ?? []);
  useEffect(() => {
    if (!country) return setPlaces([]);
    const known = cache.get(country);
    if (known) return setPlaces(known);
    setPlaces([]);
    let live = true;
    getPlaces(country)
      .then((l) => {
        cache.set(country, l);
        if (live) setPlaces(l);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [country]);
  return places;
}

/**
 * Ville puis localité (quartier, commune), en listes déroulantes, d'après les lieux de soins du pays.
 * Changer de ville efface la localité. Rien n'est affiché si le pays n'a encore aucune ville renseignée.
 */
export function PlaceFields({ country, city, locality, onChange }: {
  country: string; city: string; locality: string; onChange: (city: string, locality: string) => void;
}) {
  const places = usePlaces(country);
  if (!country || places.length === 0) return null;
  const current = places.find((p) => p.city === city);
  return (
    <>
      <Field label="Ville">
        <select value={current ? city : ''} onChange={(e) => onChange(e.target.value, '')}>
          <option value="">Toutes les villes</option>
          {places.map((p) => <option key={p.city} value={p.city}>{p.city}</option>)}
        </select>
      </Field>
      <Field label="Localité">
        <select value={locality} onChange={(e) => onChange(city, e.target.value)} disabled={!current || current.localities.length === 0}>
          <option value="">{current ? 'Toutes les localités' : 'Choisissez d\'abord la ville'}</option>
          {(current?.localities ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </Field>
    </>
  );
}
