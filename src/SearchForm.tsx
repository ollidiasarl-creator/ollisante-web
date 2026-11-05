import { FormEvent, Fragment, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { FaqEntry, News, Practitioner, Specialty, getFaq, getNews, getSpecialties, searchPractitioners } from './api';
import { askCountry } from './CountryGate';
import { PAGES, exactSpecialty, fold, suggest, suggestSpecialties, suggestTopics } from './searchIndex';
import { Field, useCountries } from './components';
import { flag } from './format';
import { go, href } from './router';
import { useLockedCountry } from './brand';
import { PlaceFields } from './Places';

/**
 * Pays, ville, localité, spécialité et nom : chaque changement met aussitôt les résultats à jour (le nom, après une
 * courte pause dans la frappe). {@code page} : « recherche » (médecins) ou « structures ».
 */
export function SearchForm({ initial, className, page = 'recherche' }: {
  initial?: { pays?: string; ville?: string; localite?: string; specialite?: string; q?: string }; className: string;
  page?: 'recherche' | 'structures';
}) {
  const countries = useCountries();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const locked = useLockedCountry();
  const pays = locked ?? initial?.pays ?? '';
  const specialite = initial?.specialite ?? '';
  const ville = initial?.ville ?? '';
  const localite = initial?.localite ?? '';
  const doctors = page === 'recherche';
  const [q, setQ] = useState(initial?.q ?? '');
  useEffect(() => {
    getSpecialties().then((l) => setSpecialties([...l].sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr')))).catch(() => undefined);
  }, []);
  const apply = (next: { pays?: string; ville?: string; localite?: string; specialite?: string; q?: string }) => {
    const all = { pays, ville, localite, specialite, q: q.trim(), ...next };
    // Un autre pays : la ville et la localité ne s'y appliquent plus.
    if (next.pays !== undefined && next.pays !== pays) Object.assign(all, { ville: '', localite: '' });
    go(page, doctors ? all : { pays: all.pays, ville: all.ville, localite: all.localite });
  };
  // Le nom : on attend que la personne s'arrête de taper avant de relancer la recherche.
  useEffect(() => {
    if (q.trim() === (initial?.q ?? '')) return;
    const timer = setTimeout(() => apply({ q: q.trim() }), 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function submit(e: FormEvent) {
    e.preventDefault();
    apply({});
  }
  return (
    <form className={className} onSubmit={submit} role="search">
      <Field label="Pays">
        <select value={pays} onChange={(e) => apply({ pays: e.target.value })} disabled={!!locked}>
          {locked ? null : <option value="">Tous les pays</option>}
          {countries.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.nameFr}</option>)}
        </select>
      </Field>
      <PlaceFields country={pays} city={ville} locality={localite} onChange={(c, l) => apply({ ville: c, localite: l })} />
      {doctors ? <>
      <Field label="Spécialité">
        <select value={specialite} onChange={(e) => apply({ specialite: e.target.value })}>
          <option value="">Toutes les spécialités</option>
          {specialties.map((s) => <option key={s.code} value={s.code}>{s.nameFr}</option>)}
        </select>
      </Field>
      <Field label="Nom du professionnel (facultatif)">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex. Diop" type="search" />
      </Field>
      <button className="btn">Rechercher</button>
      </> : null}
    </form>
  );
}

/**
 * Barre de recherche générale de l'accueil : on tape un mot (spécialité, symptôme, nom, question…) et les suggestions
 * apparaissent aussitôt. Une spécialité ouvre le choix du pays puis la connexion ; le reste mène à la page de résultats.
 */
export function SearchBar({ initial = '' }: { initial?: string }) {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [faq, setFaq] = useState<FaqEntry[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [text, setText] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pros, setPros] = useState<Practitioner[]>([]);
  const box = useRef<HTMLFormElement>(null);
  useEffect(() => {
    getSpecialties().then((l) => setSpecialties([...l].sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr')))).catch(() => undefined);
    getFaq().then(setFaq).catch(() => undefined);
    getNews(undefined, 50).then((p) => setNews(p.content)).catch(() => undefined);
  }, []);

  // Professionnels par leur nom : on attend une courte pause dans la frappe avant d'interroger le serveur.
  const term = fold(text);
  useEffect(() => {
    if (term.length < 3) {
      setPros([]);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      searchPractitioners({ q: text.trim() })
        .then((r) => live && setPros(r.content.slice(0, 3)))
        .catch(() => live && setPros([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const results = () => go('resultats', { q: text.trim() });
  type Item = { key: string; group: string; label: string; sub?: string; icon: string; run: () => void };
  // Dès la première lettre : thématiques, spécialités, informations et actualités qui commencent par ces lettres.
  const topics = term ? suggestTopics(text).slice(0, 5) : [];
  // Rien n'est proposé tant que la personne n'a pas commencé à taper : la liste n'apparaît qu'à la première lettre.
  const specs = term ? suggestSpecialties(text, specialties).slice(0, 4) : [];
  const infos = term
    ? [
        ...suggest(text, PAGES, (p) => p.title, (p) => p.keywords).slice(0, 3),
        ...suggest(text, faq, (f) => f.questionFr).slice(0, 2).map((f) => ({ title: f.questionFr, link: href('aide', { question: f.id }) })),
      ]
    : [];
  const articles = term ? suggest(text, news, (n) => n.title).slice(0, 2) : [];
  const items: Item[] = [
    ...topics.map((x) => ({ key: `t-${x}`, group: 'Thématiques', label: x, icon: '#', run: () => go('resultats', { q: x }) })),
    ...specs.map((x) => ({ key: `s-${x.code}`, group: 'Spécialités', label: x.nameFr, icon: '✚', run: () => { setOpen(false); askCountry(x); } })),
    ...pros.map((x) => ({
      key: `p-${x.id}`, group: 'Professionnels', label: `Dr ${x.firstName} ${x.lastName}`, sub: x.specialties.map((y) => y.nameFr).join(', '), icon: 'Dr',
      run: () => go(`medecin/${x.id}`),
    })),
    ...infos.map((x, i) => ({ key: `i-${i}`, group: 'Informations', label: x.title, icon: 'i', run: () => { window.location.href = x.link; } })),
    ...articles.map((x) => ({ key: `n-${x.id}`, group: 'Actualités', label: x.title, icon: '•', run: () => go('resultats', { q: x.title }) })),
    ...(term ? [{ key: 'all', group: '', label: `Voir tous les résultats pour « ${text.trim()} »`, icon: '⌕', run: results }] : []),
  ];

  function submit(e: FormEvent) {
    e.preventDefault();
    if (open && active >= 0 && items[active]) return items[active].run();
    if (!term) return;
    // Une spécialité désignée exactement (« généraliste », « dentiste »…) : choix du pays ; sinon, page de résultats.
    const s = exactSpecialty(text, specialties);
    if (s) {
      setOpen(false);
      askCountry(s);
    } else results();
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      const n = items.length;
      if (n) setActive((a) => (e.key === 'ArrowDown' ? (a + 1) % n : (a <= 0 ? n - 1 : a - 1)));
    } else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <form className="searchbar" onSubmit={submit} role="search" ref={box}>
      <label className="sb-field sb-what">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span className="sr-only">Rechercher sur Ollisanté</span>
        <input value={text} placeholder="Spécialité, symptôme, médecin, question…" autoComplete="off"
          role="combobox" aria-expanded={open && items.length > 0} aria-controls="sb-list" aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `sb-opt-${active}` : undefined}
          onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)} onKeyDown={onKey} />
      </label>
      <button className="sb-go">Rechercher<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button>
      {open && items.length ? (
        <div className="sb-pop">
          <ul id="sb-list" role="listbox" aria-label="Suggestions">
            {items.map((it, i) => (
              <Fragment key={it.key}>
                {it.group && it.group !== items[i - 1]?.group ? <li className="sb-head" role="presentation">{it.group}</li> : null}
                <li id={`sb-opt-${i}`} role="option" aria-selected={i === active} className={[i === active ? 'on' : '', it.key === 'all' ? 'sb-all' : ''].join(' ')}
                  onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); it.run(); }}>
                  <span className="sb-opt-icon" aria-hidden="true">{it.icon}</span>
                  <span><strong>{it.label}</strong>{it.sub ? <small>{it.sub}</small> : null}</span>
                </li>
              </Fragment>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
